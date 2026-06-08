import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { getDailyTotals, summarize } from '@/lib/usage';
import { buildYearGrid, colorFor, indexByDate } from '@/lib/grid';
import { formatNumber, formatTokens, todayUTC } from '@/lib/format';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'clusage activity grid';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username.toLowerCase()))
    .limit(1);
  const user = rows[0];

  if (!user || !user.username || !user.isPublic) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b0d10',
            color: '#e6e8eb',
            fontSize: 48,
          }}
        >
          clusage
        </div>
      ),
      size,
    );
  }

  const days = await getDailyTotals(user.id);
  const summary = summarize(days, todayUTC());
  const byDate = indexByDate(days);
  const { columns } = buildYearGrid(byDate, new Date(), 53);

  const cell = 16;
  const gap = 4;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0b0d10',
          color: '#e6e8eb',
          padding: 60,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 64, fontWeight: 700 }}>{user.username}</div>
            <div style={{ fontSize: 28, color: '#8b929c', marginTop: 8 }}>
              Claude Code activity
            </div>
          </div>
          <div style={{ fontSize: 30, color: '#fb923c', fontWeight: 700 }}>clusage</div>
        </div>

        <div style={{ display: 'flex', gap: 40, margin: '40px 0' }}>
          <Stat label="messages" value={formatNumber(summary.totalMessages)} />
          <Stat label="tokens" value={formatTokens(summary.totalTokens)} />
          <Stat label="streak" value={`${summary.currentStreak}d`} />
          <Stat label="active days" value={String(summary.activeDays)} />
        </div>

        <div style={{ display: 'flex', gap }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap }}>
              {col.map((c, ri) => (
                <div
                  key={ri}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: 3,
                    background: c.date === null ? 'transparent' : colorFor(c.messages, user.theme),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 44, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 24, color: '#8b929c' }}>{label}</div>
    </div>
  );
}
