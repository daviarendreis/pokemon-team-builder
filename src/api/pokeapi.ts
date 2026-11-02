import {
  isPokemonType,
  isStat,
  type Pokemon,
  type PokemonDetails,
  type PokemonType,
} from '../domain/pokemon';
import { idFromResourceUrl } from '../domain/sprites';
import type { TypeRelations } from '../domain/weakness';

const BASE_URL = 'https://pokeapi.co/api/v2';
const TIMEOUT_MS = 10_000;
const POKEMON_LIST_LIMIT = 2_000;

export type ApiErrorKind = 'not-found' | 'timeout' | 'network' | 'server';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind) {
    super(`PokéAPI: ${kind}`);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Falhas viram `ApiError`; só um cancelamento pedido pelo chamador passa como `AbortError`. */
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 404) throw new ApiError('not-found');
    if (!response.ok) throw new ApiError('server');
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new ApiError('timeout');
    if (error instanceof SyntaxError) throw new ApiError('server');
    throw new ApiError('network');
  }
}

interface NamedResource {
  name: string;
}

interface PokemonResponse {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    other?: { 'official-artwork'?: { front_default: string | null } };
  };
  types: { type: NamedResource }[];
}

interface PokemonDetailsResponse extends PokemonResponse {
  height: number;
  weight: number;
  abilities: { ability: NamedResource; is_hidden: boolean }[];
  stats: { base_stat: number; stat: NamedResource }[];
  species: NamedResource;
}

interface LocalizedText {
  language: NamedResource;
}

interface SpeciesResponse {
  genera: (LocalizedText & { genus: string })[];
  flavor_text_entries: (LocalizedText & { flavor_text: string })[];
}

interface PokemonListResponse {
  results: (NamedResource & { url: string })[];
}

export interface PokemonListEntry {
  name: string;
  /** Tirado da URL do recurso; `null` se ela vier num formato inesperado. */
  id: number | null;
}

interface TypeResponse {
  damage_relations: {
    double_damage_from: NamedResource[];
    half_damage_from: NamedResource[];
    no_damage_from: NamedResource[];
  };
}

/** `query` pode ser um nome da API ou um número da Pokédex. */
export async function fetchPokemon(query: string, signal?: AbortSignal): Promise<Pokemon> {
  const data = await request<PokemonResponse>(`/pokemon/${encodeURIComponent(query)}`, signal);

  return {
    id: data.id,
    name: data.name,
    sprite:
      data.sprites.front_default ??
      data.sprites.other?.['official-artwork']?.front_default ??
      null,
    types: data.types.map(({ type }) => type.name).filter(isPokemonType),
  };
}

export async function fetchPokemonNames(signal?: AbortSignal): Promise<string[]> {
  const entries = await fetchPokemonIndex(signal);
  return entries.map(({ name }) => name);
}

/** Nomes com o número de cada Pokémon, que serve para mostrar o sprite na busca. */
export async function fetchPokemonIndex(signal?: AbortSignal): Promise<PokemonListEntry[]> {
  const data = await request<PokemonListResponse>(`/pokemon?limit=${POKEMON_LIST_LIMIT}`, signal);
  return data.results.map(({ name, url }) => ({ name, id: idFromResourceUrl(url) }));
}

function toTypes(resources: NamedResource[]): PokemonType[] {
  return resources.map(({ name }) => name).filter(isPokemonType);
}

// As relações de tipo não mudam durante o uso, então cada tipo é buscado uma vez só.
const typeCache = new Map<PokemonType, Promise<TypeRelations>>();

export function fetchTypeRelations(type: PokemonType): Promise<TypeRelations> {
  const cached = typeCache.get(type);
  if (cached) return cached;

  const pending = request<TypeResponse>(`/type/${type}`).then(({ damage_relations: relations }) => ({
    doubleFrom: toTypes(relations.double_damage_from),
    halfFrom: toTypes(relations.half_damage_from),
    noneFrom: toTypes(relations.no_damage_from),
  }));

  typeCache.set(type, pending);
  pending.catch(() => typeCache.delete(type)); // falhas não ficam em cache: permite tentar de novo
  return pending;
}

// A PokéAPI quase não tem textos em português; o inglês serve de reserva.
const TEXT_LANGUAGES = ['pt-br', 'pt', 'en'];

function pickLocalized<T extends LocalizedText>(entries: T[]): T | undefined {
  for (const language of TEXT_LANGUAGES) {
    // A última entrada é a do jogo mais recente.
    const match = entries.findLast((entry) => entry.language.name.toLowerCase() === language);
    if (match) return match;
  }
  return undefined;
}

/** Os textos da Pokédex vêm com as quebras de linha e de página dos jogos originais. */
function cleanFlavorText(text: string): string {
  return text.replace(/­\s*/g, '').replace(/\s+/g, ' ').trim();
}

// Os detalhes não mudam durante o uso; só resultados completos ficam em cache.
const detailsCache = new Map<number, PokemonDetails>();

export async function fetchPokemonDetails(id: number, signal?: AbortSignal): Promise<PokemonDetails> {
  const cached = detailsCache.get(id);
  if (cached) return cached;

  const data = await request<PokemonDetailsResponse>(`/pokemon/${id}`, signal);

  // A espécie só traz categoria e descrição: se falhar, o resto dos detalhes ainda vale.
  let species: SpeciesResponse | null = null;
  try {
    species = await request<SpeciesResponse>(
      `/pokemon-species/${encodeURIComponent(data.species.name)}`,
      signal,
    );
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  const flavor = species ? pickLocalized(species.flavor_text_entries) : undefined;
  const details: PokemonDetails = {
    id: data.id,
    artwork:
      data.sprites.other?.['official-artwork']?.front_default ?? data.sprites.front_default ?? null,
    height: data.height,
    weight: data.weight,
    abilities: data.abilities.map(({ ability, is_hidden }) => ({
      name: ability.name,
      hidden: is_hidden,
    })),
    stats: data.stats.flatMap(({ stat, base_stat }) =>
      isStat(stat.name) ? [{ stat: stat.name, value: base_stat }] : [],
    ),
    genus: (species && pickLocalized(species.genera)?.genus) ?? null,
    flavorText: flavor ? cleanFlavorText(flavor.flavor_text) : null,
  };

  if (species) detailsCache.set(id, details);
  return details;
}
