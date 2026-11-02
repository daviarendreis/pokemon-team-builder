import { describe, expect, it } from 'vitest';
import type { Pokemon } from '../domain/pokemon';
import { TEAM_SIZE, teamReducer } from './useTeam';

function pokemon(id: number): Pokemon {
  return { id, name: `p${id}`, sprite: null, types: ['normal'] };
}

function teamOf(...ids: (number | null)[]) {
  const slots = Array.from({ length: TEAM_SIZE }, (_, i) => {
    const id = ids[i];
    return id == null ? null : pokemon(id);
  });
  return { slots, search: { status: 'idle' } as const };
}

const added = (id: number) =>
  ({ type: 'search-succeeded', query: String(id), pokemon: pokemon(id) }) as const;

describe('teamReducer', () => {
  it('coloca o Pokémon no primeiro slot vazio, mesmo no meio do time', () => {
    const state = teamReducer(teamOf(1, null, 3), added(2));

    expect(state.slots.map((slot) => slot?.id ?? null)).toEqual([1, 2, 3, null, null, null]);
    expect(state.search).toMatchObject({ status: 'success' });
  });

  it('remover mantém os outros Pokémon nos seus slots', () => {
    const state = teamReducer(teamOf(1, 2, 3), { type: 'removed', index: 1 });

    expect(state.slots.map((slot) => slot?.id ?? null)).toEqual([1, null, 3, null, null, null]);
  });

  it('remover limpa a mensagem da última busca, mas não uma busca em andamento', () => {
    const afterSuccess = teamReducer(teamOf(), added(1));
    expect(teamReducer(afterSuccess, { type: 'removed', index: 0 }).search).toEqual({
      status: 'idle',
    });

    const loading = teamReducer(teamOf(1), { type: 'search-started', query: 'p2' });
    expect(teamReducer(loading, { type: 'removed', index: 0 }).search).toEqual(loading.search);
  });

  it('recusa Pokémon repetido sem mexer no time', () => {
    const before = teamOf(1);
    const state = teamReducer(before, added(1));

    expect(state.slots).toBe(before.slots);
    expect(state.search).toMatchObject({ status: 'error', failure: 'duplicate' });
  });

  it('recusa um sétimo Pokémon', () => {
    const state = teamReducer(teamOf(1, 2, 3, 4, 5, 6), added(7));

    expect(state.slots.map((slot) => slot?.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(state.search).toMatchObject({ status: 'error', failure: 'team-full' });
  });

  it('carregar um time salvo substitui todos os slots e limpa a busca', () => {
    const before = teamReducer(teamOf(1, 2), added(3));
    const state = teamReducer(before, { type: 'loaded', slots: [null, pokemon(9)] });

    expect(state.slots.map((slot) => slot?.id ?? null)).toEqual([null, 9, null, null, null, null]);
    expect(state.search).toEqual({ status: 'idle' });
  });

  it('registra a falha mantendo o texto buscado para tentar de novo', () => {
    const state = teamReducer(teamOf(), {
      type: 'search-failed',
      query: 'missingno',
      failure: 'not-found',
    });

    expect(state.search).toEqual({ status: 'error', query: 'missingno', failure: 'not-found' });
  });
});
