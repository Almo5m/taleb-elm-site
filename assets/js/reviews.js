/* =====================================================================
   نظام التقييمات — عرض التقييمات المنشورة + استقبال تقييم جديد.
   ===================================================================== */
var Reviews = (function(){
  var configured = SUPABASE_URL.indexOf('ضع_') !== 0 && SUPABASE_ANON_KEY.indexOf('ضع_') !== 0;
  var selectedStars = 0;

  function starsSvg(count){
    var html = '';
    for(var i = 1; i <= 5; i++){
      html += '<svg viewBox="0 0 24 24" class="icon' + (i > count ? ' empty' : '') + '" style="fill:currentColor"><use href="#i-star"/></svg>';
    }
    return html;
  }

  function timeAgo(iso){
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if(diff < 3600) return 'من شوية';
    if(diff < 86400) return 'من ' + Math.floor(diff/3600) + ' ساعة';
    if(diff < 2592000) return 'من ' + Math.floor(diff/86400) + ' يوم';
    return new Date(iso).toLocaleDateString('ar-EG', { day:'numeric', month:'short' });
  }

  function escapeHtml(s){
    return (s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function renderCards(reviews){
    var track = document.getElementById('reviewsTrack');
    var empty = document.getElementById('reviewsEmpty');
    if(!reviews.length){
      if(empty) empty.style.display = 'block';
      return;
    }
    if(empty) empty.style.display = 'none';
    track.innerHTML = reviews.map(function(r){
      var safeName = escapeHtml(r.name || 'طالب');
      var safeComment = r.comment ? escapeHtml(r.comment) : '';
      return '<div class="review-card">' +
        '<div class="stars">' + starsSvg(r.rating) + '</div>' +
        (safeComment ? '<p>' + safeComment + '</p>' : '') +
        '<div class="who">' +
          '<span class="av"><svg viewBox="0 0 24 24" class="icon"><use href="#i-user"/></svg></span>' +
          '<div><b>' + safeName + '</b><small>' + timeAgo(r.created_at) + '</small></div>' +
          (r.verified ? '<span class="verified-badge" title="اتأكدنا إنه حمّل التطبيق فعلاً"><svg viewBox="0 0 24 24" class="icon"><use href="#i-check-seal"/></svg></span>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderSummary(reviews){
    var box = document.getElementById('reviewsSummary');
    if(!reviews.length || !box) return;
    var avg = reviews.reduce(function(s,r){ return s + r.rating; }, 0) / reviews.length;
    document.getElementById('reviewsScore').textContent = avg.toFixed(1);
    document.getElementById('reviewsStars').innerHTML = starsSvg(Math.round(avg));
    document.getElementById('reviewsCount').textContent = reviews.length.toLocaleString('ar-EG') + ' تقييم';
    box.style.display = 'flex';
  }

  function loadReviews(){
    if(!configured) return;
    fetch(SUPABASE_URL + '/rest/v1/site_reviews?select=id,name,rating,comment,created_at,verified&approved=eq.true&order=created_at.desc&limit=50', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      }
    }).then(function(res){ return res.ok ? res.json() : []; })
      .then(function(reviews){
        renderSummary(reviews);
        renderCards(reviews);
      }).catch(function(){});
  }

  function setupForm(){
    var picker = document.getElementById('starPicker');
    var form = document.getElementById('reviewForm');
    if(!picker || !form) return;

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
      var status = document.getElementById('reviewStatus');
      var submitBtn = document.getElementById('reviewSubmitBtn');
      var submitText = document.getElementById('reviewSubmitText');
      status.className = 'review-form-status';

      var honeypot = form.querySelector('[name=website]').value;
      var name = document.getElementById('reviewName').value.trim();
      var comment = document.getElementById('reviewComment').value.trim();

      if(honeypot) return; /* بوت على الأغلب — نتجاهل بصمت */
      if(!selectedStars){
        status.textContent = 'اختار تقييم بالنجوم الأول';
        status.className = 'review-form-status err';
        return;
      }
      if(!name){
        status.textContent = 'اكتب اسمك الأول';
        status.className = 'review-form-status err';
        return;
      }
      if(!configured){
        status.textContent = 'التقييمات مش شغالة دلوقتي، جرّب تاني بعدين';
        status.className = 'review-form-status err';
        return;
      }

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

  return { init: function(){ setupForm(); loadReviews(); } };
})();
