import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** URL-safe random string of n bytes (hex). */
export function randomHex(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Mint an API token. Returns the plaintext (shown to the user ONCE), its sha256
 * hash (stored), and a display prefix like "clst_a1b2".
 */
export function mintApiToken(): { token: string; hash: string; prefix: string } {
  const secret = randomBytes(24).toString('base64url'); // 32 chars, URL-safe
  const token = `clst_${secret}`;
  return { token, hash: sha256hex(token), prefix: token.slice(0, 9) };
}

export function hmacSign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
