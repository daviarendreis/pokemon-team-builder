import type { Pokemon } from '../domain/pokemon';
import { ApiError, fetchPokemon, request } from './pokeapi';

interface SpeciesVarieties {
  varieties: { is_default: boolean; pokemon: { name: string } }[];
}

/**
 * Busca por nome ou número. Se o nome não existir como Pokémon, tenta como espécie
 * (`/pokemon/giratina` não existe, mas a espécie `giratina` aponta para a forma padrão).
 */
export async function fetchPokemonOrSpecies(query: string, signal?: AbortSignal): Promise<Pokemon> {
  try {
    return await fetchPokemon(query, signal);
  } catch (error) {
    if (!(error instanceof ApiError && error.kind === 'not-found') || /^\d+$/.test(query)) throw error;
  }
  const species = await request<SpeciesVarieties>(
    `/pokemon-species/${encodeURIComponent(query)}`,
    signal,
  );
  const variety = species.varieties.find((entry) => entry.is_default) ?? species.varieties[0];
  if (!variety) throw new ApiError('not-found');
  return fetchPokemon(variety.pokemon.name, signal);
}

export type LookupResult = { query: string; pokemon: Pokemon | null };

/**
 * Busca vários Pokémon em paralelo. Os que não existem voltam com `pokemon: null`;
 * qualquer outra falha (rede, servidor, tempo esgotado) rejeita tudo, para a
 * importação não sair pela metade sem o usuário perceber.
 */
export async function lookupPokemon(
  queries: readonly string[],
  signal?: AbortSignal,
): Promise<LookupResult[]> {
  return Promise.all(
    queries.map(async (query) => {
      try {
        return { query, pokemon: await fetchPokemonOrSpecies(query, signal) };
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'not-found') return { query, pokemon: null };
        throw error;
      }
    }),
  );
}
