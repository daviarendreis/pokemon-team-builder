import { describe, expect, it } from 'vitest';
import { exportShowdown, parseSetHeader, parseShowdown, toApiName, toShowdownName } from './showdown';

describe('toShowdownName', () => {
  it.each([
    ['pikachu', 'Pikachu'],
    ['charizard-mega-x', 'Charizard-Mega-X'],
    ['raichu-alola', 'Raichu-Alola'],
    ['mr-mime', 'Mr. Mime'],
    ['mr-mime-galar', 'Mr. Mime-Galar'],
    ['mime-jr', 'Mime Jr.'],
    ['type-null', 'Type: Null'],
    ['farfetchd', 'Farfetch’d'],
    ['flabebe', 'Flabébé'],
    ['ho-oh', 'Ho-Oh'],
    ['porygon-z', 'Porygon-Z'],
    ['kommo-o', 'Kommo-o'],
    ['nidoran-f', 'Nidoran-F'],
    ['tapu-koko', 'Tapu Koko'],
    ['iron-valiant', 'Iron Valiant'],
    ['chien-pao', 'Chien-Pao'],
    ['giratina-altered', 'Giratina'],
    ['giratina-origin', 'Giratina-Origin'],
    ['landorus-therian', 'Landorus-Therian'],
    ['urshifu-rapid-strike', 'Urshifu-Rapid-Strike'],
    ['meowstic-female', 'Meowstic-F'],
    ['zygarde-10', 'Zygarde-10%'],
  ])('%s → %s', (api, showdown) => {
    expect(toShowdownName(api)).toBe(showdown);
  });
});

describe('toApiName', () => {
  it.each([
    ['Pikachu', 'pikachu'],
    ['Charizard-Mega-X', 'charizard-mega-x'],
    ['Mr. Mime', 'mr-mime'],
    ['Type: Null', 'type-null'],
    ['Farfetch’d', 'farfetchd'],
    ["Farfetch'd", 'farfetchd'],
    ['Flabébé', 'flabebe'],
    ['Tapu Koko', 'tapu-koko'],
    ['Giratina', 'giratina-altered'],
    ['Landorus-Therian', 'landorus-therian'],
    ['Zygarde-10%', 'zygarde-10'],
    ['Indeedee-F', 'indeedee-female'],
    ['Nidoran♀', 'nidoran-f'],
    ['  great   tusk ', 'great-tusk'],
  ])('%s → %s', (showdown, api) => {
    expect(toApiName(showdown)).toBe(api);
  });

  it('ida e volta preserva o nome da API', () => {
    const names = [
      'mr-mime',
      'type-null',
      'giratina-altered',
      'necrozma-dusk',
      'tauros-paldea-combat-breed',
      'kommo-o',
      'iron-hands',
      'charizard-gmax',
      'deoxys-attack',
    ];
    for (const name of names) expect(toApiName(toShowdownName(name))).toBe(name);
  });
});

describe('parseSetHeader', () => {
  it.each([
    ['Pikachu', 'Pikachu'],
    ['Pikachu @ Light Ball', 'Pikachu'],
    ['Sparky (Pikachu) @ Light Ball', 'Pikachu'],
    ['Sparky (Pikachu) (F) @ Light Ball', 'Pikachu'],
    ['Pikachu (M)', 'Pikachu'],
    ['Garchomp (F)', 'Garchomp'],
    ['Mr. (Fancy) (Mr. Mime)', 'Mr. Mime'],
    ['Type: Null @ Eviolite', 'Type: Null'],
    ['Landorus-Therian (M) @ Choice Scarf', 'Landorus-Therian'],
    ['Pikachu @', 'Pikachu'],
  ])('%s → %s', (line, species) => {
    expect(parseSetHeader(line)).toBe(species);
  });

  it('devolve null para linha vazia', () => {
    expect(parseSetHeader('   ')).toBeNull();
    expect(parseSetHeader('(F)')).toBeNull();
  });
});

describe('parseShowdown', () => {
  const full = `=== [gen9ou] Meu time ===

Sparky (Pikachu) (F) @ Light Ball
Ability: Static
Tera Type: Electric
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
IVs: 0 Atk
- Thunderbolt
- Volt Switch

Type: Null @ Eviolite
Ability: Battle Armor
Level: 50
- Swords Dance

Garchomp (M) @ Rocky Helmet
Ability: Rough Skin
Shiny: Yes
Jolly Nature
- Earthquake
`;

  it('ignora apelidos, itens, gênero, golpes e detalhes', () => {
    expect(parseShowdown(full)).toEqual(['Pikachu', 'Type: Null', 'Garchomp']);
  });

  it('aceita CRLF', () => {
    expect(parseShowdown(full.replace(/\n/g, '\r\n'))).toEqual(['Pikachu', 'Type: Null', 'Garchomp']);
  });

  it('separa conjuntos colados sem linha em branco', () => {
    const text = 'Pikachu @ Light Ball\n- Thunderbolt\nGarchomp\nAbility: Rough Skin\n- Earthquake\nMew';
    expect(parseShowdown(text)).toEqual(['Pikachu', 'Garchomp', 'Mew']);
  });

  it('ida e volta com a exportação', () => {
    const names = ['charizard', 'mr-mime', 'giratina-altered', 'tapu-koko', 'pikachu'];
    expect(parseShowdown(exportShowdown(names)).map(toApiName)).toEqual(names);
  });

  it('texto vazio ou só com lixo de detalhes não traz espécies', () => {
    expect(parseShowdown('')).toEqual([]);
    expect(parseShowdown('\n\n   \n')).toEqual([]);
    expect(parseShowdown('- Thunderbolt\nAbility: Static')).toEqual([]);
  });
});

describe('exportShowdown', () => {
  it('um conjunto por espécie, separados por linha em branco', () => {
    expect(exportShowdown(['pikachu', 'mr-mime'])).toBe('Pikachu\n\nMr. Mime\n');
  });

  it('time vazio vira texto vazio', () => {
    expect(exportShowdown([])).toBe('');
  });
});
