import { aggregateFileContents, TRAILING_WINDOW_DAYS } from '@clausage/shared';
import { loadConfig, getOrCreateMachineId } from '../config.js';
import { findLogFiles, readLogContents } from '../logs.js';
import { currentStreak, localToday, sumField, formatTokens, formatNumber } from '../util.js';

export async function statusCommand(): Promise<void> {
  const config = loadConfig();
  const loggedIn = Boolean(config.token);

  console.log('clausage status');
  console.log('──────────────');
  console.log(`  endpoint:  ${config.apiUrl}`);
  console.log(`  logged in: ${loggedIn ? 'yes' : 'no — run `clausage login`'}`);

  const files = findLogFiles();
  if (files.length === 0) {
    console.log('  logs:      none found under ~/.claude/projects');
    return;
  }

  const days = aggregateFileContents(readLogContents(files), {
    windowDays: TRAILING_WINDOW_DAYS,
  });
  const { machineId } = getOrCreateMachineId(config);
  const today = localToday();
  const streak = currentStreak(days, today);
  const totalMessages = sumField(days, 'messages');
  const totalTokens = sumField(days, 'inputTokens') + sumField(days, 'outputTokens');
  const lastActive = days.length ? days[days.length - 1]!.date : 'never';

  console.log(`  machine:   ${machineId}`);
  console.log(`  logs:      ${files.length} session files`);
  console.log('');
  console.log(`  active days (last ${TRAILING_WINDOW_DAYS}): ${days.length}`);
  console.log(`  messages:                  ${formatNumber(totalMessages)}`);
  console.log(`  tokens:                    ${formatTokens(totalTokens)}`);
  console.log(`  current streak:            ${streak} day${streak === 1 ? '' : 's'}`);
  console.log(`  last active:               ${lastActive}`);

  if (!loggedIn) {
    console.log('\nRun `clausage login` then `clausage sync` to publish.');
  }
}
