import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'clausage — your Claude Code activity grid',
  description:
    'Turn your local Claude Code usage into a shareable, contribution-style grid for your bio. Privacy-first: only daily counts leave your machine.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
