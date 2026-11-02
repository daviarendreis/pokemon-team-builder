import { describe, expect, it } from 'vitest';
import type { Pokemon, PokemonType } from './pokemon';
import { analyzeTeam, damageMultiplier, type RelationsByType } from './weakness';

// Recorte da tabela de tipos real, com os valores retornados pela PokéAPI.
const relations: RelationsByType = {
  fire: {
    doubleFrom: ['ground', 'rock', 'water'],
    halfFrom: ['bug', 'steel', 'fire', 'grass', 'ice', 'fairy'],
    noneFrom: [],
  },
  flying: {
    doubleFrom: ['rock', 'electric', 'ice'],
    halfFrom: ['fighting', 'bug', 'grass'],
    noneFrom: ['ground'],
  },
  water: {
    doubleFrom: ['grass', 'electric'],
    halfFrom: ['steel', 'fire', 'water', 'ice'],
    noneFrom: [],
  },
  electric: {
    doubleFrom: ['ground'],
    halfFrom: ['flying', 'steel', 'electric'],
    noneFrom: [],
  },
  ghost: {
    doubleFrom: ['ghost', 'dark'],
    halfFrom: ['poison', 'bug'],
    noneFrom: ['normal', 'fighting'],
  },
  poison: {
    doubleFrom: ['ground', 'psychic'],
    halfFrom: ['fighting', 'poison', 'bug', 'grass', 'fairy'],
    noneFrom: [],
  },
};

function pokemon(id: number, name: string, ...types: PokemonType[]): Pokemon {
  return { id, name, sprite: null, types };
}

const charizard = pokemon(6, 'charizard', 'fire', 'flying');
const gyarados = pokemon(130, 'gyarados', 'water', 'flying');
const pikachu = pokemon(25, 'pikachu', 'electric');
const gengar = pokemon(94, 'gengar', 'ghost', 'poison');

function threat(team: Pokemon[], type: PokemonType) {
  const found = analyzeTeam(team, relations).threats.find((item) => item.type === type);
  if (!found) throw new Error(`tipo ${type} ausente`);
  return found;
}

describe('damageMultiplier', () => {
  it('multiplica as fraquezas dos dois tipos', () => {
    expect(damageMultiplier('rock', charizard.types, relations)).toBe(4);
    expect(damageMultiplier('electric', gyarados.types, relations)).toBe(4);
  });

  it('cancela fraqueza com resistência', () => {
    expect(damageMultiplier('ice', charizard.types, relations)).toBe(1);
  });

  it('acumula resistências', () => {
    expect(damageMultiplier('bug', charizard.types, relations)).toBe(0.25);
  });

  it('imunidade anula uma fraqueza do outro tipo', () => {
    expect(damageMultiplier('ground', charizard.types, relations)).toBe(0);
  });

  it('calcula Pokémon de um tipo só', () => {
    expect(damageMultiplier('ground', pikachu.types, relations)).toBe(2);
  });

  it('falha de forma explícita se a relação não foi carregada', () => {
    expect(() => damageMultiplier('fire', ['grass'], relations)).toThrow(/grass/);
  });
});

describe('analyzeTeam', () => {
  it('conta quantos Pokémon são fracos a cada tipo', () => {
    const team = [charizard, gyarados, pikachu];

    expect(threat(team, 'electric').weak.map((m) => m.pokemon.name)).toEqual([
      'gyarados',
      'charizard',
    ]);
    expect(threat(team, 'ground').weak.map((m) => m.pokemon.name)).toEqual(['pikachu']);
    expect(threat(team, 'fighting').weak).toEqual([]);
  });

  it('um Pokémon com fraqueza ×4 conta como um só', () => {
    expect(threat([charizard], 'rock').weak).toEqual([{ pokemon: charizard, multiplier: 4 }]);
  });

  it('separa resistentes, imunes e neutros', () => {
    const team = [charizard, gyarados, pikachu, gengar];
    const ground = threat(team, 'ground');

    expect(ground.weak.map((m) => m.pokemon.name)).toEqual(['pikachu', 'gengar']);
    expect(ground.immune.map((m) => m.pokemon.name)).toEqual(['charizard', 'gyarados']);
    expect(threat(team, 'bug').resistant.map((m) => m.pokemon.name)).toEqual([
      'charizard',
      'gyarados',
      'gengar',
    ]);
  });

  it('lista os tipos contra os quais o time inteiro é fraco', () => {
    expect(analyzeTeam([charizard, gyarados], relations).teamWideWeaknesses).toEqual([
      'electric',
      'rock',
    ]);
  });

  it('não aponta fraqueza geral quando alguém do time não é fraco', () => {
    expect(analyzeTeam([charizard, pikachu], relations).teamWideWeaknesses).toEqual([]);
  });

  it('ordena pelos tipos com mais Pokémon fracos', () => {
    const { threats } = analyzeTeam([charizard, gyarados, pikachu], relations);

    expect(threats).toHaveLength(18);
    expect(threats[0]?.weak).toHaveLength(2);
    expect(threats[0]?.type).toBe('rock');
  });

  it('time vazio não tem fraquezas', () => {
    const { threats, teamWideWeaknesses } = analyzeTeam([], relations);

    expect(teamWideWeaknesses).toEqual([]);
    expect(threats.every((item) => item.weak.length === 0)).toBe(true);
  });
});
