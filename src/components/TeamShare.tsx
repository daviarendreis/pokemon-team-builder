import { useId, useMemo, useState, type FormEvent } from 'react';
import { buildShareUrl } from '../domain/shareLink';
import { exportShowdown } from '../domain/showdown';
import type { ImportSource, ImportState } from '../hooks/useTeamImport';
import type { Slot } from '../hooks/useTeam';
import './TeamShare.css';

export interface TeamImportControls {
  state: ImportState;
  importText: (text: string) => boolean;
  retry: () => void;
  undo: () => void;
  dismiss: () => void;
}

type Panel = 'link' | 'export' | 'import' | null;
type Feedback = { kind: 'success' | 'error'; text: string } | null;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function list(items: string[]): string {
  return items.join(', ');
}

/** Mensagem do estado da importação, com os botões de ação. `null` se não há nada a dizer. */
function ImportMessage({ controls, source }: { controls: TeamImportControls; source: ImportSource }) {
  const { state, retry, undo, dismiss } = controls;
  if (state.status === 'idle' || state.source !== source) return null;
  const what = source === 'link' ? 'o time compartilhado' : 'o time do texto';

  if (state.status === 'loading') {
    return (
      <p className="status">
        Carregando {what} ({state.count} Pokémon)…
      </p>
    );
  }
  const close = (
    <button type="button" className="button-link" onClick={dismiss}>
      Fechar
    </button>
  );
  if (state.status === 'error') {
    return (
      <p className="status-error">
        Não foi possível carregar {what}. Verifique sua conexão.
        <button type="button" className="button-link" onClick={retry}>
          Tentar de novo
        </button>
        {close}
      </p>
    );
  }
  if (state.status === 'empty') {
    return (
      <p className="status-error">
        {source === 'link'
          ? 'O link não tem nenhum Pokémon válido.'
          : 'Não encontramos nenhum Pokémon no texto. Cole um time exportado do Showdown.'}
        {close}
      </p>
    );
  }
  if (state.status === 'restored') {
    return (
      <p className="status-success">
        Seu time anterior foi restaurado.
        {close}
      </p>
    );
  }

  const { loaded, notFound, skipped, previous } = state;
  if (loaded === 0) {
    return (
      <p className="status-error">
        Nenhum Pokémon foi encontrado{notFound.length > 0 && ` (${list(notFound)})`}. Seu time não mudou.
        {close}
      </p>
    );
  }
  return (
    <p className={notFound.length > 0 ? 'status-warning' : 'status-success'}>
      {source === 'link' ? 'Time compartilhado carregado' : 'Time importado'}: {loaded} Pokémon.
      {previous && ' Ele substituiu o time que você estava montando.'}
      {notFound.length > 0 && ` Não encontrados: ${list(notFound)}.`}
      {skipped.length > 0 && ` Ignorados (repetidos ou além de 6): ${list(skipped)}.`}
      {previous && (
        <button type="button" className="button-link" onClick={undo}>
          Desfazer
        </button>
      )}
      {close}
    </p>
  );
}

/** Aviso no topo da página para quem abriu um link compartilhado. */
export function SharedLinkNotice({ controls }: { controls: TeamImportControls }) {
  const active = controls.state.status !== 'idle' && controls.state.source === 'link';
  return (
    <div className="share-notice-region" aria-live="polite">
      {active && (
        <div className="share-notice">
          <ImportMessage controls={controls} source="link" />
        </div>
      )}
    </div>
  );
}

