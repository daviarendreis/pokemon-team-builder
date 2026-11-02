import { describe, expect, it } from 'vitest';
import type { Pokemon } from './pokemon';
import {
  readSavedTeams,
  removeTeam,
  SAVED_TEAMS_KEY,
  upsertTeam,
  writeSavedTeams,
  type SavedTeam,
  type TeamStorage,
} from './savedTeams';

const SIZE = 6;

function memoryStorage(initial?: string): TeamStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(SAVED_TEAMS_KEY, initial);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

function pokemon(id: number): Pokemon {
  return { id, name: `p${id}`, sprite: `https://img/${id}.png`, types: ['fire', 'flying'] };
}

function team(name: string, savedAt: string, ...ids: (number | null)[]): SavedTeam {
  const slots = Array.from({ length: SIZE }, (_, i) => {
    const id = ids[i];
    return id == null ? null : pokemon(id);
  });
  return { name, savedAt, slots };
}

describe('times salvos', () => {
  it('grava e lê de volta o time completo, com posições vazias', () => {
    const storage = memoryStorage();
    const saved = team('Liga', '2026-01-01T10:00:00.000Z', 6, null, 9);

    expect(writeSavedTeams(storage, [saved])).toBe(true);
    expect(readSavedTeams(storage, SIZE)).toEqual([saved]);
  });

  it('lista do mais recente para o mais antigo', () => {
    const storage = memoryStorage();
    writeSavedTeams(storage, [
      team('Antigo', '2026-01-01T00:00:00.000Z', 1),
      team('Novo', '2026-03-01T00:00:00.000Z', 2),
    ]);

    expect(readSavedTeams(storage, SIZE).map((t) => t.name)).toEqual(['Novo', 'Antigo']);
  });

  it('salvar com nome já usado substitui o time, ignorando maiúsculas e espaços', () => {
    const teams = [team('Liga', '2026-01-01T00:00:00.000Z', 1), team('Outro', '2026-01-01T00:00:00.000Z', 2)];
    const next = upsertTeam(teams, team('  liga ', '2026-02-01T00:00:00.000Z', 3));

    expect(next.map((t) => t.name)).toEqual(['  liga ', 'Outro']);
    expect(removeTeam(next, 'LIGA').map((t) => t.name)).toEqual(['Outro']);
  });

  it('ignora JSON inválido, versão desconhecida e storage ausente', () => {
    expect(readSavedTeams(memoryStorage('{não é json'), SIZE)).toEqual([]);
    expect(readSavedTeams(memoryStorage('{"version":99,"teams":[]}'), SIZE)).toEqual([]);
    expect(readSavedTeams(memoryStorage('[]'), SIZE)).toEqual([]);
    expect(readSavedTeams(null, SIZE)).toEqual([]);
    expect(writeSavedTeams(null, [])).toBe(false);
  });

  it('descarta só as entradas corrompidas', () => {
    const good = team('Bom', '2026-01-01T00:00:00.000Z', 1);
    const raw = JSON.stringify({
      version: 1,
      teams: [
        good,
        null,
        { name: '', savedAt: good.savedAt, slots: good.slots },
        { name: 'Sem data', savedAt: 'ontem', slots: good.slots },
        { name: 'Tipo falso', savedAt: good.savedAt, slots: [{ ...pokemon(2), types: ['laser'] }] },
        { name: 'Vazio', savedAt: good.savedAt, slots: [null, null] },
        { name: 'Repetido', savedAt: good.savedAt, slots: [pokemon(3), pokemon(3)] },
        { name: 'Grande', savedAt: good.savedAt, slots: [1, 2, 3, 4, 5, 6, 7].map(pokemon) },
        { name: 'Sem sprite', savedAt: good.savedAt, slots: [{ ...pokemon(4), sprite: 5 }] },
      ],
    });

    expect(readSavedTeams(memoryStorage(raw), SIZE)).toEqual([good]);
  });

  it('completa com slots vazios um time salvo mais curto', () => {
    const raw = JSON.stringify({
      version: 1,
      teams: [{ name: 'Curto', savedAt: '2026-01-01T00:00:00.000Z', slots: [pokemon(1)] }],
    });

    expect(readSavedTeams(memoryStorage(raw), SIZE)[0]?.slots).toHaveLength(SIZE);
  });

  it('não lança se o navegador recusar a escrita (cota cheia)', () => {
    const storage: TeamStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError');
      },
    };
    const throwingRead: TeamStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {},
    };

    expect(writeSavedTeams(storage, [team('X', '2026-01-01T00:00:00.000Z', 1)])).toBe(false);
    expect(readSavedTeams(throwingRead, SIZE)).toEqual([]);
  });
});
