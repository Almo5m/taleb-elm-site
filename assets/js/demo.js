/* =====================================================================
   ويدجت "جرّب دلوقتي" — عداد بومودورو حقيقي شغال + قائمة مهام تفاعلية.
   كل حاجة هنا محليّة في المتصفح بس (مفيش أي اتصال بـ Supabase)، الهدف
   إن الزائر "يحس" بالتجربة فعليًا قبل ما يحمّل التطبيق.
   ===================================================================== */
(function(){
  var timerEl = document.getElementById('demoTimerDisplay');
  var labelEl = document.getElementById('demoTimerLabel');
  var toggleBtn = document.getElementById('demoTimerToggle');
  var resetBtn = document.getElementById('demoTimerReset');
  if(!timerEl || !toggleBtn) return; /* القسم مش موجود في الصفحة دي */

  var DEMO_DURATION = 25 * 60;
  var remaining = DEMO_DURATION;
  var running = false;
  var intervalId = null;

  function formatTime(sec){
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderTimer(){
    timerEl.textContent = formatTime(remaining);
    timerEl.classList.toggle('is-running', running);
  }

  function tick(){
    remaining--;
    if(remaining <= 0){
      remaining = 0;
      renderTimer();
      stopTimer();
      labelEl.textContent = 'خلصت الجلسة! 🎉 كده ذاكرت 25 دقيقة';
      return;
    }
    renderTimer();
  }

  function startTimer(){
    running = true;
    intervalId = setInterval(tick, 1000);
    toggleBtn.classList.add('is-running');
    toggleBtn.querySelector('span').textContent = 'إيقاف';
    toggleBtn.querySelector('use').setAttribute('href', '#i-pause');
    labelEl.textContent = 'ركّز... باقي شوية';
    renderTimer();
  }

  function stopTimer(){
    running = false;
    clearInterval(intervalId);
    toggleBtn.classList.remove('is-running');
    toggleBtn.querySelector('span').textContent = remaining === DEMO_DURATION ? 'ابدأ' : 'كمّل';
    toggleBtn.querySelector('use').setAttribute('href', '#i-play');
    renderTimer();
  }

  toggleBtn.addEventListener('click', function(){
    if(running) stopTimer(); else startTimer();
  });

  resetBtn.addEventListener('click', function(){
    stopTimer();
    remaining = DEMO_DURATION;
    labelEl.textContent = 'جاهز تبدأ؟';
    toggleBtn.querySelector('span').textContent = 'ابدأ';
    renderTimer();
  });

  renderTimer();

  /* =====================================================================
     قائمة المهام التجريبية
     ===================================================================== */
  var form = document.getElementById('demoTaskForm');
  var input = document.getElementById('demoTaskInput');
  var list = document.getElementById('demoTaskList');
  var emptyEl = document.getElementById('demoTaskEmpty');
  var progressFill = document.getElementById('demoTaskProgressFill');
  var progressLabel = document.getElementById('demoTaskProgressLabel');
  if(!form) return;

  var tasks = []; /* { id, text, done } — في الذاكرة بس، بتتمسح لو الصفحة اتعملها ريفرش */
  var nextId = 1;

  function renderTasks(){
    var done = tasks.filter(function(t){ return t.done; }).length;
    var total = tasks.length;
    progressLabel.textContent = done + '/' + total + ' مهام';
    progressFill.style.width = total ? Math.round((done / total) * 100) + '%' : '0%';
    emptyEl.style.display = total ? 'none' : 'block';

    list.querySelectorAll('.demo-task-item').forEach(function(el){ el.remove(); });
    tasks.forEach(function(t){
      var li = document.createElement('li');
      li.className = 'demo-task-item' + (t.done ? ' is-done' : '');
      li.innerHTML =
        '<span class="demo-task-check" role="checkbox" aria-checked="' + t.done + '">' +
          '<svg viewBox="0 0 24 24" class="icon"><use href="#i-check"/></svg>' +
        '</span>' +
        '<span class="demo-task-text"></span>' +
        '<button type="button" class="demo-task-del" aria-label="حذف"><svg viewBox="0 0 24 24" class="icon"><use href="#i-close"/></svg></button>';
      li.querySelector('.demo-task-text').textContent = t.text; /* textContent عشان مفيش أي فرصة لحقن HTML */
      li.querySelector('.demo-task-check').addEventListener('click', function(){
        t.done = !t.done;
        renderTasks();
      });
      li.querySelector('.demo-task-del').addEventListener('click', function(){
        tasks = tasks.filter(function(x){ return x.id !== t.id; });
        renderTasks();
      });
      list.appendChild(li);
    });
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var text = input.value.trim();
    if(!text) return;
    tasks.push({ id: nextId++, text: text, done: false });
    input.value = '';
    renderTasks();
  });

  renderTasks();
})();
