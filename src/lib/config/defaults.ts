// ---------------------------------------------------------------------------
// File-based fallback configuration + helpers to coerce persisted JSON into a
// complete AppConfig (forward-compatible with older/missing stored fields).
// ---------------------------------------------------------------------------

import type { AppConfig } from './types';

export function defaultConfig(): AppConfig {
  return {
    scanIntervalMinutes: 10,
    relevanceThreshold: 40,
    duplicationWindowHours: 72,
    dedupeWarm: true,
    requestTimeoutMs: 15_000,
    maxConcurrentRequests: 2,
    dailyRequestLimit: 2000,
    retryCount: 4,
    negativeList: ['photography', 'dslr', 'photographic', 'marriage photography', 'stock photo'],
    collectDocuments: true,
    enableEmailAlert: true,
    emailFrom: '',
    notificationStartHour: 8,
    notificationEndHour: 22,
    minRelevanceForAlert: 40,
    deadlineAlert: {
      at24h: true,
      at12h: true,
      at3h: true,
    },
    channels: {
      email: true,
      browser: true,
      telegram: false,
      whatsapp: false,
    },
    sourceDemoMode: false,
    defaultState: 'GJ',
    defaultStateName: 'Gujarat',
    defaultCities: ['ahmedabad', 'gandhinagar', 'vadodara', 'surat', 'rajkot'],
    defaultKeywords: ['supply', 'installation', 'maintenance', 'cctv', 'ransomware'],
    exportPageSize: 100,
  };
}

function num(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : d;
}
function bool(v: unknown, d: boolean): boolean {
  return typeof v === 'boolean' ? v : d;
}
function str(v: unknown, d: string): string {
  return typeof v === 'string' && v.length > 0 ? v : d;
}
function strArr(v: unknown, d: string[]): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : d;
}
function nested(o: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = o[key];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

export function normalizeConfig(raw: Record<string, unknown>): AppConfig {
  const d = defaultConfig();
  const deadline = nested(raw, 'deadlineAlert');
  const channels = nested(raw, 'channels');
  return {
    scanIntervalMinutes: num(raw.scanIntervalMinutes, d.scanIntervalMinutes),
    relevanceThreshold: num(raw.relevanceThreshold, d.relevanceThreshold),
    duplicationWindowHours: num(raw.duplicationWindowHours, d.duplicationWindowHours),
    dedupeWarm: bool(raw.dedupeWarm, d.dedupeWarm),
    requestTimeoutMs: num(raw.requestTimeoutMs, d.requestTimeoutMs),
    maxConcurrentRequests: num(raw.maxConcurrentRequests, d.maxConcurrentRequests),
    dailyRequestLimit: num(raw.dailyRequestLimit, d.dailyRequestLimit),
    retryCount: num(raw.retryCount, d.retryCount),
    negativeList: strArr(raw.negativeList, d.negativeList),
    collectDocuments: bool(raw.collectDocuments, d.collectDocuments),
    enableEmailAlert: bool(raw.enableEmailAlert, d.enableEmailAlert),
    emailFrom: str(raw.emailFrom, d.emailFrom),
    notificationStartHour: num(raw.notificationStartHour, d.notificationStartHour),
    notificationEndHour: num(raw.notificationEndHour, d.notificationEndHour),
    minRelevanceForAlert: num(raw.minRelevanceForAlert, d.minRelevanceForAlert),
    deadlineAlert: {
      at24h: bool(deadline.at24h, d.deadlineAlert.at24h),
      at12h: bool(deadline.at12h, d.deadlineAlert.at12h),
      at3h: bool(deadline.at3h, d.deadlineAlert.at3h),
    },
    channels: {
      email: bool(channels.email, d.channels.email),
      browser: bool(channels.browser, d.channels.browser),
      telegram: bool(channels.telegram, d.channels.telegram),
      whatsapp: bool(channels.whatsapp, d.channels.whatsapp),
    },
    sourceDemoMode: bool(raw.sourceDemoMode, d.sourceDemoMode),
    defaultState: str(raw.defaultState, d.defaultState),
    defaultStateName: str(raw.defaultStateName, d.defaultStateName),
    defaultCities: strArr(raw.defaultCities, d.defaultCities),
    defaultKeywords: strArr(raw.defaultKeywords, d.defaultKeywords),
    exportPageSize: num(raw.exportPageSize, d.exportPageSize),
  };
}
