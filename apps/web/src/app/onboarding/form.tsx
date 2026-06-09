'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OnboardingForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/username', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Could not save username');
        setSaving(false);
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Network error');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex items-center rounded-md border border-[var(--color-panel)] bg-[var(--color-panel)] px-3 focus-within:border-orange-500">
        <span className="text-[var(--color-muted)]">clausage.com/u/</span>
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="yourname"
          className="flex-1 bg-transparent py-2 outline-none"
          pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
          minLength={3}
          maxLength={30}
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-orange-500 px-4 py-2 font-medium text-black hover:bg-orange-400 hover:cursor-pointer disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Claim username'}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-[var(--color-muted)]">
        Lowercase letters, numbers and hyphens. 3–30 characters.
      </p>
    </form>
  );
}
