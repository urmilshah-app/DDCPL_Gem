// ---------------------------------------------------------------------------
// Runtime configuration shape. Persisted as JSON (Setting key "app").
// Durations are in minutes unless stated otherwise.
// ---------------------------------------------------------------------------

export interface ChannelSwitch {
  email: boolean;
  browser: boolean;
  telegram: boolean;
  whatsapp: boolean;
}

export interface DeadlineAlertSwitch {
  at24h: boolean;
  at12h: boolean;
  at3h: boolean;
}

export interface AppConfig {
  // Monitoring cadence
  scanIntervalMinutes: number;
  // Relevance / matching
  relevanceThreshold: number; // 0..100 â€” minimum to alert/shortlist
  duplicationWindowHours: number;
  dedupeWarm: boolean;
  // GeM collector (politeness / source behaviour)
  requestTimeoutMs: number;
  maxConcurrentRequests: number;
  dailyRequestLimit: number;
  retryCount: number;
  negativeList: string[];
  collectDocuments: boolean;
  sourceDemoMode: boolean; // use bundled demo feed instead of live GeM
  // Notifications
  enableEmailAlert: boolean;
  emailFrom: string;
  notificationStartHour: number; // 0..23 quiet window start
  notificationEndHour: number; // 0..23 quiet window end
  minRelevanceForAlert: number;
  deadlineAlert: DeadlineAlertSwitch;
  channels: ChannelSwitch;
  // Defaults for new watchlists
  defaultState: string; // '' = All India
  defaultStateName: string;
  defaultCities: string[];
  defaultKeywords: string[];
  // Export
  exportPageSize: number;
}
