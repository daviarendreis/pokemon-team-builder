import { POKEMON_TYPES, type Pokemon, type PokemonType } from './pokemon';

/** Como um tipo se comporta ao ser atacado. */
export interface TypeRelations {
  doubleFrom: PokemonType[];
  halfFrom: PokemonType[];
  noneFrom: PokemonType[];
}

export type RelationsByType = Partial<Record<PokemonType, TypeRelations>>;

export interface TeamMatchup {
  pokemon: Pokemon;
  multiplier: number;
}

/** Como o time inteiro reage a um tipo de ataque. */
export interface TypeThreat {
  type: PokemonType;
  weak: TeamMatchup[];
  resistant: TeamMatchup[];
  immune: TeamMatchup[];
}

export interface TeamAnalysis {
  /** Os 18 tipos, do mais perigoso para o menos perigoso. */
  threats: TypeThreat[];
  /** Tipos contra os quais todos os Pokémon do time são fracos. */
  teamWideWeaknesses: PokemonType[];
}

/** Multiplicador de dano de um ataque contra um Pokémon: o produto dos seus tipos. */
export function damageMultiplier(
  attack: PokemonType,
  defenderTypes: PokemonType[],
  relations: RelationsByType,
): number {
  return defenderTypes.reduce((multiplier, defenderType) => {
    const relation = relations[defenderType];
    if (!relation) throw new Error(`Relações do tipo "${defenderType}" não carregadas`);
    if (relation.noneFrom.includes(attack)) return 0;
    if (relation.doubleFrom.includes(attack)) return multiplier * 2;
    if (relation.halfFrom.includes(attack)) return multiplier * 0.5;
    return multiplier;
  }, 1);
}

function threatFor(type: PokemonType, team: Pokemon[], relations: RelationsByType): TypeThreat {
  const threat: TypeThreat = { type, weak: [], resistant: [], immune: [] };

  for (const pokemon of team) {
    const multiplier = damageMultiplier(type, pokemon.types, relations);
    const matchup = { pokemon, multiplier };
    if (multiplier === 0) threat.immune.push(matchup);
    else if (multiplier > 1) threat.weak.push(matchup);
    else if (multiplier < 1) threat.resistant.push(matchup);
  }

  threat.weak.sort((a, b) => b.multiplier - a.multiplier);
  return threat;
}

/** Mais fracos primeiro; no empate, pesa quem toma ×4 e depois quem cobre o tipo. */
function compareThreats(a: TypeThreat, b: TypeThreat): number {
  const quadruple = (threat: TypeThreat) =>
    threat.weak.filter((matchup) => matchup.multiplier >= 4).length;
  const covered = (threat: TypeThreat) => threat.resistant.length + threat.immune.length;

  return (
    b.weak.length - a.weak.length ||
    quadruple(b) - quadruple(a) ||
    covered(a) - covered(b)
  );
}

export function analyzeTeam(team: Pokemon[], relations: RelationsByType): TeamAnalysis {
  const threats = POKEMON_TYPES.map((type) => threatFor(type, team, relations)).sort(compareThreats);

  return {
    threats,
    teamWideWeaknesses:
      team.length === 0
        ? []
        : threats.filter((threat) => threat.weak.length === team.length).map((threat) => threat.type),
  };
}
