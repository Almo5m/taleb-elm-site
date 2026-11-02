/* حركة الصفحة: الهيرو (مبعثر ← مترتّب)، شريط التقدّم، الفصل الحالي في النافيجيشن،
   وشريط التحميل الثابت على الموبايل. كله بيتحدّث من نفس حدث السكرول. */
(function(){
  var root = document.documentElement;
  var hero = document.getElementById('hero');
  var bar = document.getElementById('topbar');
  var progress = document.getElementById('progress');
  var dlBar = document.getElementById('dlBar');
  var cta = document.getElementById('cta-final');
  var navLinks = document.querySelectorAll('.topnav a[data-ch]');
  var chapters = ['hero', 'ch-2', 'ch-3', 'ch-4', 'ch-5'].map(function(id){ return document.getElementById(id); });
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var currentChapter = 0;

  /* ارتفاع الـ topbar بيتغيّر بين الموبايل والكمبيوتر — الهيرو اللاصق لازم يبدأ تحته بالظبط */
  function syncBar(){ if(bar) root.style.setProperty('--topbar-h', bar.offsetHeight + 'px'); }

  function updateHero(){
    if(!hero) return;
    if(reduced){ hero.style.setProperty('--p', 1); return; }
    var total = hero.offsetHeight - root.clientHeight;
    var p = total > 0 ? Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / total)) : 1;
    hero.style.setProperty('--p', p.toFixed(3));
  }

  function updateProgress(){
    if(!progress) return;
    var max = root.scrollHeight - root.clientHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4) + ')';
  }

  function updateChapter(){
    var idx = 0;
    chapters.forEach(function(el, i){ if(el && el.getBoundingClientRect().top <= root.clientHeight * 0.35) idx = i; });
    if(idx === currentChapter) return;
    currentChapter = idx;
    navLinks.forEach(function(a){
      var on = Number(a.dataset.ch) === idx + 1;
      a.classList.toggle('active', on);
      if(on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      if(on) centerLink(a);
    });
  }

  /* يظهر بعد الهيرو، ويختفي لما نوصل لقسم التحميل (هو نفسه فيه الزرار) */
  function updateDlBar(){
    if(!dlBar || !hero || !cta) return;
    var show = hero.getBoundingClientRect().bottom < root.clientHeight * 0.6 && cta.getBoundingClientRect().top > root.clientHeight;
    dlBar.classList.toggle('show', show);
    dlBar.inert = !show;
  }

  /* بنحرّك صف النافيجيشن الأفقي بس، مش الصفحة (scrollIntoView كان بيتخانق مع السكرول) */
  function centerLink(a){
    var row = a.parentElement;
    row.scrollLeft += (a.getBoundingClientRect().left + a.offsetWidth / 2) - (row.getBoundingClientRect().left + row.offsetWidth / 2);
  }

  var queued = false;
  function update(){ queued = false; updateHero(); updateProgress(); updateChapter(); updateDlBar(); }
  function request(){ if(!queued){ queued = true; requestAnimationFrame(update); } }

  syncBar();
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', function(){ syncBar(); request(); });
  update();
  navLinks[0] && navLinks[0].classList.add('active');

  /* التطبيق أندرويد بس: أي جهاز تاني بياخد طريقة يوصّل بيها اللينك لموبايله */
  if(hero && !/Android/i.test(navigator.userAgent)){
    var note = hero.querySelector('.dev-note');
    if(note){
      note.hidden = false;
      var copy = note.querySelector('button');
      copy.addEventListener('click', function(){
        if(!(navigator.clipboard && navigator.clipboard.writeText)) return;
        navigator.clipboard.writeText(location.href.split('#')[0]).then(function(){
          copy.textContent = 'تم نسخ الرابط ✓';
        }).catch(function(){});
      });
    }
  }
})();
