import { aggregateFileContents, SyncPayloadSchema, TRAILING_WINDOW_DAYS } from '@clusage/shared';
import { loadConfig, getOrCreateMachineId } from '../config.js';
import { findLogFiles, readLogContents } from '../logs.js';
import { postSync, ApiError } from '../api.js';
import { currentStreak, localToday, sumField, formatTokens, formatNumber } from '../util.js';
import { CLI_VERSION } from '../version.js';

export interface SyncOptions {
  dryRun?: boolean;
}

export async function syncCommand(opts: SyncOptions = {}): Promise<void> {
  const config = loadConfig();

  if (!opts.dryRun && !config.token) {
    console.error('Not logged in. Run `clusage login` first.');
    process.exitCode = 1;
    return;
  }

  const files = findLogFiles();
  if (files.length === 0) {
    console.error(
      'No Claude Code logs found under ~/.claude/projects. Use Claude Code first, then sync.',
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Reading ${files.length} session log${files.length === 1 ? '' : 's'}… `);
  const days = aggregateFileContents(readLogContents(files), {
    windowDays: TRAILING_WINDOW_DAYS,
  });
  console.log('done.');

  // Validate locally before sending — fail fast and prove the contract.
  const { machineId } = getOrCreateMachineId(config);
  const payload = SyncPayloadSchema.parse({
    machineId,
    cliVersion: CLI_VERSION,
    days,
  });

  const today = localToday();
  const streak = currentStreak(days, today);
  const totalMessages = sumField(days, 'messages');
  const totalTokens = sumField(days, 'inputTokens') + sumField(days, 'outputTokens');

  if (opts.dryRun) {
    console.log('\nDry run — nothing sent. Computed payload:');
    console.log(`  machineId:   ${machineId}`);
    console.log(`  active days: ${days.length}`);
    console.log(`  messages:    ${formatNumber(totalMessages)}`);
    console.log(`  tokens:      ${formatTokens(totalTokens)}`);
    console.log(`  streak:      ${streak} day${streak === 1 ? '' : 's'}`);
    return;
  }

  try {
    const res = await postSync(config.apiUrl, config.token!, payload);
    console.log('\n✓ Synced.');
    console.log(`  ${res.daysUpserted} day${res.daysUpserted === 1 ? '' : 's'} updated`);
    console.log(`  ${formatNumber(totalMessages)} messages · ${formatTokens(totalTokens)} tokens`);
    console.log(`  current streak: ${streak} day${streak === 1 ? '' : 's'} 🔥`);
    console.log(`\n  ${config.apiUrl.replace(/\/$/, '')}/u/${res.username}`);
  } catch (err) {
    if (err instanceof ApiError) {
      console.error(`\n✗ ${err.message}`);
      if (err.status === 401) console.error('  Run `clusage login` with a fresh token.');
    } else {
      console.error(`\n✗ Could not reach ${config.apiUrl}. ${(err as Error).message}`);
    }
    process.exitCode = 1;
  }
}
