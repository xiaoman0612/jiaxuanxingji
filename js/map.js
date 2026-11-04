/* =========================================================
   稼轩行迹 · 水墨地图渲染
   ========================================================= */
(function (X) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var G = window.MAP_GEO;
  var svg, markerLayer, onSelect, markers = {};

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }
  function txt(x, y, str, cls, extra) {
    var t = el('text', { x: x, y: y, 'class': cls || '' });
    if (extra) for (var k in extra) t.setAttribute(k, extra[k]);
    t.textContent = str;
    return t;
  }

  /* 投影：经纬度 → 视图坐标（与 _build/build-map.mjs 一致） */
  function proj(lon, lat) {
    return [
      (lon - G.lon0) / (G.lon1 - G.lon0) * G.w,
      (G.lat0 - lat) / (G.lat0 - G.lat1) * G.h
    ];
  }

  /* 山峦笔触 */
  var RIDGES = [
    [700, 196, 1], [726, 188, .8], [676, 205, .74], [646, 214, .6],
    [596, 246, .9], [566, 252, .78], [536, 258, .66], [506, 262, .6],
    [470, 268, .5], [438, 276, .44], [410, 288, .4], [378, 300, .34],
    [338, 312, .3], [300, 300, .26],
    [706, 300, .5], [738, 292, .42], [770, 300, .36],
    [636, 430, .5], [666, 440, .44], [700, 452, .38], [736, 446, .34],
    [792, 424, .36], [820, 436, .3],
    [566, 470, .32], [530, 480, .28],
    [760, 156, .5], [800, 168, .4], [836, 182, .32]
  ];

  function ridgeG(cx, cy, s) {
    var g = el('g', { transform: 'translate(' + cx + ',' + cy + ') scale(' + s + ')' });
    g.appendChild(el('path', {
      d: 'M-15 5 Q-9 -1 -5 -6 Q-1 -1 2 2 Q5 -4 9 -8 Q13 -2 15 5',
      fill: 'none', stroke: '#3b382e', 'stroke-width': '1.6',
      'stroke-linecap': 'round', opacity: '.5'
    }));
    return g;
  }

  /* 海浪纹 */
  function seaLines() {
    var g = el('g', { 'class': 'sea-lines', opacity: '.55' });
    var rows = [300, 330, 360, 390, 420, 450, 480, 510, 540];
    rows.forEach(function (y, i) {
      var d = 'M' + (860 + (i % 2) * 14) + ' ' + y;
      for (var x = 860; x < 1010; x += 26) {
        d += ' q6.5 -5 13 0 q6.5 5 13 0';
      }
      g.appendChild(el('path', {
        d: d, fill: 'none', stroke: '#5d7176', 'stroke-width': '.8',
        'stroke-linecap': 'round', opacity: '.34'
      }));
    });
    return g;
  }

  function build() {
    svg = document.getElementById('map');
    svg.setAttribute('viewBox', '0 0 ' + G.w + ' ' + G.h);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = '';

    var defs = el('defs');

    /* 纸底 */
    var paperGrad = el('linearGradient', { id: 'seaGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
    paperGrad.appendChild(el('stop', { offset: '0', 'stop-color': '#e6e6d9' }));
    paperGrad.appendChild(el('stop', { offset: '1', 'stop-color': '#dfe1d2' }));
    defs.appendChild(paperGrad);

    var landGrad = el('linearGradient', { id: 'landGrad', x1: '0', y1: '0', x2: '.3', y2: '1' });
    landGrad.appendChild(el('stop', { offset: '0', 'stop-color': '#f4ecd8' }));
    landGrad.appendChild(el('stop', { offset: '.55', 'stop-color': '#eee2c9' }));
    landGrad.appendChild(el('stop', { offset: '1', 'stop-color': '#e7d9bd' }));
    defs.appendChild(landGrad);

    /* 边缘淡出：让裁切过的图幅像旧纸一样化进背景 */
    function edgeFade(id, x1, y1, x2, y2) {
      var g = el('linearGradient', { id: id, x1: x1, y1: y1, x2: x2, y2: y2 });
      g.appendChild(el('stop', { offset: '0', 'stop-color': '#f1e6ce', 'stop-opacity': '.95' }));
      g.appendChild(el('stop', { offset: '.55', 'stop-color': '#f1e6ce', 'stop-opacity': '.45' }));
      g.appendChild(el('stop', { offset: '1', 'stop-color': '#f1e6ce', 'stop-opacity': '0' }));
      defs.appendChild(g);
    }
    edgeFade('fadeL', '0', '0', '1', '0');
    edgeFade('fadeR', '1', '0', '0', '0');
    edgeFade('fadeT', '0', '0', '0', '1');
    edgeFade('fadeB', '0', '1', '0', '0');

    /* 图形裁剪：只显示视图内的陆地 */
    var clip = el('clipPath', { id: 'viewClip' });
    clip.appendChild(el('rect', { x: 0, y: 0, width: G.w, height: G.h }));
    defs.appendChild(clip);

    var landClip = el('clipPath', { id: 'landClip' });
    landClip.appendChild(el('path', { d: G.land }));
    G.islands.forEach(function (d) { landClip.appendChild(el('path', { d: d })); });
    defs.appendChild(landClip);

    svg.appendChild(defs);

    var root = el('g', { 'clip-path': 'url(#viewClip)' });
    svg.appendChild(root);

    /* 海 */
    root.appendChild(el('rect', { x: 0, y: 0, width: G.w, height: G.h, fill: 'url(#seaGrad)' }));
    root.appendChild(seaLines());

    /* 陆地 */
    var landG = el('g', { 'class': 'land-g', 'pointer-events': 'none' });
    landG.appendChild(el('path', { d: G.land, fill: 'url(#landGrad)', stroke: '#3a362c', 'stroke-width': '1.5', 'stroke-linejoin': 'round' }));
    G.islands.forEach(function (d) {
      landG.appendChild(el('path', { d: d, fill: 'url(#landGrad)', stroke: '#3a362c', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }));
    });
    root.appendChild(landG);

    /* 金、南宋的淡墨分色 */
    var wash = el('g', { 'clip-path': 'url(#landClip)', 'pointer-events': 'none' });
    wash.appendChild(el('rect', { x: 0, y: 0, width: G.w, height: G.h, fill: '#b7a06e', opacity: '.10' }));
    wash.appendChild(el('path', {
      d: 'M267 217 C 330 225, 390 232, 452 238 S 545 247, 610 245 S 720 241, 790 238 S 850 234, 872 230 L 1000 224 L 1000 -40 L 0 -40 L 0 217 Z',
      fill: '#7e98a2', opacity: '.16'
    }));
    root.appendChild(wash);

    /* 河流 */
    var rivers = el('g', { 'class': 'rivers', 'clip-path': 'url(#landClip)', 'pointer-events': 'none' });
    var mainR = ['changjiang', 'huanghe'];
    var order = ['huanghe', 'changjiang', 'han', 'gan', 'yuan', 'min', 'xi', 'huai', 'xiang'];
    order.forEach(function (k) {
      var d = G.rivers[k];
      if (!d) return;
      var isMain = mainR.indexOf(k) >= 0;
      rivers.appendChild(el('path', {
        d: d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        stroke: isMain ? '#6b7f86' : '#7d8f92',
        'stroke-width': isMain ? '2.1' : '1.25',
        opacity: isMain ? '.85' : '.6'
      }));
    });
    root.appendChild(rivers);

    /* 山水笔触 */
    var hills = el('g', { 'class': 'hills', 'clip-path': 'url(#landClip)', 'pointer-events': 'none' });
    RIDGES.forEach(function (r) { hills.appendChild(ridgeG(r[0], r[1], r[2])); });
    root.appendChild(hills);

    /* 宋金界 */
    var border = el('g', { 'class': 'border-g', 'pointer-events': 'none' });
    border.appendChild(el('path', {
      d: 'M267 217 C 330 225, 390 232, 452 238 S 545 247, 610 245 S 720 241, 790 238 S 850 234, 872 230',
      fill: 'none', stroke: '#8c463a', 'stroke-width': '1.6',
      'stroke-dasharray': '9 5', opacity: '.62'
    }));
    var bx = proj(113.2, 33.4);
    border.appendChild(txt(bx[0], bx[1] - 8, '宋金和议界', 'map-note', {
      'font-size': '11', 'text-anchor': 'middle', opacity: '.62'
    }));
    root.appendChild(border);

    /* 地名注记 */
    var notes = el('g', { 'class': 'map-notes', 'pointer-events': 'none' });
    function note(lon, lat, str, size, anchor, op) {
      var p = proj(lon, lat);
      notes.appendChild(txt(p[0], p[1], str, 'map-note', {
        'font-size': size || 12, 'text-anchor': anchor || 'middle', opacity: op || '.5'
      }));
    }
    note(114.3, 34.8, '开封', 11, 'middle', .42);
    note(112.4, 34.6, '洛阳', 11, 'middle', .42);
    note(112.1, 32.0, '襄阳', 11, 'middle', .42);
    note(108.9, 34.3, '长安', 11, 'middle', .38);
    note(118.1, 39.6, '燕京', 11, 'middle', .4);
    root.appendChild(notes);

    /* 海名 */
    var sea = el('g', { 'class': 'sea-names', 'pointer-events': 'none' });
    sea.appendChild(txt(956, 452, '东海', 'sea-name', { 'font-size': '16', opacity: '.34', style: 'writing-mode:vertical-rl;letter-spacing:.34em' }));
    root.appendChild(sea);

    /* 大区字 */
    var regions = el('g', { 'class': 'regions', 'pointer-events': 'none' });
    regions.appendChild(txt(470, 132, '金', 'region-name', { 'font-size': '58', opacity: '.2' }));
    regions.appendChild(txt(468, 352, '南宋', 'region-name', { 'font-size': '46', opacity: '.2' }));
    root.appendChild(regions);

    /* 右下 · 图名与印（版面已由页眉承担，此处留白） */
    var cart = el('g', { 'class': 'cartouche', 'pointer-events': 'none' });
    root.appendChild(cart);

    /* 罗盘 */
    var comp = el('g', { 'class': 'compass', transform: 'translate(916,96)', opacity: '.5' });
    comp.appendChild(el('path', { d: 'M0 -22 L7 8 L0 2 L-7 8 Z', fill: '#3a362c', opacity: '.8' }));
    comp.appendChild(txt(0, -28, '北', 'compass-n', { 'text-anchor': 'middle', 'font-size': '12' }));
    root.appendChild(comp);

    /* 四边淡出 */
    var fades = el('g', { 'class': 'edge-fades', 'pointer-events': 'none' });
    fades.appendChild(el('rect', { x: 0, y: 0, width: 72, height: G.h, fill: 'url(#fadeL)' }));
    fades.appendChild(el('rect', { x: G.w - 72, y: 0, width: 72, height: G.h, fill: 'url(#fadeR)' }));
    fades.appendChild(el('rect', { x: 0, y: 0, width: G.w, height: 54, fill: 'url(#fadeT)' }));
    fades.appendChild(el('rect', { x: 0, y: G.h - 58, width: G.w, height: 58, fill: 'url(#fadeB)' }));
    root.appendChild(fades);

    /* 标记层 */
    markerLayer = el('g', { 'class': 'markers' });
    root.appendChild(markerLayer);

    X.LOCATIONS.forEach(function (loc) {
      markerLayer.appendChild(buildMarker(loc));
    });
  }

  function buildMarker(loc) {
    var short = loc.name.split(' · ').pop();
    var lb = loc.label || { dx: 0, dy: -18, anchor: 'middle' };
    var g = el('g', {
      'class': 'loc loc-' + loc.type,
      'data-id': loc.id,
      transform: 'translate(' + loc.mx + ',' + loc.my + ')',
      tabindex: '0', role: 'button',
      'aria-label': loc.name + '，' + (loc.modern || '')
    });
    g.style.setProperty('--c', (X.TYPES[loc.type] || {}).color || '#a2352a');

    g.appendChild(el('circle', { 'class': 'loc-hit', r: '16', fill: 'transparent' }));
    g.appendChild(el('circle', { 'class': 'loc-halo', r: '17' }));
    g.appendChild(el('circle', { 'class': 'loc-ring', r: '8.5', fill: 'none' }));
    g.appendChild(el('circle', { 'class': 'loc-dot', r: '3.4' }));

    var hasScene = loc.events.some(function (e) { return e.hasScene; });
    if (hasScene) {
      var badge = el('g', { 'class': 'loc-badge', transform: 'translate(-4,-24)' });
      badge.appendChild(el('rect', { x: '-9', y: '-9', width: '18', height: '18', rx: '2' }));
      badge.appendChild(el('text', { x: '0', y: '4.6', 'text-anchor': 'middle' })).textContent = '叙';
      g.appendChild(badge);
    }

    var label = el('text', {
      'class': 'loc-label',
      x: lb.dx, y: lb.dy, 'text-anchor': lb.anchor
    });
    label.textContent = short;
    g.appendChild(label);

    /* 小字今地 */
    var sub = el('text', {
      'class': 'loc-sub', x: lb.dx, y: lb.dy + 13,
      'text-anchor': lb.anchor
    });
    sub.textContent = (loc.modern || '').replace('今', '');
    g.appendChild(sub);

    var seal = el('g', { 'class': 'loc-seal', transform: 'translate(14,-21)' });
    seal.appendChild(el('rect', { x: '-7.5', y: '-7.5', width: '15', height: '15', rx: '2' }));
    seal.appendChild(el('text', { x: '0', y: '4.6', 'text-anchor': 'middle' })).textContent = '阅';
    g.appendChild(seal);

    g.addEventListener('click', function (e) {
      e.stopPropagation();
      if (onSelect) onSelect(loc.id);
    });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onSelect) onSelect(loc.id);
      }
    });

    markers[loc.id] = g;
    return g;
  }

  X.MapUI = {
    init: function (handler) {
      onSelect = handler;
      build();
      svg.addEventListener('click', function (e) {
        if (e.target === svg || e.target.tagName === 'rect' || e.target.tagName === 'path') {
          if (X.App && X.App.clearSelection) X.App.clearSelection();
        }
      });
    },
    setActive: function (id) {
      Object.keys(markers).forEach(function (k) {
        markers[k].classList.toggle('is-active', k === id);
      });
    },
    markSeen: function (id) {
      if (markers[id]) markers[id].classList.add('is-seen');
    },
    center: function (id) {
      var g = markers[id];
      if (!g) return;
      g.classList.remove('is-ping');
      void g.offsetWidth;
      g.classList.add('is-ping');
    }
  };
})(window.XQJ);
