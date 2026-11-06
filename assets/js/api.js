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
  /* بيحوّل أي فشل لرسالة تفهّم السبب الحقيقي، وبيسجّل التفاصيل في الـ console */
  function httpError(res){
    var err = new Error('http ' + res.status);
    err.status = res.status;
    return err;
  }
  function explain(err){
    var status = err && err.status;
    console.warn('[api] فشل الإرسال', status || err);
    if(status === 429) return 'بعتّ تقييمات كتير. جرّب بعد ساعة.';
    if(status === 400) return 'في بيان مش مظبوط. راجع الاسم والنجوم وجرّب تاني.';
    if(status) return 'في مشكلة عندنا في السيرفر، مش من النت عندك. جرّب بعد شوية.';
    if(navigator.onLine === false) return 'النت فاصل. اتأكد من الاتصال وجرّب تاني.';
    return 'مقدرناش نوصل للسيرفر. جرّب بعد شوية.';
  }
  function saveProof(p){ try{ localStorage.setItem(PROOF_KEY, p); }catch(e){} }
  function getProof(){ try{ return localStorage.getItem(PROOF_KEY) || null; }catch(e){ return null; } }

  return { post: post, httpError: httpError, explain: explain, saveProof: saveProof, getProof: getProof };
})();
