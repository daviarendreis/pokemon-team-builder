import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbort } from '../api/pokeapi';
import { lookupPokemon } from '../api/teamLookup';
import { hasSharedIds, parseTeamHash } from '../domain/shareLink';
import { placeResults, planTextImport } from '../domain/teamImport';
import { TEAM_SIZE, type Slot } from './useTeam';

export type ImportSource = 'link' | 'text';

export type ImportState =
  | { status: 'idle' }
  | { status: 'loading'; source: ImportSource; count: number }
  | {
      status: 'done';
      source: ImportSource;
      loaded: number;
      notFound: string[];
      /** Repetidos ou além dos 6. */
      skipped: string[];
      /** Time que foi substituído, para desfazer. `null` se o time estava vazio. */
      previous: Slot[] | null;
    }
  | { status: 'empty'; source: ImportSource }
  | { status: 'error'; source: ImportSource }
  | { status: 'restored'; source: ImportSource };

/** Tira o `#team=…` da barra de endereço sem recarregar nem criar entrada no histórico. */
function clearShareHash() {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname}${search}`);
}

/**
 * Importa times de um link compartilhado (`#team=…`) ou de texto do Showdown.
 * O time importado substitui o atual; se havia um time, dá para desfazer.
 */
export function useTeamImport(slots: Slot[], load: (slots: Slot[]) => void) {
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);
  const inFlight = useRef<AbortController | null>(null);
  const lastAttempt = useRef<(() => void) | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const run = useCallback(
    async (
      source: ImportSource,
      queries: (string | null)[],
      keepPositions: boolean,
      extraSkipped: string[],
      labelOf: (query: string) => string,
    ) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      const wanted = queries.filter((query): query is string => query !== null);
      setState({ status: 'loading', source, count: wanted.length });

      try {
        const found = new Map(
          (await lookupPokemon(wanted, controller.signal)).map((result) => [result.query, result]),
        );
        const placed = placeResults(
          queries.map((query) => (query === null ? null : found.get(query) ?? null)),
          TEAM_SIZE,
          keepPositions,
        );
        if (source === 'link') clearShareHash();

        const loaded = placed.slots.filter((slot) => slot !== null).length;
        const notFound = placed.notFound.map(labelOf);
        const skipped = [...placed.duplicates.map(labelOf), ...extraSkipped];
        if (loaded === 0) {
          setState({ status: 'done', source, loaded, notFound, skipped, previous: null });
          return;
        }
        const current = slotsRef.current;
        const previous = current.some((slot) => slot !== null) ? [...current] : null;
        load(placed.slots);
        setState({ status: 'done', source, loaded, notFound, skipped, previous });
      } catch (error) {
        if (isAbort(error)) return;
        // O `#team=…` fica na URL: recarregar a página também tenta de novo.
        setState({ status: 'error', source });
      }
    },
    [load],
  );

  const importIds = useCallback(
    (ids: (number | null)[]) => {
      const attempt = () =>
        void run('link', ids.map((id) => (id === null ? null : String(id))), true, [], (q) => `nº ${q}`);
      lastAttempt.current = attempt;
      attempt();
    },
    [run],
  );

  /** Lê o `#team=…` da URL atual, se houver. */
  const importFromHash = useCallback(() => {
    const ids = parseTeamHash(window.location.hash, TEAM_SIZE);
    if (ids === null) return;
    if (!hasSharedIds(ids)) {
      clearShareHash();
      setState({ status: 'empty', source: 'link' });
      return;
    }
    importIds(ids);
  }, [importIds]);

  useEffect(() => {
    importFromHash();
    // Colar outro link na mesma aba só muda o fragmento, sem recarregar.
    window.addEventListener('hashchange', importFromHash);
    return () => window.removeEventListener('hashchange', importFromHash);
  }, [importFromHash]);

  /** Devolve `false` se o texto não tem nenhuma espécie reconhecível. */
  const importText = useCallback(
    (text: string): boolean => {
      const plan = planTextImport(text, TEAM_SIZE);
      if (plan.queries.length === 0) {
        setState({ status: 'empty', source: 'text' });
        return false;
      }
      const attempt = () =>
        void run('text', plan.queries, false, plan.overflow, (q) => plan.labels.get(q) ?? q);
      lastAttempt.current = attempt;
      attempt();
      return true;
    },
    [run],
  );

  const retry = useCallback(() => lastAttempt.current?.(), []);

  const undo = useCallback(() => {
    if (state.status !== 'done' || !state.previous) return;
    inFlight.current?.abort();
    load(state.previous);
    setState({ status: 'restored', source: state.source });
  }, [load, state]);

  const dismiss = useCallback(() => setState({ status: 'idle' }), []);

  return { state, importText, retry, undo, dismiss };
}
