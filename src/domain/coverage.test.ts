import { describe, expect, it } from 'vitest';
import { analyzeCoverage, attackMultiplier, type AttackRelationsByType } from './coverage';
import type { Pokemon, PokemonType } from './pokemon';

// Recorte da tabela de tipos real (lado do ataque), com os valores retornados pela PokéAPI.
const relations: AttackRelationsByType = {
  fire: {
    doubleTo: ['grass', 'ice', 'bug', 'steel'],
    halfTo: ['fire', 'water', 'rock', 'dragon'],
    noneTo: [],
  },
  flying: {
    doubleTo: ['fighting', 'bug', 'grass'],
    halfTo: ['electric', 'rock', 'steel'],
    noneTo: [],
  },
  electric: {
    doubleTo: ['water', 'flying'],
    halfTo: ['electric', 'grass', 'dragon'],
    noneTo: ['ground'],
  },
  normal: {
    doubleTo: [],
    halfTo: ['rock', 'steel'],
    noneTo: ['ghost'],
  },
};

function pokemon(id: number, name: string, ...types: PokemonType[]): Pokemon {
  return { id, name, sprite: null, types };
}

const charizard = pokemon(6, 'charizard', 'fire', 'flying');
const pikachu = pokemon(25, 'pikachu', 'electric');
const snorlax = pokemon(143, 'snorlax', 'normal');

function entry(team: Pokemon[], type: PokemonType) {
  return analyzeCoverage(team, relations).coverage.find((coverage) => coverage.type === type);
}

describe('attackMultiplier', () => {
  it('lê o lado do ataque das relações', () => {
    expect(attackMultiplier('fire', 'grass', relations)).toBe(2);
    expect(attackMultiplier('fire', 'water', relations)).toBe(0.5);
    expect(attackMultiplier('electric', 'ground', relations)).toBe(0);
    expect(attackMultiplier('fire', 'normal', relations)).toBe(1);
  });

  it('acusa quando faltam as relações do tipo de ataque', () => {
    expect(() => attackMultiplier('water', 'fire', relations)).toThrow(/water/);
  });
});

describe('analyzeCoverage', () => {
  it('fica com o melhor multiplicador do time e com quem o alcança', () => {
    expect(entry([charizard, pikachu], 'water')).toEqual({
      type: 'water',
      multiplier: 2,
      providers: [{ pokemon: pikachu, attackTypes: ['electric'] }],
    });
  });

  it('lista os dois tipos de um Pokémon quando ambos empatam', () => {
    expect(entry([charizard, pikachu], 'grass')?.providers).toEqual([
      { pokemon: charizard, attackTypes: ['fire', 'flying'] },
    ]);
  });

  it('usa o tipo neutro quando o outro tipo do Pokémon é resistido', () => {
    expect(entry([charizard, pikachu], 'dragon')).toEqual({
      type: 'dragon',
      multiplier: 1,
      providers: [{ pokemon: charizard, attackTypes: ['flying'] }],
    });
  });

  it('ignora quem não causa dano e marca ×0 quando ninguém causa', () => {
    expect(entry([charizard, pikachu], 'ground')?.providers.map((p) => p.pokemon)).toEqual([
      charizard,
    ]);
    expect(entry([snorlax], 'ghost')).toEqual({ type: 'ghost', multiplier: 0, providers: [] });
  });

  it('separa os tipos super efetivos das lacunas', () => {
    const { superEffective, gaps } = analyzeCoverage([charizard, pikachu], relations);

    expect(superEffective).toEqual(['water', 'grass', 'ice', 'fighting', 'flying', 'bug', 'steel']);
    expect(gaps).toHaveLength(18 - superEffective.length);
    expect(gaps.every((gap) => gap.multiplier <= 1)).toBe(true);
  });

  it('ordena as lacunas do pior multiplicador para o melhor, antes dos tipos cobertos', () => {
    const order = analyzeCoverage([snorlax], relations).coverage.map((coverage) => coverage.type);
    expect(order.slice(0, 3)).toEqual(['ghost', 'rock', 'steel']);
    expect(order).toHaveLength(18);
  });

  it('coloca primeiro os tipos cobertos por menos membros', () => {
    const team = [charizard, pikachu, pokemon(18, 'pidgeot', 'normal', 'flying')];
    const covered = analyzeCoverage(team, relations).coverage.filter((c) => c.multiplier > 1);

    expect(covered.map((c) => c.type)).toEqual([
      'water',
      'ice',
      'flying',
      'steel',
      'grass',
      'fighting',
      'bug',
    ]);
    expect(covered.map((c) => c.providers.length)).toEqual([1, 1, 1, 1, 2, 2, 2]);
  });

  it('com o time vazio, nada é coberto', () => {
    const { superEffective, gaps } = analyzeCoverage([], relations);
    expect(superEffective).toEqual([]);
    expect(gaps).toHaveLength(18);
  });
});
