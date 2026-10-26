/* اختبار المنطق النقي: node tests/logic.test.mjs */
import assert from 'node:assert/strict';
import { isVisitorId, clip, originAllowed, signProof, verifyProof, ipHash, PROOF_MAX_AGE_SEC } from '../supabase/functions/_shared/logic.ts';

const SECRET = 'x'.repeat(40), NOW = 1_800_000_000, V = '3f1c2a9e-1111-4222-8333-444455556666';

assert.ok(isVisitorId(V) && isVisitorId('anon-abc123xyz') && isVisitorId('v-1730000000000-ab12cd'));
assert.ok(!isVisitorId('short') && !isVisitorId('a'.repeat(65)) && !isVisitorId("x'; drop table--") && !isVisitorId(null));
assert.equal(clip('abcdef', 3), 'abc'); assert.equal(clip('', 3), null); assert.equal(clip(5, 3), null);
assert.ok(originAllowed('https://almo5m.github.io', ['https://almo5m.github.io']));
assert.ok(!originAllowed('https://evil.com', ['https://almo5m.github.io']) && !originAllowed(null, ['x']));

const proof = await signProof(V, SECRET, NOW);
assert.ok(await verifyProof(proof, V, SECRET, NOW + 60), 'proof صحيح');
assert.ok(!(await verifyProof(proof, 'other-visitor-id-1234', SECRET, NOW + 60)), 'زائر تاني');
assert.ok(!(await verifyProof(proof, V, 'y'.repeat(40), NOW + 60)), 'سر تاني');
assert.ok(!(await verifyProof(proof.slice(0, -2) + 'AA', V, SECRET, NOW + 60)), 'توقيع متعدّل');
assert.ok(!(await verifyProof(`${NOW + 99999}.${proof.split('.')[1]}`, V, SECRET, NOW)), 'وقت في المستقبل');
assert.ok(!(await verifyProof(proof, V, SECRET, NOW + PROOF_MAX_AGE_SEC + 10)), 'منتهي');
assert.ok(!(await verifyProof('garbage', V, SECRET, NOW)) && !(await verifyProof(undefined, V, SECRET, NOW)));

const a = await ipHash('1.2.3.4', 'salt', '2026-10-25');
assert.equal(a, await ipHash('1.2.3.4', 'salt', '2026-10-25'));
assert.notEqual(a, await ipHash('1.2.3.4', 'salt', '2026-10-26'), 'الملح بيتغيّر كل يوم');
assert.notEqual(a, await ipHash('1.2.3.5', 'salt', '2026-10-25'));
console.log('كل الاختبارات نجحت');
