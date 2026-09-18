/* حط نفس بيانات Supabase اللي حطيتها في index.html */
const SUPABASE_URL = "https://nokgvbmngcgkfjlcmvmd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_r96Xijbc6491_olkX2Gaqw_49BAVA48";

/* الباسورد بيتخزّن في localStorage عشان يفضل شغال حتى لو قفلت المتصفح
   بالكامل وفتحته تاني — من غير ما تدخله كل مرة. بيفضل محفوظ لحد ما تدوس
   "خروج" بنفسك. ده أمان معقول لصفحة شخصية زي دي، طالما الرابط والباسورد
   في حد ذاتهم مش متسربين. */
const SESSION_KEY = 'ti_dash_pw';

var lastDaily = [];

function fmt(n){ return (n||0).toLocaleString('ar-EG'); }
function pct(n,d){ return d ? Math.round((n/d)*100) : 0; }

async function callRpc(fn, body){
  var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
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

function renderFunnel(stats){
  var steps = [
    { label:'زوّار الموقع', value: stats.unique_visitors, color:'var(--navy)' },
    { label:'وصلوا للتحميل', value: stats.unique_reached_download, color:'var(--amber)' },
    { label:'حمّلوا فعلاً', value: stats.unique_downloaded, color:'var(--mint)' }
  ];
  var max = steps[0].value || 1;
  var html = '';
  steps.forEach(function(s){
    var w = Math.max(pct(s.value, max), s.value > 0 ? 4 : 0);
    html += '<div class="funnel-row">' +
      '<div class="funnel-label">' + s.label + '</div>' +
      '<div class="funnel-bar-wrap"><div class="funnel-bar" style="width:' + w + '%;background:' + s.color + '">' + fmt(s.value) + '</div></div>' +
      '<div class="funnel-pct">' + pct(s.value, max) + '%</div>' +
      '</div>';
  });
  document.getElementById('funnel').innerHTML = html;
}

function renderChart(daily){
  var container = document.getElementById('trendChart');
  if(!container || !daily.length) return;

  var W = 640, H = 220, padL = 34, padR = 14, padT = 14, padB = 26;
  var innerW = W - padL - padR, innerH = H - padT - padB;

  var series = [
    { data: daily.map(function(d){ return d.page_views; }), color: '#16214A' },
    { data: daily.map(function(d){ return d.reached_download; }), color: '#F5A524' },
    { data: daily.map(function(d){ return d.downloaded; }), color: '#17B978' }
  ];
  var allValues = [];
  series.forEach(function(s){ allValues = allValues.concat(s.data); });
  var maxVal = Math.max(1, Math.max.apply(null, allValues));
  /* نقرّب السقف لأعلى رقم "مظبوط" (5, 10, 20, 50...) عشان خطوط الشبكة تبان منطقية */
  var niceMax = Math.pow(10, Math.floor(Math.log10(maxVal)));
  while(niceMax * 5 < maxVal) niceMax *= 5;
  while(niceMax < maxVal) niceMax *= 2;

  function x(i){ return padL + (daily.length > 1 ? (i / (daily.length - 1)) * innerW : innerW / 2); }
  function y(v){ return padT + innerH - (v / niceMax) * innerH; }

  /* خط منحني ناعم (Catmull-Rom مُحوّل لـ Bezier) بدل خطوط مستقيمة حادة */
  function smoothPath(pts){
    if(pts.length < 2) return '';
    if(pts.length === 2) return 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1) + ' L' + pts[1][0].toFixed(1) + ',' + pts[1][1].toFixed(1);
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for(var i = 0; i < pts.length - 1; i++){
      var p0 = pts[i === 0 ? 0 : i - 1];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];
      var cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      var cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      var cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      var cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) + ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }

  function pointsFor(data){
    return data.map(function(v, i){ return [x(i), y(v)]; });
  }
  function pathFor(data){
    return smoothPath(pointsFor(data));
  }
  function areaFor(data){
    return pathFor(data) + ' L' + x(data.length - 1).toFixed(1) + ',' + (padT + innerH) + ' L' + x(0).toFixed(1) + ',' + (padT + innerH) + ' Z';
  }

  /* خطوط شبكة أفقية (4 مستويات) + تسميات المحور الرأسي */
  var gridLines = '', yLabels = '';
  for(var g = 0; g <= 4; g++){
    var v = (niceMax / 4) * g;
    var gy = y(v);
    gridLines += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="#E7EAF1" stroke-width="1"/>';
    yLabels += '<text x="' + (padL - 8) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" font-size="10" fill="#5B6479">' + Math.round(v) + '</text>';
  }

  /* تسميات المحور الأفقي: أول يوم، النص، وآخر يوم بس عشان الزحمة —
     أول تسمية وآخر تسمية بمحاذاة لجوه عشان مايتقطعوش على حواف الرسمة */
  var xLabels = '';
  var labelIdxs = daily.length > 1 ? [0, Math.floor((daily.length - 1) / 2), daily.length - 1] : [0];
  labelIdxs.forEach(function(i){
    var dt = new Date(daily[i].day);
    var label = dt.toLocaleDateString('ar-EG', { day:'numeric', month:'short' });
    var anchor = i === 0 ? 'start' : (i === daily.length - 1 ? 'end' : 'middle');
    xLabels += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anchor + '" font-size="10" fill="#5B6479">' + label + '</text>';
  });

  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="width:100%;height:220px;font-family:IBM Plex Sans Arabic,sans-serif">' +
    gridLines +
    series.map(function(s){
      return '<path d="' + areaFor(s.data) + '" fill="' + s.color + '" opacity="0.07"/>' +
             '<path d="' + pathFor(s.data) + '" fill="none" stroke="' + s.color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('') +
    yLabels + xLabels +
  '</svg>';

  container.innerHTML = daily.length ? svg : '';
}

function renderDailyTable(daily){
  var body = document.getElementById('dailyBody');
  if(!daily.length){
    body.innerHTML = '<tr><td colspan="5" class="empty-state">مفيش بيانات لسه</td></tr>';
    return;
  }
  body.innerHTML = daily.slice().reverse().map(function(row){
    var dt = new Date(row.day);
    var label = dt.toLocaleDateString('ar-EG', { weekday:'short', day:'numeric', month:'short' });
    return '<tr><td class="day-cell">' + label + '</td><td>' + fmt(row.page_views) + '</td><td>' + fmt(row.reached_download) + '</td><td>' + fmt(row.downloaded) + '</td><td>' + fmt(row.whatsapp_followed) + '</td></tr>';
  }).join('');
}

async function loadStats(password, days){
  var refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.classList.add('spin');
  document.getElementById('errBanner').style.display = 'none';
  try{
    var stats = (await callRpc('get_site_stats', { p_password: password }))[0];
    var daily = await callRpc('get_site_stats_daily', { p_password: password, p_days: days });
    lastDaily = daily;

    document.getElementById('c-visitors').textContent = fmt(stats.unique_visitors);
    document.getElementById('c-views').textContent = fmt(stats.total_page_views) + ' زيارة إجمالي';
    document.getElementById('c-reached').textContent = fmt(stats.unique_reached_download);
    document.getElementById('c-reached-t').textContent = fmt(stats.total_reached_download) + ' مرة إجمالي';
    document.getElementById('c-downloaded').textContent = fmt(stats.unique_downloaded);
    document.getElementById('c-downloaded-t').textContent = fmt(stats.total_downloaded) + ' مرة إجمالي';
    document.getElementById('c-abandoned').textContent = fmt(stats.reached_but_not_downloaded);
    document.getElementById('c-wa').textContent = fmt(stats.unique_whatsapp_followed);
    document.getElementById('c-wa-t').textContent = fmt(stats.total_whatsapp_followed) + ' مرة إجمالي';
    document.getElementById('c-conv').textContent = pct(stats.unique_downloaded, stats.unique_visitors) + '%';

    renderFunnel(stats);

    document.getElementById('updatedAt').textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    renderChart(daily);
    renderDailyTable(daily);
  }catch(e){
    document.getElementById('loadingScreen').style.display = 'none';
    var banner = document.getElementById('errBanner');
    banner.textContent = 'حصل خطأ في جلب البيانات — تأكد إنك شغّلت ملف الـ SQL في Supabase وإن الباسورد صح.';
    banner.style.display = 'block';
    document.getElementById('content').style.display = 'block';
  }
  refreshBtn.classList.remove('spin');
}

function showDash(password){
  document.getElementById('gate').style.display = 'none';
  document.getElementById('dash').style.display = 'block';
  var activeRange = document.querySelector('.range-tabs button.active');
  loadStats(password, parseInt(activeRange.dataset.range, 10));
  loadReviews(password);
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

async function loadReviews(password){
  var loading = document.getElementById('reviewsLoading');
  var content = document.getElementById('reviewsContent');
  try{
    var reviews = await callRpc('admin_list_reviews', { p_password: password });
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
    loading.innerHTML = '<span>حصل خطأ في جلب التقييمات — تأكد إنك شغّلت ملف supabase-setup-reviews.sql</span>';
  }
}

document.body.addEventListener('click', async function(e){
  var btn = e.target.closest('.mini-btn');
  if(!btn) return;
  var row = btn.closest('.review-row');
  var id = row.dataset.id;
  var action = btn.dataset.action;
  var password = localStorage.getItem(SESSION_KEY);
  if(!password) return;

  if(action === 'delete' && !confirm('متأكد إنك عايز تحذف التقييم ده؟')) return;

  btn.disabled = true;
  try{
    await callRpc('admin_review_action', { p_password: password, p_id: parseInt(id, 10), p_action: action });
    loadReviews(password);
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
document.getElementById('pwBtn').addEventListener('click', async function(){
  var pw = document.getElementById('pw').value;
  if(!pw) return;
  var btn = document.getElementById('pwBtn');
  var btnText = document.getElementById('pwBtnText');
  btn.disabled = true; btnText.textContent = 'بيتحقق...';
  document.getElementById('gateErr').style.display = 'none';
  try{
    await callRpc('get_site_stats', { p_password: pw });
    try{ localStorage.setItem(SESSION_KEY, pw); }catch(e){}
    showDash(pw);
  }catch(e){
    document.getElementById('gateErr').style.display = 'block';
  }
  btn.disabled = false; btnText.textContent = 'دخول';
});
document.getElementById('pw').addEventListener('keydown', function(e){
  if(e.key === 'Enter') document.getElementById('pwBtn').click();
});

/* خروج */
document.getElementById('logoutBtn').addEventListener('click', function(){
  try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
  location.reload();
});

/* تحديث */
document.getElementById('refreshBtn').addEventListener('click', function(){
  var pw = localStorage.getItem(SESSION_KEY);
  if(!pw) return;
  var activeRange = document.querySelector('.range-tabs button.active');
  loadStats(pw, parseInt(activeRange.dataset.range, 10));
  loadReviews(pw);
});

/* تبديل المدى الزمني */
document.querySelectorAll('.range-tabs button').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.range-tabs button').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    var pw = localStorage.getItem(SESSION_KEY);
    if(pw) loadStats(pw, parseInt(btn.dataset.range, 10));
  });
});

/* لو الباسورد متخزّن في الجلسة، ادخل على طول من غير ما يتطلب تاني */
(function(){
  var saved = null;
  try{ saved = localStorage.getItem(SESSION_KEY); }catch(e){}
  if(saved){
    showDash(saved);
  }
})();
