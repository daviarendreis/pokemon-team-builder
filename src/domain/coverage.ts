import { POKEMON_TYPES, type Pokemon, type PokemonType } from './pokemon';
import type { TypeRelations } from './weakness';

/** Como um tipo se comporta ao atacar (o lado `_to` das relações da PokéAPI). */
export interface AttackRelations {
  doubleTo: PokemonType[];
  halfTo: PokemonType[];
  noneTo: PokemonType[];
}

/** Relações completas de um tipo: defesa (usada nas fraquezas) e ataque (usada na cobertura). */
export type FullTypeRelations = TypeRelations & AttackRelations;

export type FullRelationsByType = Partial<Record<PokemonType, FullTypeRelations>>;

export type AttackRelationsByType = Partial<Record<PokemonType, AttackRelations>>;

/** Multiplicador de um ataque do tipo `attack` contra um Pokémon de tipo único `defender`. */
export function attackMultiplier(
  attack: PokemonType,
  defender: PokemonType,
  relations: AttackRelationsByType,
): number {
  const relation = relations[attack];
  if (!relation) throw new Error(`Relações do tipo "${attack}" não carregadas`);
  if (relation.noneTo.includes(defender)) return 0;
  if (relation.doubleTo.includes(defender)) return 2;
  if (relation.halfTo.includes(defender)) return 0.5;
  return 1;
}

export interface CoverageProvider {
  pokemon: Pokemon;
  /** Os tipos do próprio Pokémon (STAB) que alcançam o melhor multiplicador. */
  attackTypes: PokemonType[];
}

/** O melhor que o time consegue fazer contra um tipo defensor. */
export interface TypeCoverage {
  type: PokemonType;
  /** 2, 1, 0.5 ou 0. Sem nenhum tipo de ataque no time, fica 0. */
  multiplier: number;
  /** Quem alcança esse multiplicador; vazio quando o melhor é ×0. */
  providers: CoverageProvider[];
}

export interface CoverageAnalysis {
  /**
   * Os 18 tipos: primeiro as lacunas (do pior multiplicador para o melhor),
   * depois os cobertos, dos que dependem de menos membros para os de mais.
   */
  coverage: TypeCoverage[];
  /** Tipos que o time acerta super efetivo, na ordem da tabela de tipos. */
  superEffective: PokemonType[];
  /** Tipos que o time não acerta melhor que neutro. */
  gaps: TypeCoverage[];
}

function coverageFor(
  type: PokemonType,
  team: Pokemon[],
  relations: AttackRelationsByType,
): TypeCoverage {
  let best = 0;
  let providers: CoverageProvider[] = [];

  for (const pokemon of team) {
    let own = 0;
    let attackTypes: PokemonType[] = [];
    for (const attack of pokemon.types) {
      const multiplier = attackMultiplier(attack, type, relations);
      if (multiplier > own) {
        own = multiplier;
        attackTypes = [attack];
      } else if (multiplier === own && multiplier > 0) {
        attackTypes.push(attack);
      }
    }

    if (own === 0) continue;
    if (own > best) {
      best = own;
      providers = [];
    }
    if (own === best) providers.push({ pokemon, attackTypes });
  }

  return { type, multiplier: best, providers };
}

export function analyzeCoverage(team: Pokemon[], relations: AttackRelationsByType): CoverageAnalysis {
  const all = POKEMON_TYPES.map((type) => coverageFor(type, team, relations));
  const superEffective = all.filter((entry) => entry.multiplier > 1);
  // `sort` é estável: no empate vale a ordem da tabela de tipos.
  const gaps = all
    .filter((entry) => entry.multiplier <= 1)
    .sort((a, b) => a.multiplier - b.multiplier);
  const covered = [...superEffective].sort((a, b) => a.providers.length - b.providers.length);

  return {
    coverage: [...gaps, ...covered],
    superEffective: superEffective.map((entry) => entry.type),
    gaps,
  };
}
