import { POKEMON_TYPES, TYPE_LABELS, type PokemonType } from './pokemon';
import { effectivenessAgainst } from './typeChart';

/** Como o time atual reage a um tipo de ataque. */
export interface TeamExposure {
  type: PokemonType;
  /** Índices dos membros que tomam mais que ×1. */
  weakMembers: number[];
  /** Quantos membros resistem ou são imunes. */
  covered: number;
}

export interface CoveredWeakness {
  type: PokemonType;
  /** Multiplicador que o tipo sugerido recebe: 0, ¼ ou ½. */
  multiplier: number;
  weakCount: number;
}

export interface TypeSuggestion {
  /** Um tipo ou um par de tipos. */
  types: PokemonType[];
  score: number;
  /** Fraquezas descobertas do time que esse tipo resiste, da mais grave para a menos grave. */
  covers: CoveredWeakness[];
  /** Fraquezas que o tipo traria e que se somam às que o time já tem descobertas. */
  stacks: PokemonType[];
  /** Quantos membros diferentes são fracos a algum dos tipos cobertos. */
  membersHelped: number;
}

export interface SuggestionAnalysis {
  /** Tipos de ataque a que há mais membros fracos do que resistentes. */
  openWeaknesses: TeamExposure[];
  suggestions: TypeSuggestion[];
}

/** Um par só entra se for claramente melhor que cada um dos seus tipos sozinho. */
const PAIR_MARGIN = 1;
/** Peso extra de uma fraqueza nova que se soma a uma que o time já não cobre. */
const STACK_PENALTY = 1.5;

export function teamExposure(team: readonly (readonly PokemonType[])[]): TeamExposure[] {
  return POKEMON_TYPES.map((type) => {
    const exposure: TeamExposure = { type, weakMembers: [], covered: 0 };
    team.forEach((types, index) => {
      const multiplier = effectivenessAgainst(type, types);
      if (multiplier > 1) exposure.weakMembers.push(index);
      else if (multiplier < 1) exposure.covered += 1;
    });
    return exposure;
  });
}

/** Saldo de um ataque: positivo quando há mais membros fracos do que quem o segure. */
function pressure(exposure: TeamExposure): number {
  return exposure.weakMembers.length - exposure.covered;
}

function resistanceWeight(multiplier: number): number {
  if (multiplier === 0) return 1.5;
  return multiplier <= 0.25 ? 1.25 : 1;
}

function evaluate(types: PokemonType[], exposures: TeamExposure[]): TypeSuggestion {
  let score = 0;
  const covers: CoveredWeakness[] = [];
  const stacks: PokemonType[] = [];
  const helped = new Set<number>();

  for (const exposure of exposures) {
    const multiplier = effectivenessAgainst(exposure.type, types);
    const open = pressure(exposure);

    if (multiplier < 1 && open > 0) {
      score += open * resistanceWeight(multiplier);
      covers.push({ type: exposure.type, multiplier, weakCount: exposure.weakMembers.length });
      exposure.weakMembers.forEach((member) => helped.add(member));
    } else if (multiplier > 1) {
      // Uma fraqueza nova só pesa de verdade se o time não tiver como segurá-la.
      // Somar-se a uma fraqueza que o time já tem pesa mais que abrir uma nova.
      const after = open + 1;
      const stacking = after > 0 && exposure.weakMembers.length > 0;
      const severity = (multiplier >= 4 ? 1.5 : 1) * (stacking ? STACK_PENALTY : 1);
      score -= after > 0 ? after * severity : 0.1;
      if (stacking) stacks.push(exposure.type);
    }
  }

  covers.sort((a, b) => b.weakCount - a.weakCount || a.multiplier - b.multiplier);
  return { types, score, covers, stacks, membersHelped: helped.size };
}

function candidates(): PokemonType[][] {
  const singles = POKEMON_TYPES.map((type) => [type]);
  const pairs = POKEMON_TYPES.flatMap((first, index) =>
    POKEMON_TYPES.slice(index + 1).map((second) => [first, second]),
  );
  return [...singles, ...pairs];
}

/**
 * Sugere os tipos que melhor cobrem as fraquezas do time: ganham pontos por
 * resistir (ou ser imune) a ataques que mais membros temem do que seguram, e
 * perdem por trazer fraquezas que se somam às que o time já não cobre.
 */
export function suggestNextTypes(
  team: readonly (readonly PokemonType[])[],
  limit = 3,
): SuggestionAnalysis {
  const exposures = teamExposure(team);
  const openWeaknesses = exposures
    .filter((exposure) => pressure(exposure) > 0)
    .sort((a, b) => pressure(b) - pressure(a));

  if (team.length === 0 || openWeaknesses.length === 0) return { openWeaknesses, suggestions: [] };

  const evaluated = candidates().map((types) => evaluate(types, exposures));
  const singleScore = new Map(
    evaluated.filter((s) => s.types.length === 1).map((s) => [s.types[0], s.score]),
  );

  const ranked = evaluated
    .filter((suggestion) => suggestion.score > 0 && suggestion.covers.length > 0)
    .filter(
      (suggestion) =>
        suggestion.types.length === 1 ||
        suggestion.types.every((type) => suggestion.score >= (singleScore.get(type) ?? 0) + PAIR_MARGIN),
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.membersHelped - a.membersHelped ||
        a.types.length - b.types.length ||
        a.stacks.length - b.stacks.length,
    );

  // Evita três variações do mesmo tipo: cada sugestão precisa trazer um tipo novo.
  const picked: TypeSuggestion[] = [];
  const seen = new Set<PokemonType>();
  for (const suggestion of ranked) {
    if (picked.length === limit) break;
    if (suggestion.types.every((type) => seen.has(type))) continue;
    picked.push(suggestion);
    suggestion.types.forEach((type) => seen.add(type));
  }

  return { openWeaknesses, suggestions: picked };
}

function listLabels(types: PokemonType[]): string {
  const labels = types.map((type) => TYPE_LABELS[type]);
  return labels.length <= 1 ? (labels[0] ?? '') : `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
}

/** Ex.: "Resiste Fogo e Gelo — fraquezas de 3 membros". */
export function describeSuggestion(suggestion: TypeSuggestion): string {
  const immune = suggestion.covers.filter((cover) => cover.multiplier === 0).map((cover) => cover.type);
  const resists = suggestion.covers.filter((cover) => cover.multiplier > 0).map((cover) => cover.type);

  const parts: string[] = [];
  if (immune.length > 0) parts.push(`Imune a ${listLabels(immune)}`);
  if (resists.length > 0) parts.push(`${immune.length > 0 ? 'resiste' : 'Resiste'} ${listLabels(resists)}`);

  const members = suggestion.membersHelped;
  let text = `${parts.join('; ')} — fraquezas de ${members} ${members === 1 ? 'membro' : 'membros'}`;
  if (suggestion.stacks.length > 0) text += `. Atenção: também é fraco a ${listLabels(suggestion.stacks)}`;
  return text;
}
