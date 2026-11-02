import { useMemo } from 'react';
import type { Pokemon } from '../domain/pokemon';
import { describeSuggestion, suggestNextTypes } from '../domain/typeSuggestions';
import { TypeBadge } from './TypeBadge';
import './TypeSuggestions.css';

interface TypeSuggestionsProps {
  team: Pokemon[];
  teamSize: number;
}

function Suggestions({ team }: { team: Pokemon[] }) {
  const { openWeaknesses, suggestions } = useMemo(
    () => suggestNextTypes(team.map((pokemon) => pokemon.types)),
    [team],
  );

  if (openWeaknesses.length === 0) {
    return (
      <p className="panel-message">
        Nenhuma fraqueza descoberta: para cada tipo de ataque, há pelo menos tantos membros que resistem
        quanto membros fracos.
      </p>
    );
  }

  if (suggestions.length === 0) {
    return (
      <p className="panel-message">
        Nenhum tipo cobre essas fraquezas sem abrir outras equivalentes.
      </p>
    );
  }

  return (
    <ol className="type-suggestions">
      {suggestions.map((suggestion, index) => (
        <li key={suggestion.types.join('-')} className="type-suggestion">
          <span className="type-suggestion-rank" aria-hidden="true">
            {index + 1}
          </span>
          <div className="type-suggestion-body">
            <div className="summary-types">
              {suggestion.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
            <p className="type-suggestion-reason">{describeSuggestion(suggestion)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TypeSuggestions({ team, teamSize }: TypeSuggestionsProps) {
  return (
    <section aria-labelledby="suggestions-heading">
      <div className="section-heading">
        <h2 id="suggestions-heading">Próximo tipo sugerido</h2>
      </div>

      <div aria-live="polite">
        {team.length === 0 ? (
          <p className="panel-message">Adicione um Pokémon para receber sugestões de tipo.</p>
        ) : team.length >= teamSize ? (
          <p className="panel-message">
            Time completo. Remova um Pokémon para ver qual tipo equilibraria melhor as fraquezas.
          </p>
        ) : (
          <Suggestions team={team} />
        )}
      </div>
      <p className="footnote">
        Leva em conta só a defesa: pares de tipos aparecem quando cobrem bem mais que cada tipo sozinho.
      </p>
    </section>
  );
}
