'use client';

import { useState } from 'react';

interface TokenRow {
  id: string;
  prefix: string;
  label: string | null;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
}

export function TokenManager({ initialTokens }: { initialTokens: TokenRow[] }) {
  const [tokens, setTokens] = useState<TokenRow[]>(initialTokens);
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function mint() {
    setBusy(true);
    const res = await fetch('/api/tokens', { method: 'POST', body: '{}' });
    const json = await res.json();
    setBusy(false);
    if (res.ok) {
      setFresh(json.token);
      setTokens((t) => [
        { id: json.id, prefix: json.prefix, label: 'CLI token', lastUsedAt: null, createdAt: new Date() },
        ...t,
      ]);
    }
  }

  async function revoke(id: string) {
    const res = await fetch('/api/tokens', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setTokens((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {fresh && (
        <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3">
          <p className="text-sm font-medium">Copy your token now — it won&apos;t be shown again:</p>
          <code className="mt-2 block break-all rounded bg-[var(--color-bg)] p-2 text-sm">
            {fresh}
          </code>
        </div>
      )}

      <button
        onClick={mint}
        disabled={busy}
        className="self-start rounded-md bg-orange-500 px-4 py-2 font-medium text-black hover:bg-orange-400 hover:cursor-pointer disabled:opacity-60"
      >
        {busy ? 'Generating…' : 'Generate token'}
      </button>

      {tokens.length > 0 && (
        <ul className="divide-y divide-[var(--color-panel)] rounded-md border border-[var(--color-panel)]">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <code className="text-[var(--color-fg)]">{t.prefix}…</code>
                <span className="ml-2 text-[var(--color-muted)]">
                  {t.lastUsedAt ? 'used' : 'never used'}
                </span>
              </div>
              <button
                onClick={() => revoke(t.id)}
                className="text-[var(--color-muted)] hover:text-red-400 hover:cursor-pointer"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
