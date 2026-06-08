import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { getDailyTotals, summarize } from '@/lib/usage';
import { renderBadgeSvg } from '@/lib/badge';
import { todayUTC } from '@/lib/format';

export const runtime = 'nodejs';
// Regenerate at most once a day; sync revalidates this path on a fresh push.
export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username.toLowerCase()))
    .limit(1);
  const user = rows[0];

  if (!user || !user.username || !user.isPublic) {
    return new Response('Not found', { status: 404 });
  }

  const days = await getDailyTotals(user.id);
  const summary = summarize(days, todayUTC());
  const svg = renderBadgeSvg(user.username, days, user.theme, summary, new Date());

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      // CDN caches a day; serves stale while revalidating for a week.
      'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
