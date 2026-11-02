import { useMemo, useState } from 'react';
import { CoveragePanel } from './components/CoveragePanel';
import { DashboardStats } from './components/DashboardStats';
import { PokemonDetailsModal } from './components/PokemonDetailsModal';
import { SavedTeams } from './components/SavedTeams';
import { SearchBar } from './components/SearchBar';
import { SharedLinkNotice, TeamShare } from './components/TeamShare';
import { TeamSlots } from './components/TeamSlots';
import { TeamStatsPanel } from './components/TeamStatsPanel';
import { TypeSuggestions } from './components/TypeSuggestions';
import { WeaknessPanel } from './components/WeaknessPanel';
import { analyzeCoverage } from './domain/coverage';
import { POKEMON_TYPES, type Pokemon } from './domain/pokemon';
import { analyzeTeam } from './domain/weakness';
import { usePokemonNames } from './hooks/usePokemonNames';
import { useSavedTeams } from './hooks/useSavedTeams';
import { useTeam } from './hooks/useTeam';
import { useTeamImport } from './hooks/useTeamImport';
import { useTypeRelations } from './hooks/useTypeRelations';

export function App() {
  const { slots, search, runSearch, remove, load } = useTeam();
  const savedTeams = useSavedTeams();
  const { names, retry: retryNames } = usePokemonNames();
  const [detailsOf, setDetailsOf] = useState<Pokemon | null>(null);
  const teamImport = useTeamImport(slots, load);

  const team = useMemo(() => slots.filter((slot): slot is Pokemon => slot !== null), [slots]);
  const teamTypes = useMemo(() => [...new Set(team.flatMap((pokemon) => pokemon.types))], [team]);
  const { relations, status, retry } = useTypeRelations(teamTypes);
  // Só para o resumo do topo; o painel de fraquezas faz a própria análise.
  const teamWideWeaknesses = useMemo(
    () => (status === 'ready' && team.length > 0 ? analyzeTeam(team, relations).teamWideWeaknesses : null),
    [status, team, relations],
  );
  const superEffectiveCount = useMemo(
    () => (status === 'ready' && team.length > 0 ? analyzeCoverage(team, relations).superEffective.length : null),
    [status, team, relations],
  );

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-title">
          <h1>Montador de Time Pokémon</h1>
          <p>Monte um time de até 6 Pokémon e descubra a quais tipos ele está exposto.</p>
        </div>
        <DashboardStats
          stats={[
            { label: 'No time', value: `${team.length}/${slots.length}` },
            { label: 'Tipos diferentes', value: String(teamTypes.length) },
            {
              label: 'Fraquezas do time todo',
              value: teamWideWeaknesses ? String(teamWideWeaknesses.length) : '—',
              alert: (teamWideWeaknesses?.length ?? 0) > 0,
            },
            {
              label: 'Tipos com super efetivo',
              value: superEffectiveCount === null ? '—' : `${superEffectiveCount}/${POKEMON_TYPES.length}`,
            },
            {
              label: 'Times salvos',
              value: savedTeams.available ? String(savedTeams.teams.length) : '—',
            },
          ]}
        />
      </header>

      <SharedLinkNotice controls={teamImport} />

      <main className="dashboard">
        {/* As duas colunas só existem no desktop; abaixo disso os cards fluem direto no grid. */}
        <div className="dashboard-main">
          <div className="card area-team">
            <SearchBar
              names={names}
              search={search}
              teamIsFull={team.length === slots.length}
              onSearch={runSearch}
              onRetryNames={retryNames}
            />
            <TeamSlots
              slots={slots}
              pendingIndex={search.status === 'loading' ? slots.indexOf(null) : -1}
              onRemove={remove}
              onOpenDetails={setDetailsOf}
            />
          </div>
          <div className="card area-stats">
            <TeamStatsPanel team={team} />
          </div>
          <div className="card area-analysis">
            <WeaknessPanel team={team} relations={relations} status={status} onRetry={retry} />
          </div>
          <div className="card area-coverage">
            <CoveragePanel team={team} relations={relations} status={status} onRetry={retry} />
          </div>
        </div>
        <div className="dashboard-side">
          <div className="card area-saved">
            <SavedTeams
              slots={slots}
              teams={savedTeams.teams}
              available={savedTeams.available}
              onSave={savedTeams.save}
              onLoad={(saved) => {
                setDetailsOf(null);
                load(saved.slots);
              }}
              onDelete={savedTeams.remove}
            />
          </div>
          <div className="card area-share">
            <TeamShare slots={slots} controls={teamImport} />
          </div>
          <div className="card area-suggestions">
            <TypeSuggestions team={team} teamSize={slots.length} />
          </div>
        </div>
      </main>

      <footer className="page-footer">
        Dados da <a href="https://pokeapi.co/">PokéAPI</a>.
      </footer>

      {detailsOf && (
        <PokemonDetailsModal
          key={detailsOf.id}
          pokemon={detailsOf}
          onClose={() => setDetailsOf(null)}
        />
      )}
    </div>
  );
}
