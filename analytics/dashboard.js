/* حط نفس بيانات Supabase اللي حطيتها في index.html */
const SUPABASE_URL = "https://nokgvbmngcgkfjlcmvmd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_r96Xijbc6491_olkX2Gaqw_49BAVA48";

/* تسجيل الدخول بحساب Supabase Auth حقيقي (إيميل + باسورد). الجلسة بتتخزّن في
   sessionStorage بس — بتتمسح لما تقفل التاب، ومفيش أي باسورد بيتخزّن في المتصفح. */
const SESSION_KEY = 'ti_dash_session';

function getSession(){ try{ return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }catch(e){ return null; } }
function setSession(s){
  try{ if(s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESSION_KEY); }catch(e){}
}

async function authRequest(path, body){
  var res = await fetch(SUPABASE_URL + '/auth/v1/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('auth');
  return res.json();
}
function toSession(r){ return { access: r.access_token, refresh: r.refresh_token, exp: Date.now() + (r.expires_in - 30) * 1000 }; }

async function signIn(email, password){
  var s = toSession(await authRequest('token?grant_type=password', { email: email, password: password }));
  setSession(s);
  return s;
}

/* بيرجّع توكن شغّال، وبيجدّده تلقائي لو قرّب يخلص */
async function freshToken(){
  var s = getSession();
  if(!s) throw new Error('unauthorized');
  if(Date.now() >= s.exp){
    try{ s = toSession(await authRequest('token?grant_type=refresh_token', { refresh_token: s.refresh })); setSession(s); }
    catch(e){ setSession(null); throw new Error('unauthorized'); }
  }
  return s.access;
}

function fmt(n){ return (n||0).toLocaleString('ar-EG'); }
function pct(n,d){ return d ? Math.round((n/d)*100) : 0; }

async function callRpc(fn, body){
  var token = await freshToken();
  var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('unauthorized');
  /* بعض الدوال (زي admin_review_action) بترجع بلا محتوى (204) —
     لو حاولنا نعمل .json() على رد فاضي هيرمي خطأ رغم إن العملية
     نفسها نجحت في قاعدة البيانات، فبنتأكد الأول إن فيه محتوى فعلاً. */
  var text = await res.text();
  return text ? JSON.parse(text) : null;
}

function showDash(){
  document.getElementById('gate').style.display = 'none';
  document.getElementById('dash').style.display = 'block';
  var activeRange = document.querySelector('.range-tabs button.active');
  loadStats(parseInt(activeRange.dataset.range, 10));
  loadReviews();
}

/* =====================================================================
   إدارة التقييمات
   ===================================================================== */
function starsSvg(count){
  var html = '';
  for(var i = 1; i <= 5; i++){
    html += '<svg viewBox="0 0 24 24" class="' + (i > count ? 'empty' : '') + '" style="fill:currentColor"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 3.5Z"/></svg>';
  }
  return html;
}

function reviewDate(iso){
  return new Date(iso).toLocaleDateString('ar-EG', { day:'numeric', month:'short', year:'numeric' });
}

function escapeHtml(s){
  return (s || '').replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

function reviewRowHtml(r, pending){
  var safeName = escapeHtml(r.name || 'طالب');
  var safeComment = r.comment ? escapeHtml(r.comment) : '';
  return '<div class="review-row" data-id="' + r.id + '">' +
    '<span class="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c1-3.6 4-5.5 7-5.5s6 1.9 7 5.5"/></svg></span>' +
    '<div class="body">' +
      '<div class="top">' +
        '<b>' + safeName + '</b>' +
        (r.verified ? '<span class="verified-tag" title="اتأكدنا إنه حمّل التطبيق">✅ موثّق</span>' : '') +
        '<span class="stars">' + starsSvg(r.rating) + '</span>' +
        (pending ? '<span class="pending-tag">في الانتظار</span>' : '') +
        '<span class="date">' + reviewDate(r.created_at) + '</span>' +
      '</div>' +
      (safeComment ? '<p>' + safeComment + '</p>' : '') +
      '<div class="actions">' +
        (pending ? '<button class="mini-btn approve" data-action="approve"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg> نشر</button>' : '') +
        '<button class="mini-btn delete" data-action="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg> حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

async function loadReviews(){
  var loading = document.getElementById('reviewsLoading');
  var content = document.getElementById('reviewsContent');
  try{
    var reviews = await callRpc('admin_list_reviews', {});
    var pending = reviews.filter(function(r){ return !r.approved; });
    var published = reviews.filter(function(r){ return r.approved; });

    var badge = document.getElementById('pendingBadge');
    if(pending.length){
      badge.textContent = pending.length;
      badge.style.display = 'inline-block';
    }else{
      badge.style.display = 'none';
    }

    document.getElementById('r-pending').textContent = pending.length;
    document.getElementById('r-published').textContent = published.length;
    document.getElementById('r-avg').textContent = published.length
      ? (published.reduce(function(s,r){ return s + r.rating; }, 0) / published.length).toFixed(1)
      : '–';

    var pendingList = document.getElementById('pendingList');
    pendingList.innerHTML = pending.length
      ? pending.map(function(r){ return reviewRowHtml(r, true); }).join('')
      : '<p class="empty-state">مفيش تقييمات محتاجة مراجعة دلوقتي 🎉</p>';

    var publishedList = document.getElementById('publishedList');
    publishedList.innerHTML = published.length
      ? published.map(function(r){ return reviewRowHtml(r, false); }).join('')
      : '<p class="empty-state">لسه مفيش تقييمات منشورة</p>';

    loading.style.display = 'none';
    content.style.display = 'block';
  }catch(e){
    loading.innerHTML = '<span>حصل خطأ في جلب التقييمات — تأكد إنك شغّلت analytics/supabase-setup-auth.sql</span>';
  }
}

document.body.addEventListener('click', async function(e){
  var btn = e.target.closest('.mini-btn');
  if(!btn) return;
  var row = btn.closest('.review-row');
  var id = row.dataset.id;
  var action = btn.dataset.action;
  if(!getSession()) return;

  if(action === 'delete' && !confirm('متأكد إنك عايز تحذف التقييم ده؟')) return;

  btn.disabled = true;
  try{
    await callRpc('admin_review_action', { p_id: parseInt(id, 10), p_action: action });
    loadReviews();
  }catch(e){
    btn.disabled = false;
    alert('حصل خطأ، جرّب تاني');
  }
});

/* التبديل بين الإحصائيات والتقييمات */
document.querySelectorAll('.view-tabs button').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.view-tabs button').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    var view = btn.dataset.view;
    document.getElementById('statsView').style.display = view === 'stats' ? 'block' : 'none';
    document.getElementById('reviewsView').style.display = view === 'reviews' ? 'block' : 'none';
  });
});

