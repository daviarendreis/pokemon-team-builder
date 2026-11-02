/**
 * Link de compartilhamento: o time vai no fragmento da URL como números da Pokédex,
 * na ordem dos slots, ex.: `#team=6,130,,25` (o slot 3 está vazio).
 *
 * O fragmento não chega ao servidor, então funciona num site estático (GitHub Pages)
 * em qualquer subcaminho.
 */
export const SHARE_PARAM = 'team';

/** Acima disso não existe Pokémon na PokéAPI; evita pedidos absurdos. */
const MAX_ID = 99_999;

interface HasId {
  id: number;
}

/** `[charizard, null, pikachu, null…]` → `team=6,,25`. Devolve `null` se o time está vazio. */
export function encodeTeamParam(slots: readonly (HasId | null)[]): string | null {
  const ids = slots.map((slot) => (slot ? String(slot.id) : ''));
  while (ids.length > 0 && ids.at(-1) === '') ids.pop();
  return ids.length === 0 ? null : `${SHARE_PARAM}=${ids.join(',')}`;
}

/** Troca o fragmento de `href` pelo do time. */
export function buildShareUrl(href: string, slots: readonly (HasId | null)[]): string | null {
  const param = encodeTeamParam(slots);
  if (!param) return null;
  const base = href.split('#')[0];
  return `${base}#${param}`;
}

function parseId(token: string): number | null {
  const trimmed = token.trim();
  if (!/^\d{1,5}$/.test(trimmed)) return null;
  const id = Number(trimmed);
  return id >= 1 && id <= MAX_ID ? id : null;
}

/**
 * Lê o time de um fragmento (`#team=…`, com ou sem `#`). Devolve `null` se o
 * fragmento não for de um time. Números inválidos ou repetidos viram slots vazios,
 * para não deslocar os outros; só os `teamSize` primeiros contam.
 */
export function parseTeamHash(hash: string, teamSize: number): (number | null)[] | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  let value: string | null;
  try {
    value = new URLSearchParams(fragment).get(SHARE_PARAM);
  } catch {
    return null;
  }
  if (value === null) return null;

  const seen = new Set<number>();
  const ids = value
    .split(',')
    .slice(0, teamSize)
    .map((token) => {
      const id = parseId(token);
      if (id === null || seen.has(id)) return null;
      seen.add(id);
      return id;
    });
  while (ids.length > 0 && ids.at(-1) === null) ids.pop();
  return ids;
}

/** `true` se sobrou algum número válido para buscar. */
export function hasSharedIds(ids: readonly (number | null)[] | null): ids is (number | null)[] {
  return ids !== null && ids.some((id) => id !== null);
}
