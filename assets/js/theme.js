/* الوضع الفاتح/الداكن — بيتحمّل في الـ <head> عشان الصفحة متفلّش بلون غلط وهي بتفتح */
(function(){
  var d = document.documentElement, KEY = 'ti_theme', t = null;
  try{ t = localStorage.getItem(KEY); }catch(e){}
  if(t !== 'dark' && t !== 'light') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  d.setAttribute('data-theme', t);

  document.addEventListener('DOMContentLoaded', function(){
    var b = document.getElementById('themeToggle');
    if(!b) return;
    function sync(){
      var dark = d.getAttribute('data-theme') === 'dark';
      b.setAttribute('aria-pressed', dark);
      b.setAttribute('aria-label', dark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن');
    }
    sync();
    b.addEventListener('click', function(){
      var next = d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      d.setAttribute('data-theme', next);
      try{ localStorage.setItem(KEY, next); }catch(e){}
      sync();
    });
  });
})();
