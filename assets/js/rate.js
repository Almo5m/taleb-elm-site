/* صفحة التقييم — الإعدادات (SUPABASE_URL...) و getVisitorId() جايين من config.js */
(function(){
  var STAR_LABELS = { 1:'مش عاجبني', 2:'متوسط', 3:'كويس', 4:'حلو', 5:'ممتاز!' };
  var selectedStars = 0;
  var picker = document.getElementById('starPicker');
  var starLabel = document.getElementById('starLabel');
  var status = document.getElementById('status');

  function fail(msg){ status.textContent = msg; status.className = 'status err'; }

  picker.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(){
      selectedStars = parseInt(btn.dataset.star, 10);
      picker.querySelectorAll('button').forEach(function(b){
        var on = parseInt(b.dataset.star, 10) <= selectedStars;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
      });
      starLabel.textContent = STAR_LABELS[selectedStars] || '';
    });
  });

  document.getElementById('rateForm').addEventListener('submit', function(e){
    e.preventDefault();
    var submitBtn = document.getElementById('submitBtn');
    var submitText = document.getElementById('submitText');
    status.className = 'status';

    var name = document.getElementById('rName').value.trim();
    var comment = document.getElementById('rComment').value.trim();

    if(this.querySelector('[name=website]').value) return; /* بوت على الأغلب — نتجاهل بصمت */
    if(!selectedStars) return fail('اختار تقييم بالنجوم الأول');
    if(!name) return fail('اكتب اسمك الأول');

    submitBtn.disabled = true;
    submitText.textContent = 'بيترسل...';

    Api.post('review', { name: name, rating: selectedStars, comment: comment || null, visitor_id: getVisitorId(), proof: Api.getProof() }).then(function(res){
      if(!res.ok) throw new Error('failed');
      document.getElementById('formCard').style.display = 'none';
      document.getElementById('thanks').style.display = 'block';
    }).catch(function(){
      fail('التقييم ماتبعتش. اتأكد من النت وجرّب تاني.');
      submitBtn.disabled = false;
      submitText.textContent = 'إرسال التقييم';
    });
  });
})();
