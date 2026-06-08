import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { OnboardingForm } from './form';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.username) redirect('/dashboard');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pick your username</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          This is your public URL: clusage.com/u/<span className="text-[var(--color-fg)]">you</span>
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
