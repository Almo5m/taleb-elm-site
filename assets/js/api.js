/* =====================================================================
   التواصل مع دوال Supabase Edge (track و review) + حفظ إثبات التحميل.
   الإثبات موقّع من السيرفر لما يسجّل ضغطة تحميل، وبيتبعت مع التقييم
   عشان السيرفر يتأكد منه — مفيش حاجة هنا العميل يقدر يتحايل بيها.
   ===================================================================== */
var Api = (function(){
  var PROOF_KEY = 'ti_dlproof';

  function post(name, body){
    return fetch(FUNCTIONS_URL + '/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      keepalive: true,
      body: JSON.stringify(body)
    });
  }
  function saveProof(p){ try{ localStorage.setItem(PROOF_KEY, p); }catch(e){} }
  function getProof(){ try{ return localStorage.getItem(PROOF_KEY) || null; }catch(e){ return null; } }

  return { post: post, saveProof: saveProof, getProof: getProof };
})();
