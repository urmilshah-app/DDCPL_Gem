export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

let current: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
if (!LEVEL_ORDER[current]) current = 'info';

export function setLogLevel(level: LogLevel): void {
  current = level;
}

export function enabled(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[current];
}

type Bucket = { level: LogLevel; scope: string; args: unknown[] };

const pending: Bucket[] = [];
let flushing = false;

function fmtArg(a: unknown): string {
  if (a instanceof Error) return a.stack ?? a.message;
  if (typeof a === 'object' && a !== null) {
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  }
  return String(a);
}

function flush(level: LogLevel, scope: string, args: unknown[]): void {
  if (!enabled(level)) return;
  const line = [new Date().toISOString(), level.toUpperCase().padEnd(5), `[${scope}]`, ...args.map(fmtArg)].join(' ');
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(line + '\n');
}

export function log(level: LogLevel, scope: string, ...args: unknown[]): void {
  pending.push({ level, scope, args });
  if (flushing) return;
  flushing = true;
  queueMicrotask(() => {
    let b: Bucket | undefined;
    while ((b = pending.shift())) flush(b.level, b.scope, b.args);
    flushing = false;
  });
}

export const logger = {
  debug: (scope: string, ...args: unknown[]) => log('debug', scope, ...args),
  info: (scope: string, ...args: unknown[]) => log('info', scope, ...args),
  warn: (scope: string, ...args: unknown[]) => log('warn', scope, ...args),
  error: (scope: string, ...args: unknown[]) => log('error', scope, ...args),
};

export type Logger = typeof logger;

export function named(scope: string): Logger {
  return {
    debug: (...a) => logger.debug(scope, ...a),
    info: (...a) => logger.info(scope, ...a),
    warn: (...a) => logger.warn(scope, ...a),
    error: (...a) => logger.error(scope, ...a),
  };
}
