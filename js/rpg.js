/* =========================================================
   稼轩行迹 · 互动叙事引擎（橙光式）
   ========================================================= */
(function (X) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var dom = {};
  var state = {
    scene: null,
    nodeId: null,
    node: null,
    typing: false,
    timer: null,
    full: '',
    shown: 0,
    bgKey: null,
    chapterId: null,
    choicesOpen: false,
    poemOpen: false,
    poemRevealed: false,
    ending: false,
    chapterLock: false,
    transitionLock: false,
    history: [],
    flags: {},
    logOpen: false,
    bgFlip: false,
    key: ''
  };

  var LIGHT_BG = { study: 1, door: 1, ehu: 1, sword: 1, wake: 1, cover: 1 };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function cacheDom() {
    dom.rpg = $('rpg');
    dom.stage = $('rpg-stage');
    dom.bgA = $('rpg-bg-a');
    dom.bgB = $('rpg-bg-b');
    dom.portrait = $('rpg-portrait');
    dom.portraitImg = dom.portrait.querySelector('img');
    dom.chapter = $('rpg-chapter-card');
    dom.chapterNo = dom.chapter.querySelector('.chapter-no');
    dom.chapterName = dom.chapter.querySelector('.chapter-name');
    dom.chapterPlace = dom.chapter.querySelector('.chapter-place');
    dom.chapterFlag = $('rpg-chapter-flag');
    dom.poemPanel = $('rpg-poem-panel');
    dom.scrollLines = $('scroll-lines');
    dom.dialog = $('rpg-dialog');
    dom.name = $('rpg-name');
    dom.text = $('rpg-text');
    dom.next = $('rpg-next');
    dom.choices = $('rpg-choices');
    dom.ending = $('rpg-ending');
    dom.endingNote = $('ending-note');
    dom.log = $('rpg-log');
    dom.logBody = $('rpg-log-body');
  }

  /* ---------------- 背景 / 立绘 / 章回 ---------------- */

  function setBg(key) {
    if (!key || key === state.bgKey) return;
    var url = 'assets/img/' + key + '.jpg';
    var incoming = state.bgFlip ? dom.bgA : dom.bgB;
    var outgoing = state.bgFlip ? dom.bgB : dom.bgA;
    incoming.style.backgroundImage = 'url("' + url + '")';
    requestAnimationFrame(function () {
      incoming.classList.add('is-on');
      outgoing.classList.remove('is-on');
    });
    state.bgFlip = !state.bgFlip;
    state.bgKey = key;
  }

  function setPortrait(key) {
    if (!key) {
      dom.portrait.classList.remove('is-on');
      return;
    }
    var url = 'assets/img/' + key + '.jpg';
    if (dom.portraitImg.getAttribute('src') !== url) dom.portraitImg.src = url;
    dom.portrait.classList.add('is-on');
  }

  function showChapter(ch, after) {
    state.chapterLock = true;
    dom.chapterNo.textContent = ch.no;
    dom.chapterName.textContent = ch.name;
    dom.chapterPlace.textContent = ch.place;
    dom.chapterFlag.textContent = ch.no + ' · ' + ch.name;
    dom.chapter.hidden = false;
    dom.chapter.classList.remove('is-out');
    dom.chapter.style.animation = '';
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      dom.chapter.classList.add('is-out');
      setTimeout(function () {
        dom.chapter.hidden = true;
        dom.chapter.classList.remove('is-out');
        state.chapterLock = false;
        if (after) after();
      }, 520);
    }
    dom.chapter.onclick = function (e) { e.stopPropagation(); close(); };
    setTimeout(close, 1900);
  }

  /* ---------------- 打字机 ---------------- */

  function typeText(text) {
    clearInterval(state.timer);
    state.full = text;
    state.shown = 0;
    state.typing = true;
    dom.text.innerHTML = '';
    dom.next.classList.remove('is-on');
    var tick = Math.max(18, Math.min(42, 2600 / Math.max(12, text.length)));
    state.timer = setInterval(function () {
      state.shown += 1;
      if (state.shown >= state.full.length) {
        finishTyping();
      } else {
        dom.text.innerHTML = esc(state.full.slice(0, state.shown)) + '<span class="cursor"></span>';
      }
    }, tick);
  }

  function finishTyping() {
    clearInterval(state.timer);
    state.typing = false;
    dom.text.innerHTML = esc(state.full);
    if (state.node) afterText(state.node);
  }

  function afterText(node) {
    if (node.choices) {
      showChoices(node.choices);
      return;
    }
    if (node.fx === 'flash') {
      state.transitionLock = true;
      var token = state.fxToken;
      flash(function () {
        if (token !== state.fxToken) return;
        state.transitionLock = false;
        if (!state.scene) return;
        goto(node.next);
      });
      return;
    }
    if (node.fx === 'poem') {
      openPoem();
      return;
    }
    dom.next.classList.add('is-on');
  }

  /* ---------------- 选项 ---------------- */

  function showChoices(list) {
    state.choicesOpen = true;
    dom.choices.innerHTML = '';
    list.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'choice-btn';
      b.type = 'button';
      b.style.animationDelay = (i * 90) + 'ms';
      b.textContent = c.text;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        pickChoice(c);
      });
      dom.choices.appendChild(b);
    });
    dom.choices.hidden = false;
  }

  function pickChoice(c) {
    state.choicesOpen = false;
    dom.choices.hidden = true;
    dom.choices.innerHTML = '';
    if (c.flag) state.flags[c.flag] = true;
    pushLog('选择', c.text);
    goto(c.next);
  }

  /* ---------------- 词卷 ---------------- */

  function openPoem() {
    state.poemOpen = true;
    state.poemRevealed = false;
    dom.scrollLines.innerHTML = '';
    X.POEM.lines.forEach(function (line, i) {
      var d = document.createElement('div');
      d.className = 'scroll-line';
      d.textContent = line.text.replace(/[，。！]$/, '');
      d.style.animationDelay = (i * 190) + 'ms';
      d.addEventListener('animationend', function () {
        d.style.opacity = '1';
        d.style.transform = 'none';
      });
      dom.scrollLines.appendChild(d);
    });
    dom.poemPanel.hidden = false;
    setTimeout(function () { state.poemRevealed = true; }, X.POEM.lines.length * 190 + 300);
  }

  function closePoem() {
    dom.poemPanel.hidden = true;
    state.poemOpen = false;
    goto(state.node.next);
  }

  /* ---------------- 闪白（入梦） ---------------- */

  function flash(cb) {
    var d = document.createElement('div');
    d.className = 'rpg-flash';
    dom.stage.appendChild(d);
    setTimeout(function () {
      d.remove();
      cb();
    }, 720);
  }

  /* ---------------- 主流程 ---------------- */

  function clearOverlays() {
    if (state.choicesOpen) {
      state.choicesOpen = false;
      dom.choices.hidden = true;
      dom.choices.innerHTML = '';
    }
    if (state.poemOpen) {
      state.poemOpen = false;
      state.poemRevealed = false;
      dom.poemPanel.hidden = true;
    }
  }

  function goto(id) {
    if (state.ending) return;
    state.fxToken = (state.fxToken || 0) + 1;
    state.transitionLock = false;
    clearOverlays();
    if (id === 'END' || !id) { finish(); return; }
    var node = state.scene.nodes[id];
    if (!node) { finish(); return; }

    /* 条件节点：条件不满足则跳过 */
    if (node.cond && !state.flags[node.cond]) { goto(node.next); return; }

    state.nodeId = id;
    state.node = node;

    var bg = node.bg || state._bg || 'study';
    if (node.bg) state._bg = node.bg;

    if (node.ch && node.ch !== state.chapterId) {
      var ch = findChapter(node.ch);
      state.chapterId = node.ch;
      if (ch) {
        setBg(bg);
        dom.dialog.style.opacity = '0';
        showChapter(ch, function () {
          dom.dialog.style.opacity = '';
          renderNode(node);
        });
        return;
      }
    }
    renderNode(node);
    setBg(bg);
  }

  function findChapter(id) {
    var list = state.scene.chapters || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function renderNode(node) {
    var speaker = node.s || '旁白';
    var cast = state.scene.cast[speaker] || {};
    dom.name.textContent = speaker;
    dom.name.classList.toggle('is-narrator', speaker === '旁白');
    dom.name.style.background = speaker === '旁白' ? '' : (cast.color || '');

    var bgKey = node.bg || state._bg || 'study';
    var portrait = null;
    if (speaker !== '旁白' && cast.portrait && LIGHT_BG[bgKey]) portrait = cast.portrait;
    setPortrait(portrait);

    if (node.s !== '旁白') pushLog(speaker, node.t);
    else pushLog('旁白', node.t);

    state.typing = false;
    if (node.fx === 'poem') {
      dom.text.innerHTML = esc(node.t);
      afterText(node);
      return;
    }
    typeText(node.t);
  }

  function pushLog(who, text) {
    state.history.push({ who: who, text: text });
    if (state.history.length > 200) state.history.shift();
  }

  /* ---------------- 推进 / 结束 ---------------- */

  function advance() {
    if (!state.scene || state.ending || state.logOpen || state.transitionLock) return;
    if (state.chapterLock) return;
    if (state.poemOpen) {
      if (!state.poemRevealed) {
        state.poemRevealed = true;
        Array.prototype.forEach.call(dom.scrollLines.children, function (d) {
          d.style.animationDelay = '0ms';
          d.style.opacity = '1';
          d.style.transform = 'none';
        });
        return;
      }
      closePoem();
      return;
    }
    if (state.choicesOpen) return;
    if (state.typing) { finishTyping(); return; }
    var node = state.node;
    if (!node) return;
    if (node.next) goto(node.next);
    else finish();
  }

  function finish() {
    state.ending = true;
    dom.choices.hidden = true;
    dom.poemPanel.hidden = true;
    dom.dialog.style.opacity = '0';
    dom.endingNote.textContent = state.scene.ending ? state.scene.ending.note : '';
    dom.ending.hidden = false;
    if (X.App && X.App.markSceneDone) X.App.markSceneDone(state.scene.id);
  }

  /* ---------------- 开 / 关 ---------------- */

  function start(sceneId) {
    var scene = X.SCENES[sceneId];
    if (!scene) return;
    clearInterval(state.timer);
    state.scene = scene;
    state.node = null;
    state.nodeId = null;
    state.bgKey = null;
    state._bg = 'study';
    state.chapterId = null;
    state.flags = {};
    state.history = [];
    state.ending = false;
    state.choicesOpen = false;
    state.poemOpen = false;
    state.chapterLock = false;
    state.transitionLock = false;
    state.typing = false;
    state.bgFlip = false;

    dom.bgA.classList.remove('is-on');
    dom.bgB.classList.remove('is-on');
    dom.bgA.style.backgroundImage = '';
    dom.bgB.style.backgroundImage = '';
    dom.ending.hidden = true;
    dom.choices.hidden = true;
    dom.choices.innerHTML = '';
    dom.poemPanel.hidden = true;
    dom.chapter.hidden = true;
    dom.portrait.classList.remove('is-on');
    dom.dialog.style.opacity = '';
    dom.dialog.hidden = false;
    dom.log.hidden = true;
    state.logOpen = false;

    dom.rpg.hidden = false;
    document.body.classList.add('is-rpg');

    setBg('study');
    goto(scene.entry);
  }

  function close() {
    clearInterval(state.timer);
    dom.rpg.hidden = true;
    document.body.classList.remove('is-rpg');
    state.scene = null;
    state.node = null;
    state.typing = false;
    state.poemOpen = false;
    state.ending = false;
    state.transitionLock = false;
    state.chapterLock = false;
  }

  function openLog() {
    if (!state.history.length) return;
    state.logOpen = true;
    dom.logBody.innerHTML = '';
    state.history.forEach(function (h) {
      var row = document.createElement('div');
      row.className = 'log-row';
      var who = document.createElement('div');
      who.className = 'log-speaker';
      who.textContent = h.who;
      var tx = document.createElement('div');
      tx.className = 'log-text';
      tx.textContent = h.text;
      row.appendChild(who);
      row.appendChild(tx);
      dom.logBody.appendChild(row);
    });
    dom.log.hidden = false;
    dom.logBody.scrollTop = dom.logBody.scrollHeight;
  }

  function closeLog() {
    state.logOpen = false;
    dom.log.hidden = true;
  }

  /* ---------------- 事件绑定 ---------------- */

  function bind() {
    dom.stage.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      if (e.target.closest('.rpg-hud')) return;
      if (e.target.closest('.rpg-ending')) return;
      if (e.target.closest('.rpg-log')) return;
      if (e.target.closest('.rpg-poem-panel')) {
        advance();
        return;
      }
      advance();
    });

    dom.rpg.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-rpg]');
      if (!btn) return;
      var act = btn.getAttribute('data-rpg');
      e.stopPropagation();
      if (act === 'history') openLog();
      else if (act === 'close-history') closeLog();
      else if (act === 'restart' || act === 'replay') {
        if (state.scene) closeLog(), start(state.scene.id);
      } else if (act === 'exit') {
        close();
      } else if (act === 'to-map') {
        close();
      } else if (act === 'to-poem') {
        close();
        if (X.App) X.App.openPoem();
      }
    });

    dom.ending.addEventListener('click', function (e) { e.stopPropagation(); });
    dom.choices.addEventListener('click', function (e) { e.stopPropagation(); });
    dom.log.addEventListener('click', function (e) {
      if (e.target === dom.log || e.target.closest('[data-rpg]')) {
        var b = e.target.closest('[data-rpg]');
        if (b && b.getAttribute('data-rpg') === 'close-history') closeLog();
        else if (e.target === dom.log) closeLog();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (dom.rpg.hidden) return;
      if (e.key === 'Escape') {
        if (state.logOpen) closeLog();
        else close();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (e.target.closest('button')) return;
        e.preventDefault();
        advance();
      }
    });
  }

  X.RPG = {
    init: function () {
      cacheDom();
      bind();
    },
    start: start,
    jump: function (id) { goto(id); },
    close: close,
    isOpen: function () { return !dom.rpg.hidden; }
  };
})(window.XQJ);
