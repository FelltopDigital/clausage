import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">clausage</h1>
        <p className="mt-3 text-lg text-[var(--color-muted)]">
          Your Claude Code activity, as a shareable contribution grid.
        </p>
      </div>

      <ol className="space-y-3 text-[var(--color-fg)]">
        <li>
          <span className="font-mono text-[var(--color-muted)]">1.</span> Sign in with a magic link
          and pick a username.
        </li>
        <li>
          <span className="font-mono text-[var(--color-muted)]">2.</span> Run{' '}
          <code className="rounded bg-[var(--color-panel)] px-1.5 py-0.5">npx clausage sync</code>.
        </li>
        <li>
          <span className="font-mono text-[var(--color-muted)]">3.</span> Share{' '}
          <code className="rounded bg-[var(--color-panel)] px-1.5 py-0.5">clausage.com/u/you</code>{' '}
          and a README badge.
        </li>
      </ol>

      <p className="text-sm text-[var(--color-muted)]">
        Privacy-first: only daily numeric counts ever leave your machine — never prompts, code, or
        file contents.
      </p>

      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-orange-500 px-4 py-2 font-medium text-black hover:bg-orange-400"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-[var(--color-panel)] px-4 py-2 font-medium hover:bg-[var(--color-panel)]"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
