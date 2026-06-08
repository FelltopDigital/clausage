import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

/** Root directory holding Claude Code session logs. */
export function claudeProjectsDir(): string {
  return process.env.CLAUSAGE_LOGS_DIR ?? join(homedir(), '.claude', 'projects');
}

/** Recursively collect all *.jsonl log file paths. */
export function findLogFiles(root = claudeProjectsDir()): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let s;
      try {
        s = statSync(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) walk(full);
      else if (s.isFile() && name.endsWith('.jsonl')) out.push(full);
    }
  };
  walk(root);
  return out;
}

/** Read file contents; unreadable files are skipped (returns ''). */
export function readFileSafe(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/** Lazily yield the contents of all log files. */
export function* readLogContents(paths: string[]): Generator<string> {
  for (const p of paths) {
    const content = readFileSafe(p);
    if (content) yield content;
  }
}
