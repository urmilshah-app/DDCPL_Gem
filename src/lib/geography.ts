// ---------------------------------------------------------------------------
// State/city geography matching for watched locations.
// Only imports verified strings.ts exports: normalizeText, tokenize,
// withoutStops, toSearchTokens, similarity.
// ---------------------------------------------------------------------------

import { normalizeText, tokenize, withoutStops, toSearchTokens, similarity } from "./strings";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CityDef {
  id: string;
  name: string;
  normalized: string;
  stateId: string;
  stateName: string;
  stateCode: string;
  lat?: number | null;
  lng?: number | null;
  isCapital?: boolean;
}

export interface StateDef {
  id: string;
  name: string;
  code: string;
  normalized: string;
}

export interface StateLocDef {
  id: string;
  stateId: string;
  mode: "STATE" | "CITY";
  radiusKm?: number | null;
  cityIds: string[];
}

export interface LocationMatchInput {
  stateName?: string | null;
  cityName?: string | null;
  addressText?: string | null;
  watchStateIds: string[];
  watchCityIds: string[];
  watchStateNames: string[];
  watchCityNames: string[];
  result?: string;
}

export interface LocationMatchOutput {
  matchType: "EXACT_CITY" | "STATE_MATCH" | "ADDRESS_MATCH" | "NO_MATCH" | "UNKNOWN";
  matchedCity?: string;
  matchedState?: string;
  confidence: number;
  why: string;
}

// Common Gujarati city tokens that may appear in GeM addresses.
const ADDRESS_CITY_HINTS = new Set([
  "ahmedabad", "gandhinagar", "vadodara", "surat", "rajkot",
  "gir", "junagadh", "bhavnagar", "jamnagar", "porbandar", "morbi",
  "anand", "nadiad", "mehsana", "bhuj", "gandhidham", "navsari",
  "valsad", "vapi", "palanpur", "himmatnagar", "godhra", "dahod",
  "amreli", "botad", "dwarka", "pali", "surendranagar", "veraval",
  "gandhinagar", "patan", "deesa", "jetpur", "gondal", "dhoraji",
  "viramgam", "dehgam", "kalol", "gandhinagarr",
]);

export function matchLocation(input: LocationMatchInput): LocationMatchOutput {
  const stateNorm = input.stateName ? normalizeText(input.stateName) : "";
  const cityNorm = input.cityName ? normalizeText(input.cityName) : "";
  const addressNorm = input.addressText ? normalizeText(input.addressText) : "";

  const watchStates = new Set(input.watchStateNames.map((s) => normalizeText(s)));
  const watchCities = new Set(input.watchCityNames.map((s) => normalizeText(s)));

  if (cityNorm) {
    for (const c of watchCities) {
      if (cityNorm === c || similarity(cityNorm, c) > 0.75) {
        return {
          matchType: "EXACT_CITY",
          matchedCity: input.cityName ?? undefined,
          matchedState: input.stateName ?? undefined,
          confidence: 1,
          why: `Exact city match: ${cityNorm}`,
        };
      }
    }
  }

  if (stateNorm) {
    for (const s of watchStates) {
      if (stateNorm === s || similarity(stateNorm, s) > 0.8) {
        return {
          matchType: "STATE_MATCH",
          matchedCity: input.cityName ?? undefined,
          matchedState: input.stateName ?? undefined,
          confidence: 0.9,
          why: `State match: ${stateNorm}`,
        };
      }
    }
  }

  if (addressNorm && addressNorm.length >= 8) {
    const tokens = toSearchTokens(addressNorm);
    const hits = tokens.filter((t) => ADDRESS_CITY_HINTS.has(t));
    if (hits.length > 0) {
      const matched = hits[0];
      if (watchCities.has(matched)) {
        return {
          matchType: "EXACT_CITY",
          matchedCity: matched,
          matchedState: undefined,
          confidence: 0.85,
          why: `Address mentions watch city: ${matched}`,
        };
      }
      return {
        matchType: "ADDRESS_MATCH",
        matchedCity: matched,
        matchedState: undefined,
        confidence: 0.7,
        why: `Address talk: ${matched}`,
      };
    }
  }

  return {
    matchType: "NO_MATCH",
    confidence: 0,
    why: "No geolocation constraint satisfied",
  };
}

export function stateOrCityIsWatched(
  watch: { states: string[]; cities: string[] },
  state?: string | null,
  city?: string | null,
): boolean {
  const st = state ? normalizeText(state) : "";
  const ct = city ? normalizeText(city) : "";
  return (
    watch.cities.some((c) => ct && (ct === normalizeText(c) || similarity(ct, normalizeText(c)) > 0.75)) ||
    watch.states.some((s) => st === normalizeText(s))
  );
}

export function buildGeoSearchQuery(input: { stateIds?: string[]; cityIds?: string[]; radiusKm?: number }): string {
  return [
    input.stateIds?.length ? `stateId IN (${input.stateIds.map((_) => "?").join(",")})` : "",
    input.cityIds?.length ? `cityId IN (${input.cityIds.map((_) => "?").join(",")})` : "",
  ]
    .filter(Boolean)
    .join(" AND ");
}
