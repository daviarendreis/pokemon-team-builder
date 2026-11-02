/**
 * Texto de time do Pokémon Showdown. O app só conhece as espécies, então a
 * exportação traz só os nomes e a importação ignora o resto (golpes, item, EVs…).
 *
 * Os nomes da PokéAPI são minúsculos com hífens (`mr-mime`, `giratina-altered`);
 * os do Showdown têm maiúsculas, pontuação e omitem a forma padrão (`Mr. Mime`, `Giratina`).
 */

/** Espécies cujo nome no Showdown não sai só capitalizando as partes. */
const SPECIAL_BASE_NAMES: Record<string, string> = {
  'mr-mime': 'Mr. Mime',
  'mr-rime': 'Mr. Rime',
  'mime-jr': 'Mime Jr.',
  'type-null': 'Type: Null',
  farfetchd: 'Farfetch’d',
  sirfetchd: 'Sirfetch’d',
  flabebe: 'Flabébé',
  'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z',
  'jangmo-o': 'Jangmo-o',
  'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o',
  'nidoran-f': 'Nidoran-F',
  'nidoran-m': 'Nidoran-M',
  'wo-chien': 'Wo-Chien',
  'chien-pao': 'Chien-Pao',
  'ting-lu': 'Ting-Lu',
  'chi-yu': 'Chi-Yu',
  'tapu-koko': 'Tapu Koko',
  'tapu-lele': 'Tapu Lele',
  'tapu-bulu': 'Tapu Bulu',
  'tapu-fini': 'Tapu Fini',
  'great-tusk': 'Great Tusk',
  'scream-tail': 'Scream Tail',
  'brute-bonnet': 'Brute Bonnet',
  'flutter-mane': 'Flutter Mane',
  'slither-wing': 'Slither Wing',
  'sandy-shocks': 'Sandy Shocks',
  'roaring-moon': 'Roaring Moon',
  'walking-wake': 'Walking Wake',
  'gouging-fire': 'Gouging Fire',
  'raging-bolt': 'Raging Bolt',
  'iron-treads': 'Iron Treads',
  'iron-bundle': 'Iron Bundle',
  'iron-hands': 'Iron Hands',
  'iron-jugulis': 'Iron Jugulis',
  'iron-moth': 'Iron Moth',
  'iron-thorns': 'Iron Thorns',
  'iron-valiant': 'Iron Valiant',
  'iron-leaves': 'Iron Leaves',
  'iron-boulder': 'Iron Boulder',
  'iron-crown': 'Iron Crown',
};

/**
 * Formas cujo nome muda entre os dois lados. Inclui as formas padrão que a PokéAPI
 * exige no nome (`/pokemon/giratina` não existe) e o Showdown omite.
 */
const FORM_NAMES: [api: string, showdown: string][] = [
  ['deoxys-normal', 'Deoxys'],
  ['wormadam-plant', 'Wormadam'],
  ['giratina-altered', 'Giratina'],
  ['shaymin-land', 'Shaymin'],
  ['basculin-red-striped', 'Basculin'],
  ['darmanitan-standard', 'Darmanitan'],
  ['darmanitan-galar-standard', 'Darmanitan-Galar'],
  ['tornadus-incarnate', 'Tornadus'],
  ['thundurus-incarnate', 'Thundurus'],
  ['landorus-incarnate', 'Landorus'],
  ['enamorus-incarnate', 'Enamorus'],
  ['keldeo-ordinary', 'Keldeo'],
  ['meloetta-aria', 'Meloetta'],
  ['meowstic-male', 'Meowstic'],
  ['meowstic-female', 'Meowstic-F'],
  ['aegislash-shield', 'Aegislash'],
  ['pumpkaboo-average', 'Pumpkaboo'],
  ['gourgeist-average', 'Gourgeist'],
  ['zygarde-50', 'Zygarde'],
  ['zygarde-10', 'Zygarde-10%'],
  ['oricorio-baile', 'Oricorio'],
  ['lycanroc-midday', 'Lycanroc'],
  ['wishiwashi-solo', 'Wishiwashi'],
  ['minior-red-meteor', 'Minior-Meteor'],
  ['minior-red', 'Minior'],
  ['mimikyu-disguised', 'Mimikyu'],
  ['necrozma-dusk', 'Necrozma-Dusk-Mane'],
  ['necrozma-dawn', 'Necrozma-Dawn-Wings'],
  ['toxtricity-amped', 'Toxtricity'],
  ['eiscue-ice', 'Eiscue'],
  ['indeedee-male', 'Indeedee'],
  ['indeedee-female', 'Indeedee-F'],
  ['morpeko-full-belly', 'Morpeko'],
  ['urshifu-single-strike', 'Urshifu'],
  ['basculegion-male', 'Basculegion'],
  ['basculegion-female', 'Basculegion-F'],
  ['oinkologne-male', 'Oinkologne'],
  ['oinkologne-female', 'Oinkologne-F'],
  ['maushold-family-of-four', 'Maushold-Four'],
  ['maushold-family-of-three', 'Maushold'],
  ['squawkabilly-green-plumage', 'Squawkabilly'],
  ['palafin-zero', 'Palafin'],
  ['tatsugiri-curly', 'Tatsugiri'],
  ['dudunsparce-two-segment', 'Dudunsparce'],
  ['tauros-paldea-combat-breed', 'Tauros-Paldea-Combat'],
  ['tauros-paldea-blaze-breed', 'Tauros-Paldea-Blaze'],
  ['tauros-paldea-aqua-breed', 'Tauros-Paldea-Aqua'],
  ['ogerpon-wellspring-mask', 'Ogerpon-Wellspring'],
  ['ogerpon-hearthflame-mask', 'Ogerpon-Hearthflame'],
  ['ogerpon-cornerstone-mask', 'Ogerpon-Cornerstone'],
];

