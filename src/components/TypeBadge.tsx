import { TYPE_LABELS, type PokemonType } from '../domain/pokemon';

export function TypeBadge({ type }: { type: PokemonType }) {
  return <span className={`type-badge type-${type}`}>{TYPE_LABELS[type]}</span>;
}
