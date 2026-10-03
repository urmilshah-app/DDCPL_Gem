import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * ESM/CommonJS-portable helpers.
 *
 * `import.meta.url` only exists in ESM. Next/SWC transpiles server code to CJS
 * where it is unavailable, while `tsx` scripts can run as ESM. These helpers
 * therefore accept an optional `importMetaUrl` and fall back to `process.cwd()`.
 */

export type WithMetaUrl = { url?: string };

/** __dirname-equivalent for an ESM module that passes `import.meta.url`. */
export function dirnameOf(metaUrl?: string): string {
  if (metaUrl != null && !/^file:/.test(metaUrl)) {
    return dirname(resolve(metaUrl));
  }
  return process.cwd();
}

/**
 * Walk up from `start` until we find the project root, i.e. the directory that
 * contains `prisma/schema.prisma` (and usually `package.json`). This anchor is
 * stable whether we launch from a script, the Next runtime, or a subfolder.
 * Falls back to `start` itself.
 */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = resolve(start);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (existsSync(join(dir, 'prisma', 'schema.prisma')) && existsSync(join(dir, 'node_modules'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

let cachedRoot: string | null = null;
/** Memoized absolute path to the repository root. */
export function repoRoot(): string {
  if (cachedRoot) return cachedRoot;
  cachedRoot = process.env.GEM_PROJECT_ROOT ? resolve(process.env.GEM_PROJECT_ROOT) : findRepoRoot();
  return cachedRoot;
}

/** Resolve a path (or list of segments) relative to the repository root. */
export function fromRepoRoot(...segments: string[]): string {
  return join(repoRoot(), ...segments);
}

/** Path to a path-relative file (e.g. node_modules/.bin). */
export function resolvePathRelativeToRoot(file: string): string {
  return fromRepoRoot(...file.split(/[\\/]+/).filter(Boolean));
}
