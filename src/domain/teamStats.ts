import { STATS, type PokemonDetails, type Stat } from './pokemon';

/** Os seis status base de um Pokémon, como vêm da PokéAPI. */
export type BaseStats = Record<Stat, number>;

/** Nomes por extenso, usados no painel de status do time. */
export const STAT_NAMES: Record<Stat, string> = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque Esp.',
  'special-defense': 'Defesa Esp.',
  speed: 'Velocidade',
};

/** Abreviações para as colunas da tabela. */
export const STAT_SHORT: Record<Stat, string> = {
  hp: 'HP',
  attack: 'Atq',
  defense: 'Def',
  'special-attack': 'At.E',
  'special-defense': 'Df.E',
  speed: 'Vel',
};

/**
 * Limites para destacar áreas do time, aplicados à média de cada status.
 * Para comparação: a média de um status base entre todos os Pokémon fica por volta de 70–75.
 */
export const STRONG_AVERAGE = 100;
export const WEAK_AVERAGE = 70;

/** Converte a lista da API; um status ausente conta como 0. */
export function toBaseStats(stats: PokemonDetails['stats']): BaseStats {
  const result = Object.fromEntries(STATS.map((stat) => [stat, 0])) as BaseStats;
  for (const { stat, value } of stats) result[stat] = value;
  return result;
}

export function statTotal(stats: BaseStats): number {
  return STATS.reduce((sum, stat) => sum + stats[stat], 0);
}

export type HighlightKind = 'strong' | 'weak';

export interface StatHighlight {
  stat: Stat;
  kind: HighlightKind;
  /** Média do time nesse status, arredondada. */
  average: number;
  /** Frase curta, ex.: "Time lento". */
  label: string;
}

const HIGHLIGHT_LABELS: Record<Stat, Record<HighlightKind, string>> = {
  hp: { strong: 'HP alto', weak: 'Pouco HP' },
  attack: { strong: 'Ataque físico forte', weak: 'Pouco ataque físico' },
  defense: { strong: 'Boa defesa física', weak: 'Pouca defesa física' },
  'special-attack': { strong: 'Ataque especial forte', weak: 'Pouco ataque especial' },
  'special-defense': { strong: 'Boa defesa especial', weak: 'Pouca defesa especial' },
  speed: { strong: 'Time rápido', weak: 'Time lento' },
};

export function classifyAverage(average: number): HighlightKind | null {
  if (average >= STRONG_AVERAGE) return 'strong';
  if (average < WEAK_AVERAGE) return 'weak';
  return null;
}

export interface TeamStatsSummary {
  /** Quantos Pokémon entraram na conta. */
  count: number;
  /** Média do time por status, arredondada para inteiro. */
  averages: BaseStats;
  averageTotal: number;
  /** Status com a maior e a menor média (o primeiro na ordem do jogo, em caso de empate). */
  best: Stat;
  worst: Stat;
  /** Fracos primeiro, depois fortes; dentro de cada grupo, na ordem do jogo. */
  highlights: StatHighlight[];
}

/** `null` se não houver nenhum Pokémon com status carregados. */
export function summarizeTeamStats(members: BaseStats[]): TeamStatsSummary | null {
  if (members.length === 0) return null;

  const averages = Object.fromEntries(
    STATS.map((stat) => [
      stat,
      Math.round(members.reduce((sum, member) => sum + member[stat], 0) / members.length),
    ]),
  ) as BaseStats;
  const averageTotal = Math.round(
    members.reduce((sum, member) => sum + statTotal(member), 0) / members.length,
  );

  let best: Stat = STATS[0];
  let worst: Stat = STATS[0];
  for (const stat of STATS) {
    if (averages[stat] > averages[best]) best = stat;
    if (averages[stat] < averages[worst]) worst = stat;
  }

  const highlights = STATS.flatMap((stat): StatHighlight[] => {
    const kind = classifyAverage(averages[stat]);
    return kind ? [{ stat, kind, average: averages[stat], label: HIGHLIGHT_LABELS[stat][kind] }] : [];
  }).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'weak' ? -1 : 1));

  return { count: members.length, averages, averageTotal, best, worst, highlights };
}
