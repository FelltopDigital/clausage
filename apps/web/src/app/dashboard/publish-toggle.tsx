'use client';

import { useState } from 'react';

export function PublishToggle({
  isPublic,
  isPaid,
  publicUrl,
  username,
}: {
  isPublic: boolean;
  isPaid: boolean;
  publicUrl: string;
  username: string;
}) {
  const [pub, setPub] = useState(isPublic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.url) {
        window.location.href = json.url;
      } else {
        setError(json.error ?? 'Checkout is not available yet.');
        setBusy(false);
      }
    } catch {
      setError('Could not start checkout.');
      setBusy(false);
    }
  }

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isPublic: next }),
    });
    setBusy(false);
    if (res.ok) {
      setPub(next);
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Could not update.');
    }
  }

  return (
    <div className="rounded-md border border-[var(--color-panel)] bg-[var(--color-panel)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{pub ? 'Public' : 'Private'}</p>
          <p className="text-sm text-[var(--color-muted)]">
            {pub ? 'Anyone with the link can see your grid.' : 'Only you can see your grid.'}
          </p>
        </div>

        {isPaid ? (
          <button
            onClick={() => toggle(!pub)}
            disabled={busy}
            className={`rounded-md px-4 py-2 font-medium disabled:opacity-60 ${
              pub
                ? 'border border-[var(--color-muted)] hover:bg-[var(--color-bg)]'
                : 'bg-orange-500 text-black hover:bg-orange-400'
            }`}
          >
            {pub ? 'Make private' : 'Make public'}
          </button>
        ) : (
          <button
            onClick={startCheckout}
            disabled={busy}
            className="rounded-md bg-orange-500 px-4 py-2 font-medium text-black hover:bg-orange-400 disabled:opacity-60"
          >
            {busy ? '…' : 'Publish — $2.99'}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-[var(--color-muted)]">Your page:</span>
        <a href={`/u/${username}`} className="text-orange-400 hover:underline">
          {publicUrl}
        </a>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