export function TeamShare({ slots, controls }: { slots: Slot[]; controls: TeamImportControls }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const ids = { link: useId(), export: useId(), import: useId() };

  const teamIsEmpty = slots.every((slot) => slot === null);
  const exported = useMemo(
    () => exportShowdown(slots.flatMap((slot) => (slot ? [slot.name] : []))),
    [slots],
  );
  const busy = controls.state.status === 'loading';

  function toggle(next: Exclude<Panel, null>) {
    setFeedback(null);
    setPanel((current) => (current === next ? null : next));
  }

  async function shareLink() {
    const url = buildShareUrl(window.location.href, slots);
    if (!url) return;
    setLink(url);
    setPanel('link');
    const copied = await copyText(url);
    setFeedback(
      copied
        ? { kind: 'success', text: 'Link copiado! Quem abrir verá este time.' }
        : { kind: 'error', text: 'Não deu para copiar automaticamente. Selecione o link abaixo e copie.' },
    );
  }

  async function copyExport() {
    const copied = await copyText(exported);
    setFeedback(
      copied
        ? { kind: 'success', text: 'Texto copiado! Cole no Teambuilder do Showdown (Import from text).' }
        : { kind: 'error', text: 'Não deu para copiar automaticamente. Selecione o texto e copie.' },
    );
  }

  function submitImport(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    if (controls.importText(pasted)) setPasted('');
  }

  return (
    <section aria-labelledby="share-heading">
      <div className="section-heading">
        <h2 id="share-heading">Compartilhar e exportar</h2>
      </div>

      <div className="share-actions">
        <button
          type="button"
          className="button-secondary"
          disabled={teamIsEmpty}
          onClick={shareLink}
          aria-controls={panel === 'link' ? ids.link : undefined}
        >
          Compartilhar link
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={teamIsEmpty}
          aria-expanded={panel === 'export'}
          aria-controls={ids.export}
          onClick={() => toggle('export')}
        >
          Exportar texto
        </button>
        <button
          type="button"
          className="button-secondary"
          aria-expanded={panel === 'import'}
          aria-controls={ids.import}
          onClick={() => toggle('import')}
        >
          Importar texto
        </button>
      </div>
      {teamIsEmpty && panel !== 'import' && (
        <p className="share-hint muted">Adicione Pokémon ao time para compartilhar ou exportar.</p>
      )}

      <div className="search-status" aria-live="polite">
        {feedback && <p className={`status-${feedback.kind}`}>{feedback.text}</p>}
      </div>

      {panel === 'link' && link && !teamIsEmpty && (
        <div className="share-panel" id={ids.link}>
          <label className="search-label" htmlFor={`${ids.link}-field`}>
            Link do time
          </label>
          <input
            id={`${ids.link}-field`}
            className="share-field"
            type="text"
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}

      {panel === 'export' && !teamIsEmpty && (
        <div className="share-panel" id={ids.export}>
          <label className="search-label" htmlFor={`${ids.export}-field`}>
            Time no formato do Showdown
          </label>
          <textarea
            id={`${ids.export}-field`}
            className="share-text"
            readOnly
            rows={Math.min(12, exported.split('\n').length)}
            value={exported}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button type="button" className="button-secondary" onClick={copyExport}>
            Copiar texto
          </button>
        </div>
      )}

      {panel === 'import' && (
        <form className="share-panel" id={ids.import} onSubmit={submitImport}>
          <label className="search-label" htmlFor={`${ids.import}-field`}>
            Cole um time do Showdown
          </label>
          <p className="share-hint muted" id={`${ids.import}-hint`}>
            Só as espécies são usadas; golpes, itens e EVs são ignorados. O time atual será substituído.
          </p>
          <textarea
            id={`${ids.import}-field`}
            className="share-text"
            rows={6}
            value={pasted}
            aria-describedby={`${ids.import}-hint`}
            placeholder={'Pikachu @ Light Ball\nAbility: Static\n- Thunderbolt\n\nGarchomp'}
            onChange={(event) => setPasted(event.target.value)}
          />
          <button type="submit" className="button-primary" disabled={busy || pasted.trim() === ''}>
            {busy ? 'Importando…' : 'Importar'}
          </button>
        </form>
      )}

      <div className="search-status" aria-live="polite">
        <ImportMessage controls={controls} source="text" />
      </div>
    </section>
  );
}
