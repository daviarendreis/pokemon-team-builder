/**
 * Os 18 tipos jogáveis. A PokéAPI também lista `stellar`, `unknown` e `shadow`,
 * que não são tipos de ataque normais e ficam de fora da análise.
 */
export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export const TYPE_LABELS: Record<PokemonType, string> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  electric: 'Elétrico',
  grass: 'Planta',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Veneno',
  ground: 'Terra',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada',
};

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

export interface Pokemon {
  id: number;
  /** Identificador da API, ex.: `mr-mime`. */
  name: string;
  sprite: string | null;
  types: PokemonType[];
}

/** `mr-mime` → `Mr Mime` */
export function formatName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Converte o que o usuário digitou para o formato de nome usado pela API. */
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ.'’:]/g, '')
    .replace(/\s+/g, '-');
}

export const STATS = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;

export type Stat = (typeof STATS)[number];

export const STAT_LABELS: Record<Stat, string> = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidade',
};

export function isStat(value: string): value is Stat {
  return (STATS as readonly string[]).includes(value);
}

export interface PokemonAbility {
  /** Identificador da API, ex.: `solar-power`. */
  name: string;
  hidden: boolean;
}

export interface PokemonDetails {
  id: number;
  artwork: string | null;
  /** Em decímetros, como vem da API. */
  height: number;
  /** Em hectogramas, como vem da API. */
  weight: number;
  abilities: PokemonAbility[];
  stats: { stat: Stat; value: number }[];
  /** Categoria da espécie, ex.: "Flame Pokémon". `null` se a espécie não carregou. */
  genus: string | null;
  /** Descrição da Pokédex. `null` se não houver ou se a espécie não carregou. */
  flavorText: string | null;
}
