import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { formatName, normalizeQuery } from '../domain/pokemon';
import type { NamesState } from '../hooks/usePokemonNames';
import type { SearchFailure, SearchState } from '../hooks/useTeam';
import { ResultSprite } from './ResultSprite';

const MAX_SUGGESTIONS = 8;

interface SearchBarProps {
  names: NamesState;
  search: SearchState;
  teamIsFull: boolean;
  onSearch: (query: string) => Promise<boolean>;
  onRetryNames: () => void;
}

function suggestionsFor(query: string, names: NamesState): string[] {
  if (!query || names.status !== 'success') return [];

  const prefix = names.names.filter((name) => name.startsWith(query));
  if (prefix.length >= MAX_SUGGESTIONS) return prefix.slice(0, MAX_SUGGESTIONS);

  const partial = names.names.filter((name) => name.includes(query) && !name.startsWith(query));
  return [...prefix, ...partial].slice(0, MAX_SUGGESTIONS);
}

function failureMessage(query: string, failure: SearchFailure): string {
  const name = formatName(query);
  switch (failure) {
    case 'not-found':
      return `Nenhum Pokémon encontrado para “${query}”. Confira o nome e tente de novo.`;
    case 'duplicate':
      return `${name} já está no time.`;
    case 'team-full':
      return 'O time já tem 6 Pokémon. Remova um para adicionar outro.';
    case 'timeout':
      return 'A PokéAPI demorou demais para responder.';
    case 'network':
      return 'Não foi possível conectar à PokéAPI. Verifique sua internet.';
    case 'server':
      return 'A PokéAPI está com problemas no momento.';
  }
}

function canRetry(failure: SearchFailure): boolean {
  return failure === 'timeout' || failure === 'network' || failure === 'server';
}

export function SearchBar({ names, search, teamIsFull, onSearch, onRetryNames }: SearchBarProps) {
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const listId = useId();

  const query = normalizeQuery(text);
  const suggestions = useMemo(() => suggestionsFor(query, names), [query, names]);
  const showList = isOpen && suggestions.length > 0;

  function changeText(value: string) {
    setText(value);
    setIsOpen(true);
    setHighlighted(-1);
  }

  async function submit(target: string) {
    const typed = text;
    setIsOpen(false);
    setHighlighted(-1);
    const added = await onSearch(target);
    if (added) setText((current) => (current === typed ? '' : current));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!query || teamIsFull) return;

    // Alguns nomes da API não são óbvios (`deoxys` é `deoxys-normal`), então
    // sem escolha explícita vale a melhor sugestão, se houver.
    const exact = suggestions.includes(query) ? query : undefined;
    void submit(suggestions[highlighted] ?? exact ?? suggestions[0] ?? query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setHighlighted(-1);
      return;
    }
    if (suggestions.length === 0) return;

    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step !== 0) {
      event.preventDefault();
      setIsOpen(true);
      setHighlighted((current) =>
        current === -1 && step === -1
          ? suggestions.length - 1
          : (current + step + suggestions.length) % suggestions.length,
      );
    }
  }

  return (
    <section className="search" aria-label="Buscar Pokémon">
      <form className="search-form" onSubmit={handleSubmit} role="search">
        <label className="search-label" htmlFor="pokemon-search">
          Buscar Pokémon
        </label>
        <div className="search-row">
          <div className="search-field">
            <input
              id="pokemon-search"
              type="text"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={highlighted >= 0 ? `${listId}-${highlighted}` : undefined}
              autoComplete="off"
              spellCheck={false}
              placeholder={teamIsFull ? 'Time completo' : 'Ex.: pikachu ou 25'}
              value={text}
              disabled={teamIsFull}
              onChange={(event) => changeText(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setIsOpen(false)}
            />
            <ul id={listId} role="listbox" className="suggestions" hidden={!showList}>
              {suggestions.map((name, index) => (
                <li
                  key={name}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === highlighted}
                  className={index === highlighted ? 'is-highlighted' : undefined}
                  // Sem isto, o blur do campo fecharia a lista antes do clique.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void submit(name)}
                >
                  <span className="suggestion-item">
                    <ResultSprite
                      id={names.status === 'success' ? names.ids.get(name) : undefined}
                      label={formatName(name)}
                    />
                    <span>{formatName(name)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {/* Fica ativo ao carregar: botão desabilitado faria o navegador ignorar o Enter. */}
          <button type="submit" className="button-primary" disabled={!query || teamIsFull}>
            {search.status === 'loading' ? 'Buscando…' : 'Adicionar'}
          </button>
        </div>
      </form>

      <div className="search-status" aria-live="polite">
        {search.status === 'loading' && <p className="status">Buscando {formatName(search.query)}…</p>}
        {search.status === 'success' && (
          <p className="status status-success">{formatName(search.pokemon.name)} entrou no time.</p>
        )}
        {search.status === 'error' && (
          <p className="status status-error" role="alert">
            {failureMessage(search.query, search.failure)}
            {canRetry(search.failure) && (
              <button type="button" className="button-link" onClick={() => void submit(search.query)}>
                Tentar de novo
              </button>
            )}
          </p>
        )}
        {teamIsFull && search.status !== 'error' && (
          <p className="status">Time completo. Remova um Pokémon para adicionar outro.</p>
        )}
        {names.status === 'error' && (
          <p className="status status-warning">
            Sugestões indisponíveis: busque pelo nome exato ou pelo número.
            <button type="button" className="button-link" onClick={onRetryNames}>
              Carregar sugestões
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
