/* تحليلات لوحة الإحصائيات: بتجيب كل الأرقام من get_site_insights وبترسم الرسومات وبتطلّع التقارير.
   بتتحمّل قبل dashboard.js، واللي فيها بيتنادى منه (fmt و pct و callRpc و escapeHtml). */

var lastInsights = null;
var trendHidden = {};

var TREND_SERIES = [
  { key: 'visitors', label: 'زوّار', color: '#16214A' },
  { key: 'reached', label: 'وصلوا للتحميل', color: '#F5A524' },
  { key: 'downloaded', label: 'حمّلوا', color: '#17B978' }
];
var SRC_NAMES = { direct: 'مباشر أو غير معروف', google: 'جوجل', youtube: 'يوتيوب', whatsapp: 'واتساب', facebook: 'فيسبوك',
  instagram: 'إنستجرام', tiktok: 'تيك توك', telegram: 'تليجرام', x: 'X (تويتر)', search: 'محركات بحث تانية', other: 'مواقع تانية' };
var DEV_NAMES = { android: 'أندرويد', ios: 'آيفون وآيباد', desktop: 'كمبيوتر', other: 'غير معروف' };
var DEV_COLORS = { android: '#17B978', ios: '#8B7FE8', desktop: '#16214A', other: '#B8BFD0' };
var WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

var regionNames = null;
try{ regionNames = new Intl.DisplayNames(['ar'], { type: 'region' }); }catch(e){}

