import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupPokemon } from './teamLookup';

const pokemon = (id: number, name: string) => ({
  id,
  name,
  sprites: { front_default: `${name}.png` },
  types: [{ type: { name: 'normal' } }],
});

function respond(routes: Record<string, unknown>, fail?: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const path = input.replace('https://pokeapi.co/api/v2', '');
      if (path === fail) return Promise.reject(new TypeError('offline'));
      const body = routes[path];
      return Promise.resolve(
        body === undefined ? new Response('', { status: 404 }) : new Response(JSON.stringify(body)),
      );
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('lookupPokemon', () => {
  it('marca os inexistentes e usa a forma padrão da espécie', async () => {
    respond({
      '/pokemon/25': pokemon(25, 'pikachu'),
      '/pokemon-species/giratina': {
        varieties: [
          { is_default: false, pokemon: { name: 'giratina-origin' } },
          { is_default: true, pokemon: { name: 'giratina-altered' } },
        ],
      },
      '/pokemon/giratina-altered': pokemon(487, 'giratina-altered'),
    });

    const results = await lookupPokemon(['25', 'giratina', 'nada', '99999']);
    expect(results.map((result) => result.pokemon?.name ?? null)).toEqual([
      'pikachu',
      'giratina-altered',
      null,
      null,
    ]);
  });

  it('falha de rede rejeita a busca toda', async () => {
    respond({ '/pokemon/25': pokemon(25, 'pikachu') }, '/pokemon/6');
    await expect(lookupPokemon(['25', '6'])).rejects.toMatchObject({ kind: 'network' });
  });
});
