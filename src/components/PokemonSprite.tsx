import { useState } from 'react';
import { formatName, type Pokemon } from '../domain/pokemon';

interface PokemonSpriteProps {
  pokemon: Pokemon;
  size: number;
}

export function PokemonSprite({ pokemon, size }: PokemonSpriteProps) {
  const [broken, setBroken] = useState(false);
  const label = formatName(pokemon.name);

  if (!pokemon.sprite || broken) {
    return (
      <span
        className="sprite-fallback"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label} (sem imagem)`}
      >
        ?
      </span>
    );
  }

  return (
    <img
      className="sprite"
      src={pokemon.sprite}
      alt={label}
      width={size}
      height={size}
      onError={() => setBroken(true)}
    />
  );
}
