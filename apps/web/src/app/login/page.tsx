'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold tracking-tight">Sign in to clusage</h1>

      {status === 'sent' ? (
        <div className="rounded-md border border-[var(--color-panel)] bg-[var(--color-panel)] p-4">
          <p className="font-medium">Check your email ✉️</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            We sent a sign-in link to <span className="text-[var(--color-fg)]">{email}</span>. It
            expires in 15 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-sm text-[var(--color-muted)]" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-[var(--color-panel)] bg-[var(--color-panel)] px-3 py-2 outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="rounded-md bg-orange-500 px-4 py-2 font-medium text-black hover:bg-orange-400 disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {status === 'error' && (
            <p className="text-sm text-red-400">Something went wrong. Try again.</p>
          )}
        </form>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        No password needed. We email you a one-time sign-in link.
      </p>
    </main>
  );
}