function countryLabel(code){
  if(!/^[A-Z]{2}$/.test(code)) return '🌐 دولة غير معروفة';
  var flag = String.fromCodePoint.apply(null, code.split('').map(function(c){ return 127397 + c.charCodeAt(0); }));
  var name = code;
  try{ name = (regionNames && regionNames.of(code)) || code; }catch(e){}
  return flag + ' ' + escapeHtml(name);
}
function countryName(code){
  if(!/^[A-Z]{2}$/.test(code)) return 'غير معروفة';
  try{ return (regionNames && regionNames.of(code)) || code; }catch(e){ return code; }
}
function hourLabel(h){ return (h % 12 || 12).toLocaleString('ar-EG') + (h < 12 ? ' ص' : ' م'); }
function dayDate(iso){ return new Date(iso + 'T12:00:00'); }
function dayLabel(iso, withWeekday){
  return dayDate(iso).toLocaleDateString('ar-EG', withWeekday ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
}
function pct1(n, d){ return d ? Math.round((n / d) * 1000) / 10 : 0; }
function fmtPct(v){ return v.toLocaleString('ar-EG') + '٪'; }

function setDelta(id, cur, prev, points){
  var el = document.getElementById(id);
  if(!el) return;
  var cls = 'flat', txt = '—';
  if(points){
    var diff = Math.round((cur - prev) * 10) / 10;
    if(diff !== 0){ cls = diff > 0 ? 'up' : 'down'; txt = (diff > 0 ? '▲ ' : '▼ ') + Math.abs(diff).toLocaleString('ar-EG') + ' نقطة'; }
  }else if(prev === 0){
    if(cur > 0){ cls = 'up'; txt = 'جديد'; }
  }else{
    var ch = Math.round(((cur - prev) / prev) * 100);
    if(ch !== 0){ cls = ch > 0 ? 'up' : 'down'; txt = (ch > 0 ? '▲ ' : '▼ ') + Math.abs(ch).toLocaleString('ar-EG') + '٪'; }
  }
  el.className = 'delta ' + cls;
  el.textContent = txt;
}

function niceMax(v){
  if(v <= 4) return 4;
  var raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p * 4;
}

/* ---------- المؤشرات ---------- */
function renderKpis(k){
  var c = k.cur, p = k.prev;
  var conv = pct1(c.downloaded, c.visitors), convPrev = pct1(p.downloaded, p.visitors);
  document.getElementById('c-visitors').textContent = fmt(c.visitors);
  document.getElementById('c-views').textContent = fmt(c.views) + ' زيارة';
  document.getElementById('c-reached').textContent = fmt(c.reached);
  document.getElementById('c-reached-t').textContent = fmtPct(pct1(c.reached, c.visitors)) + ' من الزوار';
  document.getElementById('c-downloaded').textContent = fmt(c.downloaded);
  document.getElementById('c-downloaded-t').textContent = fmtPct(conv) + ' من الزوار';
  document.getElementById('c-abandoned').textContent = fmt(Math.max(c.reached - c.downloaded, 0));
  document.getElementById('c-wa').textContent = fmt(c.whatsapp);
  document.getElementById('c-wa-t').textContent = fmtPct(pct1(c.whatsapp, c.visitors)) + ' من الزوار';
  document.getElementById('c-conv').textContent = fmtPct(conv);
  setDelta('d-visitors', c.visitors, p.visitors);
  setDelta('d-reached', c.reached, p.reached);
  setDelta('d-downloaded', c.downloaded, p.downloaded);
  setDelta('d-wa', c.whatsapp, p.whatsapp);
  setDelta('d-conv', conv, convPrev, true);
}

function renderFunnel(c){
  var steps = [
    { label: 'زوّار الموقع', value: c.visitors, color: 'var(--navy)' },
    { label: 'وصلوا للتحميل', value: c.reached, color: 'var(--amber)' },
    { label: 'حمّلوا فعلاً', value: c.downloaded, color: 'var(--mint)' }
  ];
  var max = steps[0].value || 1;
  document.getElementById('funnel').innerHTML = steps.map(function(s){
    var w = Math.max(pct(s.value, max), s.value > 0 ? 4 : 0);
    return '<div class="funnel-row"><div class="funnel-label">' + s.label + '</div>' +
      '<div class="funnel-bar-wrap"><div class="funnel-bar" style="width:' + w + '%;background:' + s.color + '">' + fmt(s.value) + '</div></div>' +
      '<div class="funnel-pct">' + pct(s.value, max) + '%</div></div>';
  }).join('');
}

/* ---------- الرسم البياني التفاعلي ---------- */
function renderLegend(){
  var el = document.getElementById('legend');
  el.innerHTML = TREND_SERIES.map(function(s){
    return '<button type="button" data-key="' + s.key + '" class="' + (trendHidden[s.key] ? 'off' : '') + '"><i style="background:' + s.color + '"></i>' + s.label + '</button>';
  }).join('');
}

function smoothPath(pts){
  if(pts.length < 2) return '';
  var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
  for(var i = 0; i < pts.length - 1; i++){
    var p0 = pts[i === 0 ? 0 : i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];
    d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
      (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
  }
  return d;
}

function renderTrend(){
  var daily = lastInsights.daily, box = document.getElementById('trendChart');
  var n = daily.length;
  var W = Math.max(box.clientWidth, 300), H = 250, padL = 40, padR = 14, padT = 16, padB = 28;
  var innerW = W - padL - padR, innerH = H - padT - padB, bottom = padT + innerH;
  var visible = TREND_SERIES.filter(function(s){ return !trendHidden[s.key]; });
  var peak = 1;
  visible.forEach(function(s){ daily.forEach(function(d){ peak = Math.max(peak, d[s.key]); }); });
  var top = niceMax(peak);
  function x(i){ return padL + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2); }
  function y(v){ return padT + innerH - (v / top) * innerH; }

  var grid = '';
  for(var g = 0; g <= 4; g++){
    var gv = (top / 4) * g, gy = y(gv).toFixed(1);
    grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#E7EAF1"/>' +
      '<text x="' + (padL - 8) + '" y="' + (Number(gy) + 3) + '" text-anchor="end" font-size="10" fill="#5B6479">' + Math.round(gv).toLocaleString('ar-EG') + '</text>';
  }
  var labels = '', step = Math.max(1, Math.ceil(n / 6));
  for(var i = 0; i < n; i += step){
    labels += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#5B6479">' + dayLabel(daily[i].day) + '</text>';
  }
  var lines = visible.map(function(s){
    var pts = daily.map(function(d, i){ return [x(i), y(d[s.key])]; });
    var line = smoothPath(pts);
    var area = n > 1 ? line + ' L' + x(n - 1).toFixed(1) + ',' + bottom + ' L' + x(0).toFixed(1) + ',' + bottom + ' Z' : '';
    return '<path d="' + area + '" fill="' + s.color + '" opacity="0.08"/>' +
      '<path d="' + line + '" fill="none" stroke="' + s.color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      (n === 1 ? '<circle cx="' + x(0) + '" cy="' + y(daily[0][s.key]) + '" r="4" fill="' + s.color + '"/>' : '');
  }).join('');

  box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" style="font-family:IBM Plex Sans Arabic,sans-serif">' +
    grid + labels + lines + '<g id="cross" style="display:none"><line y1="' + padT + '" y2="' + bottom + '" stroke="#9AA3B8" stroke-dasharray="3 3"/>' +
    visible.map(function(s){ return '<circle r="4.5" fill="#fff" stroke="' + s.color + '" stroke-width="2.4" data-key="' + s.key + '"/>'; }).join('') + '</g></svg>' +
    '<div class="tip" id="tip" style="display:none"></div>';

  var cross = box.querySelector('#cross'), tip = box.querySelector('#tip');
  function show(ev){
    var r = box.getBoundingClientRect();
    var i = n > 1 ? Math.round(((ev.clientX - r.left - padL) / innerW) * (n - 1)) : 0;
    i = Math.max(0, Math.min(n - 1, i));
    var cx = x(i);
    cross.style.display = '';
    cross.querySelector('line').setAttribute('x1', cx); cross.querySelector('line').setAttribute('x2', cx);
    cross.querySelectorAll('circle').forEach(function(c){ c.setAttribute('cx', cx); c.setAttribute('cy', y(daily[i][c.dataset.key])); });
    tip.innerHTML = '<b>' + dayLabel(daily[i].day, true) + '</b>' + visible.map(function(s){
      return '<span><i style="background:' + s.color + '"></i>' + s.label + ': <b>' + fmt(daily[i][s.key]) + '</b></span>';
    }).join('') + '<span class="muted">زيارات: ' + fmt(daily[i].views) + '</span>';
    tip.style.display = '';
    var tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(W - tw, cx - tw / 2)) + 'px';
  }
  box.onpointermove = show;
  box.onpointerdown = show;
  box.onpointerleave = function(){ cross.style.display = 'none'; tip.style.display = 'none'; };
}

