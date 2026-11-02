import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchPokemonDetails, isAbort, type ApiErrorKind } from '../api/pokeapi';
import type { PokemonDetails } from '../domain/pokemon';

export type DetailsState =
  | { status: 'loading' }
  | { status: 'error'; failure: ApiErrorKind }
  | { status: 'success'; details: PokemonDetails };

/** Busca os detalhes que o card do time não mostra (status, habilidades, descrição…). */
export function usePokemonDetails(id: number) {
  const [state, setState] = useState<DetailsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setState({ status: 'loading' });
    fetchPokemonDetails(id, controller.signal).then(
      (details) => setState({ status: 'success', details }),
      (error: unknown) => {
        if (isAbort(error)) return;
        setState({ status: 'error', failure: error instanceof ApiError ? error.kind : 'network' });
      },
    );

    return () => controller.abort();
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { details: state, retry };
}
