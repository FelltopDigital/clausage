/** Pure, side-effect-free driver selection helpers (shared by client + scripts). */

export function usesPglite(url: string | undefined): boolean {
  return !url || url.startsWith('pglite') || url.startsWith('file:');
}

export function pgliteDir(url: string | undefined): string | undefined {
  if (!url) return '.pglite';
  const path = url.replace(/^(pglite:\/\/|pglite:|file:\/\/|file:)/, '');
  if (path === 'memory' || path === '') return undefined; // in-memory
  return path;
}
