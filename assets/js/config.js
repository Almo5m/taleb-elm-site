/* =====================================================================
   حط لينك تحميل ملف الـ APK هنا (من GitHub Releases مثلًا) — مكان واحد بس
   وكل زراير التحميل في الموقع (فوق، النص، وقسم الـ CTA) هتستخدمه تلقائي.
   ===================================================================== */
const APK_URL = "https://github.com/Almo5m/taleb-elm-site/releases/download/v1.0/taleb-elm-v2.0.0.apk";

/* =====================================================================
   إعدادات تتبّع الزيارات (Supabase) — حط بياناتك من:
   Supabase Dashboard → Settings → API
   لو سبتهم زي ما هما، التتبع هيتعطّل تلقائي من غير ما يبوّظ الموقع.
   ===================================================================== */
const SUPABASE_URL = "https://nokgvbmngcgkfjlcmvmd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_r96Xijbc6491_olkX2Gaqw_49BAVA48";

/* =====================================================================
   معرّف عشوائي واحد للزائر، مخزّن في المتصفح ومشترك بين التتبع والتقييمات
   (عشان نقدر نتحقق إن اللي بيقيّم نفس اللي دوس تحميل من قبل).
   ===================================================================== */
function getVisitorId(){
  try{
    var id = localStorage.getItem('ti_vid');
    if(!id){
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('v-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      localStorage.setItem('ti_vid', id);
    }
    return id;
  }catch(e){ return 'anon-' + Math.random().toString(36).slice(2); }
}
