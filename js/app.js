/* =========================================================
   稼轩行迹 · 界面与交互
   ========================================================= */
(function (X) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    selected: null,
    progress: { seen: {}, scenes: {}, poem: false },
    poemLine: null,
    speaking: false,
    toastTimer: null
  };

  var dom = {};

  /* ---------------- 存档 ---------------- */

  function loadProgress() {
    try {
      var raw = localStorage.getItem(X.CONFIG.storageKey);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.seen) state.progress = { seen: p.seen || {}, scenes: p.scenes || {}, poem: !!p.poem };
      }
    } catch (e) { /* file:// 环境下存储不可用时静默降级 */ }
  }
  function saveProgress() {
    try { localStorage.setItem(X.CONFIG.storageKey, JSON.stringify(state.progress)); } catch (e) {}
  }

  /* ---------------- 小工具 ---------------- */

  function toast(msg, ms) {
    var t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, ms || 2200);
  }

  function findLoc(id) {
    for (var i = 0; i < X.LOCATIONS.length; i++) if (X.LOCATIONS[i].id === id) return X.LOCATIONS[i];
    return null;
  }

  function typeLabel(t) { return (X.TYPES[t] || {}).label || '行迹'; }

  /* ---------------- 侧栏 ---------------- */

  function renderIntro() {
    var legend = Object.keys(X.TYPES).map(function (k) {
      return '<li><span class="dot ' + k + '"></span>' + X.TYPES[k].label + '</li>';
    }).join('');

    dom.sideInner.innerHTML =
      '<div class="side-intro">' +
        '<div class="intro-figure">' +
          '<img src="assets/img/xinqiji.jpg" alt="辛弃疾意笔画像">' +
          '<span>辛弃疾 · 意笔</span>' +
        '</div>' +
        '<h2>一个人，一幅地图</h2>' +
        '<p class="intro-quote">“醉里挑灯看剑，梦回吹角连营。”</p>' +
        '<div class="intro-actions">' +
          '<button class="ink-btn ink-btn-seal" data-act="start-scene" data-scene="ehu">进入《破阵子》叙事</button>' +
          '<button class="ink-btn ink-btn-ghost" data-act="poem">读《破阵子》</button>' +
        '</div>' +
        (state.progress.scenes.ehu ? '<p class="intro-done">已读完这段叙事，可以再走一遍。</p>' : '') +
        '<p>辛弃疾（1140—1207），字幼安，号稼轩，山东历城人。二十二岁起兵，南归后力主抗金，一生起落，闲居江西近二十年。</p>' +
        '<p>图上的每一处墨点，都是他曾经站立过的地方。</p>' +
        '<p class="intro-hint">点一处墨点，看他在这里做了什么。</p>' +
        '<div class="legend-wrap"><h3 class="side-sub">图例</h3>' +
        '<ul class="legend">' + legend + '</ul></div>' +
      '</div>';
  }

  function renderLocation(loc) {
    var events = loc.events.map(function (ev, i) {
      var flag = '';
      if (ev.hasScene) {
        flag = state.progress.scenes[ev.scene]
          ? '<span class="event-flag is-done">阅</span>'
          : '<span class="event-flag">叙</span>';
      }
      var actions = [];
      if (ev.scene) actions.push('<button class="ink-btn ink-btn-seal" data-act="scene" data-scene="' + ev.scene + '">进入互动叙事</button>');
      if (ev.poem) actions.push('<button class="ink-btn ink-btn-ghost" data-act="poem">看词作</button>');
      if (ev.goto) actions.push('<button class="ink-btn ink-btn-ghost" data-act="goto" data-loc="' + ev.goto + '">前往此处</button>');
      if (ev.scene) actions.push('<button class="ink-btn ink-btn-ghost" data-act="poem">先读原词</button>');

      return '<article class="event' + (i === 0 ? ' is-open' : '') + '" data-idx="' + i + '">' +
        '<button class="event-head" aria-expanded="' + (i === 0) + '">' +
          '<span class="event-year">' + ev.year + '</span>' +
          '<span class="event-titles">' +
            '<b class="event-title">' + ev.title + '</b>' +
            '<span class="event-brief">' + ev.brief + '</span>' +
          '</span>' + flag +
        '</button>' +
        '<div class="event-body"><div class="event-body-inner"><div class="event-detail">' +
          ev.detail.map(function (p) { return '<p>' + p + '</p>'; }).join('') +
          (actions.length ? '<div class="event-actions">' + actions.join('') + '</div>' : '') +
        '</div></div></div>' +
      '</article>';
    }).join('');

    dom.sideInner.innerHTML =
      '<div class="loc-head">' +
        '<button class="loc-close" data-act="close-loc" aria-label="返回总览">×</button>' +
        '<h2 class="loc-name">' + loc.name + '</h2>' +
        '<p class="loc-modern">' + loc.modern + ' · ' + loc.years + '</p>' +
        '<div class="loc-tags">' +
          '<span class="tag is-seal">' + typeLabel(loc.type) + '</span>' +
          '<span class="tag">' + loc.events.length + ' 则行迹</span>' +
          (loc.events.some(function (e) { return e.hasScene; }) ? '<span class="tag">含互动叙事</span>' : '') +
        '</div>' +
      '</div>' +
      '<p class="loc-summary">' + loc.summary + '</p>' +
      '<div class="events">' + events + '</div>';

    dom.sideInner.scrollTop = 0;
  }

  function selectLocation(id, silent) {
    var loc = findLoc(id);
    if (!loc) return;
    state.selected = id;
    X.MapUI.setActive(id);
    X.MapUI.markSeen(id);
    state.progress.seen[id] = true;
    saveProgress();
    renderLocation(loc);
    if (!silent) X.MapUI.center(id);
    highlightYear(loc.events[0] && loc.events[0].year);
  }

  function clearSelection() {
    if (!state.selected) return;
    state.selected = null;
    X.MapUI.setActive(null);
    renderIntro();
    highlightYear(null);
  }

  /* ---------------- 编年 ---------------- */

  function renderTimeline() {
    dom.timeline.innerHTML = X.YEARS.map(function (y) {
      return '<button class="year-chip" data-year="' + y.year + '" data-loc="' + y.loc + '">' +
        '<span class="yc-year">' + y.year + '</span>' +
        '<span class="yc-label">' + y.label + '</span>' +
      '</button>';
    }).join('');
  }

  function highlightYear(year) {
    var chips = dom.timeline.querySelectorAll('.year-chip');
    Array.prototype.forEach.call(chips, function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-year') === year);
    });
    if (year) {
      var active = dom.timeline.querySelector('.year-chip.is-active');
      if (active && active.scrollIntoView) {
        dom.timeline.scrollTo({ left: Math.max(0, active.offsetLeft - 120), behavior: 'smooth' });
      }
    }
  }

  /* ---------------- 弹窗 ---------------- */

  function openModal(id) {
    var m = $(id);
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('is-modal');
  }
  function closeModal(id) {
    var m = $(id);
    if (!m) return;
    m.hidden = true;
    if (!$('modal-poem').hidden || !$('modal-guide').hidden) return;
    document.body.classList.remove('is-modal');
  }
  function closeAllModals() {
    $('modal-poem').hidden = true;
    $('modal-guide').hidden = true;
    document.body.classList.remove('is-modal');
  }

  /* 词作 */
  function buildPoem() {
    var hosts = document.querySelectorAll('#poem-lines');
    hosts.forEach(function (host) {
      host.innerHTML = X.POEM.lines.map(function (line, i) {
        return '<div class="poem-line" data-i="' + i + '" role="button" tabindex="0">' +
          '<span class="line-no">' + (i + 1) + '</span>' + line.text +
        '</div>';
      }).join('');
    });
  }

  function renderPoemNote(i) {
    var body = $('poem-note-body');
    var title = $('poem-note-title');
    if (i === null || i === undefined) {
      title.textContent = '全词';
      body.innerHTML = X.POEM.overview.join('');
      return;
    }
    var line = X.POEM.lines[i];
    var idx = String(i + 1).padStart(2, '0');
    title.textContent = '第 ' + idx + ' 句';
    body.innerHTML =
      '<h4>' + line.text.replace(/[，。！]$/, '') + '</h4>' +
      '<div class="note-grid">' +
        line.note.comment.map(function (c) {
          var parts = c.split('：');
          return parts.length > 1
            ? '<div class="note-row"><b>' + parts[0] + '</b><span>' + parts.slice(1).join('：') + '</span></div>'
            : '<div class="note-row"><b>注</b><span>' + c + '</span></div>';
        }).join('') +
      '</div>' +
      '<h4>赏析</h4><p>' + line.note.analysis + '</p>';
    body.scrollTop = 0;
  }

  function openPoem() {
    openModal('modal-poem');
    state.poemLine = null;
    var lines = $('poem-lines').querySelectorAll('.poem-line');
    Array.prototype.forEach.call(lines, function (l) { l.classList.remove('is-active'); });
    renderPoemNote(null);
    if (!state.progress.poem) {
      state.progress.poem = true;
      saveProgress();
    }
  }

  function speakPoem() {
    var btn = $('btn-read');
    if (!('speechSynthesis' in window)) {
      toast('当前浏览器不支持语音朗读');
      return;
    }
    if (state.speaking) {
      window.speechSynthesis.cancel();
      state.speaking = false;
      btn.textContent = '朗读全词';
      return;
    }
    var u = new SpeechSynthesisUtterance(X.POEM.readText);
    u.lang = 'zh-CN';
    u.rate = 0.82;
    u.pitch = 0.95;
    var voices = window.speechSynthesis.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (/zh[-_]CN/i.test(voices[i].lang) || /Chinese|中文|普通话/i.test(voices[i].name)) {
        u.voice = voices[i];
        break;
      }
    }
    u.onend = function () { state.speaking = false; btn.textContent = '朗读全词'; };
    u.onerror = function () { state.speaking = false; btn.textContent = '朗读全词'; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    state.speaking = true;
    btn.textContent = '停止朗读';
  }

  /* 全屏 */
  function toggleFullscreen() {
    var el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(function () { toast('浏览器未允许全屏'); });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  /* ---------------- 事件 ---------------- */

  function bindGlobal() {
    document.addEventListener('click', function (e) {
      var closeEl = e.target.closest('[data-close]');
      if (closeEl) {
        closeModal('modal-' + closeEl.getAttribute('data-close'));
        return;
      }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'poem') openPoem();
      else if (a === 'guide') openModal('modal-guide');
      else if (a === 'fullscreen') toggleFullscreen();
      else if (a === 'close-loc') clearSelection();
      else if (a === 'start-scene') X.RPG.start(act.getAttribute('data-scene') || 'ehu');
      else if (a === 'scene') X.RPG.start(act.getAttribute('data-scene'));
      else if (a === 'goto') {
        var id = act.getAttribute('data-loc');
        selectLocation(id);
        X.MapUI.center(id);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (X.RPG.isOpen()) return;
      closeAllModals();
    });

    $('poem-lines').addEventListener('click', function (e) {
      var line = e.target.closest('.poem-line');
      if (!line) return;
      var i = parseInt(line.getAttribute('data-i'), 10);
      var all = $('poem-lines').querySelectorAll('.poem-line');
      Array.prototype.forEach.call(all, function (l) { l.classList.toggle('is-active', l === line); });
      state.poemLine = i;
      renderPoemNote(i);
    });

    $('poem-lines').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var line = e.target.closest('.poem-line');
      if (!line) return;
      e.preventDefault();
      line.click();
    });

    $('btn-read').addEventListener('click', speakPoem);

    dom.sideInner.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (act) return; /* 交给全局代理 */
      var head = e.target.closest('.event-head');
      if (!head) return;
      var art = head.closest('.event');
      var open = art.classList.toggle('is-open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    dom.timeline.addEventListener('click', function (e) {
      var chip = e.target.closest('.year-chip');
      if (!chip) return;
      selectLocation(chip.getAttribute('data-loc'));
    });
  }

  /* ---------------- 启动 ---------------- */

  function preload() {
    ['study', 'door', 'ehu', 'sword', 'camp', 'battle', 'wake', 'cover', 'chenliang', 'xinqiji'].forEach(function (k) {
      var img = new Image();
      img.src = 'assets/img/' + k + '.jpg';
    });
  }

  function enter() {
    var splash = $('splash');
    if (splash.hidden || splash.classList.contains('is-leaving')) return;
    splash.classList.add('is-leaving');
    setTimeout(function () { splash.hidden = true; }, 950);
    preload();
    setTimeout(function () {
      if (!state.selected) toast('点地图上的墨点，开始');
    }, 1500);
  }

  function init() {
    dom.sideInner = $('side-inner');
    dom.timeline = $('timeline');

    var splash = $('splash');
    splash.hidden = false;
    splash.classList.remove('is-leaving');

    loadProgress();
    buildPoem();
    renderTimeline();
    renderIntro();
    X.MapUI.init(selectLocation);
    X.RPG.init();
    bindGlobal();

    Object.keys(state.progress.seen).forEach(function (id) { X.MapUI.markSeen(id); });

    $('btn-enter').addEventListener('click', enter);
    $('app').addEventListener('click', function () { /* 占位，保持事件顺序 */ });

    document.addEventListener('keydown', function (e) {
      if (X.RPG.isOpen()) return;
      if (e.key === 'Escape' && state.selected) clearSelection();
    });
  }

  X.App = {
    init: init,
    openPoem: openPoem,
    clearSelection: clearSelection,
    markSceneDone: function (sceneId) {
      if (state.progress.scenes[sceneId]) return;
      state.progress.scenes[sceneId] = true;
      saveProgress();
      if (state.selected) renderLocation(findLoc(state.selected));
      toast('这一段读完了 · 得一枚「阅」印');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.XQJ);