/* دخول */
async function doLogin(){
  var email = document.getElementById('email').value.trim();
  var pw = document.getElementById('pw').value;
  if(!email || !pw) return;
  var btn = document.getElementById('pwBtn');
  var btnText = document.getElementById('pwBtnText');
  btn.disabled = true; btnText.textContent = 'بيتحقق...';
  document.getElementById('gateErr').style.display = 'none';
  try{
    await signIn(email, pw);
    await callRpc('get_site_stats', {}); /* بيفشل لو الحساب مش أدمن */
    showDash();
  }catch(e){
    setSession(null);
    document.getElementById('gateErr').style.display = 'block';
  }
  document.getElementById('pw').value = '';
  btn.disabled = false; btnText.textContent = 'دخول';
}
document.getElementById('pwBtn').addEventListener('click', doLogin);
['email', 'pw'].forEach(function(id){
  document.getElementById(id).addEventListener('keydown', function(e){ if(e.key === 'Enter') doLogin(); });
});

/* خروج: بيقفل الجلسة في Supabase كمان، مش بس في المتصفح */
document.getElementById('logoutBtn').addEventListener('click', function(){
  var s = getSession();
  setSession(null);
  if(!s){ location.reload(); return; }
  fetch(SUPABASE_URL + '/auth/v1/logout', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + s.access }
  }).catch(function(){}).finally(function(){ location.reload(); });
});

/* تحديث */
document.getElementById('refreshBtn').addEventListener('click', function(){
  if(!getSession()) return;
  var activeRange = document.querySelector('.range-tabs button.active');
  loadStats(parseInt(activeRange.dataset.range, 10));
  loadReviews();
});

/* تبديل المدى الزمني */
document.querySelectorAll('.range-tabs button').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.range-tabs button').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    if(getSession()) loadStats(parseInt(btn.dataset.range, 10));
  });
});

/* نضّف أي باسورد قديم كان متخزّن في المتصفح من النسخة السابقة */
try{ localStorage.removeItem('ti_dash_pw'); }catch(e){}

/* لو فيه جلسة شغّالة في التاب ده، ادخل على طول */
if(getSession()) showDash();