/* ---------- مكونات صغيرة ---------- */
function barRows(rows){
  var max = Math.max.apply(null, rows.map(function(r){ return r.value; }).concat(1));
  return rows.map(function(r){
    var w = Math.max((r.value / max) * 100, r.value ? 3 : 0);
    return '<div class="brow"><div class="bl">' + r.label + '</div><div class="bt"><i style="width:' + w + '%;background:' + (r.color || 'var(--navy)') + '"></i></div>' +
      '<div class="bn">' + fmt(r.value) + '<small>' + (r.sub || '') + '</small></div></div>';
  }).join('');
}

function donut(parts, centerText){
  var total = parts.reduce(function(s, p){ return s + p.value; }, 0);
  var circ = 2 * Math.PI * 42, off = 0;
  var arcs = parts.map(function(p){
    var len = total ? (p.value / total) * circ : 0;
    var a = '<circle cx="50" cy="50" r="42" fill="none" stroke="' + p.color + '" stroke-width="14" stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) +
      '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 50 50)"/>';
    off += len;
    return a;
  }).join('');
  return '<svg viewBox="0 0 100 100" class="donut"><circle cx="50" cy="50" r="42" fill="none" stroke="#E7EAF1" stroke-width="14"/>' + arcs +
    '<text x="50" y="55" text-anchor="middle" font-size="15" font-weight="800" fill="#16214A">' + centerText + '</text></svg>';
}

