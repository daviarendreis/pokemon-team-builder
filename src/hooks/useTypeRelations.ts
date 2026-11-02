import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTypeRelations } from '../api/pokeapi';
import type { PokemonType } from '../domain/pokemon';
import type { RelationsByType } from '../domain/weakness';

export type RelationsStatus = 'loading' | 'error' | 'ready';

/**
 * Garante que as relações dos tipos pedidos estejam carregadas. O que já foi
 * carregado é mantido, então adicionar um Pokémon só busca o que falta e a
 * análise não pisca de volta para o estado de carregamento à toa.
 */
export function useTypeRelations(types: PokemonType[]) {
  const [relations, setRelations] = useState<RelationsByType>({});
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const missingKey = types.filter((type) => !relations[type]).join(',');
  const missing = useMemo(
    () => (missingKey ? (missingKey.split(',') as PokemonType[]) : []),
    [missingKey],
  );

  useEffect(() => {
    if (missing.length === 0) return;
    let stale = false;

    setFailed(false);
    Promise.all(missing.map(async (type) => [type, await fetchTypeRelations(type)] as const)).then(
      (loaded) => {
        if (!stale) setRelations((current) => ({ ...current, ...Object.fromEntries(loaded) }));
      },
      () => {
        if (!stale) setFailed(true);
      },
    );

    return () => {
      stale = true;
    };
  }, [missing, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const status: RelationsStatus = missing.length === 0 ? 'ready' : failed ? 'error' : 'loading';

  return { relations, status, retry };
}
