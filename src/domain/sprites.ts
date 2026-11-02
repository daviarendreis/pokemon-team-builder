const SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/**
 * A lista de Pokémon da PokéAPI só traz nome e URL, mas o número está na URL
 * (`…/pokemon/25/`). Com ele dá para montar o endereço do sprite sem uma
 * requisição extra por resultado.
 */
export function idFromResourceUrl(url: string): number | null {
  const match = /\/pokemon\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

/** Endereço previsível do sprite frontal no repositório de sprites da PokéAPI. */
export function spriteUrlForId(id: number): string {
  return `${SPRITE_BASE_URL}/${id}.png`;
}
