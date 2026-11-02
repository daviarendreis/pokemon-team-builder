import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBaseStats } from './baseStats';

afterEach(() => {
  vi.unstubAllGlobals();
});

const pokemon = {
  id: 25,
  name: 'pikachu',
  sprites: { front_default: null },
  types: [],
  height: 4,
  weight: 60,
  abilities: [],
  species: { name: 'pikachu' },
  stats: [
    { base_stat: 35, stat: { name: 'hp' } },
    { base_stat: 55, stat: { name: 'attack' } },
    { base_stat: 40, stat: { name: 'defense' } },
    { base_stat: 50, stat: { name: 'special-attack' } },
    { base_stat: 50, stat: { name: 'special-defense' } },
    { base_stat: 90, stat: { name: 'speed' } },
  ],
};

describe('fetchBaseStats', () => {
  it('junta pedidos simultâneos e guarda o resultado', async () => {
    const mock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(JSON.stringify(url.includes('/pokemon-species/') ? { genera: [], flavor_text_entries: [] } : pokemon)),
      ),
    );
    vi.stubGlobal('fetch', mock);

    const [first, second] = await Promise.all([fetchBaseStats(25), fetchBaseStats(25)]);
    await fetchBaseStats(25);

    expect(first).toEqual({
      hp: 35,
      attack: 55,
      defense: 40,
      'special-attack': 50,
      'special-defense': 50,
      speed: 90,
    });
    expect(second).toBe(first);
    // Uma busca do Pokémon e uma da espécie, nada mais.
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('não guarda falhas, para poder tentar de novo', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 500 }))));
    await expect(fetchBaseStats(26)).rejects.toMatchObject({ kind: 'server' });

    const mock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            url.includes('/pokemon-species/') ? { genera: [], flavor_text_entries: [] } : { ...pokemon, id: 26 },
          ),
        ),
      ),
    );
    vi.stubGlobal('fetch', mock);
    await expect(fetchBaseStats(26)).resolves.toMatchObject({ speed: 90 });
    expect(mock).toHaveBeenCalled();
  });
});
