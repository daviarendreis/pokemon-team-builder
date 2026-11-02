import { useMemo, useState } from 'react';
import { PokemonDetailsModal } from './components/PokemonDetailsModal';
import { SearchBar } from './components/SearchBar';
import { TeamSlots } from './components/TeamSlots';
import { TypeSuggestions } from './components/TypeSuggestions';
import { WeaknessPanel } from './components/WeaknessPanel';
import type { Pokemon } from './domain/pokemon';
import { usePokemonNames } from './hooks/usePokemonNames';
import { useTeam } from './hooks/useTeam';
import { useTypeRelations } from './hooks/useTypeRelations';

export function App() {
  const { slots, search, runSearch, remove } = useTeam();
  const { names, retry: retryNames } = usePokemonNames();
  const [detailsOf, setDetailsOf] = useState<Pokemon | null>(null);

  const team = useMemo(() => slots.filter((slot): slot is Pokemon => slot !== null), [slots]);
  const teamTypes = useMemo(() => [...new Set(team.flatMap((pokemon) => pokemon.types))], [team]);
  const { relations, status, retry } = useTypeRelations(teamTypes);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Montador de Time Pokémon</h1>
        <p>Monte um time de até 6 Pokémon e descubra a quais tipos ele está exposto.</p>
      </header>

      <main className="page-main">
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
        <WeaknessPanel team={team} relations={relations} status={status} onRetry={retry} />
        <TypeSuggestions team={team} teamSize={slots.length} />
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
