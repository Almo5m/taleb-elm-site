/* سلوك صفحة المتجر: ملاحظة "التطبيق للأندرويد" لغير الأندرويد، وفتح قسم تحذير التثبيت لما الرابط يشاور عليه. */
(function(){
  var notice = document.getElementById('install-notice');
  function openNotice(){
    if(!notice) return;
    notice.open = true;
    notice.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', function(){ if(location.hash === '#install-notice') openNotice(); });
  document.querySelectorAll('a[href="#install-notice"]').forEach(function(a){ a.addEventListener('click', openNotice); });
  if(location.hash === '#install-notice') openNotice();


  /* تكبير السكرينات: ضغطة على الصورة تفتحها، وأسهم ولوحة المفاتيح والسحب للتنقل */
  var box = document.getElementById('lightbox');
  var shots = Array.prototype.slice.call(document.querySelectorAll('.shot'));
  if(box && shots.length){
    var bigImg = box.querySelector('img');
    var caption = box.querySelector('figcaption');
    var current = 0, opener = null, startX = null;
    function show(i){
      current = (i + shots.length) % shots.length;
      var src = shots[current].querySelector('img');
      bigImg.src = src.currentSrc || src.src;
      bigImg.alt = src.alt;
      caption.textContent = src.alt;
    }
    function openBox(i){
      opener = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      box.querySelector('.lb-close').focus();
    }
    function closeBox(){
      box.hidden = true;
      document.body.style.overflow = '';
      if(opener && opener.focus) opener.focus();
    }
    shots.forEach(function(el, i){
      el.addEventListener('click', function(){ openBox(i); });
      el.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openBox(i); }
      });
    });
    box.querySelector('.lb-close').addEventListener('click', closeBox);
    box.querySelector('.lb-prev').addEventListener('click', function(){ show(current - 1); });
    box.querySelector('.lb-next').addEventListener('click', function(){ show(current + 1); });
    box.addEventListener('click', function(e){ if(e.target === box) closeBox(); });
    document.addEventListener('keydown', function(e){
      if(box.hidden) return;
      if(e.key === 'Escape') closeBox();
      if(e.key === 'ArrowLeft') show(current + 1);
      if(e.key === 'ArrowRight') show(current - 1);
    });
    box.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function(e){
      if(startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if(Math.abs(dx) > 50) show(dx < 0 ? current + 1 : current - 1);
    });
  }

  var list = document.getElementById('updatesList');
  var more = document.getElementById('updatesMore');
  if(list && more){
    more.addEventListener('click', function(){
      var open = list.classList.toggle('is-collapsed') === false;
      more.setAttribute('aria-expanded', open ? 'true' : 'false');
      more.textContent = open ? 'عرض أقل' : 'عرض كل التحديثات';
    });
  }

  if(!/Android/i.test(navigator.userAgent)){
    var note = document.querySelector('.dev-note');
    if(!note) return;
    note.hidden = false;
    var copy = note.querySelector('button');
    copy.addEventListener('click', function(){
      if(!(navigator.clipboard && navigator.clipboard.writeText)) return;
      navigator.clipboard.writeText(location.href.split('#')[0]).then(function(){
        copy.textContent = 'تم نسخ الرابط ✓';
      }).catch(function(){});
    });
  }
})();
