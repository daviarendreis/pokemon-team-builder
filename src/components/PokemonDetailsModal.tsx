import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import type { ApiErrorKind } from '../api/pokeapi';
import {
  STAT_LABELS,
  formatName,
  type Pokemon,
  type PokemonDetails,
} from '../domain/pokemon';
import { usePokemonDetails } from '../hooks/usePokemonDetails';
import { PokemonSprite } from './PokemonSprite';
import { TypeBadge } from './TypeBadge';

/** Maior status base que existe nos jogos; serve de escala para as barras. */
const MAX_STAT = 255;

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface PokemonDetailsModalProps {
  pokemon: Pokemon;
  onClose: () => void;
}

function failureMessage(failure: ApiErrorKind): string {
  switch (failure) {
    case 'not-found':
      return 'A PokéAPI não tem detalhes para este Pokémon.';
    case 'timeout':
      return 'A PokéAPI demorou demais para responder.';
    case 'network':
      return 'Não foi possível conectar à PokéAPI. Verifique sua internet.';
    case 'server':
      return 'A PokéAPI está com problemas no momento.';
  }
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function statLevel(value: number): string {
  if (value >= 120) return 'is-great';
  if (value >= 90) return 'is-good';
  if (value >= 60) return 'is-ok';
  return 'is-low';
}

function Stats({ stats }: { stats: PokemonDetails['stats'] }) {
  const total = stats.reduce((sum, { value }) => sum + value, 0);

  return (
    <table className="details-stats">
      <caption className="visually-hidden">Status base</caption>
      <tbody>
        {stats.map(({ stat, value }) => (
          <tr key={stat}>
            <th scope="row">{STAT_LABELS[stat]}</th>
            <td className="stat-value">{value}</td>
            <td className="stat-bar-cell" aria-hidden="true">
              <span className="stat-bar">
                <span
                  className={`stat-fill ${statLevel(value)}`}
                  style={{ width: `${Math.min(100, (value / MAX_STAT) * 100)}%` }}
                />
              </span>
            </td>
          </tr>
        ))}
        <tr className="stat-total">
          <th scope="row">Total</th>
          <td className="stat-value">{total}</td>
          <td aria-hidden="true" />
        </tr>
      </tbody>
    </table>
  );
}

function DetailsBody({ details }: { details: PokemonDetails }) {
  return (
    <>
      {details.flavorText && <p className="details-flavor">{details.flavorText}</p>}

      <dl className="details-facts">
        <div>
          <dt>Altura</dt>
          <dd>{decimal.format(details.height / 10)} m</dd>
        </div>
        <div>
          <dt>Peso</dt>
          <dd>{decimal.format(details.weight / 10)} kg</dd>
        </div>
        <div className="details-abilities">
          <dt>Habilidades</dt>
          <dd>
            <ul>
              {details.abilities.map(({ name, hidden }) => (
                <li key={name}>
                  {formatName(name)}
                  {hidden && <span className="ability-hidden"> (oculta)</span>}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      <h3 className="details-subheading">Status base</h3>
      <Stats stats={details.stats} />
    </>
  );
}

export function PokemonDetailsModal({ pokemon, onClose }: PokemonDetailsModalProps) {
  const { details, retry } = usePokemonDetails(pokemon.id);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Só fecha se o clique começou no fundo: arrastar uma seleção para fora não conta.
  const pressedBackdrop = useRef(false);
  // Em ref para o efeito abaixo rodar só ao abrir e fechar, não a cada render do pai.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const name = formatName(pokemon.name);
  const primaryType = pokemon.types[0];
  const artwork = details.status === 'success' ? details.details.artwork : null;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow, paddingRight } = document.body.style;
    // Compensa a barra de rolagem que some, para o conteúdo do fundo não pular.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previousFocus?.focus();
    };
  }, []);

  // Mantém o Tab dentro do modal.
  function handleTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleBackdropDown(event: MouseEvent<HTMLDivElement>) {
    pressedBackdrop.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (pressedBackdrop.current && event.target === event.currentTarget) onClose();
    pressedBackdrop.current = false;
  }

  return (
    <div className="modal-backdrop" onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={`modal details${primaryType ? ` type-${primaryType}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={details.status === 'loading'}
        onKeyDown={handleTab}
      >
        <button
          ref={closeRef}
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Fechar detalhes"
          title="Fechar"
        >
          ×
        </button>

        <header className="details-header">
          <div className={artwork ? 'details-art has-artwork' : 'details-art'}>
            {/* A `key` reinicia o estado de imagem quebrada quando a arte oficial chega. */}
            <PokemonSprite
              key={artwork ?? 'sprite'}
              pokemon={artwork ? { ...pokemon, sprite: artwork } : pokemon}
              size={artwork ? 168 : 120}
            />
          </div>
          <div className="details-title">
            <p className="slot-number">#{String(pokemon.id).padStart(3, '0')}</p>
            <h2 id={titleId}>{name}</h2>
            {details.status === 'success' && details.details.genus && (
              <p className="details-genus">{details.details.genus}</p>
            )}
            <div className="slot-types">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          </div>
        </header>

        <div className="details-content">
          {details.status === 'loading' && (
            <div className="details-loading" role="status">
              <span className="visually-hidden">Carregando detalhes de {name}…</span>
              <span className="skeleton skeleton-line" aria-hidden="true" />
              <span className="skeleton skeleton-line skeleton-short" aria-hidden="true" />
              <span className="skeleton skeleton-block" aria-hidden="true" />
            </div>
          )}
          {details.status === 'error' && (
            <p className="panel-message status-error" role="alert">
              {failureMessage(details.failure)}
              {details.failure !== 'not-found' && (
                <button type="button" className="button-link" onClick={retry}>
                  Tentar de novo
                </button>
              )}
            </p>
          )}
          {details.status === 'success' && <DetailsBody details={details.details} />}
        </div>
      </div>
    </div>
  );
}
