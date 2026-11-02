import type { Pokemon } from './pokemon';
import { parseShowdown, toApiName } from './showdown';

export interface TextImportPlan {
  /** Nomes da API a buscar, sem repetição, no máximo `teamSize`. */
  queries: string[];
  /** Espécie como veio no texto, para as mensagens. */
  labels: Map<string, string>;
  /** Espécies que passaram do limite do time. */
  overflow: string[];
}

/** Decide o que buscar a partir do texto do Showdown. */
export function planTextImport(text: string, teamSize: number): TextImportPlan {
  const queries: string[] = [];
  const labels = new Map<string, string>();
  const overflow: string[] = [];

  for (const species of parseShowdown(text)) {
    const query = toApiName(species);
    if (query === '' || labels.has(query)) continue;
    if (queries.length >= teamSize) {
      overflow.push(species);
      continue;
    }
    queries.push(query);
    labels.set(query, species);
  }
  return { queries, labels, overflow };
}

export interface PlacedTeam {
  slots: (Pokemon | null)[];
  /** O que foi buscado e não existe (na ordem pedida). */
  notFound: string[];
  /** Nomes diferentes que deram no mesmo Pokémon (ex.: `Giratina` e `Giratina-Altered`). */
  duplicates: string[];
}

/**
 * Monta os slots com os resultados. Com `keepPositions`, cada resultado fica na
 * posição em que veio (link compartilhado); senão, entram em sequência (texto).
 */
export function placeResults(
  results: readonly ({ query: string; pokemon: Pokemon | null } | null)[],
  teamSize: number,
  keepPositions: boolean,
): PlacedTeam {
  const slots: (Pokemon | null)[] = Array.from({ length: teamSize }, () => null);
  const notFound: string[] = [];
  const duplicates: string[] = [];
  const ids = new Set<number>();
  let next = 0;

  results.forEach((result, index) => {
    if (!result) return;
    const { query, pokemon } = result;
    if (!pokemon) {
      notFound.push(query);
      return;
    }
    if (ids.has(pokemon.id)) {
      duplicates.push(query);
      return;
    }
    const position = keepPositions ? index : next++;
    if (position >= teamSize) return;
    ids.add(pokemon.id);
    slots[position] = pokemon;
  });
  return { slots, notFound, duplicates };
}
