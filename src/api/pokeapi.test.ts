import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchPokemon, fetchPokemonDetails, fetchTypeRelations, isAbort } from './pokeapi';

function stubFetch(implementation: typeof fetch) {
  const mock = vi.fn(implementation);
  vi.stubGlobal('fetch', mock);
  return mock;
}

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('esperava uma rejeição');
    },
    (error: unknown) => error,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetchPokemon', () => {
  it('converte a resposta e descarta tipos fora dos 18 jogáveis', async () => {
    const mock = stubFetch(() =>
      json({
        id: 6,
        name: 'charizard',
        sprites: { front_default: 'front.png' },
        types: [{ type: { name: 'fire' } }, { type: { name: 'unknown' } }],
      }),
    );

    await expect(fetchPokemon('charizard')).resolves.toEqual({
      id: 6,
      name: 'charizard',
      sprite: 'front.png',
      types: ['fire'],
    });
    expect(mock.mock.calls[0]?.[0]).toBe('https://pokeapi.co/api/v2/pokemon/charizard');
  });

  it('usa a arte oficial quando não há sprite, e null se não houver nenhuma imagem', async () => {
    stubFetch(() =>
      json({
        id: 1,
        name: 'a',
        sprites: { front_default: null, other: { 'official-artwork': { front_default: 'art.png' } } },
        types: [],
      }),
    );
    expect((await fetchPokemon('a')).sprite).toBe('art.png');

    stubFetch(() => json({ id: 1, name: 'a', sprites: { front_default: null }, types: [] }));
    expect((await fetchPokemon('a')).sprite).toBeNull();
  });

  it('escapa o texto da busca na URL', async () => {
    const mock = stubFetch(() => Promise.resolve(new Response('Not Found', { status: 404 })));

    await errorOf(fetchPokemon('../type/fire'));

    expect(mock.mock.calls[0]?.[0]).toBe('https://pokeapi.co/api/v2/pokemon/..%2Ftype%2Ffire');
  });

  it.each([
    [404, 'not-found'],
    [429, 'server'],
    [500, 'server'],
  ])('status %i vira erro %s', async (status, kind) => {
    stubFetch(() => Promise.resolve(new Response('', { status })));

    expect(await errorOf(fetchPokemon('x'))).toMatchObject({ kind });
  });

  it('corpo que não é JSON vira erro de servidor', async () => {
    stubFetch(() => Promise.resolve(new Response('<html>')));

    expect(await errorOf(fetchPokemon('x'))).toMatchObject({ kind: 'server' });
  });

  it('falha de rede vira erro de rede', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    expect(await errorOf(fetchPokemon('x'))).toMatchObject({ kind: 'network' });
  });

  it('estouro de tempo vira timeout', async () => {
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    stubFetch(() => {
      timeout.abort();
      return Promise.reject(new DOMException('timed out', 'TimeoutError'));
    });

    expect(await errorOf(fetchPokemon('x'))).toMatchObject({ kind: 'timeout' });
    vi.restoreAllMocks();
  });

  it('cancelamento do chamador não vira erro de API', async () => {
    const controller = new AbortController();
    stubFetch(() => {
      controller.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });

    const error = await errorOf(fetchPokemon('x', controller.signal));

    expect(error).not.toBeInstanceOf(ApiError);
    expect(isAbort(error)).toBe(true);
  });
});

describe('fetchTypeRelations', () => {
  const body = {
    damage_relations: {
      double_damage_from: [{ name: 'water' }],
      half_damage_from: [{ name: 'fire' }, { name: 'stellar' }],
      no_damage_from: [],
      double_damage_to: [{ name: 'grass' }],
      half_damage_to: [{ name: 'rock' }],
      no_damage_to: [],
    },
  };

  it('faz uma requisição só por tipo', async () => {
    const mock = stubFetch(() => json(body));

    const first = await fetchTypeRelations('fire');
    await fetchTypeRelations('fire');

    expect(mock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({
      doubleFrom: ['water'],
      halfFrom: ['fire'],
      noneFrom: [],
      doubleTo: ['grass'],
      halfTo: ['rock'],
      noneTo: [],
    });
  });

  it('não guarda falhas em cache', async () => {
    stubFetch(() => Promise.resolve(new Response('', { status: 500 })));
    await errorOf(fetchTypeRelations('ice'));

    const mock = stubFetch(() => json(body));
    await expect(fetchTypeRelations('ice')).resolves.toMatchObject({ doubleFrom: ['water'] });
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

describe('fetchPokemonDetails', () => {
  const pokemon = {
    id: 386,
    name: 'deoxys-normal',
    height: 17,
    weight: 608,
    sprites: {
      front_default: 'front.png',
      other: { 'official-artwork': { front_default: 'art.png' } },
    },
    types: [{ type: { name: 'psychic' } }],
    abilities: [{ ability: { name: 'pressure' }, is_hidden: false }],
    stats: [
      { base_stat: 50, stat: { name: 'hp' } },
      { base_stat: 150, stat: { name: 'attack' } },
    ],
    species: { name: 'deoxys' },
  };
  const species = {
    genera: [{ genus: 'DNA Pokémon', language: { name: 'en' } }],
    flavor_text_entries: [
      { flavor_text: 'Old\ntext.', language: { name: 'en' } },
      { flavor_text: 'A mutated\fvirus­\nform.', language: { name: 'en' } },
      { flavor_text: 'Texte.', language: { name: 'fr' } },
    ],
  };

  it('junta Pokémon e espécie, limpa a descrição e guarda em cache', async () => {
    const mock = stubFetch((input) =>
      json(String(input).includes('/pokemon-species/') ? species : pokemon),
    );

    const details = await fetchPokemonDetails(386);
    await fetchPokemonDetails(386);

    expect(details).toEqual({
      id: 386,
      artwork: 'art.png',
      height: 17,
      weight: 608,
      abilities: [{ name: 'pressure', hidden: false }],
      stats: [
        { stat: 'hp', value: 50 },
        { stat: 'attack', value: 150 },
      ],
      genus: 'DNA Pokémon',
      flavorText: 'A mutated virusform.',
    });
    expect(mock.mock.calls.map(([url]) => url)).toEqual([
      'https://pokeapi.co/api/v2/pokemon/386',
      'https://pokeapi.co/api/v2/pokemon-species/deoxys',
    ]);
  });

  it('sem a espécie, devolve o resto e não guarda em cache', async () => {
    stubFetch((input) =>
      String(input).includes('/pokemon-species/')
        ? Promise.resolve(new Response('', { status: 500 }))
        : json({ ...pokemon, id: 1 }),
    );

    await expect(fetchPokemonDetails(1)).resolves.toMatchObject({ genus: null, flavorText: null });

    const mock = stubFetch((input) =>
      json(String(input).includes('/pokemon-species/') ? species : { ...pokemon, id: 1 }),
    );
    await expect(fetchPokemonDetails(1)).resolves.toMatchObject({ genus: 'DNA Pokémon' });
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
