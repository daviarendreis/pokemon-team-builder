import { useCallback, useEffect, useState } from 'react';
import { fetchPokemonIndex, isAbort } from '../api/pokeapi';

export type NamesState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'success';
      names: string[];
      /** Número de cada nome, para montar o sprite sem buscar o Pokémon inteiro. */
      ids: ReadonlyMap<string, number>;
    };

/** Lista de nomes que alimenta as sugestões da busca. */
export function usePokemonNames() {
  const [state, setState] = useState<NamesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchPokemonIndex(controller.signal).then(
      (entries) =>
        setState({
          status: 'success',
          names: entries.map(({ name }) => name),
          ids: new Map(entries.flatMap(({ name, id }) => (id === null ? [] : [[name, id] as const]))),
        }),
      (error: unknown) => {
        if (!isAbort(error)) setState({ status: 'error' });
      },
    );

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  return { names: state, retry };
}
