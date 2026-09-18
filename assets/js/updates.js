/* =====================================================================
   قائمة آخر التحديثات — عدّل هنا مع كل نسخة جديدة، بالأحدث فوق.
   ===================================================================== */
const APP_UPDATES = [
  {
    version: "الإصدار 2.0",
    date: "سبتمبر 2026",
    latest: true,
    items: [
      "تصميم جديد بالكامل — ألوان وأزرار وقوائم كل شاشة اتظبطت لتجربة أوضح وأهدأ للعين",
      "بو، مساعدك الذكي الجديد — يجاوبك على أسئلتك عن التطبيق، يدعمك وقت المذاكرة، وممكن يشرحلك مفهوم أو يساعدك تحل مسألة",
      "منتدى أقوى — بحث أسرع، تثبيت المواضيع المهمة فوق، وإمكانية ترفق صورة في سؤالك أو ردك",
      "رتّب ملفاتك زي ما يريحك — اسحب وأفلت لإعادة ترتيب ملفات كل مادة، مع تأكيد قبل أي حذف",
      "متابعة المحاضرات — علّم أي محاضرة اتفرجت عليها، والستريك بقى بيحسب كمان أيام مشاهدة المحاضرات",
      "تقنية مذاكرة جديدة: العداد المفتوح — لطالب حابب يسيب الموبايل بعيد ويذاكر من غير قطع",
      "مهام بمواعيد وتذكير مستمر لحد الإنجاز، ولو حددت مهمة \"تمت\" غلط قدامك 3 ثواني تتراجع فيها",
      "لوحة تصنيف جديدة — تبويب \"الأكثر مذاكرة\" يوريك مين فعلاً بيذاكر أكتر ساعات",
      "بو بيفتكر كلامك — محادثاتك معاه بتتسجل عشان ترجعلها وقت ما تحب"
    ]
  },
  {
    version: "الإصدار 1.0",
    date: "أغسطس 2026",
    latest: false,
    items: [
      "أول نسخة تجريبية من التطبيق متاحة للتحميل",
      "جدول مذاكرة يومي وتتبع إنجاز المهام",
      "مواد الكيمياء والفيزياء والأحياء والعربي والإنجليزي، وموادّ تانية حسب شعبتك",
      "منتدى لطلاب صفك وشعبتك بالظبط",
      "إنجازات ولوحة ترتيب لتحفيزك على الاستمرار"
    ]
  }
];

function renderUpdates(){
  var list = document.getElementById('updatesList');
  if(!list) return;

  function itemHtml(u){
    return '<div class="update-item' + (u.latest ? ' is-latest' : '') + '">' +
      '<div class="update-top">' +
        '<span class="update-version">' + u.version + '</span>' +
        (u.latest ? '<span class="update-badge">الأحدث</span>' : '') +
        '<span class="update-date">' + u.date + '</span>' +
      '</div>' +
      '<ul>' + u.items.map(function(t){
        return '<li><svg viewBox="0 0 24 24" class="icon"><use href="#i-check"/></svg>' + t + '</li>';
      }).join('') + '</ul>' +
    '</div>';
  }

  var latestItems = APP_UPDATES.filter(function(u){ return u.latest; });
  var olderItems = APP_UPDATES.filter(function(u){ return !u.latest; });

  var html = latestItems.map(itemHtml).join('');
  if(olderItems.length){
    html += '<div class="updates-older" id="updatesOlder" hidden>' + olderItems.map(itemHtml).join('') + '</div>' +
      '<button type="button" class="updates-toggle" id="updatesToggle">' +
        '<span>شوف الإصدارات القديمة (' + olderItems.length + ')</span>' +
        '<svg viewBox="0 0 24 24" class="icon"><use href="#i-chevron"/></svg>' +
      '</button>';
  }
  list.innerHTML = html;

  var toggleBtn = document.getElementById('updatesToggle');
  var olderBox = document.getElementById('updatesOlder');
  if(toggleBtn && olderBox){
    toggleBtn.addEventListener('click', function(){
      var isHidden = olderBox.hasAttribute('hidden');
      if(isHidden){ olderBox.removeAttribute('hidden'); }
      else{ olderBox.setAttribute('hidden', ''); }
      toggleBtn.classList.toggle('is-open', isHidden);
      toggleBtn.querySelector('span').textContent = isHidden
        ? 'إخفاء الإصدارات القديمة'
        : 'شوف الإصدارات القديمة (' + olderItems.length + ')';
    });
  }
}
