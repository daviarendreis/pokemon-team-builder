import { describe, expect, it } from 'vitest';
import { idFromResourceUrl, spriteUrlForId } from './sprites';
import { effectivenessAgainst, typeEffectiveness } from './typeChart';
import { describeSuggestion, suggestNextTypes } from './typeSuggestions';

describe('typeChart', () => {
  it('multiplica os dois tipos e respeita imunidades', () => {
    expect(typeEffectiveness('fire', 'grass')).toBe(2);
    expect(effectivenessAgainst('ice', ['grass', 'ground'])).toBe(4);
    expect(effectivenessAgainst('fire', ['water', 'rock'])).toBe(0.25);
    expect(effectivenessAgainst('electric', ['water', 'ground'])).toBe(0);
    expect(effectivenessAgainst('ground', ['fire', 'flying'])).toBe(0);
    expect(effectivenessAgainst('normal', ['normal'])).toBe(1);
  });
});

describe('suggestNextTypes', () => {
  it('não sugere nada para um time vazio', () => {
    expect(suggestNextTypes([]).suggestions).toEqual([]);
  });

  it('sugere tipos que resistem às fraquezas compartilhadas', () => {
    // Três Pokémon de Planta: fracos a Fogo, Gelo, Voador, Veneno e Inseto.
    const { openWeaknesses, suggestions } = suggestNextTypes([['grass'], ['grass'], ['grass']]);

    expect(openWeaknesses.map((w) => w.type)).toEqual(
      expect.arrayContaining(['fire', 'ice', 'flying', 'poison', 'bug']),
    );
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);

    const best = suggestions[0]!;
    const covered = best.covers.map((c) => c.type);
    expect(covered).toEqual(expect.arrayContaining(['ice', 'bug']));
    expect(suggestions.some((s) => s.covers.some((c) => c.type === 'fire'))).toBe(true);
    expect(best.membersHelped).toBe(3);
    // Nunca sugere um tipo que também é fraco a Fogo, a maior ameaça do time.
    for (const suggestion of suggestions) {
      expect(effectivenessAgainst('fire', suggestion.types)).toBeLessThanOrEqual(1);
    }
  });

  it('cada sugestão traz pelo menos um tipo novo', () => {
    const { suggestions } = suggestNextTypes([['grass'], ['bug']]);
    const seen = new Set<string>();
    for (const suggestion of suggestions) {
      expect(suggestion.types.some((type) => !seen.has(type))).toBe(true);
      suggestion.types.forEach((type) => seen.add(type));
    }
  });

  it('descreve a sugestão em português', () => {
    const { suggestions } = suggestNextTypes([['grass'], ['grass']]);
    expect(describeSuggestion(suggestions[0]!)).toMatch(/fraquezas de 2 membros/);
  });
});

describe('sprites', () => {
  it('tira o número da URL da lista', () => {
    expect(idFromResourceUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25);
    expect(idFromResourceUrl('https://pokeapi.co/api/v2/pokemon/10001/')).toBe(10001);
    expect(idFromResourceUrl('https://example.com/nada')).toBeNull();
    expect(spriteUrlForId(25)).toMatch(/\/sprites\/pokemon\/25\.png$/);
  });
});
