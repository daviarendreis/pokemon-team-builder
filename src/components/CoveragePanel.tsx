import { useMemo, useState } from 'react';
import {
  analyzeCoverage,
  type AttackRelationsByType,
  type TypeCoverage,
} from '../domain/coverage';
import { formatName, POKEMON_TYPES, TYPE_LABELS, type Pokemon } from '../domain/pokemon';
import type { RelationsStatus } from '../hooks/useTypeRelations';
import { PokemonSprite } from './PokemonSprite';
import { TypeBadge } from './TypeBadge';
import './CoveragePanel.css';

interface CoveragePanelProps {
  team: Pokemon[];
  relations: AttackRelationsByType;
  status: RelationsStatus;
  onRetry: () => void;
}

const TIERS = [
  { multiplier: 0, label: 'Sem efeito (×0)', className: 'is-immune' },
  { multiplier: 0.5, label: 'Só resistido (×½)', className: 'is-resisted' },
  { multiplier: 1, label: 'Só neutro (×1)', className: 'is-neutral' },
  { multiplier: 2, label: 'Super efetivo (×2)', className: 'is-super' },
] as const;

function tierOf(multiplier: number) {
  return TIERS.find((tier) => tier.multiplier === multiplier) ?? TIERS[2];
}

function formatMultiplier(multiplier: number): string {
  return multiplier === 0.5 ? '×½' : `×${multiplier}`;
}

function CoverageRow({ entry }: { entry: TypeCoverage }) {
  const tier = tierOf(entry.multiplier);

  return (
    <tr className={tier.className}>
      <th scope="row" className="cell-type">
        <TypeBadge type={entry.type} />
      </th>
      <td className="cell-best">
        <span className="coverage-multiplier">{formatMultiplier(entry.multiplier)}</span>
      </td>
      <td className="cell-who">
        {entry.providers.length === 0 ? (
          <span className="muted">—</span>
        ) : (
          <ul className="who-list">
            {entry.providers.map(({ pokemon, attackTypes }) => {
              const labels = attackTypes.map((type) => TYPE_LABELS[type]).join(' / ');
              return (
                <li
                  key={pokemon.id}
                  title={`${formatName(pokemon.name)}: ${labels} ${formatMultiplier(entry.multiplier)}`}
                >
                  <PokemonSprite pokemon={pokemon} size={36} />
                  <span className="multiplier">{labels}</span>
                </li>
              );
            })}
          </ul>
        )}
      </td>
    </tr>
  );
}

function Analysis({ team, relations }: Pick<CoveragePanelProps, 'team' | 'relations'>) {
  const { coverage, superEffective, gaps } = useMemo(
    () => analyzeCoverage(team, relations),
    [team, relations],
  );
  const [showDetails, setShowDetails] = useState(false);
  const gapTiers = TIERS.filter((tier) => tier.multiplier <= 1)
    .map((tier) => ({ ...tier, types: gaps.filter((gap) => gap.multiplier === tier.multiplier) }))
    .filter((tier) => tier.types.length > 0);
  const hasBadGaps = gaps.some((gap) => gap.multiplier < 1);

  return (
    <>
      <div className="coverage-summary">
        <div className={`summary${hasBadGaps ? ' summary-alert' : ''}`}>
          <h3>Lacunas: sem golpe super efetivo contra</h3>
          {gapTiers.length > 0 ? (
            <dl className="coverage-gaps">
              {gapTiers.map((tier) => (
                <div key={tier.multiplier} className={`coverage-gap ${tier.className}`}>
                  <dt>{tier.label}</dt>
                  <dd className="summary-types">
                    {tier.types.map(({ type }) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>Nenhuma: o time acerta todos os 18 tipos de forma super efetiva.</p>
          )}
        </div>

        <div className="summary">
          <h3>
            Super efetivo contra{' '}
            <span className="count-total">
              ({superEffective.length}/{POKEMON_TYPES.length})
            </span>
          </h3>
          {superEffective.length > 0 ? (
            <div className="summary-types">
              {superEffective.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          ) : (
            <p>Nenhum tipo ainda.</p>
          )}
        </div>
      </div>

      <div className="threats-wrapper">
        {showDetails && (
          <table className="threats coverage-table">
            <caption className="visually-hidden">
              Melhor multiplicador que o time alcança contra cada tipo e quem o alcança
            </caption>
            <thead>
              <tr>
                <th scope="col">Defensor</th>
                <th scope="col">Melhor</th>
                <th scope="col">Quem</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((entry) => (
                <CoverageRow key={entry.type} entry={entry} />
              ))}
            </tbody>
          </table>
        )}
        <button
          type="button"
          className="threats-toggle"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((value) => !value)}
        >
          {showDetails ? 'Ocultar detalhes por tipo' : 'Mostrar quem cobre cada tipo'}
        </button>
      </div>
      <p className="footnote">
        Considera só os tipos de cada Pokémon (STAB), não os golpes que ele realmente aprende.
      </p>
    </>
  );
}

export function CoveragePanel({ team, relations, status, onRetry }: CoveragePanelProps) {
  return (
    <section aria-labelledby="coverage-heading">
      <div className="section-heading">
        <h2 id="coverage-heading">Cobertura ofensiva</h2>
      </div>

      {team.length === 0 ? (
        <p className="panel-message">Adicione um Pokémon para ver a cobertura ofensiva.</p>
      ) : status === 'loading' ? (
        <div className="panel-message" role="status">
          Calculando cobertura…
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
