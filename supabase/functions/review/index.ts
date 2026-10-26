/* استقبال التقييمات. الشارة "ضغط تحميل" بتتحسب هنا من إثبات موقّع، مش من حاجة العميل بيقولها. */
import { clip, isVisitorId, verifyProof } from '../_shared/logic.ts';
import { PROOF_SECRET, allow, clientKey, configured, corsHeaders, isAllowedOrigin, json, saveReview } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, cors);
  if (!isAllowedOrigin(origin)) return json({ error: 'forbidden' }, 403, {});
  if (!configured()) return json({ error: 'not configured' }, 503, cors);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, cors); }

  if (body.website) return json({ ok: true }, 200, cors); /* حقل البوتات المخفي: نتجاهل بصمت */

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  const rating = body.rating;
  const visitorId = body.visitor_id;
  if (!name || name.length > 60 || comment.length > 500 || !Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5 || !isVisitorId(visitorId)) {
    return json({ error: 'invalid' }, 400, cors);
  }

  if (!(await allow(`rev:${await clientKey(req)}`, 3600, 10))) return json({ error: 'rate' }, 429, cors);
  if (!(await allow(`revv:${visitorId}`, 3600, 5))) return json({ error: 'rate' }, 429, cors);

  const verified = await verifyProof(body.proof, visitorId, PROOF_SECRET, Math.floor(Date.now() / 1000));
  const ok = await saveReview({ p_name: name, p_rating: rating, p_comment: clip(comment, 500), p_visitor_id: visitorId, p_verified: verified });
  return ok ? json({ ok: true }, 200, cors) : json({ error: 'save' }, 500, cors);
});
