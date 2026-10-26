/* أدوات مشتركة بين الدالتين: CORS و Origin و التواصل مع قاعدة البيانات بصلاحية السيرفر */
import { ipHash, originAllowed } from './logic.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
export const PROOF_SECRET = Deno.env.get('PROOF_SECRET') ?? '';
const IP_SALT = Deno.env.get('IP_SALT') ?? '';
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://almo5m.github.io').split(',').map((s) => s.trim());

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!originAllowed(origin, ALLOWED)) return {};
  return {
    'Access-Control-Allow-Origin': origin!,
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

export function isAllowedOrigin(origin: string | null): boolean {
  return originAllowed(origin, ALLOWED);
}

export function configured(): boolean {
  return PROOF_SECRET.length >= 32 && IP_SALT.length >= 16;
}

export async function clientKey(req: Request): Promise<string> {
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  return await ipHash(ip, IP_SALT, new Date().toISOString().slice(0, 10));
}

async function rest(path: string, body: unknown, prefer?: string): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: JSON.stringify(body),
  });
}

/* true لو لسه في الحد المسموح. أي خطأ في القاعدة = رفض (بنفشل بأمان) */
export async function allow(key: string, seconds: number, limit: number): Promise<boolean> {
  const res = await rest('rpc/hit_rate', { p_key: key, p_seconds: seconds, p_limit: limit });
  return res.ok && (await res.json()) === true;
}

export async function insertEvent(row: Record<string, unknown>): Promise<boolean> {
  return (await rest('site_events', row, 'return=minimal')).ok;
}

export async function saveReview(args: Record<string, unknown>): Promise<boolean> {
  return (await rest('rpc/submit_review_verified', args)).ok;
}
