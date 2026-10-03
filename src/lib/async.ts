export interface RetryOptions {
  max?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  jitterMs?: number;
  shouldRetry?: (err: unknown) => boolean;
  onRetry?: (attempt: number, err: unknown, delayMs: number) => void;
}

export type { RetryOptions as default };

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const max = opts.max ?? 4;
  const initial = opts.initialDelayMs ?? 1000;
  const mult = opts.backoffMultiplier ?? 2;
  const jitter = opts.jitterMs ?? 500;
  const should = opts.shouldRetry ?? (() => true);
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  let delay = initial;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === max || !should(err)) throw lastErr;
      const j = Math.floor(Math.random() * jitter);
      opts.onRetry?.(attempt, err, delay + j);
      await sleep(delay + j);
      delay = delay * mult;
    }
  }
  throw lastErr ?? new Error('retry exhausted');
}

export async function withTimeout<T>(p: Promise<T>, ms: number, msg = 'operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export class RateLimiter {
  private hits: number[] = [];

  constructor(
    private readonly quota: number,
    private readonly windowMs: number,
    private readonly name = 'rate-limiter',
  ) {}

  get remaining(): number {
    const now = Date.now();
    this.hits = this.hits.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.quota - this.hits.length);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  async acquire(signal?: AbortSignal): Promise<void> {
    while (this.remaining <= 0) {
      if (signal?.aborted) throw new Error(`${this.name}: acquire aborted`);
      await this.sleep(250 + Math.floor(Math.random() * 250));
    }
    this.hits.push(Date.now());
  }

  get limiterStats(): { quota: number; windowMs: number; remaining: number } {
    return { quota: this.quota, windowMs: this.windowMs, remaining: this.remaining };
  }
}
