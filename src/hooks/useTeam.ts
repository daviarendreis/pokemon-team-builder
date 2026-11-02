import { useCallback, useEffect, useReducer, useRef } from 'react';
import { ApiError, fetchPokemon, isAbort, type ApiErrorKind } from '../api/pokeapi';
import type { Pokemon } from '../domain/pokemon';

export const TEAM_SIZE = 6;

export type Slot = Pokemon | null;

export type SearchFailure = ApiErrorKind | 'duplicate' | 'team-full';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; pokemon: Pokemon }
  | { status: 'error'; query: string; failure: SearchFailure };

interface TeamState {
  slots: Slot[];
  search: SearchState;
}

type TeamAction =
  | { type: 'search-started'; query: string }
  | { type: 'search-succeeded'; query: string; pokemon: Pokemon }
  | { type: 'search-failed'; query: string; failure: SearchFailure }
  | { type: 'removed'; index: number };

const initialState: TeamState = {
  slots: Array.from({ length: TEAM_SIZE }, () => null),
  search: { status: 'idle' },
};

export function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'search-started':
      return { ...state, search: { status: 'loading', query: action.query } };

    case 'search-succeeded': {
      const { pokemon, query } = action;
      // A checagem fica aqui porque só o resultado diz quem é o Pokémon quando a
      // busca é por número, e o time pode ter mudado enquanto a resposta não chegava.
      if (state.slots.some((slot) => slot?.id === pokemon.id)) {
        return { ...state, search: { status: 'error', query, failure: 'duplicate' } };
      }
      const index = state.slots.indexOf(null);
      if (index === -1) {
        return { ...state, search: { status: 'error', query, failure: 'team-full' } };
      }
      return {
        slots: state.slots.with(index, pokemon),
        search: { status: 'success', pokemon },
      };
    }

    case 'search-failed':
      return {
        ...state,
        search: { status: 'error', query: action.query, failure: action.failure },
      };

    case 'removed':
      // A mensagem da última busca pode nem valer mais ("X já está no time").
      return {
        slots: state.slots.with(action.index, null),
        search: state.search.status === 'loading' ? state.search : { status: 'idle' },
      };
  }
}

export function useTeam() {
  const [state, dispatch] = useReducer(teamReducer, initialState);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  /** Uma nova busca cancela a anterior. Resolve `true` se o Pokémon entrou no time. */
  const runSearch = useCallback(
    async (query: string): Promise<boolean> => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      if (state.slots.some((slot) => slot?.name === query)) {
        dispatch({ type: 'search-failed', query, failure: 'duplicate' });
        return false;
      }

      dispatch({ type: 'search-started', query });
      try {
        const pokemon = await fetchPokemon(query, controller.signal);
        dispatch({ type: 'search-succeeded', query, pokemon });
        return !state.slots.some((slot) => slot?.id === pokemon.id);
      } catch (error) {
        if (isAbort(error)) return false;
        const failure = error instanceof ApiError ? error.kind : 'network';
        dispatch({ type: 'search-failed', query, failure });
        return false;
      }
    },
    [state.slots],
  );

  const remove = useCallback((index: number) => dispatch({ type: 'removed', index }), []);

  return { slots: state.slots, search: state.search, runSearch, remove };
}
