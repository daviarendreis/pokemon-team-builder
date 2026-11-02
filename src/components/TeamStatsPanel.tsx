import { useMemo } from 'react';
import { formatName, STATS, type Pokemon, type Stat } from '../domain/pokemon';
import {
  classifyAverage,
  STAT_NAMES,
  STAT_SHORT,
  statTotal,
  STRONG_AVERAGE,
  summarizeTeamStats,
  WEAK_AVERAGE,
  type BaseStats,
  type HighlightKind,
  type TeamStatsSummary,
} from '../domain/teamStats';
import { useTeamBaseStats, type MemberStats } from '../hooks/useTeamBaseStats';
import { PokemonSprite } from './PokemonSprite';
import './TeamStatsPanel.css';

/** As barras vão de 0 a este valor; acima dele ficam cheias (o número continua exato). */
const BAR_MAX = 200;

const KIND_TEXT: Record<HighlightKind, string> = { strong: 'ponto forte', weak: 'ponto fraco' };
const KIND_MARK: Record<HighlightKind, string> = { strong: '▲', weak: '▼' };

function kindClass(kind: HighlightKind | null): string {
  return kind ? ` is-${kind}` : '';
}

/** Na linha da média, o destaque também aparece como ▲/▼ e em texto para leitores de tela. */
function StatCell({ stat, value, marked = false }: { stat: Stat; value: number; marked?: boolean }) {
  const kind = marked ? classifyAverage(value) : null;

  return (
    <td className={`ts-cell${kindClass(classifyAverage(value))}`} data-label={STAT_NAMES[stat]}>
      <span className="ts-value">
        {kind && (
          <span className="ts-mark" aria-hidden="true">
            {KIND_MARK[kind]}
          </span>
        )}
        {value}
        {kind && <span className="visually-hidden"> ({KIND_TEXT[kind]})</span>}
      </span>
      <span className="ts-bar" aria-hidden="true">
        <span className="ts-fill" style={{ width: `${Math.min(100, (value / BAR_MAX) * 100)}%` }} />
      </span>
    </td>
  );
}

function MemberName({ pokemon }: { pokemon: Pokemon }) {
  return (
    <th scope="row" className="ts-name">
      <span className="ts-name-inner">
        <PokemonSprite pokemon={pokemon} size={32} />
        <span className="ts-name-text">{formatName(pokemon.name)}</span>
      </span>
    </th>
  );
}

function MemberRow({
  pokemon,
  state,
  onRetry,
}: {
  pokemon: Pokemon;
  state: MemberStats;
  onRetry: () => void;
}) {
  if (state.status !== 'ready') {
    return (
      <tr className={`ts-row is-${state.status}`}>
        <MemberName pokemon={pokemon} />
        <td colSpan={STATS.length + 1} className="ts-placeholder">
          {state.status === 'loading' ? (
            <span role="status">Carregando status…</span>
          ) : (
            <span className="status-error">
              {state.failure === 'not-found'
                ? 'A PokéAPI não tem os status deste Pokémon.'
                : 'Não foi possível carregar os status.'}
              {state.failure !== 'not-found' && (
                <button type="button" className="button-link" onClick={onRetry}>
                  Tentar de novo
                </button>
              )}
            </span>
          )}
        </td>
      </tr>
    );
  }

  return <ReadyRow pokemon={pokemon} stats={state.stats} />;
}

function ReadyRow({ pokemon, stats }: { pokemon: Pokemon; stats: BaseStats }) {
  return (
    <tr className="ts-row">
      <MemberName pokemon={pokemon} />
      {STATS.map((stat) => (
        <StatCell key={stat} stat={stat} value={stats[stat]} />
      ))}
      <td className="ts-total" data-label="Total">
        {statTotal(stats)}
      </td>
    </tr>
  );
}

function AverageRow({ summary, teamSize }: { summary: TeamStatsSummary; teamSize: number }) {
  return (
    <tr className="ts-row ts-average">
      <th scope="row" className="ts-name">
        <span className="ts-name-text">
          Média do time
          {summary.count < teamSize && (
            <span className="ts-partial">
              {' '}
              ({summary.count} de {teamSize})
            </span>
          )}
        </span>
      </th>
      {STATS.map((stat) => (
        <StatCell key={stat} stat={stat} value={summary.averages[stat]} marked />
      ))}
      <td className="ts-total" data-label="Total">
        {summary.averageTotal}
      </td>
    </tr>
  );
}

function Highlights({ summary }: { summary: TeamStatsSummary }) {
  if (summary.highlights.length === 0) {
    return (
      <p className="ts-balanced">
        Equilibrado: nenhuma média abaixo de {WEAK_AVERAGE} nem a partir de {STRONG_AVERAGE}. Melhor
        status: {STAT_NAMES[summary.best]} ({summary.averages[summary.best]}); pior:{' '}
        {STAT_NAMES[summary.worst]} ({summary.averages[summary.worst]}).
      </p>
    );
  }

  return (
    <ul className="ts-highlights" aria-label="Destaques do time">
      {summary.highlights.map((highlight) => (
        <li key={highlight.stat} className={`ts-chip is-${highlight.kind}`}>
          <span aria-hidden="true">{KIND_MARK[highlight.kind]}</span>
          <strong>{highlight.label}</strong>
          <span className="ts-chip-detail">
            {STAT_NAMES[highlight.stat]} média {highlight.average}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TeamStatsPanel({ team }: { team: Pokemon[] }) {
  const { members, retry } = useTeamBaseStats(team);
  const summary = useMemo(
    () =>
      summarizeTeamStats(
        members.flatMap(({ state }) => (state.status === 'ready' ? [state.stats] : [])),
      ),
    [members],
  );
  const loading = members.some(({ state }) => state.status === 'loading');

  return (
    <section aria-labelledby="team-stats-heading" aria-busy={loading}>
      <div className="section-heading">
        <h2 id="team-stats-heading">Status base do time</h2>
      </div>

      {team.length === 0 ? (
        <p className="panel-message">Adicione um Pokémon para ver os status base do time.</p>
      ) : (
        <>
          {summary && <Highlights summary={summary} />}

          <div className="ts-wrapper">
            <table className="ts-table">
              <caption className="visually-hidden">
                Status base de cada Pokémon do time, com o total e a média do time
              </caption>
              <thead>
                <tr>
                  <th scope="col">Pokémon</th>
                  {STATS.map((stat) => (
                    <th key={stat} scope="col" className="ts-col">
                      <abbr title={STAT_NAMES[stat]}>{STAT_SHORT[stat]}</abbr>
                    </th>
                  ))}
                  <th scope="col" className="ts-col">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map(({ pokemon, state }, index) => (
                  <MemberRow key={`${index}-${pokemon.id}`} pokemon={pokemon} state={state} onRetry={retry} />
                ))}
              </tbody>
              {summary && team.length > 1 && (
                <tfoot>
                  <AverageRow summary={summary} teamSize={team.length} />
                </tfoot>
              )}
            </table>
          </div>

          <p className="footnote">
            Destaques pela média do time: ▲ {STRONG_AVERAGE} ou mais é ponto forte, ▼ abaixo de{' '}
            {WEAK_AVERAGE} é ponto fraco (a média de um status entre todos os Pokémon fica perto de
            70–75). As cores das barras seguem os mesmos limites; escala de 0 a {BAR_MAX}.
          </p>
        </>
      )}
    </section>
  );
}
