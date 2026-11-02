/* صفحات القانون: شريط تقدّم + البند الحالي في الفهرس. الثيم في theme.js. */
(function(){
  var root = document.documentElement;
  var bar = document.getElementById('bar');
  var progress = document.getElementById('progress');
  var links = [].slice.call(document.querySelectorAll('.toc a'));
  var sheets = links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); });
  var current = -1, queued = false;

  function syncBar(){ root.style.setProperty('--bar-h', bar.offsetHeight + 'px'); }

  function update(){
    queued = false;
    var max = root.scrollHeight - root.clientHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0).toFixed(4) + ')';
    var idx = 0;
    sheets.forEach(function(s, i){ if(s.getBoundingClientRect().top <= root.clientHeight * 0.35) idx = i; });
    if(idx === current) return;
    current = idx;
    links.forEach(function(a, i){
      a.classList.toggle('active', i === idx);
      if(i === idx){ a.setAttribute('aria-current', 'true'); a.scrollIntoView({ inline: 'center', block: 'nearest' }); }
      else a.removeAttribute('aria-current');
    });
  }
  function request(){ if(!queued){ queued = true; requestAnimationFrame(update); } }

  syncBar(); update();
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', function(){ syncBar(); request(); });
})();
