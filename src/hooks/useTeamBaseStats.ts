import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchBaseStats } from '../api/baseStats';
import { ApiError, type ApiErrorKind } from '../api/pokeapi';
import type { Pokemon } from '../domain/pokemon';
import type { BaseStats } from '../domain/teamStats';

export type MemberStats =
  | { status: 'loading' }
  | { status: 'error'; failure: ApiErrorKind }
  | { status: 'ready'; stats: BaseStats };

/**
 * Busca os status base dos membros do time sob demanda. O time salvo continua
 * sem status (formato antigo); o que já foi carregado é mantido entre renders,
 * então adicionar um Pokémon só busca o que falta.
 */
export function useTeamBaseStats(team: Pokemon[]) {
  const [loaded, setLoaded] = useState<Record<number, BaseStats>>({});
  const [failed, setFailed] = useState<Record<number, ApiErrorKind>>({});

  const missingKey = [...new Set(team.map(({ id }) => id))]
    .filter((id) => !loaded[id] && !failed[id])
    .join(',');
  const missing = useMemo(() => (missingKey ? missingKey.split(',').map(Number) : []), [missingKey]);

  useEffect(() => {
    let stale = false;

    for (const id of missing) {
      // Pedidos repetidos do mesmo id viram uma requisição só em `fetchBaseStats`.
      fetchBaseStats(id).then(
        (stats) => {
          if (!stale) setLoaded((current) => ({ ...current, [id]: stats }));
        },
        (error: unknown) => {
          if (stale) return;
          const failure = error instanceof ApiError ? error.kind : 'network';
          setFailed((current) => ({ ...current, [id]: failure }));
        },
      );
    }

    return () => {
      stale = true;
    };
  }, [missing]);

  const retry = useCallback(() => setFailed({}), []);

  const members = useMemo(
    () =>
      team.map((pokemon): { pokemon: Pokemon; state: MemberStats } => {
        const stats = loaded[pokemon.id];
        if (stats) return { pokemon, state: { status: 'ready', stats } };
        const failure = failed[pokemon.id];
        if (failure) return { pokemon, state: { status: 'error', failure } };
        return { pokemon, state: { status: 'loading' } };
      }),
    [team, loaded, failed],
  );

  return { members, retry };
}
