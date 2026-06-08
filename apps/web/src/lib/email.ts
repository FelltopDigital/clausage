import { env, emailConfigured } from '../env';

/**
 * Send a magic-link email via Resend. If Resend isn't configured (local dev),
 * the link is logged to the server console so the flow still works end-to-end.
 */
export async function sendMagicLink(email: string, url: string): Promise<void> {
  if (!emailConfigured) {
    console.log('\n────────────────────────────────────────────────────────');
    console.log('  [dev] Magic link (no RESEND_API_KEY set):');
    console.log(`  to: ${email}`);
    console.log(`  ${url}`);
    console.log('────────────────────────────────────────────────────────\n');
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Your clusage sign-in link',
    text: `Click to sign in to clusage:\n\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="margin:0 0 12px">Sign in to clusage</h2>
        <p style="color:#444">Click the button below to sign in. This link expires in 15 minutes.</p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#f97316;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a>
        </p>
        <p style="color:#888;font-size:13px">If you didn't request this, you can ignore this email.</p>
      </div>`,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
