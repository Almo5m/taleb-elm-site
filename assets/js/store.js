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
