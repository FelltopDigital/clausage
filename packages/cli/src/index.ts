#!/usr/bin/env node
import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { syncCommand } from './commands/sync.js';
import { statusCommand } from './commands/status.js';
import { CLI_VERSION } from './version.js';

const program = new Command();

program
  .name('clausage')
  .description('Sync your local Claude Code usage to clausage.com — a shareable activity grid.')
  .version(CLI_VERSION);

program
  .command('login')
  .description('Save your clausage API token (clst_...) to ~/.config/clausage')
  .argument('[token]', 'token to save (otherwise prompts / reads $CLAUSAGE_TOKEN)')
  .action(async (token?: string) => {
    await loginCommand(token);
  });

program
  .command('sync')
  .description('Parse local logs and push daily counts to clausage')
  .option('--dry-run', 'compute and print the payload without sending it')
  .action(async (opts: { dryRun?: boolean }) => {
    await syncCommand({ dryRun: opts.dryRun });
  });

program
  .command('status')
  .description('Show login state and a local summary of your usage')
  .action(async () => {
    await statusCommand();
  });

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
