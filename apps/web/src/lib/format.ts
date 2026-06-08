export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Local "today" as YYYY-MM-DD (server uses UTC; fine for grid bucketing). */
export function todayUTC(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
