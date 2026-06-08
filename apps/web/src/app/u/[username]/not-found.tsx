import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">Nothing here</h1>
      <p className="text-[var(--color-muted)]">
        This profile doesn&apos;t exist or isn&apos;t public yet.
      </p>
      <Link href="/" className="text-orange-400 hover:underline">
        ← clusage
      </Link>
    </main>
  );
}
