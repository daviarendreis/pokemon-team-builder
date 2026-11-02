import { useId, useState, type FormEvent } from 'react';
import { formatName } from '../domain/pokemon';
import { MAX_NAME_LENGTH, normalizeTeamName, sameTeamName, type SavedTeam } from '../domain/savedTeams';
import type { Slot } from '../hooks/useTeam';
import { PokemonSprite } from './PokemonSprite';
import './SavedTeams.css';

interface SavedTeamsProps {
  slots: Slot[];
  teams: SavedTeam[];
  /** `false` quando o navegador não deixa usar o `localStorage`. */
  available: boolean;
  onSave: (name: string, slots: Slot[]) => boolean;
  onLoad: (team: SavedTeam) => void;
  onDelete: (name: string) => boolean;
}

type Feedback = { kind: 'success' | 'error'; text: string } | null;

const WRITE_ERROR = 'Não foi possível salvar no navegador. Verifique se há espaço disponível.';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function formatSavedAt(savedAt: string): string {
  return dateFormat.format(new Date(savedAt));
}

export function SavedTeams({ slots, teams, available, onSave, onLoad, onDelete }: SavedTeamsProps) {
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [overwriting, setOverwriting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputId = useId();

  const teamIsEmpty = slots.every((slot) => slot === null);
  const trimmed = normalizeTeamName(name);
  const canSave = available && !teamIsEmpty && trimmed !== '';

  function save(teamName: string) {
    setOverwriting(null);
    if (onSave(teamName, slots)) {
      setFeedback({ kind: 'success', text: `Time “${teamName}” salvo.` });
    } else {
      setFeedback({ kind: 'error', text: WRITE_ERROR });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    const existing = teams.find((team) => sameTeamName(team.name, trimmed));
    if (existing) {
      setFeedback(null);
      setOverwriting(existing.name);
      return;
    }
    save(trimmed);
  }

  function load(team: SavedTeam) {
    onLoad(team);
    setName(team.name);
    setOverwriting(null);
    setDeleting(null);
    setFeedback({ kind: 'success', text: `Time “${team.name}” carregado.` });
  }

  function confirmDelete(teamName: string) {
    setDeleting(null);
    if (onDelete(teamName)) {
      setFeedback({ kind: 'success', text: `Time “${teamName}” excluído.` });
    } else {
      setFeedback({ kind: 'error', text: 'Não foi possível excluir o time do navegador.' });
    }
  }

  return (
    <section aria-labelledby="saved-heading">
      <div className="section-heading">
        <h2 id="saved-heading">Times salvos</h2>
        {teams.length > 0 && <span className="counter">{teams.length}</span>}
      </div>

      {!available ? (
        <p className="panel-message">
          Este navegador não permite guardar dados (talvez esteja em modo privado), então não dá para
          salvar times.
        </p>
      ) : (
        <>
          <form className="save-form" onSubmit={submit}>
            <label className="search-label" htmlFor={inputId}>
              Nome do time
            </label>
            <div className="search-row">
              <div className="search-field">
                <input
                  id={inputId}
                  type="text"
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={teamIsEmpty ? 'Adicione um Pokémon para salvar' : 'Ex.: Time da Liga'}
                  disabled={teamIsEmpty}
                  autoComplete="off"
                  onChange={(event) => {
                    setName(event.target.value);
                    setOverwriting(null);
                  }}
                />
              </div>
              <button type="submit" className="button-primary" disabled={!canSave}>
                Salvar
              </button>
            </div>
          </form>

          <div className="search-status" aria-live="polite">
            {overwriting ? (
              <p className="status-warning">
                Já existe um time chamado “{overwriting}”. Substituir?
                <button type="button" className="button-link" onClick={() => save(overwriting)}>
                  Substituir
                </button>
                <button type="button" className="button-link" onClick={() => setOverwriting(null)}>
                  Cancelar
                </button>
              </p>
            ) : (
              feedback && <p className={`status-${feedback.kind}`}>{feedback.text}</p>
            )}
          </div>

          {teams.length === 0 ? (
            <p className="panel-message">Nenhum time salvo ainda. Monte um time, dê um nome e salve.</p>
          ) : (
            <ul className="saved-teams">
              {teams.map((team) => {
                const members = team.slots.filter((slot) => slot !== null);
                return (
                  <li key={team.name} className="saved-team">
                    <div className="saved-team-info">
                      <h3 className="saved-team-name">{team.name}</h3>
                      <p className="saved-team-meta">
                        {members.length} Pokémon · salvo em {formatSavedAt(team.savedAt)}
                      </p>
                      <ul
                        className="saved-team-sprites"
                        aria-label={members.map((pokemon) => formatName(pokemon.name)).join(', ')}
                      >
                        {members.map((pokemon) => (
                          <li key={pokemon.id} aria-hidden="true">
                            <PokemonSprite pokemon={pokemon} size={48} />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="saved-team-actions">
                      {deleting === team.name ? (
                        <>
                          <span className="saved-team-confirm">Excluir?</span>
                          <button
                            type="button"
                            className="button-secondary button-danger"
                            onClick={() => confirmDelete(team.name)}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setDeleting(null)}
                          >
                            Não
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => load(team)}
                            aria-label={`Carregar o time ${team.name}`}
                          >
                            Carregar
                          </button>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setDeleting(team.name)}
                            aria-label={`Excluir o time ${team.name}`}
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
