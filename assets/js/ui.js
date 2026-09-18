(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderUpdates();
  Reviews.init();

  /* تسجيل زيارة الصفحة */
  Analytics.track('page_view');

  /* reveal on scroll */
  var revealEls = document.querySelectorAll('[data-reveal]');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, {threshold:.15});
  revealEls.forEach(function(el){ io.observe(el); });
  if(reduced){ revealEls.forEach(function(el){ el.classList.add('in'); }); }

  /* counters */
  var counters = document.querySelectorAll('.cnt');
  var cio = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      var el = en.target;
      var target = parseFloat(el.dataset.count);
      var start = null; var dur = 1100;
      function step(ts){
        if(!start) start = ts;
        var prog = Math.min(1, (ts-start)/dur);
        var eased = 1 - Math.pow(1-prog, 3);
        el.textContent = Math.round(target*eased);
        if(prog<1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      cio.unobserve(el);
    });
  }, {threshold:.5});
  counters.forEach(function(el){ cio.observe(el); });

  /* زرار دعم المشروع العائم: يظهر بعد ما الزائر ينزل شوية، ويختفي وهو
     بالفعل جوه قسم الدعم نفسه عشان مايتكررش بصريًا. */
  var supportFab = document.getElementById('supportFab');
  var supportSection = document.getElementById('support');
  if(supportFab && supportSection){
    var supportInView = false;
    supportFab.addEventListener('click', function(){
      supportSection.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    });
    var fabIo = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ supportInView = en.isIntersecting; });
      updateFabVisibility();
    }, { threshold: .15 });
    fabIo.observe(supportSection);
    function updateFabVisibility(){
      var shouldShow = window.scrollY > 700 && !supportInView;
      supportFab.classList.toggle('show', shouldShow);
    }
    window.addEventListener('scroll', updateFabVisibility, { passive: true });
  }

  /* Scrollspy: يميّز في قائمة التنقل فوق الرابط بتاع القسم اللي الزائر
     فيه دلوقتي، عشان يفضل حاسس بمكانه في الصفحة. */
  var navLinks = document.querySelectorAll('.topnav a[data-nav]');
  if(navLinks.length){
    var navMap = {};
    navLinks.forEach(function(a){
      var id = a.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if(section) navMap[id] = a;
    });
    var spyIo = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var link = navMap[en.target.id];
        if(!link) return;
        if(en.isIntersecting) link.classList.add('active');
        else link.classList.remove('active');
      });
      /* لو أكتر من قسم ظاهر جزئيًا في نفس اللحظة، خلي الأقرب لمنتصف الشاشة هو النشط */
      var visible = Array.from(navLinks).filter(function(a){ return a.classList.contains('active'); });
      if(visible.length > 1){
        visible.forEach(function(a){ a.classList.remove('active'); });
        var mid = window.innerHeight / 2;
        var closest = null, closestDist = Infinity;
        Object.keys(navMap).forEach(function(id){
          var r = document.getElementById(id).getBoundingClientRect();
          var dist = Math.abs((r.top + r.bottom) / 2 - mid);
          if(dist < closestDist){ closestDist = dist; closest = navMap[id]; }
        });
        if(closest) closest.classList.add('active');
      }
    }, { rootMargin: '-96px 0px -60% 0px', threshold: 0 });
    Object.keys(navMap).forEach(function(id){ spyIo.observe(document.getElementById(id)); });
  }

  /* download modal — شاشة تحذير بسيطة، وبعدها دعوة لمتابعة قناة الواتساب */
  var modal = document.getElementById('dl-modal');
  var waModal = document.getElementById('wa-modal');
  var goBtn = document.getElementById('dl-modal-go');
  goBtn.href = APK_URL;
  var waLink = waModal.querySelector('a[href*="whatsapp.com/channel"]');

  function openModal(m){
    m.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(m){
    m.classList.remove('show');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-download]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      Analytics.track('reached_download'); /* وصل لمرحلة التحميل */
      openModal(modal);
    });
  });
  goBtn.addEventListener('click', function(){
    Analytics.track('download_clicked'); /* حمّل فعلاً */
    /* بعد ما التحميل يبدأ (المتصفح بيتولاه بنفسه)، نقفل مودال التحذير
       ونفتح دعوة متابعة قناة الواتساب */
    closeModal(modal);
    setTimeout(function(){ openModal(waModal); }, 700);
  });
  if(waLink){
    waLink.addEventListener('click', function(){
      Analytics.track('whatsapp_followed');
    });
  }
  document.querySelectorAll('#dl-modal [data-modal-close], #wa-modal [data-modal-close]').forEach(function(el){
    el.addEventListener('click', function(e){
      var isNoticeLink = el.tagName === 'A' && el.getAttribute('href') === '#install-notice';
      if(!isNoticeLink) e.preventDefault();
      closeModal(el.closest('#dl-modal, #wa-modal'));
    });
  });
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    if(modal.classList.contains('show')) closeModal(modal);
    if(waModal.classList.contains('show')) closeModal(waModal);
  });

  /* copy to clipboard */
  document.querySelectorAll('.copy-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var val = btn.dataset.copy;
      var done = function(){
        var original = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = 'تم النسخ ✓';
        setTimeout(function(){ btn.innerHTML = original; btn.classList.remove('copied'); }, 1800);
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(val).then(done).catch(function(){
          var ta=document.createElement('textarea'); ta.value=val; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
        });
      } else {
        var ta=document.createElement('textarea'); ta.value=val; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
      }
    });
  });
})();
