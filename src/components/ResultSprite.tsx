import { useState } from 'react';
import { spriteUrlForId } from '../domain/sprites';
import './ResultSprite.css';

interface ResultSpriteProps {
  /** `undefined` quando o número não pôde ser tirado da lista da API. */
  id: number | undefined;
  label: string;
  size?: number;
}

/**
 * Sprite pequeno dos resultados da busca. O nome já aparece ao lado, então a
 * imagem é decorativa para leitores de tela (`alt=""`) e o reserva também.
 */
export function ResultSprite({ id, label, size = 40 }: ResultSpriteProps) {
  const [brokenId, setBrokenId] = useState<number | null>(null);

  if (id === undefined || brokenId === id) {
    return (
      <span
        className="sprite-fallback result-sprite"
        style={{ width: size, height: size }}
        aria-hidden="true"
        title={`${label} (sem imagem)`}
      >
        ?
      </span>
    );
  }

  return (
    <img
      key={id}
      className="sprite result-sprite"
      src={spriteUrlForId(id)}
      alt=""
      title={label}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setBrokenId(id)}
    />
  );
}