function donutBlock(parts, centerText){
  var total = parts.reduce(function(s, p){ return s + p.value; }, 0);
  return '<div class="donut-wrap">' + donut(parts, centerText) + '<ul class="donut-legend">' + parts.map(function(p){
    return '<li><i style="background:' + p.color + '"></i>' + p.label + '<b>' + fmt(p.value) + '</b><small>' + fmtPct(pct1(p.value, total)) + '</small></li>';
  }).join('') + '</ul></div>';
}

/* ---------- الأقسام ---------- */
function renderCountries(list, total){
  var el = document.getElementById('countries');
  if(!list.length){ el.innerHTML = '<p class="empty-state">لسه مفيش بيانات</p>'; return; }
  var known = list.filter(function(c){ return c.code !== '??'; }).reduce(function(s, c){ return s + c.visitors; }, 0);
  var note = known < total ? '<p class="panel-note">' + fmt(total - known) + ' زائر من غير دولة، لأن تتبع الدولة اتفعّل بعد الزيارات دي.</p>' : '';
  el.innerHTML = barRows(list.map(function(c){
    return { label: countryLabel(c.code), value: c.visitors, color: c.code === '??' ? '#B8BFD0' : 'var(--navy)',
      sub: fmtPct(pct1(c.visitors, total)) + ' · حمّل ' + fmt(c.downloads) };
  })) + note;
}

function renderSources(list, total){
  var el = document.getElementById('sources');
  el.innerHTML = list.length ? barRows(list.map(function(s){
    return { label: SRC_NAMES[s.code] || s.code, value: s.visitors, color: s.code === 'direct' ? '#B8BFD0' : 'var(--mint)',
      sub: fmtPct(pct1(s.visitors, total)) + ' · حمّل ' + fmt(s.downloads) };
  })) : '<p class="empty-state">لسه مفيش بيانات</p>';
}

function renderDevices(list, total){
  var el = document.getElementById('devices');
  if(!list.length){ el.innerHTML = '<p class="empty-state">لسه مفيش بيانات</p>'; return; }
  var ios = list.filter(function(d){ return d.code === 'ios'; })[0];
  el.innerHTML = donutBlock(list.map(function(d){
    return { label: DEV_NAMES[d.code] || d.code, value: d.visitors, color: DEV_COLORS[d.code] || '#B8BFD0' };
  }), fmt(total)) + (ios && ios.visitors ? '<p class="panel-note">' + fmtPct(pct1(ios.visitors, total)) + ' من الزوار على آيفون أو آيباد، والتطبيق أندرويد بس.</p>' : '');
}

function renderVisitorType(t){
  document.getElementById('visitorType').innerHTML = donutBlock([
    { label: 'زوّار جداد', value: t['new'], color: '#17B978' },
    { label: 'راجعين تاني', value: t['returning'], color: '#16214A' }
  ], fmt(t['new'] + t['returning']));
}

function renderHours(hours){
  var max = Math.max.apply(null, hours.concat(1)), W = 480, H = 170, base = 140, bw = 14, gap = (W - 24 * bw) / 23;
  var bars = hours.map(function(v, h){
    var bh = Math.max((v / max) * 110, v ? 3 : 0), bx = h * (bw + gap);
    return '<rect x="' + bx.toFixed(1) + '" y="' + (base - bh).toFixed(1) + '" width="' + bw + '" height="' + bh.toFixed(1) + '" rx="3" fill="' + (v === max && v > 0 ? '#17B978' : '#16214A') +
      '" opacity="' + (v === max && v > 0 ? 1 : .55) + '"><title>' + hourLabel(h) + ': ' + fmt(v) + ' زيارة</title></rect>' +
      (h % 3 === 0 ? '<text x="' + (bx + bw / 2).toFixed(1) + '" y="' + (base + 18) + '" text-anchor="middle" font-size="10" fill="#5B6479">' + hourLabel(h) + '</text>' : '');
  }).join('');
  document.getElementById('hours').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="hours-svg" style="font-family:IBM Plex Sans Arabic,sans-serif">' + bars + '</svg>';
}

