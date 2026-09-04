function normalizeKey(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');
}

const NORMALIZED_NATIONALITY_TO_CODE: Record<string, string> = {
  // A
  albania: 'al',
  algeria: 'dz',
  argentina: 'ar',
  armenia: 'am',
  australia: 'au',
  austria: 'at',

  // B
  belgium: 'be',
  bolivia: 'bo',
  'bosnia and herzegovina': 'ba',
  'bosnia herzegovina': 'ba',
  bosnia: 'ba',
  brazil: 'br',
  bulgaria: 'bg',
  'burkina faso': 'bf',

  // C
  cameroon: 'cm',
  canada: 'ca',
  'cape verde': 'cv',
  'cabo verde': 'cv',
  chile: 'cl',
  colombia: 'co',
  'congo dr': 'cd',
  'dr congo': 'cd',
  'democratic republic of the congo': 'cd',
  'republic of the congo': 'cg',
  congo: 'cg',
  'costa rica': 'cr',
  'cote divoire': 'ci',
  'ivory coast': 'ci',
  croatia: 'hr',
  czechia: 'cz',
  'czech republic': 'cz',

  // D
  denmark: 'dk',

  // E
  ecuador: 'ec',
  egypt: 'eg',
  england: 'gb-eng',

  // F
  finland: 'fi',
  france: 'fr',

  // G
  gambia: 'gm',
  georgia: 'ge',
  germany: 'de',
  ghana: 'gh',
  greece: 'gr',
  guinea: 'gn',
  'guinea-bissau': 'gw',
  'guinea bissau': 'gw',

  // H
  hungary: 'hu',

  // I
  iceland: 'is',
  iran: 'ir',
  ireland: 'ie',
  'republic of ireland': 'ie',
  israel: 'il',
  italy: 'it',

  // J
  jamaica: 'jm',
  japan: 'jp',

  // K
  'korea republic': 'kr',
  'south korea': 'kr',
  'korea republic of': 'kr',
  'republic of korea': 'kr',
  kosovo: 'xk',

  // M
  mali: 'ml',
  mexico: 'mx',
  montenegro: 'me',
  morocco: 'ma',

  // N
  netherlands: 'nl',
  'new zealand': 'nz',
  nigeria: 'ng',
  'north macedonia': 'mk',
  'northern ireland': 'gb-nir',
  norway: 'no',

  // P
  panama: 'pa',
  paraguay: 'py',
  peru: 'pe',
  poland: 'pl',
  portugal: 'pt',

  // Q
  qatar: 'qa',

  // R
  romania: 'ro',

  // S
  'saudi arabia': 'sa',
  scotland: 'gb-sct',
  senegal: 'sn',
  serbia: 'rs',
  slovakia: 'sk',
  slovenia: 'si',
  'south africa': 'za',
  spain: 'es',
  sweden: 'se',
  switzerland: 'ch',

  // T
  tunisia: 'tn',
  turkiye: 'tr',
  turkey: 'tr',

  // U
  ukraine: 'ua',
  'united kingdom': 'gb',
  'great britain': 'gb',
  'united states': 'us',
  'united states of america': 'us',
  usa: 'us',
  uruguay: 'uy',
  uzbekistan: 'uz',

  // V
  venezuela: 've',

  // W
  wales: 'gb-wls',

  // Z
  zimbabwe: 'zw',
};

/**
 * Returns the flag CDN image URL for a given player nationality.
 * Uses the API-provided nationalityFlagUrl if available, otherwise resolves via reference map.
 * Returns null if nationality is null/empty or unrecognized.
 */
export function getNationalityFlagUrl(
  nationality?: string | null,
  flagUrlFromApi?: string | null,
): string | null {
  if (flagUrlFromApi) {
    return flagUrlFromApi;
  }
  if (!nationality) {
    return null;
  }
  const key = normalizeKey(nationality);
  if (!key) {
    return null;
  }
  const code = NORMALIZED_NATIONALITY_TO_CODE[key];
  if (!code) {
    return null;
  }
  return `https://flagcdn.com/w40/${code}.png`;
}
