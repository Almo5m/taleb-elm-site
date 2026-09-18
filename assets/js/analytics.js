/* =====================================================================
   تتبّع بسيط وخاص: بيسجّل زيارة الصفحة، ووصول المستخدم لمرحلة التحميل،
   والتحميل الفعلي، ومتابعة قناة الواتساب. مفيش أي بيانات شخصية بتتسجل —
   بس معرّف عشوائي مخزّن في المتصفح عشان نعرف نفرّق زائر عن التاني.

   ملحوظة عن "الزيارات": زيارة الصفحة (page_view) بتتسجل مرة واحدة بس في
   اليوم لكل زائر، حتى لو فتح الصفحة أو عمل ريفرش عشر مرات في نفس اليوم —
   عشان رقم "الزيارات" يعكس عدد الناس اللي فعلاً زاروا الموقع مش عدد
   مرات تحميل الصفحة. لو رجع تاني يوم تاني، دي زيارة جديدة شرعية وبتتسجل.
   ===================================================================== */
var Analytics = (function(){
  var configured = SUPABASE_URL.indexOf('ضع_') !== 0 && SUPABASE_ANON_KEY.indexOf('ضع_') !== 0;
  var PAGE_VIEW_DEDUPE_KEY = 'ti_last_pv_date';

  function alreadyCountedToday(){
    try{
      var today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD بتوقيت الجهاز
      if(localStorage.getItem(PAGE_VIEW_DEDUPE_KEY) === today) return true;
      localStorage.setItem(PAGE_VIEW_DEDUPE_KEY, today);
      return false;
    }catch(e){ return false; } /* لو التخزين مش متاح، سيب الحدث يتسجل عادي بدل ما نمنعه غلط */
  }

  function track(eventType){
    if(!configured) return;
    if(eventType === 'page_view' && alreadyCountedToday()) return;
    try{
      fetch(SUPABASE_URL + '/rest/v1/site_events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        keepalive: true,
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          event_type: eventType,
          page: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent
        })
      }).catch(function(){});
    }catch(e){}
  }

  return { track: track };
})();
