import { useCallback, useEffect, useState } from 'react';
import {
  getBrowserStorage,
  normalizeTeamName,
  readSavedTeams,
  removeTeam,
  SAVED_TEAMS_KEY,
  upsertTeam,
  writeSavedTeams,
  type SavedTeam,
} from '../domain/savedTeams';
import { TEAM_SIZE, type Slot } from './useTeam';

export function useSavedTeams() {
  const [storage] = useState(getBrowserStorage);
  const [teams, setTeams] = useState(() => readSavedTeams(storage, TEAM_SIZE));

  // Mantém a lista em dia se o usuário salvar em outra aba.
  useEffect(() => {
    if (!storage) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === SAVED_TEAMS_KEY || event.key === null) {
        setTeams(readSavedTeams(storage, TEAM_SIZE));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storage]);

  /** Grava e só atualiza a lista se deu certo. */
  const commit = useCallback(
    (next: SavedTeam[]): boolean => {
      if (!writeSavedTeams(storage, next)) return false;
      setTeams(next);
      return true;
    },
    [storage],
  );

  /** Salva o time com esse nome, substituindo um time salvo de mesmo nome. */
  const save = useCallback(
    (name: string, slots: Slot[]): boolean => {
      const team: SavedTeam = {
        name: normalizeTeamName(name),
        savedAt: new Date().toISOString(),
        slots: [...slots],
      };
      return commit(upsertTeam(readSavedTeams(storage, TEAM_SIZE), team));
    },
    [commit, storage],
  );

  const remove = useCallback(
    (name: string): boolean => commit(removeTeam(readSavedTeams(storage, TEAM_SIZE), name)),
    [commit, storage],
  );

  return { teams, available: storage !== null, save, remove };
}
