import { toBaseStats, type BaseStats } from '../domain/teamStats';
import { fetchPokemonDetails } from './pokeapi';

// Reaproveita a busca de detalhes do modal (e o cache dela), para abrir os
// detalhes de um membro do time não precisar de outra requisição. Aqui ficam
// as promessas, para que vários pedidos do mesmo Pokémon ao mesmo tempo virem
// uma requisição só.
const pending = new Map<number, Promise<BaseStats>>();

/** Status base de um Pokémon. Sem `signal`: a promessa é compartilhada entre quem pedir. */
export function fetchBaseStats(id: number): Promise<BaseStats> {
  const cached = pending.get(id);
  if (cached) return cached;

  const request = fetchPokemonDetails(id).then((details) => toBaseStats(details.stats));
  pending.set(id, request);
  request.catch(() => pending.delete(id)); // falhas não ficam em cache: permite tentar de novo
  return request;
}
