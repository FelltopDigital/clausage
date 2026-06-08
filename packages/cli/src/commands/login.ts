import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { loadConfig, saveConfig } from '../config.js';

/** Read a value from argv, env, or interactively. */
async function readToken(provided?: string): Promise<string> {
  if (provided) return provided.trim();
  if (process.env.CLUSAGE_TOKEN) return process.env.CLUSAGE_TOKEN.trim();
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question('Paste your clusage token (clst_...): ');
    return answer.trim();
  } finally {
    rl.close();
  }
}

export async function loginCommand(tokenArg?: string): Promise<void> {
  const token = await readToken(tokenArg);
  if (!token) {
    console.error('No token provided. Get one at your clusage dashboard, then run `clusage login`.');
    process.exitCode = 1;
    return;
  }
  if (!token.startsWith('clst_')) {
    console.error('That does not look like a clusage token (expected it to start with "clst_").');
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  saveConfig({ ...config, token });
  console.log('✓ Token saved. Run `clusage sync` to push your usage.');
}
