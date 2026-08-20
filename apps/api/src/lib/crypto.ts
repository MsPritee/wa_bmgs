import { createHmac, timingSafeEqual } from 'node:crypto';

export function hashSecret(secret: string): string {
  return createHmac('sha256', secret).digest('base64');
}

export function verifySignature(rawBody: string, appSecret: string, providedSignature: string | undefined): boolean {
  if (!providedSignature) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(providedSignature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}