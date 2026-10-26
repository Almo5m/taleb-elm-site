/* تسجيل أحداث الموقع. الموقع مبقاش يكتب في الجدول مباشرة؛ كل حدث بيعدّي من هنا. */
import { EVENT_TYPES, clip, isVisitorId, signProof } from '../_shared/logic.ts';
import { PROOF_SECRET, allow, clientKey, configured, corsHeaders, insertEvent, isAllowedOrigin, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, cors);
  if (!isAllowedOrigin(origin)) return json({ error: 'forbidden' }, 403, {});
  if (!configured()) return json({ error: 'not configured' }, 503, cors);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, cors); }

  const visitorId = body.visitor_id;
  const type = body.event_type;
  if (!isVisitorId(visitorId) || typeof type !== 'string' || !EVENT_TYPES.includes(type)) {
    return json({ error: 'invalid' }, 400, cors);
  }

  /* حدود سخية لأن شبكات الموبايل في مصر بتشارك IP واحد بين ناس كتير */
  if (!(await allow(`ev:${await clientKey(req)}`, 60, 120))) return json({ error: 'rate' }, 429, cors);
  if (!(await allow(`vis:${visitorId}`, 60, 30))) return json({ error: 'rate' }, 429, cors);

  const saved = await insertEvent({
    visitor_id: visitorId,
    event_type: type,
    page: clip(body.page, 200),
    referrer: clip(body.referrer, 500),
    user_agent: clip(req.headers.get('user-agent'), 300),
  });
  if (!saved) return json({ error: 'save' }, 500, cors);

  const proof = type === 'download_clicked' ? await signProof(visitorId, PROOF_SECRET, Math.floor(Date.now() / 1000)) : undefined;
  return json({ ok: true, proof }, 200, cors);
});
