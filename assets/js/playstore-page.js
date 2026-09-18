/* =====================================================================
   صفحة "طالب علم" بشكل صفحة تطبيق حقيقية في متجر — كل المحتوى هنا
   حقيقي ومسحوب من نفس بيانات الموقع (مفيش أي رقم وهمي): التقييمات من
   Supabase، آخر التحديثات من APP_UPDATES، السكرين شوتات الحقيقية.
   ===================================================================== */
var PlayStorePage = (function(){
  var configured = SUPABASE_URL.indexOf('ضع_') !== 0 && SUPABASE_ANON_KEY.indexOf('ضع_') !== 0;
  var initialized = false;
  var shotsRendered = false;

  var SCREENSHOTS = [
    { file: 'today.jpg', alt: 'شاشة اليوم' },
    { file: 'materials.jpg', alt: 'شاشة المواد' },
    { file: 'schedule.jpg', alt: 'جدول المذاكرة' },
    { file: 'bo-assistant.jpg', alt: 'بو، المساعد الذكي' },
    { file: 'lectures.jpg', alt: 'متابعة المحاضرات' },
    { file: 'forum.jpg', alt: 'منتدى الطلاب' },
    { file: 'achievements.jpg', alt: 'الإنجازات' },
    { file: 'religious.jpg', alt: 'الركن الديني' }
  ];

  function starsSvg(count, cls){
    var html = '';
    for(var i = 1; i <= 5; i++){
      html += '<svg viewBox="0 0 24 24" class="' + (cls||'') + (i > count ? ' empty' : '') + '"><use href="#i-star"/></svg>';
    }
    return html;
  }

  function escapeHtml(s){
    return (s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function timeAgo(iso){
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if(diff < 3600) return 'من شوية';
    if(diff < 86400) return 'من ' + Math.floor(diff/3600) + ' ساعة';
    if(diff < 2592000) return 'من ' + Math.floor(diff/86400) + ' يوم';
    return new Date(iso).toLocaleDateString('ar-EG', { day:'numeric', month:'short' });
  }

  function renderShotsOnce(){
    if(shotsRendered) return;
    var track = document.getElementById('psShotsTrack');
    if(!track) return;
    track.innerHTML = SCREENSHOTS.map(function(s){
      return '<img src="assets/screenshots/' + s.file + '" alt="' + s.alt + '" loading="lazy">';
    }).join('');
    shotsRendered = true;
  }

  function renderWhatsNew(){
    var box = document.getElementById('psWhatsNew');
    if(!box || typeof APP_UPDATES === 'undefined' || !APP_UPDATES.length) return;
    var latest = APP_UPDATES[0];
    box.innerHTML =
      '<b>' + latest.version + ' — ' + latest.date + '</b>' +
      '<ul>' + latest.items.slice(0, 5).map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ul>';
  }

  function renderAppInfo(){
    var grid = document.getElementById('psInfoGrid');
    if(!grid || typeof APP_UPDATES === 'undefined' || !APP_UPDATES.length) return;
    var latest = APP_UPDATES[0];
    var rows = [
      ['الإصدار', latest.version],
      ['آخر تحديث', latest.date],
      ['التصنيف', 'تعليم'],
      ['مقدَّم من', 'Al-Mo'],
      ['التقييم العمري', '3+']
    ];
    grid.innerHTML = rows.map(function(r){
      return '<div class="ps-info-row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>';
    }).join('');
  }

  function setupDescriptionToggle(){
    var btn = document.getElementById('psReadmore');
    var desc = document.getElementById('psDesc');
    if(!btn || btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', function(){
      var expanded = desc.classList.toggle('is-expanded');
      btn.classList.toggle('is-expanded', expanded);
      btn.firstChild.textContent = expanded ? 'اقرأ أقل ' : 'اقرأ المزيد ';
    });
  }

  function renderStatsAndSummary(reviews){
    var ratingRowVal = document.getElementById('psStatRating');
    var ratingRowStars = document.getElementById('psStatStars');
    var ratingRowCount = document.getElementById('psStatCount');
    var bigVal = document.getElementById('psBigRating');
    var bigStars = document.getElementById('psBigStars');
    var bigCount = document.getElementById('psBigCount');
    var barsBox = document.getElementById('psRatingBars');

    if(!reviews.length){
      ratingRowVal.textContent = 'جديد';
      ratingRowStars.innerHTML = '';
      ratingRowCount.textContent = '0';
      bigVal.textContent = '–';
      bigStars.innerHTML = '';
      bigCount.textContent = 'لسه بدون تقييمات';
      barsBox.innerHTML = '';
      return;
    }

    var avg = reviews.reduce(function(s,r){ return s + r.rating; }, 0) / reviews.length;
    var avgRounded = avg.toFixed(1);

    ratingRowVal.textContent = avgRounded;
    ratingRowStars.innerHTML = starsSvg(Math.round(avg), 'ps-stat-star-ic');
    ratingRowCount.textContent = reviews.length.toLocaleString('ar-EG');

    bigVal.textContent = avgRounded;
    bigStars.innerHTML = starsSvg(Math.round(avg));
    bigCount.textContent = reviews.length.toLocaleString('ar-EG') + ' مراجعة';

    var counts = [0,0,0,0,0]; /* index 0 = 5 نجوم، index 4 = نجمة واحدة */
    reviews.forEach(function(r){ counts[5 - r.rating]++; });
    barsBox.innerHTML = counts.map(function(c, i){
      var stars = 5 - i;
      var pct = Math.round((c / reviews.length) * 100);
      return '<div class="ps-rbar"><span>' + stars + '</span>' +
        '<div class="ps-rbar-track"><span style="width:' + pct + '%"></span></div></div>';
    }).join('');
  }

  function renderReviewsList(reviews){
    var list = document.getElementById('psReviewsList');
    if(!reviews.length){
      list.innerHTML = '<p class="ps-empty">لسه مفيش تقييمات — كن أول واحد يشارك رأيه!</p>';
      return;
    }
    list.innerHTML = reviews.slice(0, 20).map(function(r){
      var safeName = escapeHtml(r.name || 'طالب');
      var initial = (r.name || 'ط').trim().charAt(0);
      var safeComment = r.comment ? escapeHtml(r.comment) : '';
      return '<div class="ps-review">' +
        '<div class="ps-review-av">' + escapeHtml(initial) + '</div>' +
        '<div class="ps-review-body">' +
          '<div class="ps-review-top"><span class="ps-review-name">' + safeName + '</span><span class="ps-review-date">' + timeAgo(r.created_at) + '</span></div>' +
          '<div class="ps-review-stars">' + starsSvg(r.rating) + '</div>' +
          (safeComment ? '<div class="ps-review-text">' + safeComment + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function loadReviews(){
    if(!configured) { renderStatsAndSummary([]); renderReviewsList([]); return; }
    fetch(SUPABASE_URL + '/rest/v1/site_reviews?select=id,name,rating,comment,created_at&approved=eq.true&order=created_at.desc&limit=100', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      }
    }).then(function(res){ return res.ok ? res.json() : []; })
      .then(function(reviews){
        renderStatsAndSummary(reviews);
        renderReviewsList(reviews);
      }).catch(function(){});
  }

  /* ============ فورم "اكتب تقييم" (نفس منطق reviews.js، منفصل هنا
     عشان الصفحة دي تفضل قائمة بذاتها) ============ */
  var selectedStars = 0;
  function setupReviewForm(){
    var openBtn = document.getElementById('psWriteReviewBtn');
    var reviewModal = document.getElementById('ps-review-modal');
    var picker = document.getElementById('psStarPicker');
    var form = document.getElementById('psReviewForm');
    if(!openBtn || openBtn.dataset.wired) return;
    openBtn.dataset.wired = '1';

    openBtn.addEventListener('click', function(){
      reviewModal.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
    reviewModal.querySelectorAll('[data-modal-close]').forEach(function(el){
      el.addEventListener('click', function(){
        reviewModal.classList.remove('show');
        document.body.style.overflow = '';
      });
    });

    picker.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(){
        selectedStars = parseInt(btn.dataset.star, 10);
        picker.querySelectorAll('button').forEach(function(b){
          b.classList.toggle('active', parseInt(b.dataset.star, 10) <= selectedStars);
        });
      });
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var status = document.getElementById('psReviewStatus');
      var submitBtn = document.getElementById('psReviewSubmitBtn');
      var submitText = document.getElementById('psReviewSubmitText');
      status.className = 'review-form-status';

      var honeypot = form.querySelector('[name=website]').value;
      var name = document.getElementById('psReviewName').value.trim();
      var comment = document.getElementById('psReviewComment').value.trim();

      if(honeypot) return;
      if(!selectedStars){ status.textContent = 'اختار تقييم بالنجوم الأول'; status.className = 'review-form-status err'; return; }
      if(!name){ status.textContent = 'اكتب اسمك الأول'; status.className = 'review-form-status err'; return; }
      if(!configured){ status.textContent = 'التقييمات مش شغالة دلوقتي'; status.className = 'review-form-status err'; return; }

      submitBtn.disabled = true;
      submitText.textContent = 'بيترسل...';

      fetch(SUPABASE_URL + '/rest/v1/rpc/submit_review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ p_name: name, p_rating: selectedStars, p_comment: comment || null, p_visitor_id: getVisitorId() })
      }).then(function(res){
        if(!res.ok) throw new Error('failed');
        status.textContent = 'شكرًا! تقييمك هيظهر بعد مراجعة بسيطة.';
        status.className = 'review-form-status ok';
        form.reset();
        selectedStars = 0;
        picker.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
      }).catch(function(){
        status.textContent = 'حصل خطأ، جرّب تاني بعد شوية';
        status.className = 'review-form-status err';
      }).finally(function(){
        submitBtn.disabled = false;
        submitText.textContent = 'إرسال التقييم';
      });
    });
  }

  function onOpen(){
    renderShotsOnce();
    renderWhatsNew();
    renderAppInfo();
    setupDescriptionToggle();
    setupReviewForm();
    loadReviews();
    initialized = true;
  }

  return { onOpen: onOpen };
})();
