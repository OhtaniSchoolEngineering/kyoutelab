/* 図・グラフ・イラスト・はじき図（すべてSVGで描く。試験冊子と同じ黒い線画） */
window.CHEM = window.CHEM || {};
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* SVG 用の化学式表記（_2 → 下付き、^{2+} → 上付き） */
  function st(s) {
    var h = esc(s);
    h = h.replace(/\^\{([^}]+)\}/g, function (m, a) { return '<tspan dy="-0.45em" font-size="70%">' + a.replace(/-/g, '−') + '</tspan><tspan dy="0.45em">​</tspan>'; });
    h = h.replace(/_\{([^}]+)\}/g, '<tspan dy="0.3em" font-size="70%">$1</tspan><tspan dy="-0.3em">​</tspan>');
    h = h.replace(/_([0-9]+|[A-Za-z])/g, '<tspan dy="0.3em" font-size="70%">$1</tspan><tspan dy="-0.3em">​</tspan>');
    /* 小さい文字の「−」は細すぎて見えないので太くする */
    h = h.replace(/−/g, '<tspan style="font-weight:700">−</tspan>');
    return h;
  }
  function arrowHead(x, y, dir) {
    var s = 6;
    if (dir === 'r') return '<path class="ink" d="M' + x + ',' + y + ' l-' + s + ',-3 v6 z"/>';
    return '<path class="ink" d="M' + x + ',' + y + ' l-3,' + s + ' h6 z"/>';
  }

  /* ---------- 実際の目盛りをもつグラフ ---------- */
  function fig(f) {
    var W = f.w || 360, H = f.h || 240, L = 52, R = 22, T = 30, B = 42;
    var pw = W - L - R, ph = H - T - B;
    var X = function (x) { return L + (x - f.x.min) / (f.x.max - f.x.min) * pw; };
    var Y = function (y) { return T + ph - (y - f.y.min) / (f.y.max - f.y.min) * ph; };
    var g = '<svg class="fig" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(f.alt || 'グラフ') + '">';
    if (f.grid) {
      (f.x.ticks || []).forEach(function (t) { var v = t.length ? t[0] : t; g += '<line class="grid" x1="' + X(v) + '" x2="' + X(v) + '" y1="' + T + '" y2="' + (T + ph) + '"/>'; });
      (f.y.ticks || []).forEach(function (t) { var v = t.length ? t[0] : t; g += '<line class="grid" x1="' + L + '" x2="' + (L + pw) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>'; });
    }
    g += '<line class="ax" x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw + 8) + '" y2="' + (T + ph) + '"/>' + arrowHead(L + pw + 12, T + ph, 'r');
    g += '<line class="ax" x1="' + L + '" y1="' + (T + ph) + '" x2="' + L + '" y2="' + (T - 8) + '"/>' + arrowHead(L, T - 12, 'u');
    (f.x.ticks || []).forEach(function (t) { var v = t.length ? t[0] : t, lab = t.length ? t[1] : String(v); g += '<line class="ax" x1="' + X(v) + '" x2="' + X(v) + '" y1="' + (T + ph) + '" y2="' + (T + ph + 4) + '"/><text class="tk" x="' + X(v) + '" y="' + (T + ph + 16) + '" text-anchor="middle">' + st(lab) + '</text>'; });
    (f.y.ticks || []).forEach(function (t) { var v = t.length ? t[0] : t, lab = t.length ? t[1] : String(v); g += '<line class="ax" x1="' + (L - 4) + '" x2="' + L + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="tk" x="' + (L - 7) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + st(lab) + '</text>'; });
    g += '<text class="atl" x="' + (L + 8) + '" y="' + (T - 14) + '">' + st(f.y.label) + '</text>';
    g += '<text class="atl" x="' + (L + pw + 12) + '" y="' + (H - 6) + '" text-anchor="end">' + st(f.x.label) + '</text>';
    (f.lines || []).forEach(function (l) { g += '<polyline class="' + (l.dash ? 'dl' : 'sl') + '" points="' + l.pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>'; });
    (f.series || []).forEach(function (s) {
      g += '<polyline class="' + (s.dash ? 'dser' : 'ser') + '" points="' + s.pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>';
      if (s.label) { var lp = s.lp || s.pts[s.pts.length - 1]; g += '<text class="sl2" x="' + (X(lp[0]) + (s.dx || 6)) + '" y="' + (Y(lp[1]) + (s.dy || -6)) + '">' + st(s.label) + '</text>'; }
    });
    /* 棒（質量スペクトルなど）と、点のない文字ラベル */
    (f.bars || []).forEach(function (b) { var bw = f.bw || 5, y0 = Y(Math.max(f.y.min, 0)), y1 = Y(b.y); g += '<rect class="bar2" x="' + (X(b.x) - bw / 2).toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + bw + '" height="' + Math.abs(y0 - y1).toFixed(1) + '"/>' + (b.t ? '<text class="mk2" x="' + X(b.x).toFixed(1) + '" y="' + (y1 - 5).toFixed(1) + '" text-anchor="middle">' + st(b.t) + '</text>' : ''); });
    (f.notes || []).forEach(function (m) { g += '<text class="mk2" x="' + X(m.x).toFixed(1) + '" y="' + Y(m.y).toFixed(1) + '" text-anchor="' + (m.a || 'start') + '">' + st(m.t) + '</text>'; });
    (f.marks || []).forEach(function (m) { g += '<circle class="ink" cx="' + X(m.x) + '" cy="' + Y(m.y) + '" r="3"/><text class="mk2" x="' + (X(m.x) + (m.dx || 6)) + '" y="' + (Y(m.y) + (m.dy || -6)) + '">' + st(m.t) + '</text>'; });
    if (f.origin !== false) g += '<text class="tk" x="' + (L - 6) + '" y="' + (T + ph + 14) + '" text-anchor="end">' + (f.originLabel || '') + '</text>';
    return g + '</svg>';
  }

  /* ---------- 選択肢のグラフ（形を選ぶ問題） ---------- */
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥'];
  function choiceGraph(pts, gax, i) {
    var W = 210, H = 168, L = 34, R = 16, T = 30, B = 30, pw = W - L - R, ph = H - T - B;
    var X = function (x) { return L + x / 10 * pw; }, Y = function (y) { return T + ph - y / 10 * ph; };
    var g = '<svg class="cg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="グラフ' + CIRC[i] + '">';
    g += '<text class="cgn" x="4" y="18">' + CIRC[i] + '</text>';
    g += '<line class="ax" x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw + 6) + '" y2="' + (T + ph) + '"/>' + arrowHead(L + pw + 10, T + ph, 'r');
    g += '<line class="ax" x1="' + L + '" y1="' + (T + ph) + '" x2="' + L + '" y2="' + (T - 6) + '"/>' + arrowHead(L, T - 10, 'u');
    (gax.xt || []).forEach(function (t) { g += '<line class="ax" x1="' + X(t[0]) + '" x2="' + X(t[0]) + '" y1="' + (T + ph) + '" y2="' + (T + ph + 3) + '"/><text class="tk s" x="' + X(t[0]) + '" y="' + (T + ph + 13) + '" text-anchor="middle">' + esc(t[1]) + '</text>'; });
    (gax.yt || []).forEach(function (t) { g += '<line class="ax" x1="' + (L - 3) + '" x2="' + L + '" y1="' + Y(t[0]) + '" y2="' + Y(t[0]) + '"/><text class="tk s" x="' + (L - 5) + '" y="' + (Y(t[0]) + 3) + '" text-anchor="end">' + esc(t[1]) + '</text>'; });
    if (!gax.xt) g += '<text class="tk s" x="' + (L - 4) + '" y="' + (T + ph + 12) + '" text-anchor="end">0</text>';
    g += '<text class="atl s" x="' + (L + 6) + '" y="' + (T - 12) + '">' + st(gax.y) + '</text>';
    g += '<text class="atl s" x="' + (W - 2) + '" y="' + (H - 3) + '" text-anchor="end">' + st(gax.x) + '</text>';
    g += '<polyline class="ser" points="' + pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>';
    return g + '</svg>';
  }

  /* ---------- 実験器具・構造のイラスト ---------- */
  function cube(type, ox, oy, label) {
    var A = [40, 70], Bp = [120, 70], Cc = [120, 150], D = [40, 150], o = [35, -30];
    function p(q, k) { return [q[0] + (k ? o[0] : 0) + ox, q[1] + (k ? o[1] : 0) + oy]; }
    var a = p(A), b = p(Bp), c = p(Cc), d = p(D), a2 = p(A, 1), b2 = p(Bp, 1), c2 = p(Cc, 1), d2 = p(D, 1);
    function ln(u, v, dash) { return '<line class="' + (dash ? 'hid' : 'edge') + '" x1="' + u[0] + '" y1="' + u[1] + '" x2="' + v[0] + '" y2="' + v[1] + '"/>'; }
    function at(q, cls) { return '<circle class="' + (cls || 'atom') + '" cx="' + q[0] + '" cy="' + q[1] + '" r="8"/>'; }
    function avg(list) { var x = 0, y = 0; list.forEach(function (q) { x += q[0]; y += q[1]; }); return [x / list.length, y / list.length]; }
    var g = ln(d2, a2, 1) + ln(d2, c2, 1) + ln(d, d2, 1);
    var back = [], front = [];
    if (type === 'fcc') { back.push(avg([a2, b2, c2, d2]), avg([a, d, a2, d2]), avg([d, c, d2, c2])); front.push(avg([a, b, a2, b2]), avg([b, c, b2, c2]), avg([a, b, c, d])); }
    back.forEach(function (q) { g += at(q, 'atom2'); });
    g += at(d2) + at(a2) + at(b2) + at(c2);
    if (type === 'bcc') g += at(avg([a, b, c, d, a2, b2, c2, d2]), 'atom2');
    g += ln(a, b) + ln(b, c) + ln(c, d) + ln(d, a) + ln(a2, b2) + ln(b2, c2) + ln(a, a2) + ln(b, b2) + ln(c, c2);
    front.forEach(function (q) { g += at(q, 'atom2'); });
    g += at(a) + at(b) + at(c) + at(d);
    g += '<text class="lab" x="' + (ox + 97) + '" y="' + (oy + 178) + '" text-anchor="middle">' + esc(label) + '</text>';
    return g;
  }
  var ILL = {
    lattice: { alt: '単純立方格子・体心立方格子・面心立方格子', vb: '0 0 600 190', body: function () { return cube('sc', 0, 0, '単純立方格子') + cube('bcc', 200, 0, '体心立方格子') + cube('fcc', 400, 0, '面心立方格子'); } },
    hcp: { alt: '六方最密構造（正六角柱。上下の層の原子と、中の層の 3 個の原子）', vb: '0 0 220 200', body: function () {
      var cx = 110, R = 62, r = 20, T = 40, Bt = 150, M = 95, g = '';
      function P(k, y, rr, ry) { var t = Math.PI / 3 * k; return [cx + (rr || R) * Math.cos(t), y + (ry || r) * Math.sin(t)]; }
      function ln(u, v, dash) { return '<line class="' + (dash ? 'hid' : 'edge') + '" x1="' + u[0].toFixed(1) + '" y1="' + u[1].toFixed(1) + '" x2="' + v[0].toFixed(1) + '" y2="' + v[1].toFixed(1) + '"/>'; }
      function at(q, cls) { return '<circle class="' + (cls || 'atom') + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="8"/>'; }
      var k;
      for (k = 0; k < 6; k++) { var back = Math.sin(Math.PI / 3 * k) < -0.1 || Math.sin(Math.PI / 3 * (k + 1)) < -0.1; g += ln(P(k, Bt), P(k + 1, Bt), back); }
      for (k = 0; k < 6; k++) { if (Math.sin(Math.PI / 3 * k) < -0.1) g += ln(P(k, T), P(k, Bt), true); }
      for (k = 0; k < 6; k++) if (Math.sin(Math.PI / 3 * k) < -0.1) g += at(P(k, Bt));
      g += at([cx, Bt]);
      [1, 3, 5].forEach(function (j) { var t = Math.PI / 3 * j + Math.PI / 6 * 0; g += at([cx + 30 * Math.cos(t + Math.PI / 6), M + 10 * Math.sin(t + Math.PI / 6)], 'atom2'); });
      for (k = 0; k < 6; k++) { if (Math.sin(Math.PI / 3 * k) >= -0.1) g += ln(P(k, T), P(k, Bt)); }
      for (k = 0; k < 6; k++) if (Math.sin(Math.PI / 3 * k) >= -0.1) g += at(P(k, Bt));
      for (k = 0; k < 6; k++) g += ln(P(k, T), P(k + 1, T));
      for (k = 0; k < 6; k++) g += at(P(k, T));
      g += at([cx, T]);
      g += '<text class="lab" x="' + cx + '" y="190" text-anchor="middle">六方最密構造</text>';
      return g;
    } },
    /* 異性体の書き出し: C8H10 の芳香族（ベンゼン環 + 置換基） */
    iso_c8h10: { alt: 'C8H10 の芳香族の構造異性体 4 種（エチルベンゼン、o-キシレン、m-キシレン、p-キシレン）', vb: '0 0 640 222', body: function () {
      function ring(cx, cy, subs, name) {
        var R = 30, g = '', pts = [];
        for (var k = 0; k < 6; k++) { var a = (-90 + 60 * k) * Math.PI / 180; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
        g += '<polygon class="edge" points="' + pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>';
        g += '<circle class="edge" cx="' + cx + '" cy="' + cy + '" r="18"/>';
        subs.forEach(function (sb) {
          var k = sb[0], a = (-90 + 60 * k) * Math.PI / 180, x2 = cx + (R + 16) * Math.cos(a), y2 = cy + (R + 16) * Math.sin(a);
          g += '<line class="edge" x1="' + pts[k][0].toFixed(1) + '" y1="' + pts[k][1].toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>';
          var ca = Math.cos(a), sa = Math.sin(a), tx = cx + (R + 20) * ca, ty = cy + (R + 20) * sa + 5;
          var anc = Math.abs(ca) < 0.2 ? 'middle' : (ca > 0 ? 'start' : 'end');
          if (sa < -0.9) ty -= 4; if (sa > 0.9) ty += 9;
          g += '<text class="lab fm" x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="' + anc + '">' + st(sb[1]) + '</text>';
        });
        g += '<text class="lab" x="' + cx + '" y="212" text-anchor="middle">' + esc(name) + '</text>';
        return g;
      }
      return '<text class="lab sub" x="8" y="18">置換基 1 つ</text>' +
        '<text class="lab sub" x="190" y="18">置換基 2 つ → 位置で 3 通り</text>' +
        '<line class="hid" x1="168" y1="30" x2="168" y2="210"/>' +
        ring(84, 110, [[0, 'C_2H_5']], 'エチルベンゼン') + ring(262, 110, [[0, 'CH_3'], [1, 'CH_3']], 'o-キシレン') +
        ring(424, 110, [[0, 'CH_3'], [2, 'CH_3']], 'm-キシレン') + ring(570, 110, [[0, 'CH_3'], [3, 'CH_3']], 'p-キシレン');
    } },
    /* 異性体の書き出し: C4H10O（アルコール 4 種・エーテル 3 種） */
    iso_c4h10o: { alt: 'C4H10O の構造異性体 7 種（アルコール 4 種とエーテル 3 種）', vb: '0 0 820 300', body: function () {
      /* 文字の幅のめやす: 全角・半角 1 文字 = 9.6、下付き数字 = 5.6（15px のとき） */
      function w(t) { var n = 0; String(t).replace(/_(\d+)/g, function (m, d) { n += d.length * 5.6; return ''; }).split('').forEach(function () { n += 9.6; }); return n; }
      var BOND = 16;
      function mol(x0, y, main, br, name) {
        var sw = main.reduce(function (s, t) { return s + w(t); }, 0) + BOND * (main.length - 1);
        var slot = Math.max(sw, name.length * 12.6), x = x0 + (slot - sw) / 2, pos = [], g = '';
        main.forEach(function (t, i) {
          if (i) { g += '<line class="edge" x1="' + (x + 4).toFixed(1) + '" y1="' + (y - 5) + '" x2="' + (x + BOND - 4).toFixed(1) + '" y2="' + (y - 5) + '"/>'; x += BOND; }
          var ww = w(t); pos.push(x + ww / 2);
          g += '<text class="lab fm" x="' + (x + ww / 2).toFixed(1) + '" y="' + y + '" text-anchor="middle">' + st(t) + '</text>'; x += ww;
        });
        (br || []).forEach(function (bb) {
          var cx = pos[bb[0]], up = bb[2] === 'up';
          g += '<line class="edge" x1="' + cx.toFixed(1) + '" y1="' + (up ? y - 18 : y + 5) + '" x2="' + cx.toFixed(1) + '" y2="' + (up ? y - 29 : y + 16) + '"/>';
          g += '<text class="lab fm" x="' + cx.toFixed(1) + '" y="' + (up ? y - 33 : y + 32) + '" text-anchor="middle">' + st(bb[1]) + '</text>';
        });
        g += '<text class="lab" x="' + (x0 + slot / 2).toFixed(1) + '" y="' + (y + 58) + '" text-anchor="middle">' + esc(name) + '</text>';
        return [g, x0 + slot];
      }
      function row(y, list) { var x = 8, g = ''; list.forEach(function (m) { var r = mol(x, y, m[0], m[1], m[2]); g += r[0]; x = r[1] + 26; }); return g; }
      var g = '<text class="lab sub" x="8" y="18">アルコール（−OH をもつ）4 種</text>';
      g += row(70, [[['CH_3', 'CH_2', 'CH_2', 'CH_2', 'OH'], [], '1-ブタノール'], [['CH_3', 'CH', 'CH_2', 'CH_3'], [[1, 'OH']], '2-ブタノール'],
        [['CH_3', 'CH', 'CH_2', 'OH'], [[1, 'CH_3']], '2-メチル-1-プロパノール'], [['CH_3', 'C', 'CH_3'], [[1, 'CH_3', 'up'], [1, 'OH']], '2-メチル-2-プロパノール']]);
      g += '<line class="hid" x1="8" y1="152" x2="812" y2="152"/>';
      g += '<text class="lab sub" x="8" y="176">エーテル（−O− をもつ）3 種</text>';
      g += row(226, [[['CH_3', 'CH_2', 'O', 'CH_2', 'CH_3'], [], 'ジエチルエーテル'], [['CH_3', 'O', 'CH_2', 'CH_2', 'CH_3'], [], 'メチルプロピルエーテル'],
        [['CH_3', 'O', 'CH', 'CH_3'], [[2, 'CH_3']], 'イソプロピルメチルエーテル']]);
      return g;
    } },
    sc: { alt: '単純立方格子', vb: '0 0 200 190', body: function () { return cube('sc', 0, 0, '単純立方格子'); } },
    bcc: { alt: '体心立方格子', vb: '0 0 200 190', body: function () { return cube('bcc', 0, 0, '体心立方格子'); } },
    fcc: { alt: '面心立方格子', vb: '0 0 200 190', body: function () { return cube('fcc', 0, 0, '面心立方格子'); } },
    collect: {
      alt: '気体の捕集法（上方置換・下方置換・水上置換）', vb: '0 0 540 180',
      body: function () {
        var g = '';
        g += '<g transform="translate(10,0)"><path class="edge" d="M50,112 V34 Q50,22 62,22 H98 Q110,22 110,34 V112"/><path class="tube" d="M6,150 H80 V40"/><text class="lab" x="80" y="172" text-anchor="middle">上方置換</text></g>';
        g += '<g transform="translate(190,0)"><path class="edge" d="M50,46 V128 Q50,140 62,140 H98 Q110,140 110,128 V46"/><path class="tube" d="M6,22 H80 V128"/><text class="lab" x="80" y="172" text-anchor="middle">下方置換</text></g>';
        g += '<g transform="translate(370,0)"><rect class="water" x="6" y="92" width="150" height="56"/><path class="edge" d="M6,80 V148 H156 V80"/><path class="water" d="M76,112 V40 Q76,30 86,30 H112 Q122,30 122,40 V112 Z"/><path class="edge" d="M76,118 V40 Q76,30 86,30 H112 Q122,30 122,40 V118"/><line class="wl" x1="6" y1="92" x2="156" y2="92"/><path class="tube" d="M-6,60 H40 V132 H99 V104"/><text class="lab" x="80" y="172" text-anchor="middle">水上置換</text></g>';
        return g;
      }
    },
    wash: {
      alt: '洗気びん2本をつないだ装置', vb: '0 0 330 180',
      body: function () {
        function bottle(x, n) {
          return '<rect class="liq" x="' + x + '" y="100" width="56" height="44"/><rect class="edge" x="' + x + '" y="60" width="56" height="84" rx="4"/><rect class="edgew" x="' + (x + 12) + '" y="52" width="32" height="10"/>' +
            '<text class="lab" x="' + (x + 28) + '" y="166" text-anchor="middle">洗気びん' + n + '</text>';
        }
        var x1 = 80, x2 = 190, g = bottle(x1, '１') + bottle(x2, '２');
        g += '<path class="tube" d="M14,30 H' + (x1 + 20) + ' V134"/><path class="tube" d="M' + (x1 + 38) + ',66 V30 H' + (x2 + 20) + ' V134"/><path class="tube" d="M' + (x2 + 38) + ',66 V30 H318"/>';
        g += arrowHead(322, 30, 'r') + '<text class="lab" x="10" y="20">発生した気体</text><text class="lab" x="320" y="20" text-anchor="end">捕集へ</text>';
        return g;
      }
    },
    elem: {
      alt: '元素分析の装置', vb: '0 0 380 150',
      body: function () {
        var g = '<rect class="edge" x="30" y="56" width="170" height="26" rx="12"/>';
        g += '<path class="edgew" d="M62,76 h26 l-4,-8 h-18 z"/><text class="lab" x="75" y="104" text-anchor="middle">試料</text>';
        for (var i = 0; i < 12; i++) g += '<circle class="dot" cx="' + (128 + (i % 6) * 9) + '" cy="' + (64 + Math.floor(i / 6) * 9) + '" r="3"/>';
        g += '<text class="lab" x="150" y="104" text-anchor="middle">酸化銅(II)</text>';
        g += '<path class="edge" d="M66,130 l10,-18 l10,18 z M134,130 l10,-18 l10,18 z"/><text class="lab" x="110" y="146" text-anchor="middle">加熱</text>';
        g += '<path class="tube" d="M0,69 H30"/>' + '<text class="lab" x="0" y="48">' + st('乾いた O_2') + '</text>';
        g += '<path class="tube" d="M200,69 H236"/><rect class="edge" x="236" y="54" width="46" height="30" rx="6"/><text class="lab big" x="259" y="74" text-anchor="middle">A</text>';
        g += '<path class="tube" d="M282,69 H306"/><rect class="edge" x="306" y="54" width="46" height="30" rx="6"/><text class="lab big" x="329" y="74" text-anchor="middle">B</text><path class="tube" d="M352,69 H376"/>';
        g += '<text class="lab" x="259" y="104" text-anchor="middle">吸収管</text><text class="lab" x="329" y="104" text-anchor="middle">吸収管</text>';
        return g;
      }
    },
    electrolysis: {
      alt: '電気分解の装置', vb: '0 0 260 190',
      body: function () {
        var g = '<rect class="liq" x="40" y="82" width="180" height="88"/><path class="edge" d="M40,62 V170 H220 V62"/>';
        g += '<rect class="edgew" x="78" y="46" width="14" height="104"/><rect class="edgew" x="168" y="46" width="14" height="104"/>';
        g += '<path class="wire" d="M85,46 V18 H122 M138,18 H175 V46"/><line class="wire" x1="122" y1="6" x2="122" y2="30"/><line class="wire2" x1="138" y1="12" x2="138" y2="24"/>';
        g += '<text class="lab" x="116" y="44" text-anchor="end">＋</text><text class="lab" x="144" y="44">−</text>';
        g += '<text class="lab" x="85" y="186" text-anchor="middle">陽極</text><text class="lab" x="175" y="186" text-anchor="middle">陰極</text><text class="lab" x="130" y="130" text-anchor="middle">電解液</text>';
        return g;
      }
    },
    daniell: {
      alt: 'ダニエル電池', vb: '0 0 280 200',
      body: function () {
        var g = '<rect class="liq" x="30" y="80" width="220" height="90"/><path class="edge" d="M30,60 V170 H250 V60"/><line class="hid" x1="140" y1="66" x2="140" y2="170"/>';
        g += '<rect class="edgew" x="70" y="40" width="14" height="112"/><rect class="edgew" x="196" y="40" width="14" height="112"/>';
        g += '<path class="wire" d="M77,40 V18 H128 M152,18 H203 V40"/><circle class="edgew" cx="140" cy="18" r="11"/><path class="wire" d="M133,24 q7,-14 14,0"/>';
        g += '<text class="lab" x="77" y="34" text-anchor="end">Zn</text><text class="lab" x="210" y="34">Cu</text>';
        g += '<text class="lab" x="85" y="188" text-anchor="middle">' + st('ZnSO_4 水溶液') + '</text><text class="lab" x="195" y="188" text-anchor="middle">' + st('CuSO_4 水溶液') + '</text><text class="lab s" x="140" y="76" text-anchor="middle">素焼き板</text>';
        return g;
      }
    },
    sepfunnel: {
      alt: '分液ろうと', vb: '0 0 220 220',
      body: function () {
        var body = 'M92,40 C48,62 46,130 96,172 L104,172 C154,130 152,62 108,40 Z';
        var g = '<clipPath id="sfclip"><path d="' + body + '"/></clipPath><rect class="liq" x="40" y="108" width="120" height="70" clip-path="url(#sfclip)"/>';
        g += '<path class="edge" d="' + body + '"/><rect class="edgew" x="92" y="22" width="16" height="20"/><rect class="edgew" x="88" y="14" width="24" height="9"/>';
        g += '<line class="edge" x1="100" y1="172" x2="100" y2="210"/><rect class="edgew" x="88" y="180" width="24" height="8"/>';
        g += '<line class="hid" x1="52" y1="108" x2="148" y2="108"/>';
        g += '<line class="lead" x1="128" y1="80" x2="168" y2="70"/><text class="lab" x="172" y="74">上層</text><line class="lead" x1="126" y1="140" x2="168" y2="150"/><text class="lab" x="172" y="154">下層</text>';
        return g;
      }
    },
    burette: {
      alt: 'ビュレットとコニカルビーカー', vb: '0 0 240 260',
      body: function () {
        var g = '<line class="edge" x1="40" y1="10" x2="40" y2="250"/><rect class="edgew" x="20" y="246" width="170" height="8"/><path class="edge" d="M40,70 H96"/>';
        g += '<rect class="edgew" x="96" y="10" width="14" height="140"/><rect class="liq" x="97" y="40" width="12" height="110"/>';
        for (var i = 0; i < 9; i++) g += '<line class="edge" x1="96" x2="' + (i % 2 ? 101 : 104) + '" y1="' + (24 + i * 14) + '" y2="' + (24 + i * 14) + '"/>';
        g += '<rect class="edgew" x="94" y="150" width="18" height="8"/><line class="edge" x1="103" y1="158" x2="103" y2="176"/>';
        g += '<path class="liq" d="M80,226 L72,244 H134 L126,226 Z"/><path class="edge" d="M92,182 V198 L64,244 H142 L114,198 V182"/>';
        g += '<line class="lead" x1="112" y1="60" x2="150" y2="52"/><text class="lab" x="153" y="56">ビュレット</text><line class="lead" x1="136" y1="226" x2="160" y2="214"/><text class="lab" x="140" y="208">コニカルビーカー</text>';
        return g;
      }
    },
    /* 面心立方格子の 1 つの面（原子は面の対角線上で接する） */
    fcc_face: { alt: '面心立方格子の面の断面。面の対角線上で、角の原子と面の中心の原子が接している', vb: '0 0 320 300', body: function () {
      var x0 = 60, y0 = 30, A = 180, r = A * Math.SQRT2 / 4, g = '';
      g += '<defs><clipPath id="fccclip"><rect x="' + x0 + '" y="' + y0 + '" width="' + A + '" height="' + A + '"/></clipPath></defs>';
      g += '<g clip-path="url(#fccclip)">';
      [[x0, y0], [x0 + A, y0], [x0, y0 + A], [x0 + A, y0 + A], [x0 + A / 2, y0 + A / 2]].forEach(function (p) { g += '<circle class="atom" cx="' + p[0] + '" cy="' + p[1] + '" r="' + r.toFixed(1) + '"/>'; });
      g += '</g><rect class="edge" x="' + x0 + '" y="' + y0 + '" width="' + A + '" height="' + A + '"/>';
      /* 対角線と、r・2r・r の区切り */
      var P = function (t) { return [x0 + t / Math.SQRT2, y0 + A - t / Math.SQRT2]; }, L = 4 * r;
      g += '<line class="wire2" style="stroke:#2F5A8C;stroke-width:2.4" x1="' + P(0)[0] + '" y1="' + P(0)[1] + '" x2="' + P(L)[0].toFixed(1) + '" y2="' + P(L)[1].toFixed(1) + '"/>';
      [r, 3 * r].forEach(function (t) { var q = P(t); g += '<circle class="dot" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3"/>'; });
      [[r / 2, 'r'], [2 * r, '2r'], [3.5 * r, 'r']].forEach(function (m) { var q = P(m[0]); g += '<text class="lab" style="fill:#2F5A8C;font-weight:700" x="' + (q[0] + 8).toFixed(1) + '" y="' + (q[1] + 14).toFixed(1) + '">' + m[1] + '</text>'; });
      g += '<text class="lab" x="' + (x0 + A / 2) + '" y="' + (y0 + A + 22) + '" text-anchor="middle">一辺 a</text>';
      g += '<text class="lab" x="' + (x0 - 10) + '" y="' + (y0 + A / 2 + 4) + '" text-anchor="end">a</text>';
      g += '<text class="lab sub" x="160" y="' + (y0 + A + 50) + '" text-anchor="middle">面の対角線 √2 a に、半径 r が 4 つ分 → √2 a = 4r</text>';
      g += '<text class="lab s" x="160" y="' + (y0 + A + 70) + '" text-anchor="middle">（角の原子どうしは接していない。接するのは対角線の方向）</text>';
      return g;
    } },
    /* 体心立方格子を、向かい合う 2 本の辺を通る面で切った断面（体対角線上で接する） */
    bcc_diag: { alt: '体心立方格子の断面。立方体の対角線上で、角の原子と中心の原子が接している', vb: '0 0 420 290', body: function () {
      var a = 140, W = a * Math.SQRT2, x0 = 120, y0 = 30, r = a * Math.sqrt(3) / 4, g = '';
      /* 左: どこで切ったかを示す立方体 */
      var c = 26, o = [16, -14], s = 64, bx = 14, by = 120;
      function v(px, py, k) { return [bx + px + (k ? o[0] : 0), by + py + (k ? o[1] : 0)]; }
      var p0 = v(0, s, 0), p1 = v(s, s, 0), p2 = v(s, 0, 0), p3 = v(0, 0, 0), q0 = v(0, s, 1), q1 = v(s, s, 1), q2 = v(s, 0, 1), q3 = v(0, 0, 1);
      function ln(u, w, cls) { return '<line class="' + (cls || 'edge') + '" x1="' + u[0] + '" y1="' + u[1] + '" x2="' + w[0] + '" y2="' + w[1] + '"/>'; }
      g += '<polygon points="' + [p0, q1, q2, p3].map(function (p) { return p.join(','); }).join(' ') + '" style="fill:#DCE7F1;stroke:#2F5A8C;stroke-width:1.4"/>';
      g += ln(p0, p1) + ln(p1, p2) + ln(p2, p3) + ln(p3, p0) + ln(p1, q1) + ln(p2, q2) + ln(p3, q3) + ln(q2, q3) + ln(q1, q2) + ln(p0, q0, 'hid') + ln(q0, q1, 'hid') + ln(q0, q3, 'hid');
      g += '<text class="lab s" x="' + (bx + 40) + '" y="' + (by + s + 20) + '" text-anchor="middle">色の面で切る</text>';
      /* 右: 断面 */
      g += '<defs><clipPath id="bccclip"><rect x="' + x0 + '" y="' + y0 + '" width="' + W.toFixed(1) + '" height="' + a + '"/></clipPath></defs>';
      g += '<g clip-path="url(#bccclip)">';
      [[x0, y0], [x0 + W, y0], [x0, y0 + a], [x0 + W, y0 + a], [x0 + W / 2, y0 + a / 2]].forEach(function (p) { g += '<circle class="atom" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(1) + '"/>'; });
      g += '</g><rect class="edge" x="' + x0 + '" y="' + y0 + '" width="' + W.toFixed(1) + '" height="' + a + '"/>';
      var D = Math.sqrt(W * W + a * a), ux = W / D, uy = a / D, P = function (t) { return [x0 + t * ux, y0 + a - t * uy]; };
      g += '<line style="stroke:#2F5A8C;stroke-width:2.4" x1="' + x0 + '" y1="' + (y0 + a) + '" x2="' + (x0 + W).toFixed(1) + '" y2="' + y0 + '"/>';
      [r, 3 * r].forEach(function (t) { var q = P(t); g += '<circle class="dot" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3"/>'; });
      [[r / 2, 'r'], [2 * r, '2r'], [3.5 * r, 'r']].forEach(function (m) { var q = P(m[0]); g += '<text class="lab" style="fill:#2F5A8C;font-weight:700" x="' + (q[0] + 6).toFixed(1) + '" y="' + (q[1] + 16).toFixed(1) + '">' + m[1] + '</text>'; });
      g += '<text class="lab" x="' + (x0 - 8) + '" y="' + (y0 + a / 2 + 4) + '" text-anchor="end">a</text>';
      g += '<text class="lab" x="' + (x0 + W / 2).toFixed(1) + '" y="' + (y0 + a + 20) + '" text-anchor="middle">面の対角線 √2 a</text>';
      g += '<text class="lab sub" x="210" y="' + (y0 + a + 58) + '" text-anchor="middle">立方体の対角線 √3 a に、r が 4 つ分 → √3 a = 4r</text>';
      g += '<text class="lab s" x="210" y="' + (y0 + a + 80) + '" text-anchor="middle">' + st('（√3 a は、横 √2 a・縦 a の長方形の対角線: (√2 a)^{2} + a^{2} = 3a^{2}）') + '</text>';
      return g;
    } },
    /* グリシン 3 分子の縮合（H_2O が 2 分子とれて、ペプチド結合が 2 つ） */
    tripeptide: { alt: 'グリシン 3 分子から水 2 分子がとれてトリペプチドができる様子', vb: '0 0 560 270', body: function () {
      /* 原子団 1 つずつに幅を割り当てて、そのまん中に書く。枠は割り当てた幅で描くので、文字とずれない */
      function cw(t) { var n = 0; String(t).replace(/_(\d+)/g, function (m, d) { n += d.length * 6; return ''; }).split('').forEach(function (ch) { n += /[A-Za-z0-9()]/.test(ch) ? 9.4 : (ch === '−' ? 12 : (ch === '+' ? 22 : 15)); }); return n + 3; }
      function lay(toks) { var x = 0; return toks.map(function (tk) { var t = typeof tk === 'string' ? tk : tk[0], w = cw(t), o = { t: t, k: typeof tk === 'string' ? '' : tk[1], x0: x, x1: x + w }; x += w; return o; }); }
      /* 結合の「−」は文字だと細く消えてしまうので、線で描く */
      function draw(y, L, cls) { var W = L[L.length - 1].x1, off = (560 - W) / 2, g = ''; L.forEach(function (o) { o.x0 += off; o.x1 += off;
        if (o.t === '−') g += '<line class="edge" x1="' + (o.x0 + 2).toFixed(1) + '" y1="' + (y - 5) + '" x2="' + (o.x1 - 2).toFixed(1) + '" y2="' + (y - 5) + '"/>';
        else g += '<text class="' + (cls || 'lab fm') + '" x="' + ((o.x0 + o.x1) / 2).toFixed(1) + '" y="' + y + '" text-anchor="middle">' + st(o.t) + '</text>'; }); return g; }
      function span(L, k) { var xs = L.filter(function (o) { return o.k === k; }); return [xs[0].x0, xs[xs.length - 1].x1]; }
      var g = '<text class="lab sub" x="8" y="22">グリシン 3 分子</text>';
      var L1 = lay(['H_2N', '−', 'CH_2', '−', 'CO', '−', ['OH', 'w1'], ['+', ''], ['H', 'w1b'], '−', 'NH', '−', 'CH_2', '−', 'CO', '−', ['OH', 'w2'], ['+', ''], ['H', 'w2b'], '−', 'NH', '−', 'CH_2', '−', 'COOH']);
      var t1 = draw(64, L1);
      [['w1', 'w1b'], ['w2', 'w2b']].forEach(function (p) {
        var A = span(L1, p[0]), B = span(L1, p[1]), xa = A[0] - 2, xb = B[1] + 2;
        g += '<rect x="' + xa.toFixed(1) + '" y="44" width="' + (xb - xa).toFixed(1) + '" height="28" rx="7" style="fill:#FCEDEF;stroke:#C41E3A;stroke-width:1.4;stroke-dasharray:4 3"/>';
        g += '<text class="lab" style="fill:#C41E3A;font-weight:700" x="' + ((xa + xb) / 2).toFixed(1) + '" y="94" text-anchor="middle">' + st('H_2O') + '</text>';
      });
      g += t1;
      g += '<text class="lab s" x="280" y="114" text-anchor="middle">' + st('枠の OH と H が H_2O になってとれ、残った C と N が結合する') + '</text>';
      g += '<line class="lead" x1="280" y1="122" x2="280" y2="142"/><polygon points="274,140 286,140 280,150" class="ink"/>';
      g += '<text class="lab sub" x="8" y="140">縮合（2 か所）</text>';
      var L2 = lay(['H_2N', '−', 'CH_2', '−', ['CO', 'p1'], ['−', 'p1'], ['NH', 'p1'], '−', 'CH_2', '−', ['CO', 'p2'], ['−', 'p2'], ['NH', 'p2'], '−', 'CH_2', '−', 'COOH']);
      var t2 = draw(186, L2);
      ['p1', 'p2'].forEach(function (k) {
        var A = span(L2, k);
        g += '<rect x="' + (A[0] - 2).toFixed(1) + '" y="166" width="' + (A[1] - A[0] + 4).toFixed(1) + '" height="28" rx="7" style="fill:#EDF2F8;stroke:#2F5A8C;stroke-width:1.6"/>';
        g += '<text class="lab" style="fill:#2F5A8C;font-weight:700" x="' + ((A[0] + A[1]) / 2).toFixed(1) + '" y="214" text-anchor="middle">ペプチド結合</text>';
      });
      g += t2;
      g += '<text class="lab sub" x="280" y="244" text-anchor="middle">分子量 = グリシン 75 × 3 − 水 18 × 2 = 189</text>';
      g += '<text class="lab s" x="280" y="264" text-anchor="middle">3 分子のつなぎ目は 2 か所 → とれる水も 2 分子</text>';
      return g;
    } },
    /* ===== コラムの図 ===== */
    /* 電気陰性度: Li・F・Cl の原子（外側の電子が感じる正電荷と距離） */
    en_atoms: { alt: 'Li、F、Cl の原子のつくり。外側の電子が感じる正電荷と、核からの距離のちがい', vb: '0 0 560 270', body: function () {
      var g = '', A = [{ x: 90, n: '+3', sh: [22], R: 70, e: 1, nm: 'Li', en: '1.0', z: '約 +1' }, { x: 270, n: '+9', sh: [22], R: 46, e: 7, nm: 'F', en: '4.0', z: '約 +7' }, { x: 460, n: '+17', sh: [20, 46], R: 80, e: 7, nm: 'Cl', en: '3.2', z: '約 +7' }], cy = 128;
      A.forEach(function (a) {
        a.sh.forEach(function (r) { g += '<circle cx="' + a.x + '" cy="' + cy + '" r="' + r + '" style="fill:none;stroke:#9A9A9A;stroke-width:1;stroke-dasharray:3 3"/>'; });
        g += '<circle cx="' + a.x + '" cy="' + cy + '" r="' + a.R + '" style="fill:none;stroke:#2F5A8C;stroke-width:1.6"/>';
        for (var i = 0; i < a.e; i++) { var t = -Math.PI / 2 + i * 2 * Math.PI / Math.max(a.e, 1) + (a.e === 1 ? Math.PI / 4 : 0); g += '<circle cx="' + (a.x + a.R * Math.cos(t)).toFixed(1) + '" cy="' + (cy + a.R * Math.sin(t)).toFixed(1) + '" r="5" style="fill:#2F5A8C"/>'; }
        g += '<circle cx="' + a.x + '" cy="' + cy + '" r="14" style="fill:#FCEDEF;stroke:#C41E3A;stroke-width:1.6"/><text class="lab s" style="fill:#C41E3A;font-weight:700" x="' + a.x + '" y="' + (cy + 4) + '" text-anchor="middle">' + a.n + '</text>';
        g += '<text class="lab sub" x="' + a.x + '" y="234" text-anchor="middle">' + a.nm + '（電気陰性度 ' + a.en + '）</text>';
        g += '<text class="lab s" x="' + a.x + '" y="256" text-anchor="middle">外側の電子が感じる＋: ' + a.z + '</text>';
      });
      g += '<text class="lab s" style="fill:#2F5A8C;font-weight:700" x="180" y="22" text-anchor="middle">右へ → 陽子が増え、同じ殻で強く引く（小さくなる）</text>';
      g += '<text class="lab s" style="fill:#2F5A8C;font-weight:700" x="400" y="40" text-anchor="middle">下へ → 殻が 1 つ外。正電荷は同じでも遠い</text>';
      return g;
    } },
    /* 気体の圧力: 重い分子はゆっくり、軽い分子は速い */
    gas_ke: { alt: '同じ温度では、重い分子はゆっくり、軽い分子は速く動き、壁を押す強さは同じになる', vb: '0 0 520 210', body: function () {
      var g = '<rect x="440" y="20" width="14" height="150" style="fill:#C9CDD1;stroke:#111"/><text class="lab s" x="447" y="190" text-anchor="middle">容器の壁</text>';
      g += '<circle cx="120" cy="60" r="26" class="atom2"/><text class="lab s" x="120" y="64" text-anchor="middle" style="fill:#fff">重い</text>';
      g += '<line class="wire" x1="152" y1="60" x2="250" y2="60"/><polygon class="ink" points="250,53 264,60 250,67"/>';
      g += '<text class="lab" x="200" y="38" text-anchor="middle">ゆっくり</text>';
      g += '<circle cx="90" cy="130" r="11" class="atom"/><text class="lab s" x="90" y="160" text-anchor="middle">軽い</text>';
      g += '<line class="wire" x1="106" y1="130" x2="420" y2="130"/><polygon class="ink" points="420,123 434,130 420,137"/>';
      g += '<text class="lab" x="260" y="120" text-anchor="middle">速い</text>';
      g += '<text class="lab s" x="230" y="200" text-anchor="middle">' + st('同じ温度なら、1 個あたりの運動エネルギー ½mv^{2} の平均は同じ') + '</text>';
      return g;
    } },
    /* 蒸気圧降下: 溶質粒子が表面をふさぐ */
    vp_surface: { alt: '純粋な水と水溶液の表面。水溶液では溶質粒子が表面の一部をふさぎ、飛び出す水分子が減る', vb: '0 0 560 230', body: function () {
      var g = '';
      function beaker(x0, solute, nOut, title) {
        g += '<path class="edge" d="M' + x0 + ',40 V190 H' + (x0 + 220) + ' V40"/><rect class="liq" x="' + (x0 + 1) + '" y="90" width="218" height="99"/>';
        for (var i = 0; i < 9; i++) {
          var cx = x0 + 18 + i * 23, isS = solute.indexOf(i) >= 0;
          g += isS ? '<circle cx="' + cx + '" cy="98" r="9" style="fill:#2F5A8C"/>' : '<circle cx="' + cx + '" cy="98" r="6" class="atom"/>';
          for (var j = 1; j < 4; j++) g += '<circle cx="' + (cx + (j % 2 ? 8 : 0)) + '" cy="' + (98 + j * 24) + '" r="6" class="atom"/>';
        }
        nOut.forEach(function (i) { var cx = x0 + 18 + i * 23; g += '<line class="lead" x1="' + cx + '" y1="88" x2="' + cx + '" y2="58"/><polygon class="ink" points="' + (cx - 5) + ',60 ' + (cx + 5) + ',60 ' + cx + ',50"/>'; });
        g += '<text class="lab sub" x="' + (x0 + 110) + '" y="24" text-anchor="middle">' + title + '</text>';
      }
      beaker(20, [], [0, 2, 4, 6, 8], '純粋な水');
      beaker(310, [1, 4, 7], [0, 3, 6], '水溶液（● が溶質の粒子）');
      g += '<text class="lab s" x="280" y="218" text-anchor="middle">表面の一部を溶質がふさぐ → 飛び出せる水分子が減る → 蒸気圧が下がる（溶質の種類でなく、数で決まる）</text>';
      return g;
    } },
    /* 活性化エネルギー: 正反応と逆反応の山 */
    ea_diagram: { alt: '発熱反応のエネルギー図。逆反応の活性化エネルギーの方が大きい', vb: '0 0 520 260', body: function () {
      var g = '<line class="edge" x1="50" y1="230" x2="50" y2="20"/><polygon class="ink" points="44,26 50,14 56,26"/><text class="lab s" x="58" y="22">エネルギー</text>';
      g += '<path style="fill:none;stroke:#111;stroke-width:2" d="M70,140 H150 C200,140 210,50 250,50 C290,50 300,200 350,200 H460"/>';
      g += '<text class="lab" x="110" y="132" text-anchor="middle">反応物</text><text class="lab" x="405" y="192" text-anchor="middle">生成物</text>';
      function arr(x, y1, y2, col) { return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" style="stroke:' + col + ';stroke-width:1.6"/><polygon points="' + (x - 5) + ',' + (y2 + (y2 < y1 ? 8 : -8)) + ' ' + (x + 5) + ',' + (y2 + (y2 < y1 ? 8 : -8)) + ' ' + x + ',' + y2 + '" style="fill:' + col + '"/>'; }
      g += '<line class="wl" x1="150" y1="50" x2="330" y2="50"/>';
      g += arr(190, 140, 52, '#2F5A8C') + '<text class="lab s" style="fill:#2F5A8C;font-weight:700" x="186" y="100" text-anchor="end">Ea（正反応）</text>';
      g += arr(320, 200, 52, '#C41E3A') + '<text class="lab s" style="fill:#C41E3A;font-weight:700" x="326" y="130">Ea（逆反応）</text>';
      g += '<line class="wl" x1="150" y1="140" x2="470" y2="140"/>' + arr(450, 140, 198, '#111') + '<text class="lab s" x="456" y="172">ΔH（発熱）</text>';
      g += '<text class="lab s" x="260" y="252" text-anchor="middle">発熱反応では、逆向きの山（Ea 逆）の方が高い</text>';
      return g;
    } },
    /* 強い → 弱い のはしご */
    ladder: { alt: '酸の強さと、金属のイオン化傾向のはしご。上のものが下のものを追い出す', vb: '0 0 560 270', body: function () {
      var g = '';
      function col(x, title, items, note) {
        g += '<text class="lab sub" x="' + (x + 100) + '" y="22" text-anchor="middle">' + title + '</text>';
        items.forEach(function (t, i) { var y = 40 + i * 46; g += '<rect x="' + (x + 30) + '" y="' + y + '" width="170" height="32" rx="6" style="fill:' + (i === 0 ? '#EDF2F8' : '#fff') + ';stroke:#2F5A8C;stroke-width:1.2"/><text class="lab fm" x="' + (x + 115) + '" y="' + (y + 22) + '" text-anchor="middle">' + st(t) + '</text>'; });
        g += '<line x1="' + (x + 14) + '" y1="44" x2="' + (x + 14) + '" y2="210" style="stroke:#C41E3A;stroke-width:3"/><polygon points="' + (x + 6) + ',206 ' + (x + 22) + ',206 ' + (x + 14) + ',222" style="fill:#C41E3A"/>';
        g += '<text class="lab s" x="' + (x + 100) + '" y="250" text-anchor="middle">' + st(note) + '</text>';
      }
      col(10, '酸の強さ（強い → 弱い）', ['HCl', 'CH_3COOH', 'H_2CO_3', 'C_6H_5OH'], '上の酸は、下の酸の塩から H^{+} を奪う');
      col(290, '電子の出しやすさ（イオン化傾向）', ['Zn', 'Fe', 'Cu', 'Ag'], '上の金属は、下の金属のイオンに電子をわたす');
      return g;
    } },
    /* オストワルト法: N 原子は 1 個ずつ受けつがれる */
    ostwald: { alt: 'オストワルト法で、N 原子が NH3 から HNO3 まで 1 個ずつ受けつがれる様子', vb: '0 0 600 210', body: function () {
      var g = '', X = [60, 210, 360, 520], T = ['NH_3', 'NO', 'NO_2', 'HNO_3'], R = ['+ O_2（Pt 触媒）', '+ O_2', '+ H_2O'];
      X.forEach(function (x, i) {
        g += '<rect x="' + (x - 46) + '" y="60" width="92" height="40" rx="8" style="fill:#fff;stroke:#111;stroke-width:1.4"/>';
        g += '<text class="lab fm" x="' + x + '" y="86" text-anchor="middle">' + st(T[i]).replace('N', '<tspan style="fill:#C41E3A;font-weight:700">N</tspan>') + '</text>';
        if (i < 3) g += '<line class="wire" x1="' + (x + 48) + '" y1="80" x2="' + (X[i + 1] - 56) + '" y2="80"/><polygon class="ink" points="' + (X[i + 1] - 58) + ',74 ' + (X[i + 1] - 46) + ',80 ' + (X[i + 1] - 58) + ',86"/><text class="lab s" x="' + ((x + X[i + 1]) / 2) + '" y="52" text-anchor="middle">' + st(R[i]) + '</text>';
      });
      g += '<path style="fill:none;stroke:#2F5A8C;stroke-width:1.6;stroke-dasharray:5 3" d="M520,102 C520,150 210,150 210,104"/><polygon points="204,110 216,110 210,100" style="fill:#2F5A8C"/>';
      g += '<text class="lab s" style="fill:#2F5A8C" x="365" y="160" text-anchor="middle">' + st('3NO_2 + H_2O → 2HNO_3 + NO の NO は、もう一度使う') + '</text>';
      g += '<text class="lab sub" x="300" y="196" text-anchor="middle">' + st('赤い N は 1 個のまま → NH_3 1 mol から HNO_3 1 mol') + '</text>';
      return g;
    } },
    /* 水分子どうしの水素結合 */
    hbond_water: { alt: '水分子どうしの水素結合。H（δ+）と、となりの分子の O（δ−）が引き合う', vb: '0 0 520 230', body: function () {
      var g = '';
      function w(ox, oy, a1, a2) {
        var h = [a1, a2].map(function (a) { var t = a * Math.PI / 180; return [ox + 38 * Math.cos(t), oy + 38 * Math.sin(t)]; });
        h.forEach(function (p) { g += '<line class="edge" x1="' + ox + '" y1="' + oy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; });
        g += '<circle cx="' + ox + '" cy="' + oy + '" r="17" style="fill:#FCEDEF;stroke:#C41E3A;stroke-width:1.6"/><text class="lab" x="' + ox + '" y="' + (oy + 5) + '" text-anchor="middle">O</text><text class="lab s" style="fill:#C41E3A" x="' + (ox - 22) + '" y="' + (oy - 18) + '">δ−</text>';
        h.forEach(function (p) { g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="11" style="fill:#EDF2F8;stroke:#2F5A8C;stroke-width:1.4"/><text class="lab s" x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" text-anchor="middle">H</text>'; });
        return h;
      }
      var h1 = w(110, 120, -20, 80), h2 = w(250, 70, 140, 30), h3 = w(400, 140, 200, 300);
      function hb(p, ox, oy) { g += '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + ox + '" y2="' + oy + '" style="stroke:#2F5A8C;stroke-width:2.2;stroke-dasharray:3 4"/>'; }
      hb(h1[0], 233, 76); hb(h2[1], 384, 132);
      g += '<text class="lab s" style="fill:#2F5A8C;font-weight:700" x="175" y="70" text-anchor="middle">水素結合</text><text class="lab s" style="fill:#2F5A8C;font-weight:700" x="350" y="88" text-anchor="middle">水素結合</text>';
      g += '<text class="lab s" x="260" y="220" text-anchor="middle">H は電子を O に引かれ、ほぼむき出しの陽子（δ+）。となりの O（δ−）と強く引き合う</text>';
      return g;
    } },
    /* 単位の約分 */
    unitcancel: { alt: '単位も数と同じように約分できる。mol/L × L = mol', vb: '0 0 560 150', body: function () {
      var g = '';
      function line(y, toks, cut) {
        var x = 40;
        toks.forEach(function (t, i) {
          var w = String(t).replace(/_\{?\d+\}?|\^\{[^}]*\}/g, '').length * 11 + 16;
          g += '<text class="lab fm" x="' + (x + w / 2).toFixed(1) + '" y="' + y + '" text-anchor="middle">' + st(t) + '</text>';
          if (cut.indexOf(i) >= 0) g += '<line x1="' + (x + 2) + '" y1="' + (y + 4) + '" x2="' + (x + w - 2) + '" y2="' + (y - 16) + '" style="stroke:#C41E3A;stroke-width:2.2"/>';
          x += w;
        });
      }
      line(50, ['0.10', 'mol', '/', 'L', '×', '0.020', 'L', '=', '2.0×10^{-3}', 'mol'], [3, 6]);
      line(110, ['5.6', 'g', '÷', '56', 'g', '/mol', '=', '0.10', 'mol'], [1, 4]);
      g += '<text class="lab s" x="280" y="140" text-anchor="middle">赤い線の単位どうしが消えて、残った単位が答えの単位になる</text>';
      return g;
    } },
    /* 周期表の縦の並び: 知らない元素は、同じ族の知っている元素から */
    analog: { alt: '同じ族の元素は性質が似ている。知っている元素から、知らない元素の性質を予想する', vb: '0 0 520 250', body: function () {
      var g = '';
      function colm(x, title, els, known) {
        g += '<text class="lab sub" x="' + (x + 50) + '" y="22" text-anchor="middle">' + title + '</text>';
        els.forEach(function (e, i) { var y = 34 + i * 40, k = known.indexOf(e) >= 0; g += '<rect x="' + x + '" y="' + y + '" width="100" height="34" rx="6" style="fill:' + (k ? '#EDF2F8' : '#fff') + ';stroke:' + (k ? '#2F5A8C' : '#9A9A9A') + ';stroke-width:1.4;' + (k ? '' : 'stroke-dasharray:4 3') + '"/><text class="lab fm" x="' + (x + 50) + '" y="' + (y + 23) + '" text-anchor="middle">' + e + '</text>'; });
      }
      colm(40, '2 族', ['Be', 'Mg', 'Ca', 'Sr', 'Ba'], ['Mg', 'Ca']);
      colm(200, '17 族', ['F', 'Cl', 'Br', 'I'], ['Cl']);
      g += '<text class="lab s" x="330" y="60">■ 青: よく知っている元素</text><text class="lab s" x="330" y="82">□ 点線: 知らなくても、</text><text class="lab s" x="346" y="102">上の元素と同じ反応で予想</text>';
      g += '<text class="lab s" x="330" y="140">例: Sr・Ba も Ca と同じく</text><text class="lab s" x="346" y="160">常温の水と反応して H_2</text><text class="lab s" x="330" y="190">例: Br・I も Cl と同じく</text><text class="lab s" x="346" y="210">Ag^{+} と沈殿をつくる</text>';
      g = g.replace('H_2</text>', st('H_2') + '</text>').replace('Ag^{+} と', st('Ag^{+}') + ' と');
      return g;
    } },
    /* ===== コラムの図（2） ===== */
    /* 物質量: ダースと同じ「まとめて数える単位」 */
    mol_scale: { alt: '1 ダース = 12 本と同じように、1 mol = 6.0×10^23 個。水 1 mol は 18 g', vb: '0 0 580 220', body: function () {
      var g = '';
      function box(x, title, sub) { g += '<rect x="' + x + '" y="20" width="170" height="150" rx="10" style="fill:#fff;stroke:#2F5A8C;stroke-width:1.4"/><text class="lab sub" x="' + (x + 85) + '" y="44" text-anchor="middle">' + st(title) + '</text><text class="lab s" x="' + (x + 85) + '" y="190" text-anchor="middle">' + st(sub) + '</text>'; }
      box(10, '1 ダース', '鉛筆 12 本');
      for (var i = 0; i < 12; i++) { var px = 30 + i * 11; g += '<rect x="' + px + '" y="64" width="7" height="80" rx="2" style="fill:#FDD835;stroke:#111;stroke-width:1"/><polygon points="' + px + ',64 ' + (px + 7) + ',64 ' + (px + 3.5) + ',54" style="fill:#F1D7B0;stroke:#111;stroke-width:1"/>'; }
      box(205, '1 mol', '粒子 6.0×10^{23} 個（数の単位）');
      for (var k = 0; k < 60; k++) { var r = (k * 37) % 60, cx = 222 + (k % 10) * 14, cy = 66 + Math.floor(k / 10) * 14 + (r % 3); g += '<circle cx="' + cx + '" cy="' + cy + '" r="4" style="fill:#2F5A8C"/>'; }
      g += '<text class="lab" x="290" y="158" text-anchor="middle">…ほぼ無限に続く</text>';
      box(400, '水 1 mol', '18 g ＝ 約 18 mL（大さじ 1 杯強）');
      g += '<path class="edge" d="M440,70 L452,150 H518 L530,70"/><path class="liq" d="M444,96 L452,150 H518 L526,96 Z"/><line class="wl" x1="444" y1="96" x2="526" y2="96"/>';
      g += '<text class="lab s" x="485" y="88" text-anchor="middle">18 mL</text>';
      return g;
    } },
    /* 電池: 電子が坂道を転がり落ちる */
    cell_slope: { alt: '電池は電子の坂道。電子を出しやすい金属から、受け取りやすいイオンへ、電子が転がり落ちる', vb: '0 0 580 250', body: function () {
      var g = '<path d="M40,60 C200,60 300,190 520,190" style="fill:none;stroke:#111;stroke-width:2.4"/>';
      g += '<rect x="20" y="40" width="120" height="30" rx="6" style="fill:#EDF2F8;stroke:#2F5A8C"/><text class="lab sub" x="80" y="60" text-anchor="middle">負極 Zn</text>';
      g += '<rect x="440" y="196" width="130" height="30" rx="6" style="fill:#FCEDEF;stroke:#C41E3A"/><text class="lab sub" x="505" y="216" text-anchor="middle">' + st('正極 Cu^{2+}') + '</text>';
      [[150, 66], [250, 104], [350, 150], [440, 180]].forEach(function (p) { g += '<circle cx="' + p[0] + '" cy="' + (p[1] - 12) + '" r="9" style="fill:#2F5A8C"/><text class="lab s" x="' + p[0] + '" y="' + (p[1] - 8) + '" text-anchor="middle" style="fill:#fff">' + st('e^{-}') + '</text>'; });
      g += '<line x1="560" y1="64" x2="560" y2="186" style="stroke:#C41E3A;stroke-width:1.6"/><polygon points="554,72 566,72 560,60" style="fill:#C41E3A"/><polygon points="554,178 566,178 560,190" style="fill:#C41E3A"/>';
      g += '<text class="lab s" style="fill:#C41E3A;font-weight:700" x="552" y="120" text-anchor="end">高さの差 = 電圧（起電力）</text>';
      g += '<text class="lab s" x="40" y="100">電子を出しやすい</text><text class="lab s" x="40" y="118">（イオン化傾向が大きい）</text>';
      g += '<text class="lab s" x="300" y="236">電子を受け取りやすい（イオン化傾向が小さい）</text>';
      return g;
    } },
    /* 2 段階の反応: いちばん高い山が律速段階 */
    twostep: { alt: '2 段階で進む反応のエネルギー図。いちばん高い山の段階が全体の速さを決める', vb: '0 0 540 250', body: function () {
      var g = '<line class="edge" x1="40" y1="230" x2="40" y2="20"/><polygon class="ink" points="34,26 40,14 46,26"/><text class="lab s" x="48" y="22">エネルギー</text>';
      g += '<path style="fill:none;stroke:#111;stroke-width:2" d="M60,170 H110 C150,170 160,50 200,50 C240,50 250,140 285,140 C320,140 330,105 360,105 C390,105 400,200 440,200 H520"/>';
      g += '<text class="lab" x="85" y="162" text-anchor="middle">反応物</text><text class="lab" x="285" y="160" text-anchor="middle">中間体</text><text class="lab" x="480" y="192" text-anchor="middle">生成物</text>';
      g += '<rect x="140" y="24" width="122" height="22" rx="5" style="fill:#FCEDEF;stroke:#C41E3A"/><text class="lab s" style="fill:#C41E3A;font-weight:700" x="201" y="40" text-anchor="middle">律速段階（高い山）</text>';
      g += '<text class="lab s" x="360" y="96" text-anchor="middle">低い山はすぐ越える</text>';
      g += '<text class="lab s" x="290" y="244" text-anchor="middle">全体の速さは、いちばん越えにくい山（律速段階）で決まる</text>';
      return g;
    } },
    /* 平面での詰め方: 正方形と互い違い */
    packing2d: { alt: '同じ円を正方形に並べた場合と、互い違いに並べた場合のすき間のちがい', vb: '0 0 560 230', body: function () {
      var g = '', r = 16, i, j;
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) g += '<circle class="atom" cx="' + (60 + j * 2 * r) + '" cy="' + (50 + i * 2 * r) + '" r="' + r + '"/>';
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) g += '<circle class="atom" style="fill:#DCE7F1" cx="' + (330 + j * 2 * r + (i % 2 ? r : 0)) + '" cy="' + (50 + i * r * Math.sqrt(3)).toFixed(1) + '" r="' + r + '"/>';
      g += '<text class="lab sub" x="108" y="196" text-anchor="middle">正方形に並べる → 78.5 %</text><text class="lab sub" x="394" y="196" text-anchor="middle">互い違いに並べる → 90.7 %</text>';
      g += '<text class="lab s" x="280" y="222" text-anchor="middle">平面をうめる割合。互い違いの方が、すき間が小さい</text>';
      return g;
    } },
    /* 色の正体: 吸収した光の補色が見える */
    color_wheel: { alt: '色相環。物質は吸収した光の補色（反対側の色）に見える', vb: '0 0 560 260', body: function () {
      var cx = 130, cy = 130, R = 100, cols = [['赤', '#E53935'], ['だいだい', '#FB8C00'], ['黄', '#FDD835'], ['緑', '#43A047'], ['青', '#1E88E5'], ['紫', '#8E24AA']], g = '';
      cols.forEach(function (c, i) {
        var a0 = (i * 60 - 120) * Math.PI / 180, a1 = ((i + 1) * 60 - 120) * Math.PI / 180, am = (a0 + a1) / 2;
        g += '<path d="M' + cx + ',' + cy + ' L' + (cx + R * Math.cos(a0)).toFixed(1) + ',' + (cy + R * Math.sin(a0)).toFixed(1) + ' A' + R + ',' + R + ' 0 0 1 ' + (cx + R * Math.cos(a1)).toFixed(1) + ',' + (cy + R * Math.sin(a1)).toFixed(1) + ' Z" style="fill:' + c[1] + ';stroke:#fff;stroke-width:2"/>';
        g += '<text class="lab s" style="fill:#fff;font-weight:700" x="' + (cx + R * 0.66 * Math.cos(am)).toFixed(1) + '" y="' + (cy + R * 0.66 * Math.sin(am) + 4).toFixed(1) + '" text-anchor="middle">' + c[0] + '</text>';
      });
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="22" style="fill:#fff"/><text class="lab s" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">反対が補色</text>';
      var ex = [['Cu^{2+}', '赤〜だいだいを吸収', '→ 青に見える'], ['MnO_4^{-}', '緑を吸収', '→ 赤紫に見える'], ['Cr_2O_7^{2-}', '青を吸収', '→ だいだいに見える']];
      ex.forEach(function (e, i) { var y = 60 + i * 64; g += '<text class="lab sub" x="270" y="' + y + '">' + st(e[0]) + '</text><text class="lab s" x="270" y="' + (y + 20) + '">' + e[1] + '</text><text class="lab s" style="font-weight:700" x="270" y="' + (y + 38) + '">' + e[2] + '</text>'; });
      return g;
    } },
    /* ===== 原子の構造・化学結合の図 ===== */
    /* 原子のつくりと、水素の同位体 */
    atom_struct: { alt: '炭素原子のつくり（陽子・中性子・電子）と、水素の 3 つの同位体', vb: '0 0 600 260', body: function () {
      var g = '', cx = 120, cy = 120;
      [34, 70].forEach(function (r) { g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" style="fill:none;stroke:#9A9A9A;stroke-width:1;stroke-dasharray:3 3"/>'; });
      var nuc = [[-6, -6, 'p'], [6, -6, 'n'], [-6, 6, 'n'], [6, 6, 'p'], [0, -12, 'p'], [0, 12, 'n'], [-12, 0, 'n'], [12, 0, 'p'], [-4, 0, 'p'], [4, 0, 'n'], [0, -2, 'p'], [0, 4, 'n']];
      nuc.forEach(function (q) { g += '<circle cx="' + (cx + q[0]) + '" cy="' + (cy + q[1]) + '" r="5" style="fill:' + (q[2] === 'p' ? '#E53935' : '#9A9A9A') + ';stroke:#fff;stroke-width:1"/>'; });
      [[0, -34], [0, 34]].forEach(function (p) { g += '<circle cx="' + (cx + p[0]) + '" cy="' + (cy + p[1]) + '" r="5" style="fill:#2F5A8C"/>'; });
      [45, 135, 225, 315].forEach(function (a) { var t = a * Math.PI / 180; g += '<circle cx="' + (cx + 70 * Math.cos(t)).toFixed(1) + '" cy="' + (cy + 70 * Math.sin(t)).toFixed(1) + '" r="5" style="fill:#2F5A8C"/>'; });
      g += '<text class="lab s" x="' + (cx - 32) + '" y="' + (cy - 38) + '">K 殻</text><text class="lab s" x="' + (cx + 52) + '" y="' + (cy - 60) + '">L 殻</text>';
      g += '<circle cx="20" cy="222" r="5" style="fill:#E53935"/><text class="lab s" x="30" y="226">陽子 6</text><circle cx="90" cy="222" r="5" style="fill:#9A9A9A"/><text class="lab s" x="100" y="226">中性子 6</text><circle cx="170" cy="222" r="5" style="fill:#2F5A8C"/><text class="lab s" x="180" y="226">電子 6</text>';
      /* 元素記号の左上に質量数、左下に原子番号 */
      g += '<text class="lab" x="236" y="92" style="font-size:16px">12</text><text class="lab" x="242" y="128" style="font-size:16px">6</text><text class="lab big" x="258" y="122" style="font-size:40px">C</text>';
      g += '<text class="lab s" x="300" y="88">← 質量数 = 陽子 + 中性子</text><text class="lab s" x="300" y="128">← 原子番号 = 陽子の数</text>';
      g += '<text class="lab s" x="236" y="160">' + st('中性子の数 = 質量数 − 原子番号 = 12 − 6 = 6') + '</text>';
      /* 水素の同位体 */
      g += '<text class="lab sub" x="236" y="196">水素の同位体（原子番号はどれも 1）</text>';
      [['^{1}H 水素', 0], ['^{2}H 重水素', 1], ['^{3}H 三重水素', 2]].forEach(function (h, i) {
        var x = 268 + i * 112, y = 228;
        g += '<circle cx="' + x + '" cy="' + y + '" r="5" style="fill:#E53935"/>';
        for (var k = 0; k < h[1]; k++) g += '<circle cx="' + (x + 10 + k * 10) + '" cy="' + y + '" r="5" style="fill:#9A9A9A"/>';
        g += '<text class="lab s" x="' + (x - 6) + '" y="' + (y + 24) + '">' + st(h[0]) + '</text>';
      });
      return g;
    } },
    /* 周期律: 原子の大きさ（めやす）と、性質の変わり方 */
    trend: { alt: '第 2〜4 周期の典型元素の原子の大きさと、周期表での性質の変わり方', vb: '0 0 600 300', body: function () {
      var g = '', R = [[['Li', 152], ['Be', 112], ['B', 85], ['C', 77], ['N', 75], ['O', 73], ['F', 72]], [['Na', 186], ['Mg', 160], ['Al', 143], ['Si', 118], ['P', 110], ['S', 103], ['Cl', 100]], [['K', 231], ['Ca', 197], ['Ga', 135], ['Ge', 122], ['As', 120], ['Se', 117], ['Br', 114]]];
      R.forEach(function (row, i) { row.forEach(function (e, j) { var x = 110 + j * 66, y = 70 + i * 66, r = e[1] / 9; g += '<circle cx="' + x + '" cy="' + y + '" r="' + r.toFixed(1) + '" style="fill:#DCE7F1;stroke:#2F5A8C;stroke-width:1.2"/><text class="lab s" x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + e[0] + '</text>'; }); });
      g += '<line x1="90" y1="24" x2="530" y2="24" style="stroke:#C41E3A;stroke-width:2.4"/><polygon points="526,18 540,24 526,30" style="fill:#C41E3A"/>';
      g += '<text class="lab s" style="fill:#C41E3A;font-weight:700" x="310" y="16" text-anchor="middle">右へ: 原子は小さく、イオン化エネルギー・電気陰性度は大きく</text>';
      g += '<line x1="40" y1="40" x2="40" y2="220" style="stroke:#2F5A8C;stroke-width:2.4"/><polygon points="34,216 40,230 46,216" style="fill:#2F5A8C"/>';
      g += '<text class="lab s" style="fill:#2F5A8C;font-weight:700" x="20" y="130" text-anchor="middle" transform="rotate(-90 20 130)">下へ: 原子は大きく、取れやすく</text>';
      g += '<text class="lab s" x="310" y="270" text-anchor="middle">円の大きさは原子半径のめやす（第 2〜4 周期の 1・2・13〜17 族）。貴ガスは除く</text>';
      g += '<text class="lab s" x="310" y="290" text-anchor="middle">右へ: 陽子が増えて同じ殻を強く引く／下へ: 殻が外に増えて遠くなる</text>';
      return g;
    } },
    /* 化学結合の 4 つ */
    bond_types: { alt: '共有結合・イオン結合・金属結合・配位結合のイメージ', vb: '0 0 600 250', body: function () {
      var g = '';
      function panel(x, title, sub) { g += '<rect x="' + x + '" y="10" width="140" height="190" rx="10" style="fill:#fff;stroke:#C9CDD1"/><text class="lab sub" x="' + (x + 70) + '" y="222" text-anchor="middle">' + title + '</text><text class="lab s" x="' + (x + 70) + '" y="242" text-anchor="middle">' + st(sub) + '</text>'; }
      panel(5, '共有結合', '電子対を共有（非金属どうし）');
      g += '<circle cx="52" cy="100" r="30" style="fill:#DCE7F1;stroke:#2F5A8C"/><circle cx="98" cy="100" r="30" style="fill:#DCE7F1;stroke:#2F5A8C"/><text class="lab" x="40" y="105">H</text><text class="lab" x="102" y="105">H</text><circle cx="75" cy="94" r="4" style="fill:#C41E3A"/><circle cx="75" cy="106" r="4" style="fill:#C41E3A"/>';
      panel(155, 'イオン結合', '陽イオンと陰イオンの引力');
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { var pos = (i + j) % 2 === 0, x = 185 + j * 40, y = 60 + i * 40; g += '<circle cx="' + x + '" cy="' + y + '" r="' + (pos ? 11 : 17) + '" style="fill:' + (pos ? '#FCEDEF' : '#DCE7F1') + ';stroke:' + (pos ? '#C41E3A' : '#2F5A8C') + '"/>' + (pos ? '<text class="lab s" x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">+</text>' : '<line x1="' + (x - 5) + '" y1="' + y + '" x2="' + (x + 5) + '" y2="' + y + '" style="stroke:#2F5A8C;stroke-width:2"/>'); }
      panel(305, '金属結合', '自由電子が全体をつなぐ');
      for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) { var mx = 335 + j * 40, my = 60 + i * 40; g += '<circle cx="' + mx + '" cy="' + my + '" r="14" style="fill:#FCEDEF;stroke:#C41E3A"/><text class="lab s" x="' + mx + '" y="' + (my + 4) + '" text-anchor="middle">+</text>'; }
      [[352, 78], [393, 64], [350, 120], [394, 104], [372, 142], [334, 160], [414, 150], [372, 84]].forEach(function (p) { g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" style="fill:#2F5A8C"/>'; });
      panel(455, '配位結合', '片方の非共有電子対を共有');
      g += '<text class="lab fm" x="470" y="90">' + st('H_3N') + '</text><circle cx="512" cy="80" r="3.5" style="fill:#C41E3A"/><circle cx="512" cy="92" r="3.5" style="fill:#C41E3A"/>';
      g += '<line class="wire" x1="520" y1="86" x2="550" y2="86"/><polygon class="ink" points="548,80 560,86 548,92"/><text class="lab fm" x="562" y="92">' + st('H^{+}') + '</text>';
      g += '<text class="lab s" x="525" y="130" text-anchor="middle">' + st('→ NH_4^{+}') + '</text><text class="lab s" x="525" y="160" text-anchor="middle">できた後は</text><text class="lab s" x="525" y="178" text-anchor="middle">4 本とも同じ</text>';
      return g;
    } },
    /* 分子の形と極性 */
    mol_shapes: { alt: 'CO2・H2O・NH3・CH4 の形と極性', vb: '0 0 620 250', body: function () {
      var g = '';
      function at(x, y, t, big) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (big ? 15 : 11) + '" style="fill:' + (big ? '#FCEDEF' : '#EDF2F8') + ';stroke:' + (big ? '#C41E3A' : '#2F5A8C') + ';stroke-width:1.4"/><text class="lab s" x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + t + '</text>'; }
      function bd(x1, y1, x2, y2, dbl) { var s = '<line class="edge" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>'; if (dbl) s += '<line class="edge" x1="' + x1 + '" y1="' + (y1 + 6) + '" x2="' + x2 + '" y2="' + (y2 + 6) + '"/>'; return s; }
      function lp(x, y) { return '<circle cx="' + (x - 5) + '" cy="' + y + '" r="2.6" class="dot"/><circle cx="' + (x + 5) + '" cy="' + y + '" r="2.6" class="dot"/>'; }
      function cap(x, a, b) { g += '<text class="lab sub" x="' + x + '" y="196" text-anchor="middle">' + a + '</text><text class="lab s" x="' + x + '" y="218" text-anchor="middle">' + b + '</text>'; }
      /* CO2 */
      g += bd(36, 97, 64, 97, true) + bd(86, 97, 114, 97, true) + at(25, 100, 'O', true) + at(75, 100, 'C') + at(125, 100, 'O', true) + lp(25, 76) + lp(25, 124) + lp(125, 76) + lp(125, 124);
      g += '<text class="lab s" x="75" y="40" text-anchor="middle">' + st('CO_2') + '</text>'; cap(75, '直線形', '無極性（打ち消し合う）');
      /* H2O */
      g += bd(225, 95, 198, 130) + bd(225, 95, 252, 130) + at(225, 92, 'O', true) + at(195, 134, 'H') + at(255, 134, 'H') + lp(211, 70) + lp(239, 70);
      g += '<text class="lab s" x="225" y="40" text-anchor="middle">' + st('H_2O') + '</text><text class="lab s" x="225" y="160" text-anchor="middle">約 104.5°</text>'; cap(225, '折れ線形', '極性分子');
      /* NH3 */
      g += bd(375, 95, 345, 130) + bd(375, 95, 375, 138) + bd(375, 95, 405, 130) + at(375, 92, 'N', true) + at(343, 134, 'H') + at(375, 142, 'H') + at(407, 134, 'H') + lp(375, 66);
      g += '<text class="lab s" x="375" y="40" text-anchor="middle">' + st('NH_3') + '</text>'; cap(375, '三角錐形', '極性分子');
      /* CH4 */
      g += bd(525, 100, 525, 64) + bd(525, 100, 495, 125) + bd(525, 100, 555, 125) + '<line class="hid" x1="525" y1="100" x2="540" y2="80"/>' + at(525, 100, 'C') + at(525, 60, 'H') + at(493, 128, 'H') + at(557, 128, 'H') + at(544, 76, 'H');
      g += '<text class="lab s" x="525" y="40" text-anchor="middle">' + st('CH_4') + '</text>'; cap(525, '正四面体形', '無極性（打ち消し合う）');
      g += '<text class="lab s" x="310" y="244" text-anchor="middle">● ● は非共有電子対。電子対どうしが反発してなるべく離れる → 形が決まる</text>';
      return g;
    } },
    /* ===== コラムの図（3） ===== */
    /* 電池の電圧: 2 つの金属の「高さの差」 */
    cell_ladder: { alt: '金属の電子の出しやすさの順と、組合せによる電圧のちがい', vb: '0 0 640 310', body: function () {
      var g = '', Y = function (E) { return 36 + (E + 2.4) / 3.3 * 230; };
      var M = [['Mg', -2.37], ['Al', -1.66], ['Zn', -0.76], ['Fe', -0.44], ['H_2', 0], ['Cu', 0.34], ['Ag', 0.80]], BY = {};
      M.forEach(function (m) { var y = Y(m[1]); BY[m[0]] = y; g += '<line x1="104" y1="' + y.toFixed(1) + '" x2="610" y2="' + y.toFixed(1) + '" style="stroke:#E3E5E7;stroke-dasharray:3 4"/><text class="lab sub" x="96" y="' + (y + 5).toFixed(1) + '" text-anchor="end">' + st(m[0] === 'H_2' ? '（H_2）' : m[0]) + '</text>'; });
      g += '<line x1="30" y1="270" x2="30" y2="40" style="stroke:#2F5A8C;stroke-width:2.4"/><polygon points="24,44 30,30 36,44" style="fill:#2F5A8C"/>';
      g += '<text class="lab s" style="fill:#2F5A8C;font-weight:700" x="18" y="150" text-anchor="middle" transform="rotate(-90 18 150)">上ほど電子を出しやすい</text>';
      [['Fe', 'Cu', '0.78 V', 200], ['Zn', 'Cu', '1.10 V', 300], ['Zn', 'Ag', '1.56 V', 400], ['Mg', 'Cu', '2.71 V', 520]].forEach(function (p) {
        var y1 = BY[p[0]], y2 = BY[p[1]], x = p[3];
        g += '<line x1="' + x + '" y1="' + y1.toFixed(1) + '" x2="' + x + '" y2="' + (y2 - 8).toFixed(1) + '" style="stroke:#C41E3A;stroke-width:3"/><polygon points="' + (x - 7) + ',' + (y2 - 10).toFixed(1) + ' ' + (x + 7) + ',' + (y2 - 10).toFixed(1) + ' ' + x + ',' + y2.toFixed(1) + '" style="fill:#C41E3A"/>';
        g += '<circle cx="' + x + '" cy="' + y1.toFixed(1) + '" r="5" style="fill:#C41E3A"/>';
        g += '<text class="lab sub" style="fill:#C41E3A" x="' + (x + 8) + '" y="' + ((y1 + y2) / 2 + 4).toFixed(1) + '">' + p[2] + '</text>';
        g += '<text class="lab s" x="' + x + '" y="296" text-anchor="middle">' + st(p[0] + ' − ' + p[1]) + '</text>';
      });
      return g;
    } },
    /* 有機化合物: 炭素の骨格と、官能基 */
    org_skeleton: { alt: '炭素の骨格（直鎖・枝分かれ・環・ベンゼン環）と、同じ骨格に官能基をつけたもの', vb: '0 0 640 300', body: function () {
      var g = '<text class="lab sub" x="12" y="22">炭素の骨格（体）　●が C 原子（H は省略）</text>';
      function dot(x, y) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5" style="fill:#111"/>'; }
      function path(pts) { var s = '<polyline class="edge" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>'; pts.forEach(function (p) { s += dot(p[0], p[1]); }); return s; }
      var y = 74;
      g += path([[30, y + 12], [62, y - 8], [94, y + 12], [126, y - 8]]) + '<text class="lab" x="78" y="128" text-anchor="middle">直鎖</text>';
      g += path([[190, y + 12], [222, y - 8], [254, y + 12]]) + path([[222, y - 8], [222, y - 38]]) + '<text class="lab" x="222" y="128" text-anchor="middle">枝分かれ</text>';
      var hex = function (cx, cy, r) { var p = []; for (var k = 0; k <= 6; k++) { var t = Math.PI / 6 + k * Math.PI / 3; p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } return p; };
      g += path(hex(380, y, 30)) + '<text class="lab" x="380" y="128" text-anchor="middle">環</text>';
      g += path(hex(530, y, 30)) + '<circle cx="530" cy="' + y + '" r="17" class="edge"/><text class="lab" x="530" y="128" text-anchor="middle">ベンゼン環</text>';
      g += '<line class="hid" x1="12" y1="146" x2="628" y2="146"/>';
      g += '<text class="lab sub" x="12" y="172">' + st('同じ骨格 C−C に、ちがう官能基（服）をつける') + '</text>';
      var R = function (t) { return '<tspan style="fill:#C41E3A;font-weight:700">' + st(t) + '</tspan>'; };
      [[110, st('CH_3−CH_3'), 'エタン', '気体（沸点 −89 ℃）'], [320, st('CH_3−CH_2−') + R('OH'), 'エタノール', '液体（沸点 78 ℃）・中性'], [530, st('CH_3−') + R('COOH'), '酢酸', '液体（沸点 118 ℃）・酸性']].forEach(function (m) {
        g += '<text class="lab fm" style="font-size:18px" x="' + m[0] + '" y="216" text-anchor="middle">' + m[1] + '</text>';
        g += '<text class="lab sub" x="' + m[0] + '" y="248" text-anchor="middle">' + m[2] + '</text><text class="lab s" x="' + m[0] + '" y="270" text-anchor="middle">' + st(m[3]) + '</text>';
      });
      g += '<text class="lab s" x="320" y="294" text-anchor="middle">赤い部分（官能基）だけで、性質ががらりと変わる</text>';
      return g;
    } },
    /* 並び方を数える: 4 個とも左 1 通り、2 個ずつ 6 通り */
    arrange4: { alt: '4 個の分子を 2 つの部屋に入れる並び方。4 個とも左は 1 通り、2 個ずつは 6 通り', vb: '0 0 660 280', body: function () {
      var g = '';
      function room(x, y, w, h, L, Rr, r) {
        var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" style="fill:#fff;stroke:#111;stroke-width:1.4"/>';
        s += '<line x1="' + (x + w / 2) + '" y1="' + y + '" x2="' + (x + w / 2) + '" y2="' + (y + h * 0.35) + '" style="stroke:#111;stroke-width:1.4"/><line x1="' + (x + w / 2) + '" y1="' + (y + h * 0.65) + '" x2="' + (x + w / 2) + '" y2="' + (y + h) + '" style="stroke:#111;stroke-width:1.4"/>';
        function put(list, x0) { list.split('').forEach(function (c, i) { var cx = x0 + (i % 2) * r * 2.4, cy = y + h / 2 + (i < 2 ? -r * 1.2 : r * 1.2) * (list.length > 2 ? 1 : 0); s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r + '" style="fill:#DCE7F1;stroke:#2F5A8C"/><text class="lab s" x="' + cx.toFixed(1) + '" y="' + (cy + 4).toFixed(1) + '" text-anchor="middle">' + c + '</text>'; }); }
        put(L, x + w / 4 - r * 1.2); put(Rr, x + w * 3 / 4 - r * 1.2);
        return s;
      }
      g += '<text class="lab sub" x="20" y="26">4 個とも左の部屋: 1 通りだけ</text>' + room(20, 50, 200, 110, 'ABCD', '', 14);
      g += '<text class="lab sub" x="260" y="26">2 個ずつに分かれる: 6 通り</text>';
      ['AB|CD', 'AC|BD', 'AD|BC', 'BC|AD', 'BD|AC', 'CD|AB'].forEach(function (p, i) { var x = 260 + (i % 3) * 132, y = 50 + Math.floor(i / 3) * 76, s = p.split('|'); g += room(x, y, 120, 64, s[0], s[1], 10); });
      g += '<text class="lab s" x="330" y="230" text-anchor="middle">分子が勝手に動き回ると、どの並び方も同じように起こる → 並び方の多い「散らばった状態」が起こりやすい</text>';
      g += '<text class="lab s" x="330" y="254" text-anchor="middle">' + st('分子が 6.0×10^{23} 個なら、全部が片側に集まる並び方は、散らばった並び方にくらべてないに等しい') + '</text>';
      return g;
    } },
    /* 正誤問題: 文を区切って 1 か所ずつ ○× */
    tf_split: { alt: '正誤問題の文を区切って、部分ごとに ○× をつける例', vb: '0 0 640 210', body: function () {
      var g = '<text class="lab s" x="20" y="22">例:「鉛蓄電池を放電すると、両極の質量が増加し、電解液の密度は大きくなる。」</text>';
      var C3 = [['鉛蓄電池を放電すると、', '', '（場面）', '#111'], ['両極の質量が増加し、', '○', '両極とも PbSO_4 がつく', '#2F5A8C'], ['電解液の密度は大きくなる。', '×', 'H_2SO_4 が減り水ができる → 小さくなる', '#C41E3A']], x = 20;
      C3.forEach(function (c) {
        var w = c[0].length * 13 + 20;
        g += '<rect x="' + x + '" y="40" width="' + w + '" height="40" rx="8" style="fill:#fff;stroke:' + c[3] + ';stroke-width:1.6"/><text class="lab" x="' + (x + w / 2) + '" y="65" text-anchor="middle">' + c[0] + '</text>';
        if (c[1]) g += '<text class="lab big" style="fill:' + c[3] + ';font-size:28px" x="' + (x + w / 2) + '" y="118" text-anchor="middle">' + c[1] + '</text>';
        g += '<text class="lab s" style="fill:' + c[3] + '" x="' + (x + w / 2) + '" y="146" text-anchor="middle">' + st(c[2]) + '</text>';
        x += w + 14;
      });
      g += '<text class="lab sub" x="320" y="190" text-anchor="middle">1 か所でも × があれば、この文は「誤りを含む」</text>';
      return g;
    } },
    /* 60 分の使い方の例 */
    timeline: { alt: '試験時間 60 分の使い方の一例', vb: '0 0 640 180', body: function () {
      var x0 = 30, W = 580, k = W / 60, g = '', S = [[0, 40, '#2F5A8C', '1 周目'], [40, 52, '#FB8C00', '2 周目'], [52, 60, '#43A047', '確認']];
      S.forEach(function (s) { var x = x0 + s[0] * k, w = (s[1] - s[0]) * k; g += '<rect x="' + x.toFixed(1) + '" y="40" width="' + w.toFixed(1) + '" height="40" style="fill:' + s[2] + '"/><text class="lab sub" style="fill:#fff" x="' + (x + w / 2).toFixed(1) + '" y="66" text-anchor="middle">' + s[3] + '</text>'; });
      [[0, '0 分'], [40, '40'], [52, '52'], [60, '60 分']].forEach(function (t) { var x = x0 + t[0] * k; g += '<line class="edge" x1="' + x.toFixed(1) + '" y1="80" x2="' + x.toFixed(1) + '" y2="88"/><text class="lab s" x="' + x.toFixed(1) + '" y="102" text-anchor="middle">' + t[1] + '</text>'; });
      g += '<text class="lab s" x="30" y="132"><tspan style="fill:#2F5A8C;font-weight:700">1 周目</tspan>: 見てすぐ解ける問題を全部拾う。手が止まったら印をつけて次へ</text>';
      g += '<text class="lab s" x="30" y="152"><tspan style="fill:#FB8C00;font-weight:700">2 周目</tspan>: 印をつけた問題にもどる（途中の式が残っているものから）</text>';
      g += '<text class="lab s" x="30" y="172"><tspan style="fill:#43A047;font-weight:700">確認</tspan>: マークのずれ・塗り残し・「二つ選べ」の確認</text>';
      return g;
    } },
    /* 概算: 仮数と指数に分ける */
    estimate: { alt: '大きな数のかけ算を、仮数と指数に分けて計算する', vb: '0 0 640 210', body: function () {
      var g = '<text class="lab fm" style="font-size:20px" x="320" y="38" text-anchor="middle">' + st('6.0×10^{23} × 2.0×10^{-2}') + '</text>';
      g += '<line class="lead" x1="250" y1="48" x2="180" y2="74"/><line class="lead" x1="390" y1="48" x2="460" y2="74"/>';
      g += '<rect x="50" y="76" width="250" height="64" rx="10" style="fill:#EDF2F8;stroke:#2F5A8C"/><text class="lab sub" x="175" y="98" text-anchor="middle">仮数どうし</text><text class="lab fm" x="175" y="126" text-anchor="middle">6.0 × 2.0 = 12</text>';
      g += '<rect x="340" y="76" width="250" height="64" rx="10" style="fill:#FCEDEF;stroke:#C41E3A"/><text class="lab sub" x="465" y="98" text-anchor="middle">指数どうし（かけ算は足す）</text><text class="lab fm" x="465" y="126" text-anchor="middle">' + st('10^{23} × 10^{-2} = 10^{21}') + '</text>';
      g += '<text class="lab fm" style="font-size:18px" x="320" y="176" text-anchor="middle">' + st('12×10^{21} = 1.2×10^{22}') + '</text>';
      g += '<text class="lab s" x="320" y="200" text-anchor="middle">仮数を 1 けたに直すと（12 → 1.2）、指数が 1 増える</text>';
      return g;
    } },
    /* マークずれ */
    checklist: { alt: '解答番号を 1 つとばしてマークすると、その後が全部ずれる例', vb: '0 0 640 240', body: function () {
      var g = '<text class="lab sub" x="30" y="24">自分の答え</text><text class="lab sub" x="330" y="24">マークシート</text>';
      var ans = [['問 1', 3], ['問 2', 1], ['問 3', 0], ['問 4', 4], ['問 5', 2]], mark = [3, 1, 4, 2, 0];
      ans.forEach(function (a, i) {
        var y = 54 + i * 34;
        g += '<text class="lab" x="30" y="' + (y + 5) + '">' + a[0] + ' → ' + (a[1] ? a[1] : '（とばした）') + '</text>';
        g += '<text class="lab s" x="330" y="' + (y + 4) + '">' + (i + 1) + '</text>';
        for (var j = 1; j <= 4; j++) { var x = 360 + j * 36, on = mark[i] === j; g += '<ellipse cx="' + x + '" cy="' + y + '" rx="10" ry="13" style="fill:' + (on ? '#111' : '#fff') + ';stroke:#C41E3A;stroke-width:1.2"/><text class="lab s" style="fill:' + (on ? '#fff' : '#C41E3A') + '" x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + j + '</text>'; }
        if (i >= 2) g += '<text class="lab big" style="fill:#C41E3A" x="560" y="' + (y + 7) + '">×</text>';
      });
      g += '<path d="M150,156 C240,156 260,122 384,122" style="fill:none;stroke:#C41E3A;stroke-width:1.6;stroke-dasharray:4 3"/><polygon points="378,116 390,122 378,128" style="fill:#C41E3A"/>';
      g += '<text class="lab s" x="320" y="228" text-anchor="middle">問 3 をとばしたのに、問 4 の答えを解答番号 3 の行にマーク → 問 3〜5 が全部ずれる</text>';
      return g;
    } },
  };
  function ill(name) {
    var d = ILL[name]; if (!d) return '';
    return '<figure class="ill' + (Number(d.vb.split(' ')[2]) <= 260 ? ' sm' : '') + '"><svg viewBox="' + d.vb + '" role="img" aria-label="' + esc(d.alt) + '">' + d.body() + '</svg></figure>';
  }

  /* ---------- はじき図 ---------- */
  function hajiki(h, hide, interactive) {
    var parts = [['top', h.top, 100, 66], ['bl', h.bl, 62, 140], ['br', h.br, 138, 140]];
    var g = '<svg class="hj" viewBox="0 0 200 200" role="img" aria-label="' + esc(h.name + '：' + h.top + ' = ' + h.bl + ' × ' + h.br) + '">';
    g += '<clipPath id="hjc-' + h.id + (interactive ? 'i' : '') + '"><circle cx="100" cy="100" r="84"/></clipPath>';
    var cp = ' clip-path="url(#hjc-' + h.id + (interactive ? 'i' : '') + ')"';
    var areas = { top: '<rect x="0" y="0" width="200" height="100"' + cp + '/>', bl: '<rect x="0" y="100" width="100" height="100"' + cp + '/>', br: '<rect x="100" y="100" width="100" height="100"' + cp + '/>' };
    parts.forEach(function (p) {
      var on = hide === p[0];
      g += '<g class="hjp' + (on ? ' on' : '') + '"' + (interactive ? ' data-act="hj" data-id="' + h.id + '" data-part="' + p[0] + '" tabindex="0" role="button" aria-label="' + esc(p[1]) + 'を求める"' : '') + '>' + areas[p[0]].replace('<rect', '<rect class="hja"');
      /* 「溶質 g」のように空白を含むものは2行に分け、円の中に収まる大きさにする */
      var lines = on ? ['？'] : (h.lines && h.lines[p[0]]) || String(p[1]).split(' ');
      var maxW = p[0] === 'top' ? 118 : 52, maxFs = p[0] === 'top' ? 40 : 28;
      var fs = maxFs;
      lines.forEach(function (ln) {
        var w = 0, s = ln.replace(/\^\{([^}]*)\}/g, function (m, a) { w += a.length * 0.42; return ''; });
        for (var k = 0; k < s.length; k++) w += s.charCodeAt(k) > 0xff ? 1 : 0.6;
        fs = Math.min(fs, maxW / Math.max(w, 0.6));
      });
      if (lines.length > 1) fs = Math.min(fs, p[0] === 'top' ? 24 : 19);
      fs = Math.round(fs);
      var y0 = lines.length > 1 ? (p[0] === 'top' ? 56 : 128) : p[3] + 0.35 * fs;
      g += lines.map(function (ln, li) { return '<text class="hjt" x="' + p[2] + '" y="' + (y0 + li * 1.15 * fs).toFixed(1) + '" text-anchor="middle" font-size="' + fs + '">' + st(ln) + '</text>'; }).join('') + '</g>';
    });
    g += '<circle class="hjo" cx="100" cy="100" r="84"/><line class="hjo" x1="16" y1="100" x2="184" y2="100"/><line class="hjo" x1="100" y1="100" x2="100" y2="184"/>';
    return g + '</svg>';
  }
  /* 数値入りのはじき図：v = {top, bl, br} に値、find の場所は「？」 */
  function hajikiVal(h, v, find) {
    v = v || {};
    var parts = [['top', h.top, 100, 58], ['bl', h.bl, 60, 128], ['br', h.br, 140, 128]];
    var id = 'hv' + Math.random().toString(36).slice(2, 8);
    var g = '<svg class="hj hjv" viewBox="0 0 200 200" role="img" aria-label="' + esc(h.name) + '">';
    g += '<clipPath id="' + id + '"><circle cx="100" cy="100" r="84"/></clipPath>';
    var cp = ' clip-path="url(#' + id + ')"';
    var areas = { top: '<rect class="hja" x="0" y="0" width="200" height="100"' + cp + '/>', bl: '<rect class="hja" x="0" y="100" width="100" height="100"' + cp + '/>', br: '<rect class="hja" x="100" y="100" width="100" height="100"' + cp + '/>' };
    parts.forEach(function (p) {
      var on = find === p[0], val = on ? '？' : (v[p[0]] != null ? String(v[p[0]]) : null);
      var lab = String(p[1]);
      var big = val != null ? val : lab;
      var maxW = p[0] === 'top' ? 100 : 58, w = 0;
      var s = big.replace(/\^\{([^}]*)\}/g, function (m, a) { w += a.length * 0.42; return ''; });
      for (var k = 0; k < s.length; k++) w += s.charCodeAt(k) > 0xff ? 1 : 0.58;
      var fs = Math.round(Math.min(p[0] === 'top' ? 34 : 24, maxW / Math.max(w, 0.6)));
      g += '<g class="hjp' + (on ? ' on' : '') + (val != null && !on ? ' val' : '') + '">' + areas[p[0]];
      g += '<text class="hjt" x="' + p[2] + '" y="' + (p[3] + 0.35 * fs).toFixed(1) + '" text-anchor="middle" font-size="' + fs + '">' + st(big) + '</text>';
      if (val != null) g += '<text class="hjl" x="' + (p[0] === 'bl' ? 66 : p[0] === 'br' ? 134 : 100) + '" y="' + (p[0] === 'top' ? 92 : 160) + '" text-anchor="middle" font-size="' + (lab.length > 3 ? 13 : lab.length > 2 ? 16 : 19) + '">' + st(lab) + '</text>';
      g += '</g>';
    });
    g += '<circle class="hjo" cx="100" cy="100" r="84"/><line class="hjo" x1="16" y1="100" x2="184" y2="100"/><line class="hjo" x1="100" y1="100" x2="100" y2="184"/>';
    return g + '</svg>';
  }
  /* しえのセット：2つの数値入りはじきを並べた図
     o.set = 'conv'（濃度変換）: a = しえの（％）、b = しえの（mol/L）。上の矢印は分子量、下の矢印は密度
     o.set = 'pair'（希釈）: a = 濃い液、b = 薄い液。上半分（溶質）を枠で囲んで「＝」 */
  function hajikiSet(o) {
    var HB = {}; (CHEM.hajiki || []).forEach(function (h) { HB[h.id] = h; });
    function nest(p, x, y) {
      return hajikiVal(HB[p.h], p.v, p.find).replace('<svg class="hj hjv" viewBox="0 0 200 200"', '<svg class="hjin" x="' + x + '" y="' + y + '" width="200" height="200" viewBox="0 0 200 200"');
    }
    function head(x, y, dir) {
      var d = { down: [-7, -13, 7, -13], up: [-7, 13, 7, 13], left: [13, -7, 13, 7], right: [-13, -7, -13, 7] }[dir];
      return '<polygon class="hsah" points="' + x + ',' + y + ' ' + (x + d[0]) + ',' + (y + d[1]) + ' ' + (x + d[2]) + ',' + (y + d[3]) + '"/>';
    }
    function lab(x, y, t, cls) { return '<text class="' + (cls || 'hsal') + '" x="' + x + '" y="' + y + '" text-anchor="middle">' + st(t) + '</text>'; }
    var g;
    if (o.set === 'pair') {
      g = '<svg class="hj hjv hjset" viewBox="0 0 520 244" role="img" aria-label="' + esc((o.la || '濃い液') + 'と' + (o.lb || '薄い液') + 'の溶質は等しい') + '">';
      g += lab(130, 24, o.la || '濃い液') + lab(390, 24, o.lb || '薄い液');
      g += nest(o.a, 30, 40) + nest(o.b, 290, 40);
      g += '<rect class="hsbox" x="36" y="52" width="448" height="88" rx="4"/>';
      g += lab(260, 108, '＝', 'hseq');
      return g + '</svg>';
    }
    g = '<svg class="hj hjv hjset" viewBox="0 0 520 286" role="img" aria-label="しえのセット（濃度変換）">';
    g += nest(o.a, 30, 46) + nest(o.b, 290, 46);
    /* 上：溶質 g ⇄ 溶質 mol（分子量） */
    g += '<path class="hsa" d="M130,60 V30 H390 V60"/>' + (o.dir === 'm2p' ? head(130, 62, 'down') : head(390, 62, 'down'));
    g += lab(260, 22, o.top || (o.dir === 'm2p' ? '× 分子量' : '÷ 分子量'));
    /* 下：溶液 L → 溶液 g（密度） */
    g += '<path class="hsa" d="M350,224 V250 H90 V230"/>' + head(90, 223, 'up');
    g += lab(220, 276, o.bot || '× 密度');
    return g + '</svg>';
  }
  /* 相関図（結晶格子）：格子の「質量 = 密度 × 体積」と、原子の「モル質量 = 原子1個の g × N_A」を
     「× / ÷ 格子内の個数」でつなぐ。o = { lat: {top, bl, br}, at: {top, bl, br}, find: 'lat.bl' など,
     n: '4'（格子内の個数）, dir: 'a2l'（原子 → 格子：×）/ 'l2a'（格子 → 原子：÷）, mark: { 'at.bl': '①', ... } } */
  function soukan(o) {
    o = o || {}; var lat = o.lat || {}, at = o.at || {}, mark = o.mark || {};
    var id = 'sk' + Math.random().toString(36).slice(2, 8);
    function fitFs(str, maxW, maxFs) {
      var w = 0, t = String(str).replace(/\^\{([^}]*)\}/g, function (m, a) { w += a.length * 0.5 + 0.2; return ''; }).replace(/_\{?([^}\s]*)\}?/g, function (m, a) { w += a.length * 0.5; return ''; });
      for (var k = 0; k < t.length; k++) w += t.charCodeAt(k) > 0xff ? 1.05 : 0.64;
      return Math.round(Math.min(maxFs, maxW / Math.max(w, 0.6)));
    }
    /* key: 'lat.top' など。area: 背景（見つける場所の色）、x・y: 中心、w: 幅 */
    function cell(key, lab, val, x, y, w, area, big) {
      var on = o.find === key, v = on ? '？' : (val != null && val !== '' ? String(val) : null);
      var g = '<g class="skc' + (on ? ' on' : '') + (v != null && !on ? ' val' : '') + '">' + area;
      if (v != null) {
        var fs = fitFs(v, w, big ? 26 : 22);
        g += '<text class="skv" x="' + x + '" y="' + (y + 0.2 * fs).toFixed(1) + '" text-anchor="middle" font-size="' + fs + '">' + st(v) + '</text>';
        g += '<text class="skl" x="' + x + '" y="' + (y + 0.2 * fs + 20).toFixed(1) + '" text-anchor="middle" font-size="' + fitFs(lab, w, 13) + '">' + st(lab) + '</text>';
      } else {
        g += '<text class="skv lab" x="' + x + '" y="' + (y + 6) + '" text-anchor="middle" font-size="' + fitFs(lab, w, big ? 20 : 16) + '">' + st(lab) + '</text>';
      }
      var MP = { 'lat.top': [22, 142], 'lat.bl': [20, 222], 'lat.br': [138, 222], 'at.top': [408, 66], 'at.bl': [378, 142], 'at.br': [490, 142] }[key];
      if (mark[key] && MP) g += '<text class="skm" x="' + MP[0] + '" y="' + MP[1] + '" font-size="16">' + esc(mark[key]) + '</text>';
      return g + '</g>';
    }
    /* 原子の楕円を上にずらし、楕円の下の段（原子1個の g）と格子の上の段（質量 g）を同じ高さにそろえ、矢印で横につなぐ */
    var g = '<svg class="hj hjv hjset sk" viewBox="0 0 620 292" role="img" aria-label="相関図（格子の質量・密度・体積と、原子のモル質量・原子1個の質量・アボガドロ定数）">';
    g += '<clipPath id="' + id + '"><ellipse cx="482" cy="120" rx="128" ry="80"/></clipPath>';
    var cp = ' clip-path="url(#' + id + ')"';
    g += '<text class="skh" x="16" y="110">格子の</text><text class="skh" x="372" y="30">原子の</text>';
    /* 格子（四角）: 上の段 = 質量（y 120〜200）、下の段 = 密度・体積（y 200〜280） */
    g += cell('lat.top', '質量 g', lat.top, 136, 160, 180, '<rect class="ska0" x="14" y="120" width="236" height="80"/>', true);
    g += cell('lat.bl', '密度 g/cm^{3}', lat.bl, 75, 242, 96, '<rect class="ska0" x="14" y="200" width="118" height="80"/>');
    g += cell('lat.br', '体積 cm^{3}', lat.br, 193, 242, 96, '<rect class="ska0" x="132" y="200" width="118" height="80"/>');
    g += '<rect class="sko" x="14" y="120" width="236" height="160"/><line class="sko" x1="14" y1="200" x2="250" y2="200"/><line class="sko" x1="132" y1="200" x2="132" y2="280"/>';
    /* 原子（楕円）: 上の段 = モル質量（y 40〜120）、下の段 = 原子1個の g・N_A（y 120〜200） */
    g += cell('at.top', 'モル質量 M', at.top, 488, 80, 160, '<rect class="ska0" x="354" y="40" width="256" height="80"' + cp + '/>', true);
    g += cell('at.bl', '原子1個の g', at.bl, 428, 160, 96, '<rect class="ska0" x="354" y="120" width="128" height="80"' + cp + '/>');
    g += cell('at.br', 'N_{A}', at.br, 538, 160, 96, '<rect class="ska0" x="482" y="120" width="128" height="80"' + cp + '/>');
    g += '<ellipse class="sko" cx="482" cy="120" rx="128" ry="80"/><line class="sko" x1="354" y1="120" x2="610" y2="120"/><line class="sko" x1="482" y1="120" x2="482" y2="200"/>';
    /* 矢印：上 = 原子1個の g → 格子の質量（× 個数）、下 = 格子の質量 → 原子1個の g（÷ 個数）。同じ高さで横につなぐ */
    var a2l = o.dir !== 'l2a';
    g += '<g class="skar' + (a2l ? ' on' : '') + '"><line x1="372" y1="146" x2="266" y2="146"/><polygon points="254,146 268,138 268,154"/><text x="300" y="132" text-anchor="middle">× 格子内の個数</text></g>';
    g += '<g class="skar' + (!a2l ? ' on' : '') + '"><line x1="254" y1="180" x2="358" y2="180"/><polygon points="372,180 358,172 358,188"/><text x="306" y="202" text-anchor="middle">÷ 格子内の個数</text></g>';
    if (o.n) g += '<text class="skn" x="306" y="169" text-anchor="middle">' + st(String(o.n)) + ' 個</text>';
    return g + '</svg>';
  }
  function hajikiFormula(h, hide) {
    if (hide === 'top') return h.top + ' = ' + h.bl + ' × ' + h.br;
    if (hide === 'bl') return h.bl + ' = {{' + h.top + '|' + h.br + '}}';
    if (hide === 'br') return h.br + ' = {{' + h.top + '|' + h.bl + '}}';
    return h.top + ' = ' + h.bl + ' × ' + h.br;
  }

  CHEM.draw = { fig: fig, choiceGraph: choiceGraph, ill: ill, ILL: ILL, hajiki: hajiki, hajikiVal: hajikiVal, hajikiSet: hajikiSet, soukan: soukan, hajikiFormula: hajikiFormula, st: st };
})();
