import { describe, expect, it } from 'vitest';
import type { Pokemon } from './pokemon';
import { placeResults, planTextImport } from './teamImport';

const mon = (id: number, name = `p${id}`): Pokemon => ({ id, name, sprite: null, types: ['normal'] });

describe('planTextImport', () => {
  it('converte para nomes da API, sem repetir e até o limite', () => {
    const text = ['Pikachu', 'Sparky (Pikachu) @ Light Ball', 'Mr. Mime', 'A', 'B', 'C', 'D', 'E', 'F'].join(
      '\n\n',
    );
    const plan = planTextImport(text, 6);
    expect(plan.queries).toEqual(['pikachu', 'mr-mime', 'a', 'b', 'c', 'd']);
    expect(plan.labels.get('mr-mime')).toBe('Mr. Mime');
    expect(plan.overflow).toEqual(['E', 'F']);
  });

  it('texto sem conjuntos não planeja nada', () => {
    expect(planTextImport('   ', 6).queries).toEqual([]);
  });
});

describe('placeResults', () => {
  it('mantém as posições no modo link e lista os não encontrados', () => {
    const placed = placeResults(
      [null, { query: '6', pokemon: mon(6) }, { query: '99999', pokemon: null }, { query: '25', pokemon: mon(25) }],
      6,
      true,
    );
    expect(placed.slots.map((slot) => slot?.id ?? null)).toEqual([null, 6, null, 25, null, null]);
    expect(placed.notFound).toEqual(['99999']);
  });

  it('preenche em sequência no modo texto e descarta repetidos', () => {
    const placed = placeResults(
      [
        { query: 'giratina', pokemon: mon(487) },
        { query: 'nada', pokemon: null },
        { query: 'giratina-altered', pokemon: mon(487) },
        { query: 'mew', pokemon: mon(151) },
      ],
      6,
      false,
    );
    expect(placed.slots.map((slot) => slot?.id ?? null)).toEqual([487, 151, null, null, null, null]);
    expect(placed.notFound).toEqual(['nada']);
    expect(placed.duplicates).toEqual(['giratina-altered']);
  });
});
