import { formatName, type Pokemon } from '../domain/pokemon';
import type { Slot } from '../hooks/useTeam';
import { PokemonSprite } from './PokemonSprite';
import { TypeBadge } from './TypeBadge';

interface TeamSlotsProps {
  slots: Slot[];
  /** Slot que mostra o carregamento enquanto uma busca está em andamento. */
  pendingIndex: number;
  onRemove: (index: number) => void;
  onOpenDetails: (pokemon: Pokemon) => void;
}

interface FilledSlotProps {
  pokemon: Pokemon;
  onRemove: () => void;
  onOpenDetails: () => void;
}

function FilledSlot({ pokemon, onRemove, onOpenDetails }: FilledSlotProps) {
  const name = formatName(pokemon.name);
  const primaryType = pokemon.types[0];

  return (
    <div className={`slot slot-filled${primaryType ? ` type-${primaryType}` : ''}`}>
      <button
        type="button"
        className="slot-remove"
        onClick={onRemove}
        aria-label={`Remover ${name} do time`}
        title="Remover do time"
      >
        ×
      </button>
      <PokemonSprite pokemon={pokemon} size={96} />
      <p className="slot-number">#{String(pokemon.id).padStart(3, '0')}</p>
      <h3 className="slot-name">
        {/* Um `::after` estica o botão sobre o card todo; o de remover fica por cima. */}
        <button
          type="button"
          className="slot-open"
          onClick={onOpenDetails}
          aria-haspopup="dialog"
          aria-label={`Ver detalhes de ${name}`}
          title="Ver detalhes"
        >
          {name}
        </button>
      </h3>
      <div className="slot-types">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>
    </div>
  );
}

export function TeamSlots({ slots, pendingIndex, onRemove, onOpenDetails }: TeamSlotsProps) {
  const filled = slots.filter(Boolean).length;

  return (
    <section aria-labelledby="team-heading">
      <div className="section-heading">
        <h2 id="team-heading">Seu time</h2>
        <span className="counter">
          {filled}/{slots.length}
        </span>
      </div>
      <ol className="slots">
        {slots.map((pokemon, index) => (
          <li key={pokemon ? pokemon.id : `empty-${index}`}>
            {pokemon ? (
              <FilledSlot
                pokemon={pokemon}
                onRemove={() => onRemove(index)}
                onOpenDetails={() => onOpenDetails(pokemon)}
              />
            ) : index === pendingIndex ? (
              <div className="slot slot-loading" aria-hidden="true">
                <span className="skeleton skeleton-sprite" />
                <span className="skeleton skeleton-line" />
                <span className="skeleton skeleton-line skeleton-short" />
              </div>
            ) : (
              <div className="slot slot-empty">
                <span className="slot-socket" aria-hidden="true" />
                <span>Slot {index + 1} vazio</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
