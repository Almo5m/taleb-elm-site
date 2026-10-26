/* منطق نقي (من غير أي اعتماد على Deno) عشان نقدر نختبره بـ node. */

export const EVENT_TYPES = ['page_view', 'reached_download', 'download_clicked', 'whatsapp_followed'];
export const PROOF_MAX_AGE_SEC = 180 * 24 * 3600;

export function isVisitorId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v);
}

export function clip(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;
}

export function originAllowed(origin: string | null, allowed: string[]): boolean {
  return origin !== null && allowed.includes(origin);
}

const enc = new TextEncoder();

function toB64Url(buf: ArrayBuffer): string {
  let s = '';
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toB64Url(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/* إثبات إن السيرفر نفسه سجّل ضغطة تحميل لزائر معيّن — مينفعش يتعمل من غير السر */
export async function signProof(visitorId: string, secret: string, nowSec: number): Promise<string> {
  return `${nowSec}.${await hmac(secret, `${visitorId}.${nowSec}`)}`;
}

export async function verifyProof(proof: unknown, visitorId: string, secret: string, nowSec: number): Promise<boolean> {
  if (typeof proof !== 'string' || proof.length > 200) return false;
  const [issuedStr, mac] = proof.split('.');
  const issued = Number(issuedStr);
  if (!Number.isInteger(issued) || !mac) return false;
  if (issued > nowSec + 300 || nowSec - issued > PROOF_MAX_AGE_SEC) return false;
  const expected = await hmac(secret, `${visitorId}.${issued}`);
  if (expected.length !== mac.length) return false;
  let diff = 0; /* مقارنة بزمن ثابت */
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ mac.charCodeAt(i);
  return diff === 0;
}

/* الـ IP مبيتخزّنش أبدًا: بنعمل منه هاش بملح بيتغيّر كل يوم ونستخدمه للعدّ بس */
export async function ipHash(ip: string, secret: string, day: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`${secret}|${day}|${ip}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