/** Normaliza para comparar nomes: minúsculas, sem acento, pontuação ou espaços. */
function toKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const API_TO_SHOWDOWN = new Map(FORM_NAMES);
const SHOWDOWN_KEY_TO_API = new Map(FORM_NAMES.map(([api, showdown]) => [toKey(showdown), api]));
const SPECIAL_BASES = Object.keys(SPECIAL_BASE_NAMES).sort((a, b) => b.length - a.length);

function capitalize(part: string): string {
  return part.charAt(0).toUpperCase() + part.slice(1);
}

/** `charizard-mega-x` → `Charizard-Mega-X`; `mr-mime-galar` → `Mr. Mime-Galar`. */
export function toShowdownName(apiName: string): string {
  const name = apiName.trim().toLowerCase();
  const mapped = API_TO_SHOWDOWN.get(name);
  if (mapped) return mapped;

  const base = SPECIAL_BASES.find((special) => name === special || name.startsWith(`${special}-`));
  if (base) {
    const rest = name.slice(base.length + 1);
    const forms = rest ? rest.split('-').map(capitalize) : [];
    return [SPECIAL_BASE_NAMES[base], ...forms].join('-');
  }
  return name.split('-').filter(Boolean).map(capitalize).join('-');
}

/** `Mr. Mime` → `mr-mime`; `Giratina` → `giratina-altered`; `Zygarde-10%` → `zygarde-10`. */
export function toApiName(showdownName: string): string {
  const mapped = SHOWDOWN_KEY_TO_API.get(toKey(showdownName));
  if (mapped) return mapped;
  return showdownName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*♀$/, '-f')
    .replace(/\s*♂$/, '-m')
    .replace(/[.'’:%]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Um conjunto por espécie, separados por linha em branco (o Showdown aceita assim). */
export function exportShowdown(names: readonly string[]): string {
  return names.map((name) => `${toShowdownName(name)}\n`).join('\n');
}

/** Linhas de detalhe de um conjunto. `Type: Null` não entra porque não é uma dessas chaves. */
const DETAIL_LINE =
  /^(ability|level|shiny|happiness|pokeball|hidden power|dynamax level|gigantamax|tera type|evs|ivs)\s*:/i;
const NATURE_LINE = /^[a-z]+\s+nature$/i;
const MOVE_LINE = /^[-~]/;
const HEADING_LINE = /^===.*===$/;

/**
 * Tira apelido, item e gênero da primeira linha de um conjunto.
 * `Apelido (Espécie) (M) @ Item` → `Espécie`.
 */
export function parseSetHeader(line: string): string | null {
  let text = line.trim();
  const at = text.lastIndexOf(' @ ');
  if (at !== -1) text = text.slice(0, at);
  else if (text.endsWith(' @')) text = text.slice(0, -2);
  text = text.trim();

  // Gênero: `(M)` ou `(F)` no fim.
  text = text.replace(/\s*\((?:m|f)\)$/i, '').trim();

  // Apelido: `Apelido (Espécie)`; a espécie é o último parêntese.
  if (text.endsWith(')')) {
    const open = text.lastIndexOf('(');
    if (open !== -1) {
      const inner = text.slice(open + 1, -1).trim();
      if (inner) text = inner;
    }
  }
  return text === '' ? null : text;
}

/** Devolve as espécies na ordem em que aparecem (no formato do Showdown, sem conversão). */
export function parseShowdown(text: string): string[] {
  const species: string[] = [];
  let inSet = false;
  let sawMoves = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || HEADING_LINE.test(line)) {
      inSet = false;
      continue;
    }
    const isDetail = DETAIL_LINE.test(line) || NATURE_LINE.test(line);
    const isMove = MOVE_LINE.test(line);

    // Um conjunto novo começa depois de linha em branco, ou logo após os golpes
    // de outro, se o texto veio sem linhas em branco.
    const startsSet = !inSet || (sawMoves && !isMove && !isDetail);
    if (startsSet && !isMove && !isDetail) {
      const name = parseSetHeader(line);
      if (name) species.push(name);
      inSet = true;
      sawMoves = false;
      continue;
    }
    if (isMove) sawMoves = true;
  }
  return species;
}