function renderWeekdays(days){
  var max = Math.max.apply(null, days.concat(1)), total = days.reduce(function(s, v){ return s + v; }, 0);
  document.getElementById('weekdays').innerHTML = barRows([6, 0, 1, 2, 3, 4, 5].map(function(i){
    return { label: WEEKDAYS[i], value: days[i], color: days[i] === max && max > 0 ? 'var(--mint)' : 'var(--navy)', sub: fmtPct(pct1(days[i], total)) };
  }));
}

function renderDailyTable(daily){
  document.getElementById('dailyBody').innerHTML = daily.slice().reverse().map(function(r){
    return '<tr><td class="day-cell">' + dayLabel(r.day, true) + '</td><td>' + fmt(r.views) + '</td><td>' + fmt(r.visitors) + '</td><td>' +
      fmt(r.reached) + '</td><td>' + fmt(r.downloaded) + '</td><td>' + fmt(r.whatsapp) + '</td></tr>';
  }).join('');
}

/* ملاحظات سريعة بتتولّد من الأرقام */
function renderNotes(data){
  var notes = [], c = data.kpi.cur, daily = data.daily;
  if(!c.visitors){
    document.getElementById('insightsBox').style.display = 'none';
    return;
  }
  var bestDay = daily.reduce(function(b, d){ return d.visitors > b.visitors ? d : b; }, daily[0]);
  notes.push('أعلى يوم زوّار: <b>' + dayLabel(bestDay.day, true) + '</b> (' + fmt(bestDay.visitors) + ' زائر).');
  var peak = Math.max.apply(null, data.hours);
  if(peak > 0) notes.push('أكتر ساعة زيارات بتوقيت القاهرة: <b>' + hourLabel(data.hours.indexOf(peak)) + '</b>، وده أنسب وقت تنشر فيه.');
  var known = data.countries.filter(function(x){ return x.code !== '??'; });
  if(known.length){
    var knownTotal = known.reduce(function(s, x){ return s + x.visitors; }, 0);
    notes.push('أكتر دولة زوّار: <b>' + countryName(known[0].code) + '</b> (' + fmtPct(pct1(known[0].visitors, knownTotal)) + ' من الزوار المعروف دولتهم).');
  }
  var top = data.sources.filter(function(s){ return s.code !== 'direct'; })[0];
  if(top) notes.push('أقوى مصدر زيارات: <b>' + (SRC_NAMES[top.code] || top.code) + '</b> (' + fmt(top.visitors) + ' زائر، حمّل منهم ' + fmt(top.downloads) + ').');
  var vt = data.visitor_type;
  if(vt['returning']) notes.push(fmtPct(pct1(vt['returning'], vt['new'] + vt['returning'])) + ' من زوّار الفترة دي رجعوا تاني.');
  document.getElementById('insightsBox').style.display = '';
  document.getElementById('insightsList').innerHTML = notes.map(function(n){ return '<li>' + n + '</li>'; }).join('');
}

