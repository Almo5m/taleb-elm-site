/* قصة الهيرو: كل ما الزائر ينزل، الحاجات المبعثرة بتترتّب (--p من 0 لـ 1).
   لو الجهاز طالب تقليل الحركة، الصفحة بتفتح مترتبة على طول. */
(function(){
  var hero = document.getElementById('hero');
  if(!hero) return;

  /* ارتفاع الـ topbar بيتغيّر بين الموبايل والكمبيوتر — الهيرو اللاصق لازم يبدأ تحته بالظبط */
  var bar = document.getElementById('topbar');
  var syncBar = function(){ if(bar) document.documentElement.style.setProperty('--topbar-h', bar.offsetHeight + 'px'); };
  syncBar();
  addEventListener('resize', syncBar);

  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    hero.style.setProperty('--p', 1);
  }else{
    var queued = false;
    var update = function(){
      queued = false;
      var total = hero.offsetHeight - document.documentElement.clientHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / total)) : 1;
      hero.style.setProperty('--p', p.toFixed(3));
    };
    var request = function(){ if(!queued){ queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    update();
  }

  /* التطبيق أندرويد بس: أي جهاز تاني بياخد طريقة يوصّل بيها اللينك لموبايله */
  if(!/Android/i.test(navigator.userAgent)){
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
