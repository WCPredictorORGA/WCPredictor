// Mapping FIFA 3-letter codes → ISO 2-letter lowercase (pour flagcdn.com)
const FIFA_TO_ISO2 = {
  // Europe
  FRA: 'fr', ENG: 'gb-eng', GER: 'de', ESP: 'es', ITA: 'it',
  POR: 'pt', NED: 'nl', BEL: 'be', CRO: 'hr', POL: 'pl',
  SUI: 'ch', SRB: 'rs', DEN: 'dk', AUT: 'at', TUR: 'tr',
  SCO: 'gb-sct', WAL: 'gb-wls', NOR: 'no', SWE: 'se', CZE: 'cz',
  SVK: 'sk', HUN: 'hu', ROU: 'ro', GRE: 'gr', ALB: 'al',
  SVN: 'si', FIN: 'fi', ISL: 'is', NIR: 'gb-nir', IRL: 'ie',
  UKR: 'ua', GEO: 'ge', AZE: 'az', LUX: 'lu', MKD: 'mk',
  KOS: 'xk', BIH: 'ba', MNE: 'me', ARM: 'am', BLR: 'by',
  // Amériques
  BRA: 'br', ARG: 'ar', URU: 'uy', COL: 'co', ECU: 'ec',
  CHI: 'cl', PAR: 'py', PER: 'pe', VEN: 've', BOL: 'bo',
  USA: 'us', MEX: 'mx', CAN: 'ca', PAN: 'pa', JAM: 'jm',
  CRC: 'cr', HON: 'hn', GTM: 'gt', SLV: 'sv', NCA: 'ni',
  CUB: 'cu', HAI: 'ht', TRI: 'tt', GUY: 'gy', SUR: 'sr',
  // Afrique
  MAR: 'ma', SEN: 'sn', NGA: 'ng', CMR: 'cm', EGY: 'eg',
  CIV: 'ci', GHA: 'gh', TUN: 'tn', ALG: 'dz', MLI: 'ml',
  ZAF: 'za', COD: 'cd', ZAM: 'zm', ZIM: 'zw', ANG: 'ao',
  MOZ: 'mz', UGA: 'ug', KEN: 'ke', ETH: 'et', CPV: 'cv',
  GAB: 'ga', BFA: 'bf', GUI: 'gn', BEN: 'bj', TOG: 'tg',
  NAM: 'na', MTN: 'mr', NIG: 'ne', TAN: 'tz', LBR: 'lr',
  SLE: 'sl', GNB: 'gw', EQG: 'gq', CTA: 'cf',
  // Asie / Pacifique
  JPN: 'jp', KOR: 'kr', IRN: 'ir', KSA: 'sa', AUS: 'au',
  QAT: 'qa', UZB: 'uz', IRQ: 'iq', JOR: 'jo', UAE: 'ae',
  CHN: 'cn', THA: 'th', VIE: 'vn', IDN: 'id', MYS: 'my',
  BHR: 'bh', KUW: 'kw', OMN: 'om', SYR: 'sy', LBN: 'lb',
  PAL: 'ps', TJK: 'tj', KGZ: 'kg', TKM: 'tm', KAZ: 'kz',
  SGP: 'sg', IND: 'in', PHI: 'ph',
  // OFC
  NZL: 'nz', FIJ: 'fj', PNG: 'pg', SOL: 'sb', VAN: 'vu',
};

/**
 * Retourne l'URL du drapeau (flagcdn.com) à partir du code FIFA 3-lettres.
 * Tente aussi une correspondance directe si le code est déjà en ISO 2-lettres.
 */
export const flagUrl = (code) => {
  if (!code) return null;
  const upper = code.toUpperCase();
  if (FIFA_TO_ISO2[upper]) return `https://flagcdn.com/20x15/${FIFA_TO_ISO2[upper]}.png`;
  if (upper.length === 2) return `https://flagcdn.com/20x15/${upper.toLowerCase()}.png`;
  return null;
};