/* ---------- التحميل والتقارير ---------- */
async function loadStats(days){
  var refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.classList.add('spin');
  document.getElementById('errBanner').style.display = 'none';
  try{
    var data = await callRpc('get_site_insights', { p_days: days });
    lastInsights = data;
    var total = data.kpi.cur.visitors;
    renderKpis(data.kpi);
    renderFunnel(data.kpi.cur);
    renderNotes(data);
    renderLegend();
    renderCountries(data.countries, total);
    renderSources(data.sources, total);
    renderDevices(data.devices, total);
    renderVisitorType(data.visitor_type);
    renderHours(data.hours);
    renderWeekdays(data.weekdays);
    renderDailyTable(data.daily);
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    renderTrend();
    document.getElementById('updatedAt').textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }catch(e){
    document.getElementById('loadingScreen').style.display = 'none';
    var banner = document.getElementById('errBanner');
    banner.textContent = 'حصل خطأ في جلب البيانات. تأكد إنك شغّلت analytics/supabase-setup-insights.sql في Supabase وإن حسابك متضاف كأدمن.';
    banner.style.display = 'block';
  }
  refreshBtn.classList.remove('spin');
}

function csvCell(v){ return '"' + String(v).replace(/"/g, '""') + '"'; }

function exportCsv(){
  if(!lastInsights) return;
  var d = lastInsights, c = d.kpi.cur, p = d.kpi.prev, rows = [];
  rows.push(['تقرير زوار طالب علم', 'آخر ' + d.days + ' يوم', 'تاريخ التقرير: ' + new Date(d.generated_at).toLocaleString('ar-EG')]);
  rows.push([]);
  rows.push(['المؤشر', 'الفترة دي', 'الفترة اللي قبلها']);
  [['زوّار فريدين', 'visitors'], ['زيارات', 'views'], ['وصلوا للتحميل', 'reached'], ['حمّلوا', 'downloaded'], ['تابعوا الواتساب', 'whatsapp']].forEach(function(m){
    rows.push([m[0], c[m[1]], p[m[1]]]);
  });
  rows.push(['نسبة التحويل ٪', pct1(c.downloaded, c.visitors), pct1(p.downloaded, p.visitors)]);
  rows.push([]); rows.push(['اليوم', 'زيارات', 'زوّار', 'وصلوا للتحميل', 'حمّلوا', 'واتساب']);
  d.daily.forEach(function(r){ rows.push([r.day, r.views, r.visitors, r.reached, r.downloaded, r.whatsapp]); });
  rows.push([]); rows.push(['الدولة', 'زوّار', 'حمّلوا']);
  d.countries.forEach(function(r){ rows.push([countryName(r.code), r.visitors, r.downloads]); });
  rows.push([]); rows.push(['المصدر', 'زوّار', 'حمّلوا']);
  d.sources.forEach(function(r){ rows.push([SRC_NAMES[r.code] || r.code, r.visitors, r.downloads]); });
  rows.push([]); rows.push(['الجهاز', 'زوّار', 'حمّلوا']);
  d.devices.forEach(function(r){ rows.push([DEV_NAMES[r.code] || r.code, r.visitors, r.downloads]); });
  rows.push([]); rows.push(['الساعة (توقيت القاهرة)', 'زيارات']);
  d.hours.forEach(function(v, h){ rows.push([h + ':00', v]); });
  var text = '\ufeff' + rows.map(function(r){ return r.map(csvCell).join(','); }).join('\r\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = 'taleb-elm-report-' + d.days + 'd-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
}

function printReport(){
  if(!lastInsights) return;
  document.getElementById('printMeta').textContent = 'آخر ' + lastInsights.days + ' يوم · اتطلّع في ' + new Date().toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' });
  window.print();
}

document.getElementById('csvBtn').addEventListener('click', exportCsv);
document.getElementById('printBtn').addEventListener('click', printReport);
document.getElementById('legend').addEventListener('click', function(e){
  var b = e.target.closest('button');
  if(!b || !lastInsights) return;
  trendHidden[b.dataset.key] = !trendHidden[b.dataset.key];
  if(TREND_SERIES.every(function(s){ return trendHidden[s.key]; })) trendHidden[b.dataset.key] = false;
  renderLegend();
  renderTrend();
});
var resizeTimer;
window.addEventListener('resize', function(){
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function(){ if(lastInsights && document.getElementById('content').style.display !== 'none') renderTrend(); }, 150);
});
