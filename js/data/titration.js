/* 滴定曲線の問題（曲線は電荷のつり合いから pH を計算して描く）
   数値と聞き方は出すたびに変わる */
window.CHEM = window.CHEM || {};
(function () {
  'use strict';
  var C = window.CHEM, fmt = C.fmt, mk = C.mkChoices, pick = C.pick, shuffle = C.shuffle;
  function f(x, s) { return fmt(x, s || 2); }
  var KW = 1.0e-14;
  var SP = {
    HCl: { n: '塩酸', f: 'HCl', z: 1, acid: true, strong: true },
    H2SO4: { n: '希硫酸', f: 'H_2SO_4', z: 2, acid: true, strong: true },
    AcOH: { n: '酢酸水溶液', f: 'CH_3COOH', z: 1, acid: true, strong: false, Ka: 2.7e-5 },
    NaOH: { n: '水酸化ナトリウム水溶液', f: 'NaOH', z: 1, acid: false, strong: true },
    NH3: { n: 'アンモニア水', f: 'NH_3', z: 1, acid: false, strong: false, Kb: 2.3e-5 },
    Na2CO3: { n: '炭酸ナトリウム水溶液', f: 'Na_2CO_3', z: 2, acid: false, strong: false }
  };
  var K1 = 4.5e-7, K2 = 4.7e-11;
  /* 成分1つの電荷（陽 − 陰）。c は mol/L、h は [H^+] */
  function chg(k, c, h, Ka) {
    switch (k) {
      case 'HCl': return -c;
      case 'H2SO4': return -2 * c;
      case 'AcOH': var ka = Ka || SP.AcOH.Ka; return -c * ka / (h + ka);
      case 'NaOH': return c;
      case 'NH3': var k4 = KW / SP.NH3.Kb; return c * h / (h + k4);
      case 'Na2CO3': var D = h * h + K1 * h + K1 * K2; return 2 * c - c * (K1 * h + 2 * K1 * K2) / D;
    }
    return 0;
  }
  function pHof(list) {
    var lo = -15, hi = 1;
    for (var i = 0; i < 64; i++) {
      var m = (lo + hi) / 2, h = Math.pow(10, m), s = h - KW / h;
      list.forEach(function (x) { s += chg(x.k, x.c, h, x.Ka); });
      if (s > 0) hi = m; else lo = m;
    }
    return -(lo + hi) / 2;
  }
  /* an: [{k, c, Ka?}] を Va mL、ti: {k, c} を v mL 加えたときの曲線 */
  function curve(an, Va, ti, vmax, eqs) {
    var vs = [];
    for (var i = 0; i <= 150; i++) vs.push(vmax * i / 150);
    (eqs || []).forEach(function (e) { [-0.06, -0.03, -0.015, -0.007, -0.003, 0, 0.003, 0.007, 0.015, 0.03, 0.06].forEach(function (d) { var v = e + d * vmax; if (v > 0 && v < vmax) vs.push(v); }); });
    vs.sort(function (a, b) { return a - b; });
    return vs.map(function (v) {
      var T = Va + v, list = an.map(function (x) { return { k: x.k, c: x.c * Va / T, Ka: x.Ka }; });
      list.push({ k: ti.k, c: ti.c * v / T });
      return [v, pHof(list)];
    });
  }
  function norm(pts, vmax) { return pts.map(function (p) { return [+(p[0] / vmax * 10).toFixed(2), +(Math.max(0, Math.min(14, p[1])) / 14 * 10).toFixed(2)]; }); }
  function gaxFor(ti, vmax) {
    var xt = []; for (var v = 0; v <= vmax + 1e-9; v += 10) xt.push([v / vmax * 10, String(v)]);
    return { x: SP[ti].f + ' 水溶液〔mL〕', y: 'pH', xt: xt, yt: [[5, '7'], [10, '14']] };
  }
  function figFor(pts, vmax, xlab, extraTicks, marks, lines) {
    var ex = extraTicks || [], xt = [];
    for (var v = 0; v <= vmax + 1e-9; v += 5) { if (!ex.some(function (e) { return Math.abs(e[0] - v) < vmax * 0.06; })) xt.push(v); }
    xt = xt.concat(ex).sort(function (a, b) { return (a.length ? a[0] : a) - (b.length ? b[0] : b); });
    return { w: 440, h: 290, alt: '滴定曲線', grid: true, x: { min: 0, max: vmax, ticks: xt, label: xlab }, y: { min: 0, max: 14, ticks: [0, 2, 4, 6, 8, 10, 12, 14].map(function (y) { return [y, String(y)]; }), label: 'pH' },
      series: [{ pts: pts.map(function (p) { return [p[0], Math.max(0, Math.min(14, p[1]))]; }) }], marks: marks || [], lines: lines || [], originLabel: '' };
  }
  /* 中和点（mL）: カノウタイカノウタイ（価数 × 濃度 × 体積）を体積について解いたもの */
  function veqOf(a, ca, Va, t, cb) { return ca * Va * SP[a].z / (cb * SP[t].z); }
  function combo(a, t, cand) {
    for (var tries = 0; tries < 60; tries++) {
      var ca = pick(cand.ca), Va = pick(cand.Va), cb = pick(cand.cb), ve = veqOf(a, ca, Va, t, cb);
      if (ve >= cand.min && ve <= cand.max && Math.abs(ve * 2 - Math.round(ve * 2)) < 1e-9) return { ca: ca, Va: Va, cb: cb, ve: ve };
    }
    return { ca: 0.10, Va: 10, cb: 0.10, ve: 10 * SP[a].z / SP[t].z };
  }
  function shienoStep(who, mol, L, c, find) {
    if (find === 'top') return { h: 'shieno_mol', who: who, v: { bl: f(L, 3), br: f(c) }, find: 'top', eq: 'mol = ' + f(L, 3) + ' × ' + f(c) + ' = ' + f(mol) + ' mol' };
    if (find === 'bl') return { h: 'shieno_mol', who: who, v: { top: f(mol), br: f(c) }, find: 'bl', eq: 'L = {{' + f(mol) + '|' + f(c) + '}} = ' + f(L, 3) + ' L' };
    return { h: 'shieno_mol', who: who, v: { top: f(mol), bl: f(L, 3) }, find: 'br', eq: 'mol/L = {{' + f(mol) + '|' + f(L, 3) + '}} = ' + f(c) + ' mol/L' };
  }
  /* 中和点の体積をカノウタイカノウタイで出す（酸を左辺、塩基を右辺に置く） */
  function eqSteps(a, ca, Va, t, cb, ve) {
    var ac = SP[a].acid ? a : t, ba = SP[a].acid ? t : a;
    var side = function (k, c, v) { return SP[k].z + ' × ' + c + ' × ' + v; };
    var L = SP[a].acid ? side(a, f(ca) + ' mol/L', Va + ' mL') : side(t, f(cb) + ' mol/L', 'V mL');
    var R = SP[a].acid ? side(t, f(cb) + ' mol/L', 'V mL') : side(a, f(ca) + ' mol/L', Va + ' mL');
    return [{ c: SP[ac].f + ' は ' + SP[ac].z + ' 価、' + SP[ba].f + ' は ' + SP[ba].z + ' 価', t: '1. 価数を確かめる' },
      { c: '濃度と体積しかわからない → カノウタイカノウタイ\n酸の（価数 × 濃度 × 体積）＝ 塩基の（価数 × 濃度 × 体積）', t: '2. 式を選ぶ' },
      { c: L + ' ＝ ' + R, t: '3. 代入する（体積は両辺 mL のまま）' },
      { c: 'V = {{' + SP[a].z + ' × ' + f(ca) + ' × ' + Va + '|' + SP[t].z + ' × ' + f(cb) + '}} = ' + f(ve, 3) + ' mL', t: '4. 中和点の体積' }];
  }
  var REV = { HCl: ['NaOH', 'HCl'], AcOH: ['NH3', 'HCl'], NH3: ['AcOH', 'NaOH'], NaOH: ['HCl', 'NaOH'], H2SO4: ['NaOH', 'HCl'] };
  var SWAP = { HCl: 'AcOH', AcOH: 'HCl', H2SO4: 'AcOH', NH3: 'NaOH', NaOH: 'NH3' };
  function startNote(a) { return SP[a].acid ? (SP[a].strong ? '強酸なので始点は pH 1〜2 付近' : '弱酸なので始点は pH 3 付近（強酸より高い）') : (SP[a].strong ? '強塩基なので始点は pH 12〜13 付近' : '弱塩基なので始点は pH 11 付近（強塩基より低い）'); }
  function eqNote(a, t) {
    var wa = !SP[a].strong || !SP[t].strong;
    if (!wa) return '強酸と強塩基なので中和点の pH は 7 付近で、跳び（垂直部分）が大きい';
    var weakAcid = (SP[a].acid && !SP[a].strong) || (SP[t].acid && !SP[t].strong);
    return weakAcid ? '弱酸と強塩基の塩は塩基性なので、中和点の pH は 7 より大きい（8〜9）' : '強酸と弱塩基の塩は酸性なので、中和点の pH は 7 より小さい（5 付近）';
  }

  var fams = [
    /* 1. 滴定曲線を選ぶ（3点チェック） */
    { id: 'tc01', u: 'acidbase', t: 'C', lv: 2, p: ['P29', 'P13'], name: '滴定曲線を選ぶ',
      gen: function () {
        var sys = pick([['HCl', 'NaOH'], ['AcOH', 'NaOH'], ['NH3', 'HCl'], ['NaOH', 'HCl'], ['H2SO4', 'NaOH']]), a = sys[0], t = sys[1];
        var cb0 = combo(a, t, { ca: [0.050, 0.10, 0.20], Va: [10, 20], cb: [0.10, 0.20], min: 5, max: 20 });
        var ca = cb0.ca, Va = cb0.Va, cb = cb0.cb, ve = cb0.ve, vmax = ve <= 10 ? 20 : 30;
        var ok = curve([{ k: a, c: ca }], Va, { k: t, c: cb }, vmax, [ve]);
        var ve2 = a === 'H2SO4' ? ve / 2 : (ve * 2 <= vmax * 0.85 ? ve * 2 : ve / 2);
        var wrongV = curve([{ k: a, c: ca * ve2 / ve }], Va, { k: t, c: cb }, vmax, [ve2]);
        var sw = SWAP[a], swc = ca * SP[a].z / SP[sw].z;
        var wrongS = curve([{ k: sw, c: swc }], Va, { k: t, c: cb }, vmax, [ve]);
        var rv = REV[a], wrongR = curve([{ k: rv[0], c: cb * ve / Va }], Va, { k: rv[1], c: cb }, vmax, [ve]);
        var set = shuffle([{ p: ok, ok: true }, { p: wrongV }, { p: wrongS }, { p: wrongR }]);
        var ans = 0; set.forEach(function (s, i) { if (s.ok) ans = i; });
        var q = pick([f(ca) + ' mol/L の' + SP[a].n + ' ' + Va + ' mL に、' + f(cb) + ' mol/L の' + SP[t].n + 'を少しずつ加えた。このときの滴定曲線として最も適当なものはどれか。',
          SP[a].n + '（' + SP[a].f + ' ' + f(ca) + ' mol/L）' + Va + ' mL をコニカルビーカーにとり、ビュレットから ' + f(cb) + ' mol/L の ' + SP[t].f + ' 水溶液を滴下した。滴下量と pH の関係を表すグラフはどれか。']);
        return { q: q, gax: gaxFor(t, vmax), gc: set.map(function (s) { return norm(s.p, vmax); }), c: ['グラフ①', 'グラフ②', 'グラフ③', 'グラフ④'], a: ans,
          hs: eqSteps(a, ca, Va, t, cb, ve),
          e: '① 始点: ' + startNote(a) + '。\n② 中和点の位置: カノウタイカノウタイ（価数 × 濃度 × 体積）で ' + f(ve, 3) + ' mL。' + (a === 'H2SO4' ? '硫酸は2価なので、価数を忘れると半分の位置になる。' : '') + '\n③ 中和点の pH: ' + eqNote(a, t) + '。\n' + (SP[a].acid ? '酸に塩基を加えるので、pH は右上がり。' : '塩基に酸を加えるので、pH は右下がり。'),
          k: 'グラフの3点チェック: 始点の pH（強いか弱いか）→ 中和点の位置（カノウタイカノウタイ）→ 中和点の pH（塩の液性）。' };
      } },
    /* 2. 曲線から中和点を読み、濃度を求める */
    { id: 'tc02', u: 'acidbase', t: 'B', lv: 2, p: ['P13', 'P29'], name: '滴定曲線から濃度',
      gen: function () {
        var sys = pick([['HCl', 'NaOH'], ['AcOH', 'NaOH'], ['H2SO4', 'NaOH'], ['NH3', 'HCl']]), a = sys[0], t = sys[1];
        var cb = pick([0.10, 0.20]), Va = pick([10, 20]), ve = pick([8, 12, 15, 16, 18]);
        var ca = cb * ve * SP[t].z / (Va * SP[a].z), vmax = ve < 13 ? 20 : 25;
        var pts = curve([{ k: a, c: ca }], Va, { k: t, c: cb }, vmax, [ve]);
        var pe = pHof([{ k: a, c: ca * Va / (Va + ve) }, { k: t, c: cb * ve / (Va + ve) }]);
        var fg = figFor(pts, vmax, SP[t].f + ' 水溶液の滴下量〔mL〕', [[ve, String(ve)]], [{ x: ve, y: pe, t: '中和点', dx: 8, dy: 4 }], [{ dash: true, pts: [[ve, 0], [ve, pe]] }]);
        var ch = mk(ca, [ca * SP[a].z, cb * Va / ve, ca * 2, ca / 2, ca * 10], 2, ' mol/L');
        var na = cb * ve / 1000 * SP[t].z / SP[a].z;
        return { q: pick(['濃度が分からない' + SP[a].n + ' ' + Va + ' mL を ' + f(cb) + ' mol/L の' + SP[t].n + 'で滴定したところ、図の滴定曲線が得られた。' + SP[a].f + ' のモル濃度は何 mol/L か。',
          '図は、' + SP[a].n + ' ' + Va + ' mL に ' + f(cb) + ' mol/L の' + SP[t].n + 'を滴下したときの滴定曲線である。もとの' + SP[a].n + 'の濃度は何 mol/L か。']),
          fig: fg, c: ch.c, a: ch.a,
          hs: [{ c: '中和点（pH が急に変わるまん中）は ' + ve + ' mL', t: '1. グラフを読む' },
            { c: SP[a].f + ' は ' + SP[a].z + ' 価、' + SP[t].f + ' は ' + SP[t].z + ' 価\n濃度と体積しかわからない → カノウタイカノウタイ', t: '2. 価数を確かめて式を選ぶ' },
            { c: (SP[a].acid ? SP[a].z + ' × c × ' + Va + ' mL ＝ ' + SP[t].z + ' × ' + f(cb) + ' mol/L × ' + ve + ' mL' : SP[t].z + ' × ' + f(cb) + ' mol/L × ' + ve + ' mL ＝ ' + SP[a].z + ' × c × ' + Va + ' mL'), t: '3. 代入する（体積は両辺 mL のまま）' },
            { c: 'c = {{' + SP[t].z + ' × ' + f(cb) + ' × ' + ve + '|' + SP[a].z + ' × ' + Va + '}} = ' + f(ca) + ' mol/L', t: '4. c について解く' }],
          e: '中和点は pH が垂直に跳ぶ部分のまん中。読んだ体積で、カノウタイカノウタイ（酸の 価数 × 濃度 × 体積 ＝ 塩基の 価数 × 濃度 × 体積）を立てる。' + (SP[a].z === 2 ? '硫酸は 2 価。' : '') + (SP[a].strong ? '' : '弱酸・弱塩基でも、価数は同じなので中和に必要な量は強いものと同じ。'),
          k: '滴定曲線の計算は「中和点の体積を読む → カノウタイカノウタイ」だけ。' };
      } },
    /* 3. 指示薬の選び方 */
    { id: 'tc03', u: 'acidbase', t: 'B', lv: 1, p: ['P29', 'P13'], name: '指示薬の選択',
      gen: function () {
        var sys = pick([['HCl', 'NaOH'], ['AcOH', 'NaOH'], ['NH3', 'HCl'], ['NaOH', 'HCl'], ['H2SO4', 'NaOH']]), a = sys[0], t = sys[1];
        var cb0 = combo(a, t, { ca: [0.10], Va: [10, 20], cb: [0.10, 0.20], min: 5, max: 20 }), ve = cb0.ve, vmax = ve <= 10 ? 20 : 30;
        var pts = curve([{ k: a, c: cb0.ca }], cb0.Va, { k: t, c: cb0.cb }, vmax, [ve]);
        var fg = figFor(pts, vmax, SP[t].f + ' 水溶液の滴下量〔mL〕', [], [], [{ dash: true, pts: [[0, 3.1], [vmax, 3.1]] }, { dash: true, pts: [[0, 4.4], [vmax, 4.4]] }, { dash: true, pts: [[0, 8.0], [vmax, 8.0]] }, { dash: true, pts: [[0, 9.8], [vmax, 9.8]] }]);
        var weakA = a === 'AcOH', weakB = a === 'NH3';
        var opts = ['フェノールフタレインだけが使える', 'メチルオレンジだけが使える', 'どちらも使える', 'どちらも使えない'];
        var ans = weakA ? 0 : weakB ? 1 : 2;
        return { q: pick([f(cb0.ca) + ' mol/L の' + SP[a].n + ' ' + cb0.Va + ' mL を ' + f(cb0.cb) + ' mol/L の' + SP[t].n + 'で滴定すると、図の曲線が得られた。中和点を知るための指示薬について正しいものはどれか。',
          '図は' + SP[a].n + 'を' + SP[t].n + 'で滴定したときの滴定曲線である。この滴定に使える指示薬として正しいものはどれか。']) + '\n（変色域　メチルオレンジ: pH 3.1〜4.4、フェノールフタレイン: pH 8.0〜9.8。図の破線は変色域の境目）',
          fig: fg, c: opts, a: ans,
          e: '指示薬の変色域が、曲線の「垂直に跳ぶ部分」に入っていれば使える。' + (weakA ? '弱酸＋強塩基は跳びが pH 7〜11 付近にあり、メチルオレンジの範囲（3.1〜4.4）は外れる。' : weakB ? '強酸＋弱塩基は跳びが pH 3〜7 付近にあり、フェノールフタレインの範囲（8.0〜9.8）は外れる。' : '強酸＋強塩基は跳びが pH 3〜11 と大きく、両方の変色域を含む。'),
          k: '弱酸を使う滴定 → フェノールフタレイン、弱塩基を使う滴定 → メチルオレンジ、強酸＋強塩基 → どちらでも。' };
      } },
    /* 4. 半中和点の pH から電離定数 */
    { id: 'tc04', u: 'equilibrium', t: 'C', lv: 3, p: ['P15', 'P29'], name: '半中和点と電離定数',
      gen: function () {
        var K = pick([[4.7, 2.0e-5], [4.4, 4.0e-5], [3.7, 2.0e-4], [5.0, 1.0e-5], [4.0, 1.0e-4]]);
        var cb = 0.10, Va = pick([10, 20]), ve = pick([10, 12, 16, 20]), ca = cb * ve / Va, vmax = ve <= 12 ? 20 : 30;
        var pts = curve([{ k: 'AcOH', c: ca, Ka: K[1] }], Va, { k: 'NaOH', c: cb }, vmax, [ve]);
        var half = ve / 2;
        var fg = figFor(pts, vmax, 'NaOH 水溶液の滴下量〔mL〕', [[half, String(half)], [ve, String(ve)]], [{ x: half, y: K[0], t: 'pH ' + K[0].toFixed(1), dx: 8, dy: -8 }], [{ dash: true, pts: [[half, 0], [half, K[0]], [0, K[0]]] }]);
        var ch = mk(K[1], [K[1] * 10, K[1] / 10, Math.pow(10, -(14 - K[0])), K[1] * 2], 2, ' mol/L');
        return { q: pick(['ある弱酸 HA の水溶液 ' + Va + ' mL を 0.10 mol/L の NaOH 水溶液で滴定したところ、図の曲線が得られた。図から、HA の電離定数 K_a を求めよ。（log_{10}2 = 0.30）',
          '図は弱酸 HA の水溶液を NaOH 水溶液で滴定したときの曲線で、中和点の半分の量を加えたときの pH が示してある。HA の電離定数 K_a はいくらか。（log_{10}2 = 0.30）']),
          fig: fg, c: ch.c, a: ch.a,
          hs: [{ c: '中和点 ' + ve + ' mL の半分（' + half + ' mL）では、HA の半分が A^{-} になっている → [HA] = [A^{-}]', t: '半中和点' },
            { c: 'K_a = {{[H^{+}][A^{-}]|[HA]}} = [H^{+}]', t: '電離定数の式' },
            { c: '[H^{+}] = 10^{−' + K[0].toFixed(1) + '} = ' + f(K[1]) + ' mol/L', t: 'pH から' }],
          e: '半中和点では [HA] = [A^{-}] なので、K_a = [H^{+}]。pH ' + K[0].toFixed(1) + ' → [H^{+}] = ' + f(K[1]) + ' mol/L。',
          k: '弱酸の滴定曲線で「中和点の半分」の pH は pK_a（K_a = [H^{+}]）。緩衝液のまん中。' };
      } },
    /* 5. 炭酸ナトリウムの2段階滴定（グラフ選択） */
    { id: 'tc05', u: 'acidbase', t: 'C', lv: 3, p: ['P29', 'P13'], name: '炭酸ナトリウムの2段階中和',
      gen: function () {
        var ca = pick([0.050, 0.10]), Va = pick([10, 20]), cb = 0.10, v1 = ca * Va / cb, vmax = v1 * 2 <= 20 ? (v1 * 2 <= 15 ? 20 : 25) : 45;
        vmax = Math.max(vmax, Math.ceil(v1 * 2.5 / 5) * 5);
        var ok = curve([{ k: 'Na2CO3', c: ca }], Va, { k: 'HCl', c: cb }, vmax, [v1, 2 * v1]);
        var one = curve([{ k: 'NaOH', c: ca * 2 }], Va, { k: 'HCl', c: cb }, vmax, [2 * v1]);
        var mix = curve([{ k: 'NaOH', c: ca }, { k: 'Na2CO3', c: ca / 2 }], Va, { k: 'HCl', c: cb }, vmax, [1.5 * v1, 2 * v1]);
        var half = curve([{ k: 'Na2CO3', c: ca / 2 }], Va, { k: 'HCl', c: cb }, vmax, [v1 / 2, v1]);
        var set = shuffle([{ p: ok, ok: true }, { p: one }, { p: mix }, { p: half }]), ans = 0;
        set.forEach(function (s, i) { if (s.ok) ans = i; });
        var xt = []; for (var v = 0; v <= vmax + 1e-9; v += (vmax > 30 ? 15 : 10)) xt.push([v / vmax * 10, String(v)]);
        return { q: pick([f(ca) + ' mol/L の炭酸ナトリウム水溶液 ' + Va + ' mL に、' + f(cb) + ' mol/L の塩酸を滴下した。滴定曲線として最も適当なものはどれか。',
          '炭酸ナトリウム Na_2CO_3（' + f(ca) + ' mol/L）' + Va + ' mL を ' + f(cb) + ' mol/L の HCl で滴定した。このときの pH 変化を表すグラフはどれか。']),
          gax: { x: 'HCl 水溶液〔mL〕', y: 'pH', xt: xt, yt: [[5, '7'], [10, '14']] }, gc: set.map(function (s) { return norm(s.p, vmax); }), c: ['グラフ①', 'グラフ②', 'グラフ③', 'グラフ④'], a: ans,
          hs: [shienoStep('Na_2CO_3', ca * Va / 1000, Va / 1000, ca, 'top'), { c: '第1段階 CO_3^{2-} + H^{+} -> HCO_3^{-}\n第2段階 HCO_3^{-} + H^{+} -> H_2O + CO_2', t: '2段階で中和' },
            { r: 'Na_2CO_3 : HCl = 1 : 1（各段階）', ans: 'どちらの段階も HCl ' + f(ca * Va / 1000) + ' mol' }, shienoStep('HCl', ca * Va / 1000, v1 / 1000, cb, 'bl'), { c: '第1中和点 ' + f(v1, 3) + ' mL、第2中和点 ' + f(2 * v1, 3) + ' mL（等間隔）', t: '答え' }],
          e: 'Na_2CO_3 は2段階で中和され、跳びが2つある。各段階で使う HCl は同じ量なので、第2中和点は第1中和点の2倍の位置。第1中和点は pH 8 付近（フェノールフタレイン）、第2中和点は pH 4 付近（メチルオレンジ）。',
          k: '2価の塩基・酸は段階ごとに中和点が出る。Na_2CO_3 は「同じ幅の2段」。' };
      } },
    /* 6. 炭酸ナトリウムの滴定曲線から濃度 */
    { id: 'tc06', u: 'acidbase', t: 'B', lv: 2, p: ['P13', 'P29'], name: '2段階中和の量計算',
      gen: function () {
        var cb = pick([0.10, 0.20]), Va = pick([10, 20]), v1 = pick([5, 6, 8, 10, 12]), ca = cb * v1 / Va, vmax = Math.ceil(v1 * 2.5 / 5) * 5;
        var pts = curve([{ k: 'Na2CO3', c: ca }], Va, { k: 'HCl', c: cb }, vmax, [v1, 2 * v1]);
        var p1 = pHof([{ k: 'Na2CO3', c: ca * Va / (Va + v1) }, { k: 'HCl', c: cb * v1 / (Va + v1) }]);
        var p2 = pHof([{ k: 'Na2CO3', c: ca * Va / (Va + 2 * v1) }, { k: 'HCl', c: cb * 2 * v1 / (Va + 2 * v1) }]);
        var mode = pick(['c1', 'c2']), V = mode === 'c1' ? v1 : 2 * v1;
        var fg = figFor(pts, vmax, 'HCl 水溶液の滴下量〔mL〕', mode === 'c1' ? [[v1, String(v1)]] : [[2 * v1, String(2 * v1)]],
          mode === 'c1' ? [{ x: v1, y: p1, t: '第1中和点', dx: 8, dy: -6 }] : [{ x: 2 * v1, y: p2, t: '第2中和点', dx: 8, dy: -6 }],
          [{ dash: true, pts: mode === 'c1' ? [[v1, 0], [v1, p1]] : [[2 * v1, 0], [2 * v1, p2]] }]);
        var ch = mk(ca, [ca * 2, ca / 2, cb * V / Va, cb * Va / V], 2, ' mol/L');
        var nH = cb * V / 1000, nC = nH / (mode === 'c1' ? 1 : 2);
        return { q: '炭酸ナトリウム水溶液 ' + Va + ' mL を ' + f(cb) + ' mol/L の塩酸で滴定したところ、図の曲線が得られ、' + (mode === 'c1' ? '第1中和点' : '第2中和点') + 'までに ' + V + ' mL を要した。炭酸ナトリウム水溶液の濃度は何 mol/L か。',
          fig: fg, c: ch.c, a: ch.a,
          hs: [{ c: mode === 'c1' ? 'Na_2CO_3 + HCl -> NaHCO_3 + NaCl\n第1中和点までは、CO_3^{2-} が H^{+} を 1 個だけ受け取る → この段階の Na_2CO_3 の価数は 1' : 'Na_2CO_3 + 2HCl -> 2NaCl + H_2O + CO_2\n第2中和点までに、CO_3^{2-} が H^{+} を 2 個受け取る → Na_2CO_3 の価数は 2', t: '1. どこまでの中和か → 価数を決める' },
            { c: '濃度と体積しかわからない → カノウタイカノウタイ\n酸の（価数 × 濃度 × 体積）＝ 塩基の（価数 × 濃度 × 体積）', t: '2. 式を選ぶ' },
            { c: '1 × ' + f(cb) + ' mol/L × ' + V + ' mL ＝ ' + (mode === 'c1' ? 1 : 2) + ' × c × ' + Va + ' mL', t: '3. 代入する（体積は両辺 mL のまま）' },
            { c: 'c = {{1 × ' + f(cb) + ' × ' + V + '|' + (mode === 'c1' ? 1 : 2) + ' × ' + Va + '}} = ' + f(ca) + ' mol/L', t: '4. c について解く' }],
          e: (mode === 'c1' ? '第1中和点までは CO_3^{2-} + H^{+} -> HCO_3^{-} なので、この段階の Na_2CO_3 の価数は 1。' : '第2中和点までに CO_3^{2-} は H^{+} を 2 個受け取るので、Na_2CO_3 の価数は 2。') + 'カノウタイカノウタイ（酸の 価数 × 濃度 × 体積 ＝ 塩基の 価数 × 濃度 × 体積）で濃度を出す。',
          k: 'どこまでの量かで価数が変わる。第1中和点まで 1 : 1、第2中和点まで 1 : 2。' };
      } }
  ];
  C.titration = { curve: curve, pH: pHof };
  C.families = (C.families || []).concat(fams);
  fams.forEach(function (fm) {
    var q = { id: fm.id, u: fm.u, t: fm.t, lv: fm.lv, p: fm.p, fam: fm };
    Object.assign(q, fm.gen());
    C.questions.push(q);
  });
})();
