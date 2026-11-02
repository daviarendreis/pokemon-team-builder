import { describe, expect, it } from 'vitest';
import { buildShareUrl, encodeTeamParam, hasSharedIds, parseTeamHash } from './shareLink';

const p = (id: number) => ({ id });

describe('encodeTeamParam', () => {
  it('lista os números na ordem dos slots, mantendo os vazios no meio', () => {
    expect(encodeTeamParam([p(6), null, p(25), null, null, null])).toBe('team=6,,25');
  });

  it('devolve null para time vazio', () => {
    expect(encodeTeamParam([null, null, null])).toBeNull();
  });
});

describe('buildShareUrl', () => {
  it('troca o fragmento e mantém o subcaminho', () => {
    expect(buildShareUrl('https://x.github.io/repo/?a=1#old', [p(1), p(4)])).toBe(
      'https://x.github.io/repo/?a=1#team=1,4',
    );
  });

  it('devolve null para time vazio', () => {
    expect(buildShareUrl('https://x/', [null])).toBeNull();
  });
});

describe('parseTeamHash', () => {
  it('faz o caminho de volta do encode', () => {
    const slots = [null, p(130), p(6), null, p(445), null];
    const hash = `#${encodeTeamParam(slots)}`;
    expect(parseTeamHash(hash, 6)).toEqual([null, 130, 6, null, 445]);
  });

  it('aceita sem #', () => {
    expect(parseTeamHash('team=25', 6)).toEqual([25]);
  });

  it('ignora fragmentos que não são de time', () => {
    expect(parseTeamHash('', 6)).toBeNull();
    expect(parseTeamHash('#secao', 6)).toBeNull();
    expect(parseTeamHash('#foo=1', 6)).toBeNull();
  });

  it('números inválidos ou repetidos viram slots vazios', () => {
    expect(parseTeamHash('#team=6,abc,0,-3,6,25', 6)).toEqual([6, null, null, null, null, 25]);
    expect(parseTeamHash('#team=6,1.5,25', 6)).toEqual([6, null, 25]);
    expect(parseTeamHash('#team=x,25,999999', 6)).toEqual([null, 25]);
  });

  it('limita a 6 posições', () => {
    expect(parseTeamHash('#team=1,2,3,4,5,6,7,8', 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('aceita espaços em volta dos números', () => {
    expect(parseTeamHash('#team=%201%20,%202', 6)).toEqual([1, 2]);
  });
});

describe('hasSharedIds', () => {
  it('só é verdadeiro com algum número válido', () => {
    expect(hasSharedIds(null)).toBe(false);
    expect(hasSharedIds([])).toBe(false);
    expect(hasSharedIds([null])).toBe(false);
    expect(hasSharedIds([null, 3])).toBe(true);
  });
});
