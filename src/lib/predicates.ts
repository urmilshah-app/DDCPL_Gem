export function notNull<T>(v: T | null | undefined): v is T {
  return v != null;
}

export function isTruthy<T>(v: T | null | undefined | false | 0 | ''): v is T {
  return !!v;
}

export function defined<T>(v: T | undefined): v is T {
  return v !== undefined;
}

export function isEmptyObject(o: unknown): boolean {
  return (
    typeof o === 'object' &&
    o !== null &&
    !Array.isArray(o) &&
    Object.keys(o as Record<string, unknown>).length === 0
  );
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    !(typeof (v as { toJSON?: unknown }).toJSON === 'function')
  );
}

export function asRecord(v: unknown): Record<string, unknown> {
  return isPlainObject(v) ? v : {};
}

export function stringOrNull(v: unknown): string | null {
  if (typeof v === 'string' && v.trim() !== '') return v;
  if (typeof v === 'number') return String(v);
  return null;
}
