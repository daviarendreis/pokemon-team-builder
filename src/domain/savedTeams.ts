import { isPokemonType, type Pokemon } from './pokemon';

/**
 * Times salvos ficam no `localStorage` do navegador (o site é estático, sem servidor).
 * Formato: `{ version: 1, teams: SavedTeam[] }`.
 */
export const SAVED_TEAMS_KEY = 'pokemon-team-builder:saved-teams';
const FORMAT_VERSION = 1;
export const MAX_NAME_LENGTH = 40;

export interface SavedTeam {
  name: string;
  /** Data em ISO 8601. */
  savedAt: string;
  /** Mesma forma dos slots do montador: posições vazias são `null`. */
  slots: (Pokemon | null)[];
}

/** O mínimo de `Storage` que usamos; facilita testar sem navegador. */
export type TeamStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** `null` quando o navegador bloqueia o acesso (modo privado, cookies desativados etc.). */
export function getBrowserStorage(): TeamStorage | null {
  try {
    const storage = window.localStorage;
    const probe = `${SAVED_TEAMS_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
}

/** Nomes iguais ignorando maiúsculas e espaços extras contam como o mesmo time. */
export function sameTeamName(a: string, b: string): boolean {
  return normalizeTeamName(a).toLocaleLowerCase() === normalizeTeamName(b).toLocaleLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePokemon(value: unknown): Pokemon | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const { id, name, sprite, types } = value;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return undefined;
  if (typeof name !== 'string' || name === '') return undefined;
  if (sprite !== null && typeof sprite !== 'string') return undefined;
  if (!Array.isArray(types) || types.length === 0) return undefined;
  if (!types.every((type) => typeof type === 'string' && isPokemonType(type))) return undefined;
  return { id, name, sprite, types };
}

/** Devolve `null` se a entrada estiver corrompida; um time ruim não derruba os outros. */
export function parseSavedTeam(value: unknown, teamSize: number): SavedTeam | null {
  if (!isRecord(value)) return null;
  const { name, savedAt, slots } = value;
  if (typeof name !== 'string' || normalizeTeamName(name) === '') return null;
  if (typeof savedAt !== 'string' || Number.isNaN(Date.parse(savedAt))) return null;
  if (!Array.isArray(slots) || slots.length > teamSize) return null;

  const parsed: (Pokemon | null)[] = [];
  for (const slot of slots) {
    const pokemon = parsePokemon(slot);
    if (pokemon === undefined) return null;
    parsed.push(pokemon);
  }
  const ids = parsed.flatMap((pokemon) => (pokemon ? [pokemon.id] : []));
  if (ids.length === 0 || new Set(ids).size !== ids.length) return null;

  while (parsed.length < teamSize) parsed.push(null);
  return { name: normalizeTeamName(name), savedAt, slots: parsed };
}

/** Lê os times salvos, do mais recente para o mais antigo. Nunca lança. */
export function readSavedTeams(storage: TeamStorage | null, teamSize: number): SavedTeam[] {
  if (!storage) return [];
  let data: unknown;
  try {
    const raw = storage.getItem(SAVED_TEAMS_KEY);
    if (raw === null) return [];
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isRecord(data) || data.version !== FORMAT_VERSION || !Array.isArray(data.teams)) return [];

  const teams: SavedTeam[] = [];
  for (const entry of data.teams) {
    const team = parseSavedTeam(entry, teamSize);
    if (team && !teams.some((other) => sameTeamName(other.name, team.name))) teams.push(team);
  }
  return teams.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
}

/** Devolve `false` se não deu para gravar (sem acesso ou cota cheia). */
export function writeSavedTeams(storage: TeamStorage | null, teams: SavedTeam[]): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVED_TEAMS_KEY, JSON.stringify({ version: FORMAT_VERSION, teams }));
    return true;
  } catch {
    return false;
  }
}

/** Salva (ou substitui, se o nome já existir) e devolve a nova lista. */
export function upsertTeam(teams: SavedTeam[], team: SavedTeam): SavedTeam[] {
  return [team, ...teams.filter((other) => !sameTeamName(other.name, team.name))];
}

export function removeTeam(teams: SavedTeam[], name: string): SavedTeam[] {
  return teams.filter((team) => !sameTeamName(team.name, name));
}
