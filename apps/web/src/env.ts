/**
 * Central environment access. Everything is optional at import time so the app
 * builds without secrets; helpers throw only when a feature is actually used.
 * See .env.example / SETUP.md for what each one is.
 */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  AUTH_SECRET: process.env.AUTH_SECRET ?? 'dev-insecure-secret-change-me',

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'clausage <login@clausage.com>',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
};

export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. See SETUP.md.`);
  }
  return value as NonNullable<(typeof env)[K]>;
}

/** True when running with a real email provider configured. */
export const emailConfigured = Boolean(env.RESEND_API_KEY);
/** True when Stripe is configured. */
export const stripeConfigured = Boolean(
  env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID && env.STRIPE_WEBHOOK_SECRET,
);
