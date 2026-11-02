import { describe, expect, it } from 'vitest';
import {
  classifyAverage,
  statTotal,
  summarizeTeamStats,
  toBaseStats,
  type BaseStats,
} from './teamStats';

function stats(
  hp: number,
  attack: number,
  defense: number,
  specialAttack: number,
  specialDefense: number,
  speed: number,
): BaseStats {
  return {
    hp,
    attack,
    defense,
    'special-attack': specialAttack,
    'special-defense': specialDefense,
    speed,
  };
}

// Valores reais da PokéAPI.
const charizard = stats(78, 84, 78, 109, 85, 100);
const snorlax = stats(160, 110, 65, 65, 110, 30);
const garchomp = stats(108, 130, 95, 80, 85, 102);

describe('toBaseStats', () => {
  it('converte a lista da API e completa status ausentes com 0', () => {
    expect(
      toBaseStats([
        { stat: 'hp', value: 78 },
        { stat: 'speed', value: 100 },
      ]),
    ).toEqual(stats(78, 0, 0, 0, 0, 100));
  });
});

describe('statTotal', () => {
  it('soma os seis status', () => {
    expect(statTotal(charizard)).toBe(534);
    expect(statTotal(snorlax)).toBe(540);
  });
});

describe('classifyAverage', () => {
  it('usa 100 ou mais como forte e abaixo de 70 como fraco', () => {
    expect(classifyAverage(100)).toBe('strong');
    expect(classifyAverage(99)).toBeNull();
    expect(classifyAverage(70)).toBeNull();
    expect(classifyAverage(69)).toBe('weak');
  });
});

describe('summarizeTeamStats', () => {
  it('devolve null sem nenhum Pokémon', () => {
    expect(summarizeTeamStats([])).toBeNull();
  });

  it('calcula médias arredondadas por status e do total', () => {
    const summary = summarizeTeamStats([charizard, snorlax, garchomp]);

    expect(summary?.count).toBe(3);
    expect(summary?.averages).toEqual(stats(115, 108, 79, 85, 93, 77));
    // (534 + 540 + 600) / 3 = 558
    expect(summary?.averageTotal).toBe(558);
    expect(summary?.best).toBe('hp');
    expect(summary?.worst).toBe('speed');
  });

  it('com um Pokémon só, a média é o próprio status', () => {
    const summary = summarizeTeamStats([snorlax]);
    expect(summary?.averages).toEqual(snorlax);
    expect(summary?.averageTotal).toBe(540);
  });

  it('destaca pontos fracos antes dos fortes, com rótulos claros', () => {
    const slowAndFrail = stats(110, 60, 120, 50, 60, 40);
    const summary = summarizeTeamStats([slowAndFrail]);

    expect(summary?.highlights).toEqual([
      { stat: 'attack', kind: 'weak', average: 60, label: 'Pouco ataque físico' },
      { stat: 'special-attack', kind: 'weak', average: 50, label: 'Pouco ataque especial' },
      { stat: 'special-defense', kind: 'weak', average: 60, label: 'Pouca defesa especial' },
      { stat: 'speed', kind: 'weak', average: 40, label: 'Time lento' },
      { stat: 'hp', kind: 'strong', average: 110, label: 'HP alto' },
      { stat: 'defense', kind: 'strong', average: 120, label: 'Boa defesa física' },
    ]);
  });

  it('aplica os limites à média arredondada', () => {
    // Velocidade média 99,5 → 100: conta como forte.
    const summary = summarizeTeamStats([stats(80, 80, 80, 80, 80, 99), stats(80, 80, 80, 80, 80, 100)]);
    expect(summary?.highlights).toEqual([
      { stat: 'speed', kind: 'strong', average: 100, label: 'Time rápido' },
    ]);
  });

  it('não destaca nada quando todas as médias ficam entre os limites', () => {
    expect(summarizeTeamStats([stats(80, 80, 80, 80, 80, 80)])?.highlights).toEqual([]);
  });

  it('em empate, melhor e pior ficam com o primeiro status na ordem do jogo', () => {
    const summary = summarizeTeamStats([stats(90, 90, 50, 50, 90, 90)]);
    expect(summary?.best).toBe('hp');
    expect(summary?.worst).toBe('defense');
  });
});
