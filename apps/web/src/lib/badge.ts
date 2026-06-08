import type { DailyUsage } from '@clausage/shared';
import { buildYearGrid, colorFor, indexByDate, themeColors } from './grid';
import { formatNumber, formatTokens } from './format';
import type { UsageSummary } from './usage';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render a self-contained, cacheable SVG badge: a title line of stats plus a
 * GitHub-style annual heatmap. Pure (no client), so it embeds in READMEs.
 */
export function renderBadgeSvg(
  username: string,
  days: DailyUsage[],
  theme: string,
  summary: UsageSummary,
  endDate: Date,
): string {
  const byDate = indexByDate(days);
  const weeks = 53;
  const { columns } = buildYearGrid(byDate, endDate, weeks);

  const cell = 10;
  const gap = 2;
  const pad = 14;
  const headerH = 46;
  const gridW = columns.length * (cell + gap) - gap;
  const gridH = 7 * (cell + gap) - gap;
  const width = gridW + pad * 2;
  const height = headerH + gridH + pad * 2;
  const palette = themeColors(theme);

  const rects: string[] = [];
  columns.forEach((col, ci) => {
    col.forEach((c, ri) => {
      if (c.date === null) return;
      const x = pad + ci * (cell + gap);
      const y = headerH + pad + ri * (cell + gap);
      rects.push(
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${colorFor(c.messages, theme)}"/>`,
      );
    });
  });

  const stats = `${formatNumber(summary.totalMessages)} messages · ${formatTokens(
    summary.totalTokens,
  )} tokens · ${summary.currentStreak}d streak`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="clausage activity for ${esc(username)}">
  <rect width="${width}" height="${height}" rx="8" fill="#0b0d10"/>
  <text x="${pad}" y="${pad + 12}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="14" font-weight="700" fill="#e6e8eb">${esc(username)}</text>
  <text x="${pad}" y="${pad + 30}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" fill="#8b929c">${esc(stats)}</text>
  <text x="${width - pad}" y="${pad + 12}" text-anchor="end" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="10" fill="${palette[3]}">clausage</text>
  ${rects.join('\n  ')}
</svg>`;
}
