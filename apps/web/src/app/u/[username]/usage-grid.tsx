'use client';

import { useMemo, useState } from 'react';
import type { DailyUsage } from '@clausage/shared';
import {
  BUCKET_LABELS,
  buildMonthGrid,
  buildYearGrid,
  colorFor,
  indexByDate,
  levelForMessages,
  parseYMD,
  themeColors,
} from '@/lib/grid';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function UsageGrid({
  days,
  theme,
  today,
}: {
  days: DailyUsage[];
  theme: string;
  today: string;
}) {
  const [view, setView] = useState<'annual' | 'month'>('annual');
  const byDate = useMemo(() => indexByDate(days), [days]);
  const palette = themeColors(theme);

  const todayDate = parseYMD(today);
  const [cursor, setCursor] = useState({
    year: todayDate.getUTCFullYear(),
    month: todayDate.getUTCMonth(),
  });

  return (
    <div className="rounded-lg border border-[var(--color-panel)] bg-[var(--color-panel)]/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <Toggle view={view} setView={setView} />
        {view === 'month' && (
          <MonthPager cursor={cursor} setCursor={setCursor} earliest={days[0]?.date} today={today} />
        )}
      </div>

      {view === 'annual' ? (
        <AnnualGrid byDate={byDate} theme={theme} today={todayDate} />
      ) : (
        <MonthGrid byDate={byDate} theme={theme} year={cursor.year} month={cursor.month} />
      )}

      <Legend palette={palette} />
    </div>
  );
}

function Toggle({
  view,
  setView,
}: {
  view: 'annual' | 'month';
  setView: (v: 'annual' | 'month') => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-[var(--color-panel)]">
      {(['annual', 'month'] as const).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`px-3 py-1 text-sm capitalize hover:cursor-pointer ${
            view === v ? 'bg-orange-500 text-black' : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function MonthPager({
  cursor,
  setCursor,
  earliest,
  today,
}: {
  cursor: { year: number; month: number };
  setCursor: (c: { year: number; month: number }) => void;
  earliest?: string;
  today: string;
}) {
  const todayDate = parseYMD(today);
  const atLatest =
    cursor.year === todayDate.getUTCFullYear() && cursor.month === todayDate.getUTCMonth();
  const earliestDate = earliest ? parseYMD(earliest) : todayDate;
  const atEarliest =
    cursor.year === earliestDate.getUTCFullYear() && cursor.month === earliestDate.getUTCMonth();

  const step = (delta: number) => {
    const d = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        onClick={() => step(-1)}
        disabled={atEarliest}
        className="px-2 text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:cursor-pointer disabled:opacity-30"
      >
        ←
      </button>
      <span className="min-w-[8.5rem] text-center font-medium">
        {MONTH_NAMES[cursor.month]} {cursor.year}
      </span>
      <button
        onClick={() => step(1)}
        disabled={atLatest}
        className="px-2 text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:cursor-pointer disabled:opacity-30"
      >
        →
      </button>
    </div>
  );
}

function AnnualGrid({
  byDate,
  theme,
  today,
}: {
  byDate: Map<string, DailyUsage>;
  theme: string;
  today: Date;
}) {
  const { columns, monthLabels } = buildYearGrid(byDate, today);
  const cell = 12;
  const gap = 3;
  const width = columns.length * (cell + gap);
  const height = 7 * (cell + gap);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height + 18} className="block">
        {monthLabels.map((m) => (
          <text
            key={`${m.col}-${m.label}`}
            x={m.col * (cell + gap)}
            y={10}
            className="fill-[var(--color-muted)]"
            fontSize={9}
          >
            {m.label}
          </text>
        ))}
        <g transform="translate(0, 16)">
          {columns.map((col, ci) =>
            col.map((c, ri) =>
              c.date === null ? null : (
                <rect
                  key={`${ci}-${ri}`}
                  x={ci * (cell + gap)}
                  y={ri * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={2}
                  fill={colorFor(c.messages, theme)}
                >
                  <title>
                    {c.date}: {c.messages} message{c.messages === 1 ? '' : 's'}
                  </title>
                </rect>
              ),
            ),
          )}
        </g>
      </svg>
    </div>
  );
}

function MonthGrid({
  byDate,
  theme,
  year,
  month,
}: {
  byDate: Map<string, DailyUsage>;
  theme: string;
  year: number;
  month: number;
}) {
  const weeks = buildMonthGrid(byDate, year, month);
  return (
    <div className="inline-block">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] text-[var(--color-muted)]">
            {w}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((c, di) =>
              c.date === null ? (
                <div key={di} className="h-9 w-9" />
              ) : (
                <div
                  key={di}
                  title={`${c.date}: ${c.messages} messages`}
                  className="flex h-9 w-9 items-center justify-center rounded text-[10px]"
                  style={{ backgroundColor: colorFor(c.messages, theme), color: levelForMessages(c.messages) >= 3 ? '#000' : 'var(--color-muted)' }}
                >
                  {Number(c.date.slice(-2))}
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ palette }: { palette: string[] }) {
  return (
    <div className="mt-4 flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
      <span>Less</span>
      {palette.map((c, i) => (
        <span
          key={i}
          title={BUCKET_LABELS[i]}
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: c }}
        />
      ))}
      <span>More</span>
    </div>
  );
}
