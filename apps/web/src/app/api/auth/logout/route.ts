import { NextResponse } from 'next/server';
import { env } from '@/env';
import { destroySession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  await destroySession();
  return NextResponse.redirect(`${env.APP_URL.replace(/\/$/, '')}/`, { status: 303 });
}
