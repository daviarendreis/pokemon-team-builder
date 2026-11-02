import { useMemo } from 'react';
import { formatName, type Pokemon } from '../domain/pokemon';
import { analyzeTeam, type RelationsByType, type TypeThreat } from '../domain/weakness';
import type { RelationsStatus } from '../hooks/useTypeRelations';
import { PokemonSprite } from './PokemonSprite';
import { TypeBadge } from './TypeBadge';

interface WeaknessPanelProps {
  team: Pokemon[];
  relations: RelationsByType;
  status: RelationsStatus;
  onRetry: () => void;
}

function severity(threat: TypeThreat, teamSize: number): string {
  if (threat.weak.length === 0) return 'is-safe';
  if (threat.weak.length === teamSize) return 'is-critical';
  return threat.weak.length >= teamSize / 2 ? 'is-high' : 'is-low';
}

function ThreatRow({ threat, teamSize }: { threat: TypeThreat; teamSize: number }) {
  const weakCount = threat.weak.length;

  return (
    <tr className={severity(threat, teamSize)}>
      <th scope="row" className="cell-type">
        <TypeBadge type={threat.type} />
      </th>
      <td className="cell-count">
        <span className="pips" aria-hidden="true">
          {Array.from({ length: teamSize }, (_, index) => (
            <span key={index} className={index < weakCount ? 'pip is-on' : 'pip'} />
          ))}
        </span>
        <span className="count-text">
          {weakCount}
          <span className="count-total">/{teamSize}</span>
        </span>
      </td>
      <td className="cell-who">
        {weakCount === 0 ? (
          <span className="muted">—</span>
        ) : (
          <ul className="who-list">
            {threat.weak.map(({ pokemon, multiplier }) => (
              <li key={pokemon.id} title={`${formatName(pokemon.name)} leva ×${multiplier}`}>
                <PokemonSprite pokemon={pokemon} size={36} />
                <span className={multiplier >= 4 ? 'multiplier is-quadruple' : 'multiplier'}>
                  ×{multiplier}
                </span>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="cell-number" data-label="Resistem">
        {threat.resistant.length || <span className="muted">0</span>}
      </td>
      <td className="cell-number" data-label="Imunes">
        {threat.immune.length || <span className="muted">0</span>}
      </td>
    </tr>
  );
}

function Analysis({ team, relations }: Pick<WeaknessPanelProps, 'team' | 'relations'>) {
  const { threats, teamWideWeaknesses } = useMemo(() => analyzeTeam(team, relations), [team, relations]);

  return (
    <>
      <div className={`summary${teamWideWeaknesses.length > 0 ? ' summary-alert' : ''}`}>
        <h3>O time inteiro é fraco a</h3>
        {teamWideWeaknesses.length > 0 ? (
          <div className="summary-types">
            {teamWideWeaknesses.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        ) : (
          <p>Nenhum tipo: para qualquer ataque, há alguém no time que não é fraco.</p>
        )}
      </div>

      <div className="threats-wrapper">
        <table className="threats">
          <caption className="visually-hidden">
            Quantos Pokémon do time são fracos, resistentes ou imunes a cada tipo de ataque
          </caption>
          <thead>
            <tr>
              <th scope="col">Ataque</th>
              <th scope="col">Fracos</th>
              <th scope="col">Quem</th>
              <th scope="col" className="cell-number">
                Resistem
              </th>
              <th scope="col" className="cell-number">
                Imunes
              </th>
            </tr>
          </thead>
          <tbody>
            {threats.map((threat) => (
              <ThreatRow key={threat.type} threat={threat} teamSize={team.length} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Considera apenas os tipos atuais de cada Pokémon. Habilidades como Levitate não entram no
        cálculo.
      </p>
    </>
  );
}

export function WeaknessPanel({ team, relations, status, onRetry }: WeaknessPanelProps) {
  return (
    <section aria-labelledby="analysis-heading">
      <div className="section-heading">
        <h2 id="analysis-heading">Fraquezas do time</h2>
      </div>

      {team.length === 0 ? (
        <p className="panel-message">Adicione um Pokémon para ver a análise de fraquezas.</p>
      ) : status === 'loading' ? (
        <div className="panel-message" role="status">
          Calculando fraquezas…
        </div>
      ) : status === 'error' ? (
        <div className="panel-message status-error" role="alert">
          Não foi possível carregar a tabela de tipos da PokéAPI.
          <button type="button" className="button-link" onClick={onRetry}>
            Tentar de novo
          </button>
        </div>
      ) : (
        <Analysis team={team} relations={relations} />
      )}
    </section>
  );
}
