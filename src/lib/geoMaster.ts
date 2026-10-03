// ---------------------------------------------------------------------------
// Master geography data (all Indian states / UTs + major cities).
// Used by prisma/seed.ts and scripts/sync-geo-master.ts to keep the State and
// City tables complete - the watchlist location dropdowns read straight from
// these tables, so a short list here means a short dropdown there.
// ---------------------------------------------------------------------------

import {
  CITY_NAMES,
  CITY_STATE,
  INDIAN_STATES,
} from '../services/bidDocument';

export interface GeoState {
  name: string;
  code: string;
}

export interface GeoCity {
  name: string;
  stateCode: string;
}

// state name -> official code (includes parser variants found in tender text)
const STATE_CODE_BY_NAME: Record<string, string> = {
  'Andaman & Nicobar': 'AN',
  'Andaman and Nicobar Islands': 'AN',
  'Andhra Pradesh': 'AP',
  'Arunachal Pradesh': 'AR',
  Assam: 'AS',
  Bihar: 'BR',
  Chandigarh: 'CH',
  Chhattisgarh: 'CG',
  'Dadra & Nagar Haveli': 'DN',
  'Daman & Diu': 'DD',
  'Dadra and Nagar Haveli and Daman and Diu': 'DD',
  Delhi: 'DL',
  Goa: 'GA',
  Gujarat: 'GJ',
  Haryana: 'HR',
  'Himachal Pradesh': 'HP',
  'Jammu & Kashmir': 'JK',
  'Jammu and Kashmir': 'JK',
  Jharkhand: 'JH',
  Karnataka: 'KA',
  Kerala: 'KL',
  Ladakh: 'LA',
  Lakshadweep: 'LD',
  'Madhya Pradesh': 'MP',
  Maharashtra: 'MH',
  Manipur: 'MN',
  Meghalaya: 'ML',
  Mizoram: 'MZ',
  Nagaland: 'NL',
  Odisha: 'OD',
  Orissa: 'OD',
  Puducherry: 'PY',
  Punjab: 'PB',
  Rajasthan: 'RJ',
  Sikkim: 'SK',
  'Tamil Nadu': 'TN',
  Telangana: 'TS',
  Tripura: 'TR',
  'Uttar Pradesh': 'UP',
  Uttarakhand: 'UK',
  Uttaranchal: 'UK',
  'West Bengal': 'WB',
};

export function stateCodeForName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  return STATE_CODE_BY_NAME[trimmed] ?? null;
}

export function stateNameForCode(code: string): string | null {
  const entry = Object.entries(STATE_CODE_BY_NAME).find(([, c]) => c === code);
  return entry ? entry[0] : null;
}

// All states / UTs, in the same spelling the PDF parser extracts.
export const GEO_STATES: GeoState[] = INDIAN_STATES.map((name) => ({
  name,
  code: STATE_CODE_BY_NAME[name] ?? name.slice(0, 2).toUpperCase(),
}));

function titleCase(value: string): string {
  return value
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Cities from the known-city list, each attached to its state via CITY_STATE.
// Duplicate names (same city listed twice) are collapsed.
const citySeen = new Set<string>();
export const GEO_CITIES: GeoCity[] = [];
for (const raw of CITY_NAMES) {
  const key = raw.trim().toLowerCase();
  if (!key || citySeen.has(key)) continue;
  citySeen.add(key);
  const stateName = CITY_STATE[key];
  const code = stateCodeForName(stateName ?? '');
  if (!code) continue;
  GEO_CITIES.push({ name: titleCase(key), stateCode: code });
}
GEO_CITIES.sort((a, b) => a.name.localeCompare(b.name));
