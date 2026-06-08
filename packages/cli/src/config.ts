import { homedir, hostname } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';

export interface CliConfig {
  /** Backend base URL, e.g. https://clusage.com */
  apiUrl: string;
  /** Bearer token (clst_...). Stored locally only. */
  token?: string;
  /** Salted, one-way hash of the hostname. Generated once. */
  machineId?: string;
  /** Random salt used to derive machineId (never transmitted). */
  machineSalt?: string;
}

const DEFAULT_API_URL = process.env.CLUSAGE_API_URL ?? 'https://clusage.com';

export function configDir(): string {
  // Respect XDG; default to ~/.config/clusage
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  return join(base, 'clusage');
}

export function configPath(): string {
  return join(configDir(), 'config.json');
}

export function loadConfig(): CliConfig {
  const path = configPath();
  if (!existsSync(path)) {
    return { apiUrl: DEFAULT_API_URL };
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<CliConfig>;
    return { apiUrl: DEFAULT_API_URL, ...raw };
  } catch {
    return { apiUrl: DEFAULT_API_URL };
  }
}

export function saveConfig(config: CliConfig): void {
  const dir = configDir();
  mkdirSync(dir, { recursive: true });
  const path = configPath();
  writeFileSync(path, JSON.stringify(config, null, 2), { mode: 0o600 });
  try {
    chmodSync(path, 0o600); // token lives here — keep it user-only
  } catch {
    /* best effort on platforms without chmod */
  }
}

/**
 * Returns a stable, salted hash of this machine's hostname. The salt is random
 * and generated once, so the value is opaque and not reversible to a hostname.
 * Persisted in config the first time it's computed.
 */
export function getOrCreateMachineId(config: CliConfig): { machineId: string; config: CliConfig } {
  if (config.machineId && config.machineSalt) {
    return { machineId: config.machineId, config };
  }
  const machineSalt = config.machineSalt ?? randomBytes(16).toString('hex');
  const digest = createHash('sha256')
    .update(machineSalt)
    .update(':')
    .update(hostname())
    .digest('hex')
    .slice(0, 24);
  const machineId = `machine_${digest}`;
  const next = { ...config, machineId, machineSalt };
  saveConfig(next);
  return { machineId, config: next };
}
