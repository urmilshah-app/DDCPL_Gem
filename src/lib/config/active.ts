// ---------------------------------------------------------------------------
// Runtime configuration resolution.
// Reads the persisted JSON config from the Setting row (key "app") and uses
// file-based defaults as a fallback / forward-compatibility base.
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { defaultConfig } from '@/lib/config/defaults';
import type { AppConfig } from '@/lib/config/types';

const CACHE_TTL_MS = 30_000;

let cache: { config: AppConfig; at: number } | null = null;

export async function getActiveConfig(): Promise<AppConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.config;
  }
  let config = defaultConfig();
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'app' } });
    if (row && row.value) {
      config = normalizeConfig(JSON.parse(row.value) as Record<string, unknown>);
    }
  } catch {
    // Keep file defaults if the persisted value is missing or unparsable.
  }
  cache = { config, at: now };
  return config;
}

export async function getConfigValue(): Promise<AppConfig> {
  return getActiveConfig();
}

export async function invalidateConfigCache(): Promise<void> {
  cache = null;
}

// Deep-merge any partial/old stored config over the default to stay forward
// compatible. Field names mirror defaultConfig() exactly.
export function normalizeConfig(raw: Record<string, unknown>): AppConfig {
  const d = defaultConfig();
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
      at24h: bool(prop(raw.deadlineAlert, 'at24h'), d.deadlineAlert.at24h),
      at12h: bool(prop(raw.deadlineAlert, 'at12h'), d.deadlineAlert.at12h),
      at3h: bool(prop(raw.deadlineAlert, 'at3h'), d.deadlineAlert.at3h),
    },
    channels: {
      email: bool(prop(raw.channels, 'email'), d.channels.email),
      browser: bool(prop(raw.channels, 'browser'), d.channels.browser),
      telegram: bool(prop(raw.channels, 'telegram'), d.channels.telegram),
      whatsapp: bool(prop(raw.channels, 'whatsapp'), d.channels.whatsapp),
    },
    sourceDemoMode: bool(raw.sourceDemoMode, d.sourceDemoMode),
    defaultState: str(raw.defaultState, d.defaultState),
    defaultStateName: str(raw.defaultStateName, d.defaultStateName),
    defaultCities: strArr(raw.defaultCities, d.defaultCities),
    defaultKeywords: strArr(raw.defaultKeywords, d.defaultKeywords),
    exportPageSize: num(raw.exportPageSize, d.exportPageSize),
  };
}

function prop(o: unknown, key: string): unknown {
  return typeof o === 'object' && o !== null ? (o as Record<string, unknown>)[key] : undefined;
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}
function strArr(v: unknown, fallback: string[]): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : fallback;
}
