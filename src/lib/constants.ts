export const APP_NAME = 'DDCPL Government Tender Monitor';
export const APP_DISPLAY = 'Independent Tender Monitoring Dashboard';
export const APP_TAGLINE = 'Internal dashboard tracking publicly listed GeM ongoing-bid tender notices. Read-only monitoring — DDCPL never places bids or submits quotations.'

export const DEMO_BANNER = 'Independent Tender Monitoring Dashboard (read-only internal tool)';

export const GEM_MAIN = 'https://gem.gov.in';
export const GEM_BID = 'https://bid.gem.gov.in';
export const GEM_ADVANCE_SEARCH = 'https://bid.gem.gov.in/advance-search';

export const AUTH_SESSION_COOKIE = 'ddcpl_session';
export const AUTH_SESSION_TTL_DAYS = 7;

export const ROLES = ['USER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const TENDER_STATUSES = [
  'NEW',
  'VIEWED',
  'SHORTLISTED',
  'NOT_RELEVANT',
  'EXPIRED',
  'CLOSED',
  'UPDATE',
] as const;
export type TenderStatus = (typeof TENDER_STATUSES)[number];

export const WORKFLOW_STATUSES = [
  'UNDER_REVIEW',
  'NEEDS_PRICING',
  'NEEDS_OEM_QUOTE',
  'READY_FOR_BID',
  'SUBMITTED',
  'NOT_RELEVANT',
  'NOT_PURSUING',
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const DECISION_STATUSES = [
  'UNDER_REVIEW',
  'NEEDS_PRICING',
  'NEEDS_OEM_QUOTE',
  'READY_FOR_BID',
  'SUBMITTED',
  'CLOSED',
  'NOT_RELEVANT',
  'NOT_PURSUING',
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const SEARCH_TYPES = [
  'TITLE',
  'DESCRIPTION',
  'BOQ',
  'CATEGORY',
  'ORGANIZATION',
  'ALL',
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const LOCATION_TYPES = [
  'EXACT_CITY',
  'STATE_MATCH',
  'ADDRESS_MATCH',
  'NO_MATCH',
  'UNKNOWN',
] as const;
export type LocationMatchType = (typeof LOCATION_TYPES)[number];

export const LOCATION_MODES = ['STATE', 'CITY'] as const;
export type LocationMode = (typeof LOCATION_MODES)[number];

export const NOTIFY_CHANNELS = ['EMAIL', 'BROWSER', 'TELEGRAM', 'WHATSAPP'] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

export const NOTIFY_STATUSES = [
  'PENDING',
  'SENT',
  'FAILED',
  'SKIPPED',
  'DISABLED',
] as const;
export type NotifyStatus = (typeof NOTIFY_STATUSES)[number];

export const CONTENT_HASH_ALGO = 'sha256';
export const DEADLINE_ALERT_HOURS = [3, 12, 24] as const;

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const SEARCH_DEFAULT_LIMIT = 50;
export const SEARCH_MAX_LIMIT = 200;

export const DEFAULT_RELEVANCE_MIN = 40;
export const DEFAULT_RELEVANCE_WEIGHTS = {
  title: 25,
  description: 20,
  category: 15,
  location: 15,
  organization: 10,
  boq: 10,
  recency: 5,
} as const;

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  UNDER_REVIEW: 'Under review',
  NEEDS_PRICING: 'Needs pricing via BOQ split',
  NEEDS_OEM_QUOTE: 'Needs OEM quotation',
  READY_FOR_BID: 'Ready for bidding',
  SUBMITTED: 'Submitted',
  NOT_RELEVANT: 'Not relevant',
  NOT_PURSUING: 'Not pursuing',
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  UNDER_REVIEW: 'Under review',
  NEEDS_PRICING: 'Needs pricing via BOQ split',
  NEEDS_OEM_QUOTE: 'Needs OEM quotation',
  READY_FOR_BID: 'Ready for bidding',
  SUBMITTED: 'Submitted',
  CLOSED: 'Closed',
  NOT_RELEVANT: 'Not relevant',
  NOT_PURSUING: 'Not pursuing',
};
