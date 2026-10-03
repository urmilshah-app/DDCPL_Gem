import { EventEmitter } from "node:events";

export interface TtlValue<T> {
  data: T;
  expiresAt: number;
}

export class Cache<TKey extends string = string, TVal = unknown> {
  private store = new Map<TKey, TtlValue<TVal>>();
  private readonly emitter = new EventEmitter();
  private hits = 0;
  private misses = 0;

  constructor(private readonly defaultTtlMs = 5 * 60 * 1000, private readonly maxEntries = 10_000) {}

  private purge(): void {
    const now = Date.now();
    for (const [k, v] of this.store) if (v.expiresAt <= now) this.store.delete(k);
    if (this.store.size > this.maxEntries) {
      const sorted = [...this.store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      for (const [k] of sorted.slice(0, sorted.length - this.maxEntries)) this.store.delete(k);
    }
  }

  get(key: TKey): TVal | undefined {
    this.purge();
    const v = this.store.get(key);
    if (!v) {
      this.misses++;
      return undefined;
    }
    if (v.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return v.data;
  }

  set(key: TKey, value: TVal, ttlMs = this.defaultTtlMs): void {
    this.purge();
    this.store.set(key, { data: value, expiresAt: Date.now() + ttlMs });
  }

  has(key: TKey): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: TKey): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    this.purge();
    return this.store.size;
  }

  get stats() {
    return { hits: this.hits, misses: this.misses, size: this.size };
  }

  async getOrSet<T extends TVal>(key: TKey, fn: () => Promise<T>, ttlMs = this.defaultTtlMs): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit as T;
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  }

  onEvict(fn: (key: TKey, value: TVal) => void): () => void {
    this.emitter.on("evict", fn);
    return () => this.emitter.off("evict", fn);
  }
}

export async function memoize<T>(fn: () => Promise<T>, key: string, cache: Cache<string, unknown>, ttlMs: number): Promise<T> {
  return cache.getOrSet(key, fn, ttlMs) as Promise<T>;
}
