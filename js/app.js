/* 化学共テラボ  本体 */
(function () {
  'use strict';
  var C = window.CHEM;

  /* ---------- 基本ユーティリティ ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* 化学式の表記: H_2O / SO_4^{2-} / -> / <=> */
  function fx(s) {
    var h = esc(s);
    h = h.replace(/&lt;=&gt;/g, '⇄').replace(/-&gt;/g, '→');
    h = h.replace(/\^\{([^}]+)\}/g, function (m, a) { return '<sup>' + a.replace(/-/g, '−') + '</sup>'; });
    h = h.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    h = h.replace(/_([0-9]+|[A-Za-z]|[぀-ヿ一-鿿]+)/g, '<sub>$1</sub>');
    /* 分数 {{分子|分母}} は上下に分けて表示する */
    h = h.replace(/\{\{([\s\S]+?)\|([\s\S]+?)\}\}/g, '<span class="frac" role="math" aria-label="$2分の$1"><span class="fn">$1</span><span class="fd">$2</span></span>');
    /* 1つの要素に包む: flex や grid の中に置いても、下付き文字の前後で改行されない */
    return '<span class="fx">' + h.replace(/\n/g, '<br>') + '</span>';
  }
  /* 解説・要点の改行: 計算（= ≒ → など）を含む文は 1 行ずつに分ける。すでにある改行はそのまま */
  function brx(s) {
    return String(s == null ? '' : s).split('\n').map(function (para) {
      var sents = para.match(/[^。]+。?/g); if (!sents || sents.length < 2) return para;
      var out = [], buf = '';
      sents.forEach(function (t) {
        var calc = /[=＝≒]|->|<=>|\{\{/.test(t);
        if (calc) { if (buf) { out.push(buf); buf = ''; } out.push(t); }
        else buf += t;
      });
      if (buf) out.push(buf);
      return out.join('\n');
    }).join('\n');
  }
  function fxb(s) { return fx(brx(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseD(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function today() { return ymd(new Date()); }
  function addDays(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); }
  function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 86400000); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pct(x) { return Math.round(x * 100); }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
  var NUM = ['1', '2', '3', '4', '5', '6', '7', '8'];
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

  /* ---------- 索引 ---------- */
  var QBY = {}, UBY = {}, PBY = {}, FBY = {}, GBY = {};
  C.questions.forEach(function (q) { QBY[q.id] = q; });
  C.units.forEach(function (u) { UBY[u.id] = u; });
  C.patterns.forEach(function (p) { PBY[p.id] = p; });
  C.fields.forEach(function (f) { FBY[f.id] = f; });
  C.generators.forEach(function (g) { GBY[g.id] = g; });
  function fieldOf(q) { return UBY[q.u].f; }

  /* ---------- 本番の正答率と難易度 ---------- */
  var RROWS = [];
  (C.itemRates || []).forEach(function (e) {
    e.rows.forEach(function (r) { RROWS.push({ ex: e, dai: r[0], q: r[1], no: r[2], pt: r[3], sei: r[4], tok: r[5], u: r[6], t: r[7], topic: r[8], b: C.bandOf(r[4]) }); });
  });
  var RATEBY = {}; (C.itemRates || []).forEach(function (e) { RATEBY[e.id] = e; });
  /* 追試験は全国の正答率がないので、分析（RROWS）には入れず、採点・診断だけに使う */
  var TROWS = [];
  (C.itemTsui || []).forEach(function (e) { e.rows.forEach(function (r) { TROWS.push({ ex: e, dai: r[0], q: r[1], no: r[2], pt: r[3], sei: null, tok: null, u: r[6], t: r[7], topic: r[8], b: null }); }); });
  var DIAGEX = (C.itemRates || []).concat(C.itemTsui || []).sort(function (a, b) { return a.year - b.year || (a.id < b.id ? -1 : 1); });
  var DIAGBY = {}; DIAGEX.forEach(function (e) { DIAGBY[e.id] = e; });
  function hasRate(e) { return e.rows[0][4] != null; }
  function rowsOf(e) { return (hasRate(e) ? RROWS : TROWS).filter(function (r) { return r.ex === e; }); }
  function wavg(list) { var s = 0, w = 0; list.forEach(function (r) { s += r.sei * r.pt; w += r.pt; }); return w ? s / w : null; }
  var R_ALL = wavg(RROWS) || 50, R_T = {}, R_U = {};
  ['A', 'B', 'C'].forEach(function (t) { R_T[t] = wavg(RROWS.filter(function (r) { return r.t === t; })); });
  C.units.forEach(function (u) { R_U[u.id] = wavg(RROWS.filter(function (r) { return r.u === u.id; })); });
  var BBY = {}; (C.bands || []).forEach(function (b) { BBY[b.id] = b; });
  var LVADJ = { 1: 12, 2: 0, 3: -12 };
  /* このアプリの問題の「本番での推定正答率」: 同じ型・同じ単元の本番小問の平均に、問題ごとの難しさ（lv）を加減 */
  function estRate(q) {
    if (q._est != null) return q._est;
    var e = (R_T[q.t] || R_ALL) + (R_U[q.u] != null ? (R_U[q.u] - R_ALL) * 0.6 : 0) + (LVADJ[q.lv || 2] || 0);
    q._est = Math.round(Math.max(10, Math.min(90, e)));
    return q._est;
  }
  function bandQ(q) { return C.bandOf(estRate(q)); }
  function difTag(b) { return '<span class="dif dif-' + b + '"><i aria-hidden="true"></i>' + BBY[b].name + '</span>'; }
  function rateBar(p) { return '<span class="rbar" aria-hidden="true"><i class="rb-' + C.bandOf(p) + '" style="width:' + Math.max(1, p).toFixed(1) + '%"></i></span>'; }
  function rowLabel(r) { return r.ex.name + ' 第' + r.dai + '問 ' + r.q; }
  function similar(q, n) {
    var e = estRate(q);
    return RROWS.filter(function (r) { return r.u === q.u; }).map(function (r) { return { r: r, d: (r.t === q.t ? 0 : 30) + Math.abs(r.sei - e) }; })
      .sort(function (a, b) { return a.d - b.d; }).slice(0, n || 3).map(function (x) { return x.r; });
  }
  function simHTML(q) {
    var list = similar(q, 3); if (!list.length) return '';
    return '<section class="simsec"><h3>本番の似た小問</h3><p class="note">この問題の難易度は ' + difTag(bandQ(q)) + '（本番での推定正答率 約 ' + estRate(q) + '%）。同じ単元の本番の小問と、全受験生の正答率です。</p><ul class="simlist">' + list.map(function (r) {
      return '<li><span class="sl-ex">' + esc(rowLabel(r)) + '</span><span class="sl-t">' + esc(r.topic) + '</span>' + rateBar(r.sei) + '<b class="num">' + r.sei.toFixed(0) + '%</b></li>';
    }).join('') + '</ul></section>';
  }
  /* 単元 → 関連の一問一答のカード（カード 1 枚ずつに単元をつけた表 js/data/flash_units.js から） */
  var FU = C.flashUnits || {};
  function unitFlash(uid) { return C.flash.filter(function (x) { return (FU[x.c + '|' + x.f] || []).indexOf(uid) >= 0; }); }
  /* いま開いているページ（演習を終えたら、ここに戻る） */
  C.debug = { ses: function () { return SES; }, order: function () { return zkList().map(function (q) { return q.id; }); } }; /* テスト用（演習の中身を見る） */
  function here() { var h = location.hash.slice(1); return h && h !== 'session' ? h : 'home'; }

  /* ---------- 保存 ---------- */
  var KEY = 'chem80_v1';
  function blank() {
    return { v: 1, prefs: { examDate: '2027-01-17', name: '', goal: 80 }, q: {}, fl: {}, log: {}, ds: {}, mocks: [], exams: {}, diag: {}, ans: {}, menu: {}, why: {}, created: today() };
  }
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); var b = blank(); Object.keys(b).forEach(function (k) { if (o[k] == null) o[k] = b[k]; }); return o; } } catch (e) { /* 保存できない環境 */ }
    return blank();
  }
  var S = load();
  /* 一問一答のカテゴリ変更（理論 → 状態・反応）で、移ったカードの記録を引き継ぐ */
  C.flash.forEach(function (x) {
    if (!x.o) return;
    var ok = x.o + '|' + x.f, nk = x.c + '|' + x.f;
    if (S.fl[ok] && !S.fl[nk]) { S.fl[nk] = S.fl[ok]; delete S.fl[ok]; }
  });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* noop */ } }
  function L() { var t = today(); if (!S.log[t]) S.log[t] = { q: 0, qc: 0, qC: 0, fl: 0, dr: 0, drc: 0 }; return S.log[t]; }

  /* ---------- 記録と復習間隔 ---------- */
  var QI = [1, 2, 4, 7, 14, 30];
  var FI = [0, 1, 3, 7, 14, 30];
  function recordQ(id, ok, hint) {
    var r = S.q[id] || (S.q[id] = { n: 0, c: 0, s: 0, due: null, h: [] });
    r.n++; if (ok) r.c++;
    r.h.push(ok ? 1 : 0); if (r.h.length > 6) r.h.shift();
    r.last = today();
    if (ok && !hint) { r.s++; r.due = addDays(today(), QI[Math.min(r.s - 1, QI.length - 1)]); }
    else { r.s = 0; r.due = addDays(today(), 1); }
    var l = L(); l.q++; if (ok) l.qc++; if (QBY[id] && QBY[id].t === 'C') l.qC++;
    save();
  }
  function recordDrill(u, ok) {
    var d = S.ds[u] || (S.ds[u] = { n: 0, c: 0, h: [] });
    d.n++; if (ok) d.c++; d.h.push(ok ? 1 : 0); if (d.h.length > 12) d.h.shift();
    var l = L(); l.dr++; if (ok) l.drc++;
    save();
  }
  function rateFlash(key, how) {
    var r = S.fl[key] || (S.fl[key] = { b: 0, n: 0, due: null });
    r.n++;
    if (how === 'know') { r.b = Math.min(r.b + 1, 5); r.due = addDays(today(), FI[r.b]); }
    else if (how === 'unsure') { r.b = 1; r.due = addDays(today(), 1); }
    else { r.b = 0; r.due = today(); }
    L().fl++;
    save();
  }
  function dueQuestions() {
    var t = today();
    return C.questions.filter(function (q) { var r = S.q[q.id]; return r && r.due && r.due <= t; }).map(function (q) { return q.id; });
  }
  function dueFlash() {
    var t = today();
    return C.flash.filter(function (x) { var r = S.fl[x.c + '|' + x.f]; return r && r.due && r.due <= t; });
  }
  function lastOk(id) { var r = S.q[id]; return r && r.h.length ? r.h[r.h.length - 1] === 1 : null; }

  /* ---------- 集計 ---------- */
  function statsFor(filter) {
    var n = 0, c = 0, total = 0;
    C.questions.forEach(function (q) {
      if (!filter(q)) return;
      total++;
      var r = S.q[q.id];
      if (r && r.h.length) { n++; if (r.h[r.h.length - 1] === 1) c++; }
    });
    return { n: n, c: c, total: total };
  }
  function drillFor(units) {
    var n = 0, c = 0;
    units.forEach(function (u) { var d = S.ds[u]; if (d) { d.h.forEach(function (v) { n++; c += v; }); } });
    return { n: n, c: c };
  }
  var PRIOR = 0.35, K = 3;
  function shrink(c, n, prior, k) { return (c + (prior == null ? PRIOR : prior) * (k || K)) / (n + (k || K)); }
  function predict() {
    var total = 0, attempts = 0, byT = { A: { n: 0, c: 0 }, B: { n: 0, c: 0 }, C: { n: 0, c: 0 } };
    C.fields.forEach(function (f) {
      ['A', 'B', 'C'].forEach(function (t) {
        var st = statsFor(function (q) { return fieldOf(q) === f.id && q.t === t; });
        var n = st.n, c = st.c;
        if (t === 'B') { var d = drillFor(C.units.filter(function (u) { return u.f === f.id; }).map(function (u) { return u.id; })); n += d.n; c += d.c; }
        attempts += n; byT[t].n += n; byT[t].c += c;
        total += C.weights[f.id][t] * shrink(c, n);
      });
    });
    return { score: Math.round(total), attempts: attempts, byT: byT };
  }
  function unitStats(uid) {
    var st = statsFor(function (q) { return q.u === uid; });
    var d = drillFor([uid]);
    return { n: st.n + d.n, c: st.c + d.c, tried: st.n, total: st.total };
  }
  function recommend(k) {
    return C.units.map(function (u) {
      var st = unitStats(u.id);
      var acc = shrink(st.c, st.n, 0.4, 2);
      var cov = st.total ? st.tried / st.total : 1;
      var pr = u.star * (1 - acc) * (1.2 - 0.6 * cov) * (u.f === 'synth' ? 0.8 : 1);
      var reason = st.n === 0 ? 'まだ解いていない頻出単元' : ('最近の正答率 ' + pct(st.c / st.n) + '%（' + st.n + '問）');
      return { u: u, acc: acc, cov: cov, pr: pr, st: st, reason: reason };
    }).sort(function (a, b) { return b.pr - a.pr; }).slice(0, k || 3);
  }
  function streak() {
    var d = today(), n = 0;
    function active(s) { var l = S.log[s]; return l && (l.q + l.fl + l.dr) > 0; }
    if (!active(d)) d = addDays(d, -1);
    while (active(d)) { n++; d = addDays(d, -1); }
    return n;
  }
  function daysLeft() { return daysBetween(today(), S.prefs.examDate || '2027-01-17'); }
  /* 目標得点（50〜90点）。初期値は80点 */
  function goalId() { var g = Number(S.prefs.goal); return C.goalBy[g] ? g : 80; }
  function G(id) { return C.goalBy[id || goalId()]; }
  function tgoal(t, id) { return G(id).abc[t] / C.abcTotal[t]; }
  function phaseOf(base, gid) { var o = G(gid).phases[base.id - 1]; return { id: base.id, name: base.name, from: base.from, color: base.color, goal: o.goal, daily: o.daily, extra: o.extra }; }
  function phaseNow() {
    var dl = daysLeft();
    for (var i = 0; i < C.phases.length; i++) { if (dl >= C.phases[i].from) return phaseOf(C.phases[i]); }
    return phaseOf(C.phases[C.phases.length - 1]);
  }

  /* ---------- 小さな部品 ---------- */
  function tb(t, long) { return '<span class="tb tb-' + t + '"><b>' + t + '</b>' + esc(long ? C.types[t].long : C.types[t].name) + '</span>'; }
  function stars(n) { return '<span class="stars" aria-label="頻出度' + n + '">' + '★★★'.slice(0, n) + '<i>' + '★★★'.slice(0, 3 - n) + '</i></span>'; }
  function meter(v, cls, goal) {
    var w = Math.max(0, Math.min(100, v * 100));
    return '<span class="meter ' + (cls || '') + '"><span style="width:' + w.toFixed(1) + '%"></span>' + (goal != null ? '<i style="left:' + (goal * 100) + '%"></i>' : '') + '</span>';
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); setTimeout(function () { t.hidden = true; }, 250); }, 2200);
  }
  function patternMini(pid, open) {
    var p = PBY[pid]; if (!p) return '';
    return '<details class="pmini"' + (open ? ' open' : '') + '><summary><span class="pid">' + p.id + '</span><span class="pname">' + fx(p.name) + '</span></summary>' +
      '<p class="cue"><b>合図</b>' + fx(p.cue) + '</p><ol>' + p.steps.map(function (s) { return '<li>' + fxb(s) + '</li>'; }).join('') + '</ol>' +
      '<a class="lnk" href="#pattern-' + p.id + '">この型のページへ</a></details>';
  }
  function tableHTML(t) {
    return '<div class="tblwrap"><table class="dtbl"><thead><tr>' + t.head.map(function (h) { return '<th>' + fx(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      t.rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i === 0 ? '<th>' + fx(c) + '</th>' : '<td>' + fx(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  /* はじき図 */
  var HBY = {}; (C.hajiki || []).forEach(function (h) { HBY[h.id] = h; });
  var UNIT_ILL = { atom: ['atom_struct', 'trend'], bond: ['bond_types', 'mol_shapes'], structure: ['lattice', 'hcp'], electro: ['daniell', 'electrolysis'], inorx: ['collect', 'wash'], orgbasic: ['elem'], aromatic: ['sepfunnel'], acidbase: ['burette'] };
  var UNIT_HJ = { mol: ['komoru', 'guten', 'elmo'], solution: ['shieno_g', 'shieno_mol', 'shibano'], acidbase: ['shieno_mol'], kinetics: ['hajino'], electro: ['kyas', 'fight'], redox: ['shieno_mol'] };
  var PAT_HJ = { P01: ['komoru', 'guten', 'elmo'], P03: ['shieno_g', 'shieno_mol', 'shibano'], P10: ['kyas', 'fight'], P12: ['shieno_mol'], P13: ['shieno_mol'], P17: ['hajino'] };
  /* はじき公式は、計算の4つの型（モル・濃度・速度・電気）のページに置く */
  var HJPAT = { komoru: 'P01', guten: 'P01', elmo: 'P01', shieno_g: 'P03', shieno_mol: 'P03', shibano: 'P03', mitsudo: 'P03', hajino: 'P17', kyas: 'P10', fight: 'P10' };
  var PAT_GROUP = { P01: 'mol', P03: 'conc', P17: 'rate', P10: 'elec' };
  function hjList(list) {
    return (list || []).map(function (x) { return typeof x === 'string' ? { id: x, hide: null } : x; }).filter(function (x) { return HBY[x.id]; });
  }
  function hajikiRow(list, title) {
    list = hjList(list); if (!list.length) return '';
    return '<section class="hjsec"><h3>' + (title || 'はじき公式で見る') + '</h3><div class="hjrow">' + list.map(function (x) {
      var hh = HBY[x.id];
      return '<a class="hjmini" href="#pattern-' + (HJPAT[x.id] || 'P01') + '">' + C.draw.hajiki(hh, x.hide, false) + '<b>' + esc(hh.name) + '</b><span>' + fx(C.draw.hajikiFormula(hh, x.hide)) + '</span></a>';
    }).join('') + '</div></section>';
  }
  /* はじきで解く（数値入りの円 → 比 → 円） */
  /* 手順カードの見出し: 番号はカード左上に出すので、見出しの先頭の「1. 」は取る */
  function hsT(t) { return fx(String(t || '').replace(/^\s*\d+\.\s*/, '')); }
  function hsHTML(hs, title) {
    if (!hs || !hs.length) return '';
    var n = 0;
    return '<section class="hssec"><h3>' + fx(title || (hs.some(function (s) { return s.h; }) ? 'はじきで解く' : '解き方')) + '</h3><ol class="hs">' + hs.map(function (s) {
      n++;
      if (s.h && HBY[s.h]) {
        var hh = HBY[s.h];
        return '<li class="hs-h"><span class="hsn num">' + n + '</span>' + C.draw.hajikiVal(hh, s.v, s.find) + '<div class="hsx"><b>' + esc(hh.name) + (s.who ? '<small>' + fx(s.who) + '</small>' : '') + '</b><p>' + fx(s.eq || '') + '</p></div></li>';
      }
      if (s.rx) return rxHTML(s, n);
      if (s.set) return '<li class="hs-x hs-set"><span class="hsn num">' + n + '</span><div class="hsx"><b>' + hsT(s.t || (s.set === 'pair' ? 'しえのセット（希釈：濃い液と薄い液の溶質は等しい）' : 'しえのセット（濃度変換）')) + '</b>' + C.draw.hajikiSet(s) + '<p>' + fx(s.eq || '') + '</p></div></li>';
      if (s.sk) return '<li class="hs-x hs-set"><span class="hsn num">' + n + '</span><div class="hsx"><b>' + hsT(s.t || '相関図で解く') + '</b>' + C.draw.soukan(s.sk) + '<p>' + fx(s.eq || '') + '</p></div></li>';
      if (s.fig) return '<li class="hs-x hs-set"><span class="hsn num">' + n + '</span><div class="hsx"><b>' + hsT(s.t || 'グラフで見る') + '</b><figure class="figw">' + C.draw.fig(s.fig) + '</figure><p>' + fx(s.c || '') + '</p></div></li>';
      if (s.ill) return '<li class="hs-x hs-set"><span class="hsn num">' + n + '</span><div class="hsx"><b>' + hsT(s.t || '図で見る') + '</b>' + C.draw.ill(s.ill) + '<p>' + fx(s.c || '') + '</p></div></li>';
      if (s.r) return '<li class="hs-r"><span class="hsn num">' + n + '</span><div class="hsx"><b>比でつなぐ</b><p class="hsr">' + fx(s.r) + '</p><p>' + fx(s.ans || '') + '</p></div></li>';
      return '<li class="hs-c"><span class="hsn num">' + n + '</span><div class="hsx"><b>' + hsT(s.t || (/[0-9]/.test(s.c) && /[×÷=＝]/.test(s.c) ? '計算' : '考え方')) + '</b><p>' + fx(s.c) + '</p></div></li>';
    }).join('') + '</ol></section>';
  }
  /* 反応式の下に並べる表（先生のテンプレ）
     k: 'mol' 過不足なし → 反応式・係数比・mol の3行
        'ex'  過不足あり → 反応式・係数比・反応前・変化量・反応後 の5行
        'eq'  化学平衡   → 反応式・係数比・反応前・変化量・平衡時 の5行
     rx: 反応式（係数は整数）。mol: base [i, mol] か n [各 mol]。ex/eq: s [反応前]、x [反応した量（係数1あたり）]
     数値のかわりに文字列（'x' など）も置ける。ask: 求める物質の番号 */
  var RX_LAB = { mol: ['反応式', '係数比', 'mol'], ex: ['反応式', '係数比', '反応前', '変化量', '反応後'], eq: ['反応式', '係数比', '反応前', '変化量', '平衡時'] };
  var RX_T = { mol: '反応式の下に3行（過不足なし）', ex: '反応式の下に5行（過不足あり）', eq: '反応式の下に5行（化学平衡）' };
  function rxParse(eq) {
    var m = eq.split(/\s*(->|<=>)\s*/);
    var L = m[0].split(' + '), R = m[2].split(' + ');
    var sp = L.concat(R).map(function (t) {
      t = t.trim(); var mm = t.match(/^(\d+)(?=[A-Z(\[])(.*)$/);
      return { k: mm ? Number(mm[1]) : 1, raw: t };
    });
    return { sp: sp, nl: L.length, rev: m[1] === '<=>' };
  }
  function rxHTML(s, n) {
    var P = rxParse(s.rx), sp = P.sp, nl = P.nl, kind = s.k || 'mol', sig = s.sig || 2, u = s.u == null ? ' mol' : s.u;
    /* 物質が5つ以上（または compact）なら、単位は各マスでなく行の見出しにまとめて幅を詰める */
    var lu = '';
    if (s.compact || sp.length >= 5) { lu = u.trim() ? '〔' + u.trim() + '〕' : ''; u = ''; }
    function clean(x) { return Math.abs(x) < 1e-9 ? 0 : Math.round(x * 1e9) / 1e9; }
    function v(x) { return typeof x === 'number' ? C.fmt(clean(x), sig) : String(x); }
    function cell(x, zeroBare) { if (x === null || x === '') return ''; var t = v(x); return t === '0' && zeroBare ? '0' : t + u; }
    var lab = RX_LAB[kind].slice(), rows = [];
    if (lu) lab = lab.map(function (x, i) { return i < 2 || x === 'mol' ? x : x + lu; });
    if (kind === 'mol') {
      if (s.lab) lab[2] = s.lab;
      var vals = s.n || sp.map(function (p) { return s.base[1] / sp[s.base[0]].k * p.k; });
      /* 3行テンプレの mol は係数比どおりに反応する量なので、係数比と同じく赤字 */
      rows.push({ c: 'rx-v rx-d last', v: vals.map(function (x) { return cell(x); }) });
    } else {
      var d = s.d || sp.map(function (p, i) { return (i < nl ? -1 : 1) * p.k * s.x; });
      var e = s.e || s.s.map(function (a, i) { return typeof a === 'number' && typeof d[i] === 'number' ? a + d[i] : ''; });
      rows.push({ c: 'rx-v', v: s.s.map(function (x) { return cell(x, true); }) });
      rows.push({ c: 'rx-d', v: d.map(function (x) { if (x === null || x === '') return ''; if (typeof x !== 'number') return '↓ ' + x; x = clean(x); return '↓ ' + (x < 0 ? '−' : '+') + C.fmt(Math.abs(x), sig); }) });
      rows.push({ c: 'rx-v last', v: e.map(function (x) { return cell(x); }) });
    }
    var ask = s.ask || [];
    function tr(cls, th, cells, ops) {
      var h = '<tr class="' + cls + '"><th scope="row">' + esc(th) + '</th>';
      cells.forEach(function (c, i) {
        if (i > 0) h += '<td class="op">' + (ops ? (i === nl ? (P.rev ? '⇄' : '→') : '+') : (cls === 'rx-k' ? ':' : '')) + '</td>';
        h += '<td' + (/last/.test(cls) && ask.indexOf(i) >= 0 ? ' class="ask"' : '') + '>' + fx(c) + '</td>';
      });
      return h + '</tr>';
    }
    var h = '<li class="hs-x"><span class="hsn num">' + n + '</span><div class="hsx"><b>' + hsT(s.t || RX_T[kind]) + '</b><div class="rxwrap"><table class="rx"><tbody>';
    h += tr('rx-eq', lab[0], sp.map(function (p) { return p.raw; }), true);
    h += tr('rx-k', lab[1], sp.map(function (p) { return String(p.k); }));
    rows.forEach(function (r, i) { h += tr(r.c, lab[2 + i], r.v); });
    h += '</tbody></table></div>' + (s.note ? '<p>' + fx(s.note) + '</p>' : '') + '</div></li>';
    return h;
  }
  /* 解説の下に出す図：数値入りの手順があればそれ、なければ公式の図 */
  function solveAid(q) {
    if (q.hs) {
      var hasRx = q.hs.some(function (s) { return s.rx; }), hasH = q.hs.some(function (s) { return s.h; });
      return hsHTML(q.hs, hasRx ? (hasH ? 'はじき → 反応式の表 → はじきで解く' : '反応式の表で解く') : null);
    }
    return hajikiRow(q.hj || (C.qHajiki && C.qHajiki[q.id]));
  }
  function toZen(n) { return String(n).replace(/[0-9]/g, function (d) { return '０１２３４５６７８９'[d]; }); }

  /* ---------- グラフ（SVG） ---------- */
  function svgActivity() {
    var days = [], max = 1;
    for (var i = 13; i >= 0; i--) {
      var d = addDays(today(), -i), l = S.log[d] || { q: 0, dr: 0, fl: 0 };
      var v = (l.q || 0) + (l.dr || 0);
      days.push({ d: d, v: v, fl: l.fl || 0 }); if (v > max) max = v;
    }
    var W = 560, H = 140, bw = W / 14;
    var top = Math.max(10, Math.ceil(max / 10) * 10);
    var g = '<svg class="chart" viewBox="0 0 ' + (W + 40) + ' ' + (H + 34) + '" role="img" aria-label="直近14日の解答数">';
    [0, 0.5, 1].forEach(function (f) { var y = 8 + H - f * H; g += '<line x1="34" x2="' + (W + 36) + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="28" y="' + (y + 4) + '" class="tick" text-anchor="end">' + Math.round(top * f) + '</text>'; });
    days.forEach(function (o, i) {
      var h = o.v / top * H, x = 36 + i * bw + 4, y = 8 + H - h;
      var isT = i === 13;
      if (o.v > 0) g += '<path d="M' + x + ',' + (8 + H) + ' V' + (y + 4) + ' q0,-4 4,-4 h' + (bw - 16) + ' q4,0 4,4 V' + (8 + H) + ' Z" class="bar' + (isT ? ' now' : '') + '"><title>' + o.d.slice(5).replace('-', '/') + '  問題 ' + o.v + '・一問一答 ' + o.fl + '</title></path>';
      g += '<rect x="' + (36 + i * bw) + '" y="8" width="' + bw + '" height="' + H + '" fill="transparent"><title>' + o.d.slice(5).replace('-', '/') + '  問題 ' + o.v + '・一問一答 ' + o.fl + '</title></rect>';
      if (i % 2 === 1 || isT) g += '<text x="' + (36 + i * bw + bw / 2) + '" y="' + (H + 26) + '" class="tick" text-anchor="middle">' + (isT ? '今日' : parseInt(o.d.slice(8), 10)) + '</text>';
    });
    if (days[13].v > 0) g += '<text x="' + (36 + 13 * bw + bw / 2) + '" y="' + (8 + H - days[13].v / top * H - 6) + '" class="val" text-anchor="middle">' + days[13].v + '</text>';
    return g + '</svg>';
  }
  function svgExamLine(points) {
    var W = 560, H = 180, n = points.length;
    var X = function (i) { return 44 + (n === 1 ? W / 2 : i * (W - 20) / (n - 1)); }, Y = function (v) { return 10 + H - v / 100 * H; };
    var g = '<svg class="chart" viewBox="0 0 ' + (W + 60) + ' ' + (H + 40) + '" role="img" aria-label="過去問の得点の推移">';
    [0, 20, 40, 60, 80, 100].filter(function (v) { return v !== goalId(); }).forEach(function (v) { g += '<line x1="40" x2="' + (W + 50) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="grid"/><text x="34" y="' + (Y(v) + 4) + '" class="tick" text-anchor="end">' + v + '</text>'; });
    var gl = goalId();
    g += '<line x1="40" x2="' + (W + 50) + '" y1="' + Y(gl) + '" y2="' + Y(gl) + '" class="goal"/><text x="' + (W + 50) + '" y="' + (Y(gl) - 6) + '" class="goall" text-anchor="end">目標 ' + gl + '</text>';
    if (n > 1) g += '<polyline class="line" fill="none" points="' + points.map(function (p, i) { return X(i) + ',' + Y(p.v); }).join(' ') + '"/>';
    points.forEach(function (p, i) {
      var last = i === n - 1;
      g += '<circle cx="' + X(i) + '" cy="' + Y(p.v) + '" r="' + (last ? 6 : 4.5) + '" class="dot' + (last ? ' last' : '') + '"><title>' + esc(p.label) + '  ' + p.v + '点</title></circle>';
      g += '<circle cx="' + X(i) + '" cy="' + Y(p.v) + '" r="14" fill="transparent"><title>' + esc(p.label) + '  ' + p.v + '点</title></circle>';
      if (last || n <= 6) g += '<text x="' + X(i) + '" y="' + (Y(p.v) - 12) + '" class="val" text-anchor="middle">' + p.v + '</text>';
      g += '<text x="' + X(i) + '" y="' + (H + 30) + '" class="tick" text-anchor="middle">' + esc(p.short) + '</text>';
    });
    return g + '</svg>';
  }
  var HATCH = '<defs><pattern id="hatchC" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#111" stroke-width="1.4"/></pattern></defs>';
  function svgStacked() {
    var rowH = 34, W = 420, x0 = 92;
    var H = C.exams.length * rowH + 30;
    var g = '<svg class="chart" viewBox="0 0 ' + (x0 + W + 110) + ' ' + H + '" role="img" aria-label="8回分のA・B・C配点">' + HATCH;
    [0, 25, 50, 75, 100].forEach(function (v) { var x = x0 + v / 100 * W; g += '<line x1="' + x + '" x2="' + x + '" y1="4" y2="' + (H - 22) + '" class="grid"/><text x="' + x + '" y="' + (H - 6) + '" class="tick" text-anchor="middle">' + v + '</text>'; });
    C.exams.forEach(function (e, i) {
      var y = 8 + i * rowH, x = x0;
      g += '<text x="' + (x0 - 10) + '" y="' + (y + 17) + '" class="lab" text-anchor="end">' + esc(e.name) + '</text>';
      ['A', 'B', 'C'].forEach(function (t) {
        var w = e[t] / 100 * W;
        g += '<rect x="' + (x + 1) + '" y="' + y + '" width="' + Math.max(0, w - 2) + '" height="24" rx="3" class="seg-' + t + '"><title>' + esc(e.name) + ' ' + t + '（' + C.types[t].name + '）' + e[t] + '点</title></rect>';
        if (w > 26) g += '<text x="' + (x + w / 2) + '" y="' + (y + 16.5) + '" class="segv segv-' + t + '" text-anchor="middle">' + e[t] + '</text>';
        x += w;
      });
      g += '<text x="' + (x0 + W + 10) + '" y="' + (y + 17) + '" class="lab2">A+B ' + (e.A + e.B) + '</text>';
    });
    return g + '</svg>';
  }
  function svgTimeline() {
    var start = S.created < today() ? S.created : today();
    var end = S.prefs.examDate;
    var total = Math.max(1, daysBetween(start, end));
    var W = 600, segs = [];
    var bounds = [{ id: 1, d: addDays(end, -40) }, { id: 2, d: addDays(end, -20) }, { id: 3, d: addDays(end, -7) }, { id: 4, d: end }];
    var prev = start;
    bounds.forEach(function (b) {
      var s = prev > b.d ? b.d : prev;
      var from = Math.max(0, daysBetween(start, s)), to = Math.max(0, daysBetween(start, b.d));
      if (to > from) segs.push({ id: b.id, x: from / total * W, w: (to - from) / total * W });
      prev = b.d > prev ? b.d : prev;
    });
    var nowP = Math.min(100, Math.max(0, daysBetween(start, today()) / total * 100));
    var g = '<div class="tl2" role="img" aria-label="試験日までの4つの時期。いまは第' + phaseNow().id + '期">';
    segs.forEach(function (s) {
      var ph = C.phases[s.id - 1];
      g += '<div class="seg" style="flex:' + s.w.toFixed(1) + '" title="第' + s.id + '期 ' + esc(ph.name) + '"><i class="ph' + s.id + '"></i><span>' + s.id + '. ' + esc(ph.name) + '</span></div>';
    });
    g += '<b class="nowm" style="left:' + nowP.toFixed(1) + '%"><em>今日</em></b>';
    return g + '</div>';
  }

  /* ---------- セッション ---------- */
  var SES = null, TICK = null;
  function stopTick() { if (TICK) { clearInterval(TICK); TICK = null; } }
  /* 数値が変わる問題は、出すたびに作り直した写しを使う */
  var SETBY = {}; (C.csets || []).forEach(function (st) { SETBY[st.id] = st; });
  function snap(id, cache) {
    var q = QBY[id]; if (!q) return null;
    if (q.set && SETBY[q.set]) {
      cache = cache || {};
      var inst = cache[q.set] || (cache[q.set] = SETBY[q.set].gen());
      return Object.assign({}, q, inst.qs[q.si], { lead: inst.lead, lfig: inst.fig || null, ltbl: inst.tbl || null });
    }
    return q.fam ? Object.assign({}, q, q.fam.gen()) : arrange(q);
  }
  /* 固定問題の選択肢の並び: 数値は小さい順（本番と同じ）、文はシャッフル。
     解説が①②…の番号で選択肢を指す問題、グラフを選ぶ問題、ア・イ・ウの組合せは並べ替えない */
  function numOf(s) {
    var m = String(s).replace(/\s/g, '').match(/^約?([−-]?\d+(?:\.\d+)?)(?:×10\^\{([−-]?\d+)\})?/);
    return m ? parseFloat(m[1].replace('−', '-')) * Math.pow(10, m[2] ? parseInt(m[2].replace('−', '-'), 10) : 0) : null;
  }
  function arrange(q) {
    if (q.gc || q.ce || !q.c || q.c.length < 3) return null;
    if (/[①②③④⑤⑥]/.test(q.q + (q.e || '') + (q.k || ''))) return null;
    if (q.c.some(function (c) { return /^[アイウエオ]/.test(c) || /すべて正しい|どれも|該当なし/.test(c); })) return null;
    var idx = q.c.map(function (_, i) { return i; }), nums = q.c.map(numOf);
    if (nums.every(function (v) { return v !== null; })) idx.sort(function (x, y) { return nums[x] - nums[y] || x - y; });
    else shuffle(idx);
    return Object.assign({}, q, { c: idx.map(function (i) { return q.c[i]; }), a: idx.indexOf(q.a) });
  }
  function IQ(it) { return it.q || QBY[it.id]; }
  /* 問題数の切り替え: ちょっと（短時間）／ノーマル */
  var QSIZE = 'normal';
  try { if (localStorage.getItem('chem80_size') === 'light') QSIZE = 'light'; } catch (e) { /* noop */ }
  var QCNT = { normal: { weak: 10, A: 20, B: 10, C: 5, K: 15, S: 10, H: 5 }, light: { weak: 5, A: 10, B: 5, C: 2, K: 10, S: 5, H: 2 } };
  function qsz(k) { return QCNT[QSIZE][k]; }
  function sizeSwitch() {
    var l = QSIZE === 'light';
    return '<span class="szsw' + (l ? ' light' : '') + '" role="group" aria-label="問題数"><button data-act="qsize" data-v="light" aria-pressed="' + l + '">ちょっと</button><button data-act="qsize" data-v="normal" aria-pressed="' + !l + '">ノーマル</button><i aria-hidden="true"></i></span>';
  }
  function startQSession(ids, title, opts) {
    ids = (ids || []).filter(function (id) { return !!QBY[id]; }); /* 外した問題・古い記録の id は除く */
    if (!ids.length) { toast('条件に合う問題がありません'); return; }
    var cache = {};
    SES = { mode: 'q', title: title, items: ids.map(function (id) { return { id: id, q: snap(id, cache) }; }), i: 0, t0: Date.now(), done: false, back: (opts && opts.back) || 'practice' };
    go('session');
  }
  function startDrill(genIds, n, back) {
    if (!genIds.length) { toast('ドリルを1つ以上選んでください'); return; }
    var items = [];
    for (var i = 0; i < n; i++) {
      var g = GBY[genIds[i % genIds.length]];
      var p = g.gen(); p.g = g.id; p.u = g.u; p.p = g.p; p.t = 'B'; p.sec = g.sec; p.name = g.name;
      if (!p.hj && C.qHajiki && C.qHajiki[g.id]) p.hj = C.qHajiki[g.id];
      items.push(p);
    }
    shuffle(items);
    SES = { mode: 'drill', title: '計算ドリル', items: items, i: 0, done: false, back: back || 'drill', gens: genIds.slice(), n: n };
    go('session');
  }
  function startFlash(cards, title, back) {
    if (!cards.length) { toast('該当するカードがありません'); return; }
    SES = { mode: 'flash', title: title || '一問一答', items: cards.map(function (x) { return { x: x, key: x.c + '|' + x.f, again: 0 }; }), i: 0, done: false, back: back || 'flash', tally: { know: 0, unsure: 0, no: 0 } };
    go('session');
  }
  function startMock() {
    var plan = [['state', 'A', 2], ['state', 'B', 1], ['state', 'C', 1], ['react', 'A', 1], ['react', 'B', 2], ['react', 'C', 1], ['inorg', 'A', 3], ['inorg', 'B', 1], ['org', 'A', 3], ['org', 'B', 1], ['synth', 'C', 3], ['synth', 'B', 1]];
    var used = {}, ids = [];
    function score(q) { var r = S.q[q.id]; return (r ? (r.n * 2 + (lastOk(q.id) ? 1 : 0)) : 0) + Math.random(); }
    plan.forEach(function (p) {
      var pool = C.questions.filter(function (q) { return fieldOf(q) === p[0] && q.t === p[1] && !used[q.id]; }).sort(function (a, b) { return score(a) - score(b); });
      if (pool.length < p[2]) pool = pool.concat(C.questions.filter(function (q) { return fieldOf(q) === p[0] && !used[q.id] && pool.indexOf(q) < 0; }).sort(function (a, b) { return score(a) - score(b); }));
      pool.slice(0, p[2]).forEach(function (q) { used[q.id] = 1; ids.push(q.id); });
    });
    var cache = {};
    SES = { mode: 'mock', title: 'ミニ模試（30分）', limit: 1800, items: ids.map(function (id) { return { id: id, q: snap(id, cache), ans: null }; }), i: 0, done: false, deadline: Date.now() + 30 * 60 * 1000, back: 'mock', confirm: false };
    go('session');
  }
  /* 本番形式の模試: 大問5つ・60分 */
  var FULL = [
    { name: '第1問', f: '理論（状態）', units: ['mol', 'structure', 'gas', 'solution'] },
    { name: '第2問', f: '理論（反応）', units: ['thermo', 'redox', 'electro', 'kinetics', 'equilibrium', 'acidbase', 'ksp'] },
    { name: '第3問', f: '無機', units: ['inogen', 'inorx', 'ionsep', 'nonmetal', 'metal', 'tmetal'] },
    { name: '第4問', f: '有機', units: ['orgbasic', 'aliphatic', 'aromatic', 'natural', 'polymer'] },
    { name: '第5問', f: '総合', sets: 2 }
  ];
  var FULLPT = [3, 3, 3, 3, 4, 4];
  function setSeen(sid) { var n = 0; C.questions.forEach(function (q) { if (q.set === sid && S.q[q.id]) n += S.q[q.id].n; }); return n + Math.random(); }
  function startFullMock() {
    var used = {}, items = [], cache = {};
    function sc(q) { var r = S.q[q.id]; return (r ? (r.n * 2 + (lastOk(q.id) ? 1 : 0)) : 0) + Math.random() * 1.5; }
    FULL.forEach(function (g, gi) {
      var ids = [];
      if (g.sets) {
        (C.csets || []).slice().sort(function (a, b) { return setSeen(a.id) - setSeen(b.id); }).slice(0, g.sets).forEach(function (st) { ids = ids.concat(setIds(st.id)); });
      } else {
        ['A', 'A', 'B', 'B', 'B', 'C'].forEach(function (t) {
          var base = C.questions.filter(function (q) { return !q.set && g.units.indexOf(q.u) >= 0 && !used[q.id]; });
          var pool = base.filter(function (q) { return q.t === t; }); if (!pool.length) pool = base;
          pool.sort(function (a, b) { return sc(a) - sc(b); });
          if (pool.length) { used[pool[0].id] = 1; ids.push(pool[0].id); }
        });
        ids.sort(function (a, b) { return g.units.indexOf(QBY[a].u) - g.units.indexOf(QBY[b].u); });
      }
      ids.forEach(function (id, k) { items.push({ id: id, q: snap(id, cache), ans: null, dai: gi, pt: FULLPT[k] || 3 }); });
    });
    SES = { mode: 'mock', full: true, title: '本番形式の模試（60分）', limit: 3600, items: items, i: 0, done: false, deadline: Date.now() + 3600 * 1000, back: 'mock', confirm: false };
    go('session');
  }

  function buildSet(o) {
    var pool = C.questions.filter(function (q) {
      return (!o.units || o.units.indexOf(q.u) >= 0) && (!o.types || o.types.indexOf(q.t) >= 0) && (!o.pattern || q.p.indexOf(o.pattern) >= 0);
    });
    if (o.order === 'weak') {
      var t = today();
      pool.forEach(function (q) {
        var r = S.q[q.id], s;
        if (!r) s = 2.2; else if (lastOk(q.id) === false) s = 3; else if (r.due && r.due <= t) s = 2.6; else s = 1 / (1 + r.s);
        q._s = s + Math.random() * 0.5;
      });
      pool.sort(function (a, b) { return b._s - a._s; });
    } else if (o.order === 'random') shuffle(pool);
    if (o.bands) pool = pool.filter(function (q) { return o.bands.indexOf(bandQ(q)) >= 0; });
    /* A・B・C を混ぜて出すときは、問題の数ではなく本番の配点の比率（A 42 : B 30 : C 28）で選ぶ */
    var mixed = o.count && !o.units && !o.pattern && (!o.types || o.types.length > 1);
    return groupSets(mixed ? balanceABC(pool, o.count) : pool.slice(0, o.count || pool.length)).map(function (q) { return q.id; });
  }
  var ABC_RATIO = { A: 42, B: 30, C: 28 };
  function balanceABC(pool, count) {
    var types = ['A', 'B', 'C'].filter(function (t) { return pool.some(function (q) { return q.t === t; }); });
    var tot = types.reduce(function (s, t) { return s + ABC_RATIO[t]; }, 0), quota = {}, left = count;
    types.forEach(function (t) { quota[t] = Math.floor(count * ABC_RATIO[t] / tot); left -= quota[t]; });
    types.slice().sort(function (a, b) { return (count * ABC_RATIO[b] / tot) % 1 - (count * ABC_RATIO[a] / tot) % 1; }).forEach(function (t) { if (left > 0) { quota[t]++; left--; } });
    var take = {};
    pool.forEach(function (q, i) { if (quota[q.t] > 0) { quota[q.t]--; take[i] = 1; } });
    /* ある種類が足りないときは、残りから弱い順に補う */
    var n = Object.keys(take).length;
    pool.forEach(function (q, i) { if (n < count && !take[i]) { take[i] = 1; n++; } });
    return pool.filter(function (q, i) { return take[i]; });
  }

  function quick(k) {
    var ph = phaseNow(), dd = ph.daily.filter(function (d) { return d.k === k; })[0] || {};
    if (k === 'flash') {
      var cats = ph.id === 1 ? C.flashCats.filter(function (c) { return c.f !== 'state' && c.f !== 'react'; }).map(function (c) { return c.id; }) : C.flashCats.map(function (c) { return c.id; });
      startFlash(buildFlash(cats, 'rec', dd.n || 20), '今日の一問一答', here());
    } else if (k === 'practice') {
      startQSession(buildSet({ types: dd.types || (ph.id === 1 ? ['A', 'B'] : ['A', 'B', 'C']), bands: dd.bands || null, order: 'weak', count: dd.n || 15 }), '今日の演習', { back: here() });
    } else if (k === 'practiceC') {
      startQSession(buildSet({ types: ['C'], order: 'weak', count: dd.n || 5 }), 'データ読解（C）', { back: here() });
    } else if (k === 'drill') {
      startDrill(C.generators.map(function (g) { return g.id; }), dd.n || 10, here());
    } else if (k === 'review') {
      var d = dueQuestions();
      if (!d.length) { toast('今日の復習はありません'); return; }
      startQSession(shuffle(d), '今日の復習', { back: here() });
    } else if (k === 'mock') { go('mock'); }
    else if (k === 'rules') { var m = S.menu[today()] || (S.menu[today()] = {}); m.rules = true; save(); go('plan'); }
  }
  function buildFlash(cats, mode, count) {
    var t = today();
    var cards = typeof cats[0] === 'object' ? cats.slice() : C.flash.filter(function (x) { return cats.indexOf(x.c) >= 0; });
    function st(x) { return S.fl[x.c + '|' + x.f]; }
    if (mode === 'due') cards = cards.filter(function (x) { var r = st(x); return r && r.due <= t; });
    else if (mode === 'weak') cards = cards.filter(function (x) { var r = st(x); return r && r.b <= 1; });
    else if (mode === 'new') cards = shuffle(cards.filter(function (x) { return !st(x); }));
    else if (mode === 'rand') cards = shuffle(cards.slice());
    else {
      var due = cards.filter(function (x) { var r = st(x); return r && r.due <= t; });
      var fresh = shuffle(cards.filter(function (x) { return !st(x); }));
      var rest = cards.filter(function (x) { var r = st(x); return r && r.due > t; }).sort(function (a, b) { return st(a).b - st(b).b; });
      cards = shuffle(due).concat(fresh, rest);
    }
    return count ? cards.slice(0, count) : cards;
  }

  /* ---------- 画面: ホーム ---------- */
  function vHome() {
    var dl = daysLeft(), ph = phaseNow(), pr = predict(), due = dueQuestions().length, fdue = dueFlash().length;
    var l = S.log[today()] || { q: 0, fl: 0, dr: 0, qC: 0 };
    var totalAns = Object.keys(S.q).reduce(function (s, k) { return s + S.q[k].n; }, 0) + Object.keys(S.ds).reduce(function (s, k) { return s + S.ds[k].n; }, 0);
    var name = S.prefs.name ? esc(S.prefs.name) + 'さん、' : '';
    var h = '<header class="home-head">';
    if (dl >= 0) h += '<p class="hh-label">' + name + '共通テスト（化学）まで</p><p class="hh-count"><span class="num">' + dl + '</span>日</p>';
    else h += '<p class="hh-label">試験日を過ぎました。お疲れさまでした。</p>';
    h += '<p class="hh-phase">いまは<b>第' + ph.id + '期「' + esc(ph.name) + '」</b>です。' + esc(ph.goal) + '</p>';
    h += '<div class="goalpick">' + goalSlider() + '<a class="lnk" href="#plan">' + esc(G().short) + 'の戦略を見る</a></div>';
    h += '<div class="tlwrap">' + svgTimeline() + '</div></header>';

    /* 今日やること */
    var m = S.menu[today()] || {};
    h += '<div class="cols2"><section class="sec"><h2>今日やること</h2><ol class="todo">';
    ph.daily.forEach(function (d) {
      var prog = 0, txt = '';
      if (d.k === 'flash') { prog = Math.min(1, (l.fl || 0) / d.n); txt = (l.fl || 0) + ' / ' + d.n + ' 枚'; }
      else if (d.k === 'practice') { prog = Math.min(1, (l.q || 0) / d.n); txt = (l.q || 0) + ' / ' + d.n + ' 問'; }
      else if (d.k === 'drill') { prog = Math.min(1, (l.dr || 0) / d.n); txt = (l.dr || 0) + ' / ' + d.n + ' 問'; }
      else if (d.k === 'practiceC') { prog = Math.min(1, (l.qC || 0) / d.n); txt = (l.qC || 0) + ' / ' + d.n + ' 問'; }
      else if (d.k === 'review') { prog = due === 0 ? 1 : 0; txt = due === 0 ? '今日の分は終わりました' : '残り ' + due + ' 問'; }
      else if (d.k === 'mock') { var mk = S.mocks.some(function (x) { return x.date === today(); }); prog = mk ? 1 : 0; txt = mk ? '今日は受けました' : '30分'; }
      else if (d.k === 'rules') { prog = m.rules ? 1 : 0; txt = m.rules ? '読みました' : '5分'; }
      var done = prog >= 1;
      h += '<li class="' + (done ? 'done' : '') + '"><span class="td-mark" aria-hidden="true">' + (done ? '✓' : '') + '</span><span class="td-main"><b>' + esc(d.label) + '</b><small class="num">' + txt + '</small></span><button class="' + (done ? 'lnkbtn' : 'btn sm') + '" data-act="quick" data-k="' + d.k + '">' + (done ? 'もう一度' : '始める') + '</button></li>';
    });
    h += '</ol><p class="aside">' + esc(ph.extra) + '</p></section>';

    /* 予測得点 */
    var NEED = 15, known = pr.attempts >= NEED, sc = pr.score, GL = goalId(), gap = GL - sc;
    h += '<section class="sec"><h2>いまの予測得点</h2>';
    if (known) h += '<p class="score"><span class="num">' + sc + '</span><span class="sc-u">点</span><span class="sc-gap">' + (gap <= 0 ? '目標の' + GL + '点に届いています' : '目標の' + GL + '点まで、あと ' + gap + ' 点') + '</span></p>';
    else h += '<p class="score unk"><span class="num">？？</span><span class="sc-u">点</span><span class="sc-gap">あと ' + (NEED - pr.attempts) + ' 問解くと表示されます</span></p>';
    h += '<div class="scale" aria-hidden="true"><span class="sfill" style="width:' + (known ? sc : 0) + '%"></span><i style="left:' + GL + '%"></i><em style="left:' + GL + '%">' + GL + '</em></div>';
    h += '<dl class="abcl">';
    ['A', 'B', 'C'].forEach(function (t) {
      var o = pr.byT[t], acc = o.n ? o.c / o.n : 0;
      h += '<div><dt>' + tb(t) + '</dt><dd>' + meter(acc, 'm-' + t, tgoal(t)) + '<span class="num">' + (o.n ? pct(acc) + '%' : '未着手') + '</span><small>目標 ' + pct(tgoal(t)) + '%</small></dd></div>';
    });
    var mb = myBand();
    C.bands.forEach(function (b) {
      var o = mb[b.id], acc = o.n ? o.c / o.n : 0, goal = G().band[b.id];
      h += '<div' + (b.id === 'K' ? ' class="dsep"' : '') + '><dt>' + difTag(b.id) + '</dt><dd>' + meter(acc, 'm-dif', goal) + '<span class="num">' + (o.n ? pct(acc) + '%' : '未着手') + '</span><small>目標 ' + pct(goal) + '%</small></dd></div>';
    });
    h += '</dl><p class="note">' + (!known ? '演習・ドリル・ミニ模試で ' + NEED + ' 問以上解くと、その結果から予測得点を出します。' : '最近解いた ' + pr.attempts + ' 問の結果を、本番の配点で重みづけしています。') + ' 目標は「' + esc(G().short) + '」です。基本 ' + pct(G().band.K) + '%・標準 ' + pct(G().band.S) + '%・発展 ' + pct(G().band.H) + '% 取れれば、本試の平均的な年で' + GL + '点前後になります。<a class="lnk" href="#plan">目標を変える</a></p></section></div>';

    /* 単元別の理解度（レーダーチャート） */
    h += radarSection();

    /* 次に伸ばす単元 */
    h += '<section class="sec"><h2>次に伸ばす単元</h2><div class="cards">';
    recommend(3).forEach(function (r) {
      h += '<a class="card" href="#unit-' + r.u.id + '"><span class="c-top"><span>' + esc(secOf(r.u.id).name) + '</span>' + stars(r.u.star) + '</span><b class="c-title">' + fx(r.u.name) + '</b><span class="c-text">' + esc(r.reason) + '</span>' + meter(r.st.n ? r.st.c / r.st.n : 0, 'm-unit') + '<span class="c-go">要点と演習へ</span></a>';
    });
    h += '</div></section>';

    /* 記録 */
    h += '<section class="sec"><h2>学習の記録</h2><p class="stats">連続 <b class="num">' + streak() + '</b> 日<span>今日 <b class="num">' + ((l.q || 0) + (l.dr || 0)) + '</b> 問</span><span>これまで <b class="num">' + totalAns + '</b> 問</span><span>復習待ち <b class="num">' + (due + fdue) + '</b></span></p>';
    h += '<div class="chartwrap">' + svgActivity() + '</div>';
    if (totalAns >= 20 && (!S.prefs.backup || daysBetween(S.prefs.backup, today()) >= 7)) h += '<p class="note">記録はこのブラウザの中だけにあります。<a class="lnk" href="#prefs">記録をファイルに保存する</a>（週1回がおすすめ）</p>';
    h += '</section>';
    return h;
  }

  /* ---------- 単元別の理解度（レーダーチャート） ----------
     理解度 = その範囲の問題のうち「最後に解いたときに正解した」問題の割合（解いていない問題は 0 として数える） */
  var USHORT = { atom: '原子', bond: '化学結合', mol: '物質量', acidbase: '酸と塩基', redox: '酸化還元', gas: '気体', structure: '結晶', solution: '溶液',
    thermo: 'エンタルピー', electro: '電池・電解', kinetics: '反応速度', equilibrium: '化学平衡', ksp: '溶解度積',
    inogen: '一般論', inorx: '反応・製法', ionsep: '沈殿・分離', nonmetal: '非金属', metal: '典型金属', tmetal: '遷移元素', orgbasic: '有機の基礎', aliphatic: '脂肪族', aromatic: '芳香族',
    natural: '天然高分子', polymer: '合成高分子', data: 'データ読解' };
  function radarGroups() {
    return [
      { id: 'kiso', name: '化学基礎', units: SECBY.kiso.units },
      { id: 'state', name: '理論（状態）', units: SECBY.state.units },
      { id: 'react', name: '理論（反応）', units: SECBY.react.units },
      { id: 'muki', name: '無機', units: SECBY.muki.units },
      { id: 'yuki', name: '有機・高分子', units: SECBY.yuki.units },
      { id: 'sogo', name: '総合', units: SECBY.sogo.units }
    ];
  }
  function mastery(filter) { var s = statsFor(filter); return { v: s.total ? s.c / s.total : 0, c: s.c, n: s.n, total: s.total }; }
  /* axes: [{ name, v(0〜1), tip, href }]、goal: 目標の割合 */
  function radarSVG(axes, goal, opt) {
    opt = opt || {};
    var N = axes.length, W = opt.w || 300, H = opt.h || 260, cx = W / 2, cy = H / 2 + (opt.dy || 4), R = opt.r || 82;
    function pt(i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; }
    function poly(f) { return axes.map(function (x, i) { var p = pt(i, typeof f === 'function' ? f(x) : f); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
    var g = '<svg class="radar" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc((opt.title || '理解度') + '：' + axes.map(function (x) { return x.name + ' ' + pct(x.v) + '%'; }).join('、')) + '">';
    [0.25, 0.5, 0.75, 1].forEach(function (f) { g += '<polygon class="rd-ring' + (f === 1 ? ' out' : '') + '" points="' + poly(f) + '"/>'; });
    axes.forEach(function (x, i) { var p = pt(i, 1); g += '<line class="rd-spoke" x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; });
    if (goal) g += '<polygon class="rd-goal" points="' + poly(goal) + '"/>';
    g += '<polygon class="rd-area" points="' + poly(function (x) { return Math.max(0.02, x.v); }) + '"/>';
    axes.forEach(function (x, i) {
      var p = pt(i, Math.max(0.02, x.v)), lp = pt(i, 1 + (opt.lgap || 0.2)), a = -Math.PI / 2 + i * 2 * Math.PI / N;
      var anc = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
      var ly = lp[1] + (Math.sin(a) > 0.5 ? 10 : Math.sin(a) < -0.5 ? -8 : 0);
      var tip = '<title>' + esc(x.tip || (x.name + ' ' + pct(x.v) + '%')) + '</title>';
      var dot = '<circle class="rd-hit" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="12">' + tip + '</circle><circle class="rd-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4"/>';
      var lab = '<text class="rd-lab" x="' + lp[0].toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anc + '">' + esc(x.name) + '</text><text class="rd-val num" x="' + lp[0].toFixed(1) + '" y="' + (ly + 15).toFixed(1) + '" text-anchor="' + anc + '">' + (x.n ? pct(x.v) + '%' : '未着手') + tip + '</text>';
      g += x.href ? '<a href="' + x.href + '">' + dot + lab + '</a>' : dot + lab;
    });
    return g + '</svg>';
  }
  function radarSection() {
    var goal = goalId() / 100, gs = radarGroups();
    var main = gs.map(function (gr) {
      var m = mastery(function (q) { return gr.units.indexOf(q.u) >= 0; });
      return { name: gr.name, v: m.v, n: m.n, tip: gr.name + '　理解度 ' + pct(m.v) + '%（' + m.c + ' / ' + m.total + ' 問）' };
    });
    var h = '<section class="sec radsec"><h2>単元別の理解度<small>最後に解いたときに正解した問題の割合。点線は目標の ' + goalId() + '%</small></h2>';
    h += '<div class="radmain"><figure class="radfig">' + radarSVG(main, goal, { w: 400, h: 320, r: 108, title: '6分野の理解度', lgap: 0.16 }) + '</figure>';
    h += '<p class="note">頂点にカーソルを合わせると、解けた問題数が出ます。下の分野ごとのチャートの頂点を押すと、その単元のページに移ります。</p></div>';
    h += '<div class="radgrid">';
    gs.forEach(function (gr, gi) {
      var axes;
      if (gr.units.length >= 3) {
        axes = gr.units.map(function (u) {
          var m = mastery(function (q) { return q.u === u; });
          return { name: USHORT[u] || UBY[u].name, v: m.v, n: m.n, href: '#unit-' + u, tip: UBY[u].name + '　' + pct(m.v) + '%（' + m.c + ' / ' + m.total + ' 問）' };
        });
      } else {
        /* 総合は単元が1つなので、全範囲を問題のタイプ（A・B・C）で見る */
        axes = ['A', 'B', 'C'].map(function (t) {
          var m = mastery(function (q) { return q.t === t; });
          return { name: C.types[t].name + '（' + t + '）', v: m.v, n: m.n, tip: '全範囲の ' + C.types[t].name + '（' + t + '）　' + pct(m.v) + '%（' + m.c + ' / ' + m.total + ' 問）' };
        });
      }
      h += '<figure class="radcard"><figcaption><b>' + esc(gr.name) + '</b><span class="num">' + (main[gi].n ? pct(main[gi].v) + '%' : '未着手') + '</span>' + (gr.id === 'sogo' ? '<small>全範囲を A・B・C で</small>' : '') + '</figcaption>' + radarSVG(axes, goal, { w: 280, h: 230, r: 64, title: gr.name + 'の理解度', lgap: 0.22 }) + '</figure>';
    });
    return h + '</div></section>';
  }

  /* ---------- 画面: 目標ごとの戦略（5割〜9割をタブで切り替え。最初は自分の目標のタブ） ---------- */
  var PLAN = { tab: null };
  function gfY(v) { return ((90 - v) / 40 * 30 + 8).toFixed(1); }
  function goalSlider() {
    var v = goalId(), g = G(), p = (v - 50) / 40 * 100;
    var path = 'M18 4h12v17l13.5 28a6 6 0 0 1-5.4 8.6H9.9a6 6 0 0 1-5.4-8.6L18 21z';
    var h = '<div class="gslider"><svg class="gflask" viewBox="0 0 48 62" aria-hidden="true"><defs><clipPath id="gfclip"><path d="' + path + '"/></clipPath></defs>' +
      '<g clip-path="url(#gfclip)"><g class="gfl" id="gfl" style="transform:translateY(' + gfY(v) + 'px)"><rect x="0" y="12" width="48" height="60"/><path class="gfw" d="M0 12q6-4 12 0t12 0 12 0 12 0v4H0z"/>' +
      '<circle class="gfb" cx="17" cy="38" r="2.2"/><circle class="gfb b2" cx="28" cy="44" r="1.6"/><circle class="gfb b3" cx="23" cy="30" r="1.3"/></g></g>' +
      '<path class="gfo" d="' + path + '"/><path class="gfo" d="M15 4h18"/></svg>';
    h += '<div class="gsmain"><div class="gshead"><span class="gpl">目標の得点率</span><b class="gsv" id="gsv">' + g.short + '</b><span class="gsp num" id="gsp">' + v + '点</span><span class="gst" id="gst">' + esc(g.tag) + '</span></div>';
    h += '<div class="gsrange"><input type="range" class="grange" id="goalrange" min="50" max="90" step="10" value="' + v + '" style="--p:' + p + '%" aria-label="目標の得点率" aria-valuetext="' + g.short + '（' + v + '点）">';
    h += '<div class="gsticks">' + C.goals.map(function (x, k) { return '<button class="gtick' + (x.id === v ? ' on' : '') + '" data-act="setgoal" data-g="' + x.id + '" style="left:calc(13px + (100% - 26px) * ' + (k / 4) + ')">' + x.short + '</button>'; }).join('') + '</div></div></div></div>';
    return h;
  }
  /* スライダーを動かしている間は表示だけ変え、指を離したら保存する */
  function goalPreview(v) {
    var g = G(v), el;
    if ((el = $('#gsv'))) el.textContent = g.short;
    if ((el = $('#gsp'))) el.textContent = v + '点';
    if ((el = $('#gst'))) el.textContent = g.tag;
    if ((el = $('#gfl'))) el.style.transform = 'translateY(' + gfY(v) + 'px)';
    if ((el = $('#goalrange'))) { el.style.setProperty('--p', ((v - 50) / 40 * 100) + '%'); el.setAttribute('aria-valuetext', g.short + '（' + v + '点）'); }
    document.querySelectorAll('.gtick').forEach(function (b) { b.classList.toggle('on', Number(b.dataset.g) === v); });
  }
  document.addEventListener('input', function (e) { if (e.target.id === 'goalrange') goalPreview(Number(e.target.value)); });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'goalrange') return;
    ACT.setgoal({ dataset: { g: e.target.value } });
    var r = $('#goalrange'); if (r) r.focus();
  });
  function bandAvg() {
    var ex = C.itemRates || [], o = { K: 0, S: 0, H: 0 };
    ex.forEach(function (e) { var b = bandPts(RROWS.filter(function (r) { return r.ex === e; })); o.K += b.K; o.S += b.S; o.H += b.H; });
    if (ex.length) { o.K /= ex.length; o.S /= ex.length; o.H /= ex.length; }
    return o;
  }
  function vPlan() {
    var mine = goalId(), gid = C.goalBy[PLAN.tab] ? PLAN.tab : mine, g = G(gid), ph = phaseNow();
    var h = '<nav class="subtabs gtabs" role="tablist" aria-label="目標の得点率">' + C.goals.map(function (x) {
      var on = x.id === gid;
      return '<button role="tab" aria-selected="' + on + '"' + (on ? ' class="on"' : '') + ' data-act="plantab" data-g="' + x.id + '">' + x.short + (x.id === mine ? '<i>目標</i>' : '') + '</button>';
    }).join('') + '</nav>';
    h += '<header class="ph-head"><p class="eyebrow">' + g.short + 'の設計図</p><h1>' + esc(g.title) + '</h1><p class="lead">' + esc(g.lead) + '</p>';
    if (gid !== mine) h += '<p class="gswitch">いまの目標は「' + G(mine).short + '」です。このページは見比べ用です。<button class="btn sm" data-act="setgoal" data-g="' + gid + '">目標を' + g.short + 'に変える</button></p>';
    h += '</header>';

    h += '<section class="panel"><h2>方針</h2><ol class="policy">' + g.policy.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></section>';

    /* 得点の内訳 */
    var go = { A: '<a class="lnk" href="#flash">一問一答へ</a>', B: '<a class="lnk" href="#patterns">解法の型へ</a>', C: '<button class="lnkbtn" data-act="quick" data-k="practiceC">C問題を解く</button>' };
    h += '<section class="panel"><h2>得点の内訳目標<small>8回分の平均配点 A 42・B 30・C 28 点に対して</small></h2><div class="bp">';
    ['A', 'B', 'C'].forEach(function (t) {
      h += '<div class="bpc bpc-' + t + '">' + tb(t, true) + '<div class="bpn"><span class="num">' + g.abc[t] + '</span><small>/ ' + C.abcTotal[t] + ' 点（' + pct(tgoal(t, gid)) + '%）</small></div><p>' + esc(g.how[t]) + '</p>' + go[t] + '</div>';
    });
    h += '<div class="bpsum"><span>合計</span><span class="num">' + gid + '</span><small>/ 100 点</small></div></div>';
    var ba = bandAvg(), tot = 0;
    h += '<h3 class="bph">難易度別に見ると<small>本試4回の平均配点に対して</small></h3><div class="bandgoal">';
    C.bands.forEach(function (b) {
      var pt = ba[b.id] * g.band[b.id]; tot += pt;
      h += '<div>' + difTag(b.id) + '<b class="num">' + pct(g.band[b.id]) + '<small>%</small></b><span>約 ' + Math.round(pt) + ' / ' + Math.round(ba[b.id]) + ' 点</span></div>';
    });
    h += '<div class="bgsum"><span>合計</span><b class="num">約 ' + Math.round(tot) + '<small> 点</small></b></div></div></section>';

    /* 取る・後回し */
    h += '<section class="panel"><h2>取る問題と、後回しでよい問題</h2><div class="takeskip"><div class="tk"><h3>確実に取る</h3><ul>' + g.take.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="sk"><h3>後回しでよい</h3><ul>' + g.skip.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div></section>';

    /* 解法の型 */
    var tier = function (p) { return C.patTier[p.id] || 90; };
    var pats = C.patterns.filter(function (p) { return tier(p) <= gid; });
    pats.sort(function (a, b) { return tier(a) - tier(b); });
    h += '<section class="panel"><h2>使いこなす解法の型<small>' + pats.length + ' / ' + C.patterns.length + ' 個</small></h2><ul class="patlist">' +
      pats.map(function (p) { return '<li><a href="#pattern-' + p.id + '">' + fx(p.name) + '</a>' + (gid > 50 && tier(p) === gid ? '<em>' + g.short + 'で追加</em>' : '') + '</li>'; }).join('') + '</ul>' +
      (pats.length < C.patterns.length ? '<p class="note">残りの ' + (C.patterns.length - pats.length) + ' 個は、上の目標で必要になる型です。余裕ができてから取りかかれば十分です。</p>' : '') + '</section>';

    /* 4つの時期 */
    h += '<section class="panel"><h2>試験日までの4つの時期<small>いまは第' + ph.id + '期</small></h2><div class="tlwrap">' + svgTimeline() + '</div><ol class="phases">';
    C.phases.forEach(function (b) {
      var p = phaseOf(b, gid);
      h += '<li class="' + (p.id === ph.id ? 'cur' : '') + '"><div class="phh"><span class="phtag ph' + p.id + '">第' + p.id + '期</span><b>' + esc(p.name) + '</b><small>' + (p.id === 1 ? '試験41日前まで' : p.id === 2 ? '40〜21日前' : p.id === 3 ? '20〜8日前' : '最後の7日') + '</small></div><p>' + esc(p.goal) + '</p><ul>' + p.daily.map(function (d) { return '<li>' + esc(d.label) + '</li>'; }).join('') + '</ul><p class="extra">' + esc(p.extra) + '</p></li>';
    });
    h += '</ol>' + (gid === mine ? '<p class="note">ホームの「今日やること」は、この表の「いまの時期」のメニューです。</p>' : '') + '</section>';

    /* 時間配分 */
    h += '<section class="panel"><h2>60分の時間配分</h2><div class="tp">';
    g.time.forEach(function (t) { h += '<div class="tpi" style="flex:' + t.min + '"><b>' + esc(t.sec) + '</b><span class="num">' + t.min + '分</span></div>'; });
    h += '</div><ul class="tpn">' + g.time.map(function (t) { return '<li><b>' + esc(t.sec) + '</b>' + esc(t.note) + '</li>'; }).join('') + '</ul></section>';

    h += '<section class="panel"><h2>過去問の使い方</h2><p>' + esc(g.exams) + '</p><a class="btn sm" href="#exams">解く順番と記録へ</a></section>';

    h += '<section class="panel" id="rules"><h2>本番のルール<small>どの目標でも共通</small></h2><div class="rules">';
    C.rules.forEach(function (r) { h += '<div class="rule"><h3>' + esc(r.h) + '</h3><ul>' + r.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>'; });
    h += '</div></section>';
    return h;
  }

  /* ---------- 画面: 分析 ---------- */
  function vAnalysis() {
    var h = '<header class="ph-head"><p class="eyebrow">根拠データ</p><h1>A・B・C の分析（8回分）</h1><p class="lead">2023〜2026年の本試・追試（2025年の旧課程用第6問は除く）の全設問を、問題文と配点から分類しました。</p></header>';
    h += '<section class="panel"><h2>年度別の A・B・C 配点<small>1回100点</small></h2><div class="legend"><span><i class="lg lg-A"></i>A 知識</span><span><i class="lg lg-B"></i>B 典型</span><span><i class="lg lg-C"></i>C 思考</span></div><div class="chartwrap">' + svgStacked() + '</div>';
    h += '<div class="tblwrap"><table class="dtbl"><thead><tr><th>試験</th><th>A</th><th>B</th><th>C</th><th>A+B</th><th>平均点</th><th>特徴</th></tr></thead><tbody>';
    C.exams.forEach(function (e) { h += '<tr><th>' + esc(e.name) + '</th><td class="num">' + e.A + '</td><td class="num">' + e.B + '</td><td class="num">' + e.C + '</td><td class="num"><b>' + (e.A + e.B) + '</b></td><td class="num">' + (e.avg ? e.avg.toFixed(2) : '非公表') + '</td><td class="note">' + esc(e.note) + '</td></tr>'; });
    h += '<tr class="avg"><th>8回平均</th><td class="num">41.6</td><td class="num">30.4</td><td class="num">28.0</td><td class="num"><b>72.0</b></td><td></td><td></td></tr></tbody></table></div></section>';
    h += secPanel();
    h += '<section class="panel"><h2>分野別の内訳<small>8回平均（点）</small></h2><div class="tblwrap"><table class="dtbl"><thead><tr><th>分野</th><th>配点</th><th>A</th><th>B</th><th>C</th><th>A+Bの割合</th></tr></thead><tbody>';
    C.fields.forEach(function (f) { var w = C.weights[f.id]; var tot = w.A + w.B + w.C; h += '<tr><th>' + esc(f.name) + '</th><td class="num">' + f.pts + '</td><td class="num">' + w.A.toFixed(1) + '</td><td class="num">' + w.B.toFixed(1) + '</td><td class="num">' + w.C.toFixed(1) + '</td><td class="num"><b>' + pct((w.A + w.B) / tot) + '%</b></td></tr>'; });
    h += '</tbody></table></div><ul class="bul">' + C.fields.map(function (f) { return '<li><b>' + esc(f.name) + '</b>' + esc(f.note) + '</li>'; }).join('') + '</ul></section>';
    h += '<section class="panel"><h2>くり返し出ているテーマ</h2><div class="themes">';
    C.themes.forEach(function (t) { h += '<div class="theme"><span class="tn">' + (t.label ? esc(t.label) : '8回中<b class="num">' + t.n + '</b>回' + (t.n === 5 ? '前後' : '')) + '</span><ul>' + t.list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; });
    h += '</div><p class="note">大問の順番は固定ではありません。2025年追試は 第2問 無機・第3問 有機・第4問 総合・第5問 理論（反応） の順でした。</p></section>';
    h += '<section class="panel"><h2>読み方の注意</h2><ul class="bul"><li>A・B・C は「問題の種類」の分類で、「難しさ」ではありません。難しさは<a class="lnk" href="#difficulty">難易度と正答率</a>のページで、本番の小問別正答率から見られます。2025本試は A+B が77点あるのに平均点は45点で、知識問題でも多くの受験生が失点しています。</li><li>境界にある設問（電離平衡の正誤、グラフを選ぶ問題など）は、見る人によって分類が変わる可能性があります。</li><li>追試験の平均点は公表されていません。本試の平均点は大学入試センターの発表値です。</li></ul></section>';
    return h;
  }

  var EXSEL = 'all';
  function sbar(o, tot) {
    tot = tot || 20;
    return '<span class="sbar" aria-hidden="true">' + ['A', 'B', 'C'].map(function (t) { return o[t] ? '<i class="sb-' + t + '" style="width:' + (o[t] / tot * 100).toFixed(1) + '%"></i>' : ''; }).join('') + '</span>';
  }
  function secPanel() {
    var data = C.examSecs || {};
    var h = '<section class="panel" id="secs"><h2>大問ごとの A・B・C<small>各大問20点。年度を選んでください</small></h2><div class="chips">';
    h += '<button class="chip sm' + (EXSEL === 'all' ? ' on' : '') + '" data-act="exsel" data-e="all">8回の平均</button>';
    C.exams.forEach(function (e) { h += '<button class="chip sm' + (EXSEL === e.id ? ' on' : '') + '" data-act="exsel" data-e="' + e.id + '">' + esc(e.name) + '</button>'; });
    h += '</div>';
    if (EXSEL === 'all') {
      var agg = {}, n = 0;
      C.exams.forEach(function (e) {
        var d = data[e.id]; if (!d) return; n++;
        d.forEach(function (s) { var k = s.f; var a = agg[k] || (agg[k] = { A: 0, B: 0, C: 0, cnt: 0 }); a.A += s.A; a.B += s.B; a.C += s.C; a.cnt++; });
      });
      if (!n) return h + '<p class="note">大問別の集計はまだありません。</p></section>';
      h += '<div class="tblwrap"><table class="dtbl sec"><thead><tr><th>分野</th><th>大問1つあたり</th><th>A</th><th>B</th><th>C</th><th>A+B</th></tr></thead><tbody>';
      ['理論（状態）', '理論（反応）', '無機', '有機', '総合'].forEach(function (k) {
        var a = agg[k]; if (!a) return;
        var o = { A: a.A / a.cnt, B: a.B / a.cnt, C: a.C / a.cnt };
        h += '<tr><th>' + k + '<small>' + a.cnt + '題の平均</small></th><td>' + sbar(o) + '</td><td class="num">' + o.A.toFixed(1) + '</td><td class="num">' + o.B.toFixed(1) + '</td><td class="num">' + o.C.toFixed(1) + '</td><td class="num"><b>' + (o.A + o.B).toFixed(1) + '</b></td></tr>';
      });
      h += '</tbody></table></div><p class="note">' + n + '回分の大問を分野ごとに平均しました。理論（状態）は第1問、理論（反応）は第2問（2025年追試のみ第5問）です。</p>';
      return h + '</section>';
    }
    var e = C.exams.filter(function (x) { return x.id === EXSEL; })[0], d = data[EXSEL];
    if (!d) return h + '<p class="note">' + esc(e.name) + 'の大問別の集計はまだありません。</p></section>';
    h += '<div class="tblwrap"><table class="dtbl sec"><thead><tr><th>大問</th><th>分野</th><th>主な内容</th><th>内訳</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>';
    var tA = 0, tB = 0, tC = 0;
    d.forEach(function (s, i) {
      tA += s.A; tB += s.B; tC += s.C;
      h += '<tr><th>第' + (i + 1) + '問</th><td>' + esc(s.f) + '</td><td class="note">' + esc(s.topic || '') + '</td><td>' + sbar(s) + '</td><td class="num">' + s.A + '</td><td class="num">' + s.B + '</td><td class="num">' + s.C + '</td></tr>';
    });
    h += '<tr class="avg"><th>合計</th><td></td><td></td><td></td><td class="num">' + tA + '</td><td class="num">' + tB + '</td><td class="num">' + tC + '</td></tr></tbody></table></div>';
    return h + '</section>';
  }

  /* ---------- 選択肢ごとの解説 ---------- */
  function ceHTML(q) {
    if (!q.ce) return '';
    return '<section class="cesec"><h3>選択肢ごとの解説</h3><ol class="celist">' + q.ce.map(function (x, i) {
      return '<li class="' + (x.ok ? 'tr' : 'fa') + (i === q.a ? ' ans' : '') + '"><span class="cen">' + CIRC[i] + '</span><span class="cem" aria-label="' + (x.ok ? '正しい' : '誤り') + '">' + (x.ok ? '○' : '×') + '</span><div><p class="cst">' + fx(q.c[i]) + '</p><p class="cex">' + fx(x.t) + '</p></div></li>';
    }).join('') + '</ol></section>';
  }
  /* 大問のリード文（資料つき） */
  function leadHTML(q) {
    if (!q.lead) return '';
    var n = C.questions.filter(function (x) { return x.set === q.set; }).length;
    return '<div class="setlead"><p class="settl">大問「' + fx(q.setTitle || '') + '」　小問 ' + (q.si + 1) + ' / ' + n + '</p><div class="ltext">' + fx(q.lead) + '</div>' +
      (q.lfig ? '<figure class="figw">' + C.draw.fig(q.lfig) + '</figure>' : '') + (q.ltbl ? tableHTML(q.ltbl) : '') + '</div>';
  }
  function setIds(sid) { return C.questions.filter(function (q) { return q.set === sid; }).sort(function (a, b) { return a.si - b.si; }).map(function (q) { return q.id; }); }
  function groupSets(list) {
    var out = [], seen = {};
    list.forEach(function (q) {
      if (!q.set) { out.push(q); return; }
      if (seen[q.set]) return; seen[q.set] = 1;
      list.filter(function (x) { return x.set === q.set; }).sort(function (a, b) { return a.si - b.si; }).forEach(function (x) { out.push(x); });
    });
    return out;
  }

  /* ---------- 画面: 解答の入力と診断（本試験） ---------- */
  var DG = { ex: null, sort: 'no' };
  var OVD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  function ansOf(eid) { S.ans = S.ans || {}; return S.ans[eid] || (S.ans[eid] = {}); }
  function nosOf(no) { var m = String(no).split('-').map(Number), a = []; if (m.length === 1) return [m[0]]; for (var i = m[0]; i <= m[1]; i++) a.push(i); return a; }
  function keyOf(eid, r) { return ((C.answerKey || {})[eid] || {})[r.no]; }
  function keyText(k) { if (k == null) return '—'; if (typeof k === 'string') return k; if (Array.isArray(k)) return k.join('・'); return k.set.join('・') + '（順不同）'; }
  function examNos(e) { var a = []; rowsOf(e).forEach(function (r) { nosOf(r.no).forEach(function (n) { a.push({ n: n, r: r }); }); }); return a; }
  /* 1つの小問の採点。st: ok（満点）/ part（部分点）/ ng（誤り）/ skip（空欄）/ blank（未入力） */
  function scoreItem(eid, r, A) {
    var k = keyOf(eid, r), nos = nosOf(r.no), vals = nos.map(function (n) { return A[n] ? A[n].v : undefined; });
    if (vals.every(function (v) { return v === undefined; })) return { st: 'blank', got: 0, conf: null, vals: vals };
    var skip = vals.every(function (v) { return v === undefined || v === 'x'; });
    var conf = nos.some(function (n) { return A[n] && A[n].c === 'unsure'; }) ? 'unsure' : 'sure';
    var got = 0;
    if (typeof k === 'string') got = vals[0] === k ? r.pt : 0;
    else if (Array.isArray(k)) got = k.every(function (x, i) { return x === vals[i]; }) ? r.pt : 0;
    else if (k) {
      var hit = {}; vals.forEach(function (v) { if (k.set.indexOf(v) >= 0) hit[v] = 1; });
      var nh = Object.keys(hit).length;
      got = k.each ? nh * k.each : (nh === k.set.length ? r.pt : 0);
    }
    return { st: skip ? 'skip' : got === r.pt ? 'ok' : got > 0 ? 'part' : 'ng', got: got, conf: skip ? null : conf, vals: vals };
  }
  function diagEval(e) {
    var A = ansOf(e.id), items = rowsOf(e).map(function (r) { return Object.assign({ r: r }, scoreItem(e.id, r, A)); });
    var o = { items: items, got: 0, dai: [0, 0, 0, 0, 0], nat: [0, 0, 0, 0, 0], q: { sure_ok: [], unsure_ok: [], sure_ng: [], weak: [] }, band: {}, unit: {}, type: {}, skipDai: [0, 0, 0, 0, 0] };
    C.bands.forEach(function (b) { o.band[b.id] = { got: 0, tot: 0, nat: 0 }; });
    ['A', 'B', 'C'].forEach(function (t) { o.type[t] = { got: 0, tot: 0, nat: 0 }; });
    items.forEach(function (it) {
      var r = it.r, d = r.dai - 1;
      o.got += it.got; o.dai[d] += it.got; if (r.tok != null) o.nat[d] += r.tok / 100 * r.pt;
      if (r.b) { var b = o.band[r.b]; b.got += it.got; b.tot += r.pt; b.nat += r.tok / 100 * r.pt; }
      var t = o.type[r.t]; t.got += it.got; t.tot += r.pt; if (r.tok != null) t.nat += r.tok / 100 * r.pt;
      var u = o.unit[r.u] || (o.unit[r.u] = { lost: 0, must: 0, tot: 0 }); u.tot += r.pt; u.lost += r.pt - it.got; if (r.b && r.b !== 'H') u.must += r.pt - it.got;
      if (it.st === 'skip') o.skipDai[d]++;
      if (it.st === 'ok') (it.conf === 'unsure' ? o.q.unsure_ok : o.q.sure_ok).push(it);
      else if (it.st === 'ng' || it.st === 'part') (it.conf === 'sure' ? o.q.sure_ng : o.q.weak).push(it);
      else if (it.st === 'skip') o.q.weak.push(it);
    });
    return o;
  }
  function stLabel(it) { return { ok: '○', part: '△', ng: '×', skip: '空欄', blank: '—' }[it.st]; }
  function yourText(it) { return it.vals.map(function (v) { return v === undefined ? '—' : v === 'x' ? '？' : v; }).join('・'); }
  function itemLine(it, extra) {
    var r = it.r;
    return '<li><span class="sl-ex">第' + r.dai + '問 ' + esc(r.q) + '（' + esc(r.no) + '）</span><span class="sl-t">' + esc(r.topic) + (r.b ? ' ' + difTag(r.b) : '') + (extra ? '<small class="sl-x">' + extra + '</small>' : '') + '</span>' + (r.sei != null ? rateBar(r.sei) + '<b class="num">' + r.sei.toFixed(0) + '%</b>' : '<span></span><b></b>') + '</li>';
  }
  function diagBody(e) {
    var A = ansOf(e.id), nos = examNos(e), entered = nos.filter(function (x) { return A[x.n] && A[x.n].v != null; }).length, checked = !!A._checked;
    var h = '';
    if (!checked) {
      /* 入力（マークシート） */
      h += '<section class="panel"><h2>' + esc(e.name) + 'の解答<small>' + entered + ' / ' + nos.length + ' 個入力</small></h2>';
      h += '<p class="note">○を押すとマーク、もう一度押すと消えます。「迷った」は、自信がないまま選んだときに押します（何も押さなければ「自信あり」）。</p><div class="ansgrid">';
      for (var d = 1; d <= 5; d++) {
        h += '<div class="ansblk"><div class="ansh">第' + d + '問</div>';
        nos.filter(function (x) { return x.r.dai === d; }).forEach(function (x) {
          var a = A[x.n] || {}, v = a.v;
          h += '<div class="arow' + (v != null ? ' done' : '') + '"><span class="ano num">' + x.n + '</span><span class="aovs">' + OVD.map(function (dg) { return '<button class="aov' + (v === dg ? ' on' : '') + '" data-act="aset" data-n="' + x.n + '" data-v="' + dg + '" aria-label="解答番号' + x.n + 'に' + dg + 'をマーク">' + dg + '</button>'; }).join('') + '</span>' +
            '<button class="aq' + (v === 'x' ? ' on' : '') + '" data-act="aset" data-n="' + x.n + '" data-v="x" title="わからず空欄">？</button>' +
            '<button class="acf' + (a.c === 'unsure' ? ' on' : '') + '" data-act="aconf" data-n="' + x.n + '"' + (v != null && v !== 'x' ? '' : ' disabled') + '>迷った</button></div>';
        });
        h += '</div>';
      }
      h += '</div><div class="btnrow ansbtns"><button class="btn" data-act="acheck"' + (entered ? '' : ' disabled') + '>採点する' + (entered < nos.length && entered ? '（未入力 ' + (nos.length - entered) + ' 個は空欄として採点）' : '') + '</button>' + (entered ? '<button class="btn ghost" data-act="areset">入力を消す</button>' : '') + '</div></section>';
      return h;
    }
    /* 採点結果と診断 */
    var o = diagEval(e), q = o.q, GL = goalId(), gap = GL - o.got;
    h += '<section class="panel"><h2>' + esc(e.name) + 'の結果<small>' + (e.avg ? '全受験生の平均点 ' + e.avg + ' 点' + (e.avgRaw ? '（得点調整後。大問別の全国平均は調整前の値で、合計 ' + e.avgRaw + ' 点）' : '') : '追試験（全国の平均点と正答率は公表されていません）') + '</small></h2>';
    h += '<div class="dgtop"><p class="score"><span class="num">' + o.got + '</span><span class="sc-u">点</span><span class="sc-gap">' + (gap <= 0 ? '目標の' + GL + '点に届いています' : '目標の' + GL + '点まで、あと ' + gap + ' 点') + '</span></p>';
    h += '<div class="tblwrap"><table class="dtbl"><thead><tr><th>大問</th>' + [1, 2, 3, 4, 5].map(function (i) { return '<th>第' + i + '問</th>'; }).join('') + '</tr></thead><tbody><tr><th>あなた</th>' + o.dai.map(function (v) { return '<td class="num' + (v >= 16 ? ' good' : '') + '"><b>' + v + '</b></td>'; }).join('') + '</tr>' + (hasRate(e) ? '<tr><th>全国平均</th>' + o.nat.map(function (v) { return '<td class="num">' + v.toFixed(1) + '</td>'; }).join('') + '</tr>' : '') + '</tbody></table></div></div>';
    h += '<div class="btnrow"><button class="btn sm ghost" data-act="aedit">入力を直す</button><button class="btn sm ghost" data-act="areset">解き直す（入力を消す）</button><span class="note">得点は、上の記録にも保存しました。</span></div></section>';
    /* 手ごたえの4分類 */
    function pts(list) { return list.reduce(function (s, it) { return s + it.r.pt - it.got; }, 0); }
    h += '<section class="panel"><h2>手ごたえと結果</h2><div class="quad">' +
      '<div class="qd q-ok"><b>自信あり・正解</b><span class="num">' + q.sure_ok.length + '</span><small>実力で取れた問題</small></div>' +
      '<div class="qd q-luck"><b>迷った・正解</b><span class="num">' + q.unsure_ok.length + '</span><small>まぐれかも。次も取れるとは限らない</small></div>' +
      '<div class="qd q-bad"><b>自信あり・不正解</b><span class="num">' + q.sure_ng.length + '</span><small>思い込み。覚え方が間違っている（最優先）</small></div>' +
      '<div class="qd q-weak"><b>迷った・空欄で不正解</b><span class="num">' + q.weak.length + '</span><small>まだ身についていない</small></div></div>';
    if (q.sure_ng.length) h += '<h3 class="sub">自信があったのに間違えた問題</h3><ul class="simlist">' + q.sure_ng.map(function (it) { return itemLine(it, 'あなた ' + yourText(it) + ' / 正解 ' + keyText(keyOf(e.id, it.r))); }).join('') + '</ul>';
    if (q.unsure_ok.length) h += '<h3 class="sub">迷ったけれど正解した問題</h3><ul class="simlist">' + q.unsure_ok.map(function (it) { return itemLine(it, '迷って正解'); }).join('') + '</ul>';
    h += '</section>';
    /* 落とせなかった問題 */
    var must = o.items.filter(function (it) { return it.r.b === 'K' && it.st !== 'ok'; }).sort(function (a, b) { return b.r.sei - a.r.sei; });
    var mustS = o.items.filter(function (it) { return it.r.b === 'S' && it.st !== 'ok'; }).sort(function (a, b) { return b.r.sei - a.r.sei; });
    if (hasRate(e)) {
    h += '<section class="panel"><h2>落とせなかった問題<small>全国の正答率が高いのに落とした問題</small></h2>';
    if (!must.length && !mustS.length) h += '<p class="dgmsg">基本と標準の問題は、すべて取れています。発展の半分を目標にしましょう。</p>';
    else {
      h += '<p class="dgmsg">基本（正答率60%以上）で <b>−' + pts(must) + ' 点</b>、標準（40〜60%）で <b>−' + pts(mustS) + ' 点</b>。ここを取れば <b>' + (o.got + pts(must) + pts(mustS)) + ' 点</b>です。</p>';
      if (must.length) h += '<h3 class="sub">基本（受験生の6割以上が正解）</h3><ul class="simlist">' + must.map(function (it) { return itemLine(it, stLabel(it) + (it.conf === 'sure' ? '・自信あり' : it.conf === 'unsure' ? '・迷った' : '')); }).join('') + '</ul>';
      if (mustS.length) h += '<h3 class="sub">標準（受験生の4〜6割が正解）</h3><ul class="simlist">' + mustS.map(function (it) { return itemLine(it, stLabel(it) + (it.conf === 'sure' ? '・自信あり' : it.conf === 'unsure' ? '・迷った' : '')); }).join('') + '</ul>';
    }
    h += '</section>';
    }
    /* 難易度別・型別 */
    var hr = hasRate(e), easyMsg = '';
    h += '<section class="panel"><h2>' + (hr ? '難易度と型ごとの得点率<small>全国平均との比較</small>' : '型ごとの得点率<small>追試験は全国の正答率がないため、あなたの得点率だけを出します</small>') + '</h2><div class="tblwrap"><table class="dtbl"><thead><tr><th></th><th>あなた</th>' + (hr ? '<th>全国平均</th><th>差</th>' : '') + '</tr></thead><tbody>';
    var rateRow = function (lab, x, isK) {
      var me = x.got / x.tot * 100;
      if (!hr) return '<tr><th>' + lab + '<small>' + x.tot + '点分</small></th><td class="num"><b>' + me.toFixed(0) + '%</b></td></tr>';
      var nat = x.nat / x.tot * 100;
      if (isK && me < nat) easyMsg = '基本の問題の得点率が全国平均より低く、簡単な問題を落としています。知識の確認（一問一答・正誤問題）を優先しましょう。';
      return '<tr><th>' + lab + '<small>' + x.tot + '点分</small></th><td class="num"><b>' + me.toFixed(0) + '%</b></td><td class="num">' + nat.toFixed(0) + '%</td><td class="num' + (me >= nat ? ' good' : ' bad') + '">' + (me >= nat ? '+' : '') + (me - nat).toFixed(0) + '</td></tr>';
    };
    if (hr) C.bands.forEach(function (b) { var x = o.band[b.id]; if (x.tot) h += rateRow(difTag(b.id), x, b.id === 'K'); });
    ['A', 'B', 'C'].forEach(function (t) { var x = o.type[t]; if (x.tot) h += rateRow(tb(t), x, false); });
    h += '</tbody></table></div>' + (easyMsg ? '<p class="dgmsg">' + easyMsg + '</p>' : '') + (hr ? '' : '<p class="note">A 知識が低ければ一問一答と正誤問題、B 典型が低ければ解法の型と計算ドリル、C 思考が低ければ大問演習を優先します。</p>') + '</section>';
    /* 苦手な分野 */
    var us = Object.keys(o.unit).filter(function (u) { return o.unit[u].lost > 0; }).sort(function (a, b) { return (o.unit[b].must * 2 + o.unit[b].lost) - (o.unit[a].must * 2 + o.unit[a].lost); });
    if (us.length) {
      h += '<section class="panel"><h2>苦手な分野<small>' + (hasRate(e) ? '失点の多い単元（基本・標準の失点を重く見ています）' : '失点の多い単元') + '</small></h2><div class="cards">';
      us.slice(0, 6).forEach(function (u) {
        var x = o.unit[u];
        h += '<div class="card static"><span class="c-top"><span>' + esc(secOf(u).name) + '</span><span>−' + x.lost + ' / ' + x.tot + ' 点</span></span><b class="c-title">' + fx(UBY[u].name) + '</b><span class="c-text">' + (x.must ? '基本・標準で −' + x.must + ' 点' : (hasRate(e) ? '発展で落とした' : 'この回の失点')) + '</span><div class="btnrow"><button class="btn sm" data-act="unitgo" data-u="' + u + '">この単元を演習</button><a class="btn sm ghost" href="#unit-' + u + '">要点</a></div></div>';
      });
      h += '</div></section>';
    }
    /* 時間配分 */
    var sk = o.skipDai.reduce(function (s, v) { return s + v; }, 0);
    if (sk) {
      var late = o.skipDai[3] + o.skipDai[4];
      h += '<section class="panel"><h2>時間配分</h2><p class="dgmsg">空欄が ' + sk + ' 問（' + o.skipDai.map(function (v, i) { return v ? '第' + (i + 1) + '問 ' + v : ''; }).filter(Boolean).join('、') + '）。' +
        (late >= 2 ? '後半に空欄が多く、時間が足りなかった可能性があります。第1〜4問は各10分を目安に、1分考えて方針が立たない問題は飛ばしましょう。' : '空欄でもマークはしておきましょう。4択なら25%の確率で得点になります。') + '</p></section>';
    }
    /* 次にやること */
    var todo = [];
    if (q.sure_ng.length) todo.push('自信があったのに間違えた ' + q.sure_ng.length + ' 問は、覚え方が間違っています。解説と単元の要点を読み直してください（最優先）。');
    if (must.length) todo.push('基本の問題を ' + must.length + ' 問落としています。演習の「基本を15問」と一問一答で、取りこぼしをなくします。');
    if (q.unsure_ok.length) todo.push('迷って正解した ' + q.unsure_ok.length + ' 問は、次も取れるとは限りません。同じ単元の問題で確認しましょう。');
    if (us.length) todo.push('いちばん失点が多いのは「' + fx(UBY[us[0]].name).replace(/<[^>]+>/g, '') + '」。単元ページの要点を読み、演習で10問解きます。');
    if (!todo.length) todo.push('よくできています。次の過去問で、発展の問題を半分取れるかを確かめましょう。');
    h += '<section class="panel"><h2>次にやること</h2><ol class="points">' + todo.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></section>';
    /* すべての小問 */
    var view = o.items.slice(); if (DG.sort === 'rate' && hasRate(e)) view.sort(function (a, b) { return b.r.sei - a.r.sei; });
    h += '<section class="panel"><h2>すべての小問' + (hasRate(e) ? '<small>受験者 ' + esc(e.n) + ' 人の正答率と比べて</small>' : '') + '</h2>' + (hasRate(e) ? '<div class="tbar"><div class="chips"><button class="chip sm' + (DG.sort !== 'rate' ? ' on' : '') + '" data-act="dgsort" data-s="no">解答番号順</button><button class="chip sm' + (DG.sort === 'rate' ? ' on' : '') + '" data-act="dgsort" data-s="rate">正答率の高い順</button></div></div>' : '');
    h += '<div class="tblwrap"><table class="dtbl items dg"><thead><tr><th>大問</th><th>設問</th><th>番号</th><th>内容</th><th>単元</th><th>配点</th><th>あなた</th><th>正解</th><th>結果</th><th>全国の正答率</th><th>難易度</th></tr></thead><tbody>';
    var cum = 0;
    view.forEach(function (it) {
      var r = it.r, cls = it.st === 'ok' ? 'ok' : (it.st === 'blank' ? '' : (r.b === 'K' || r.b === 'S' ? 'ng must' : 'ng'));
      cum += r.pt; if (DG.sort === 'rate' && hasRate(e) && cum >= goalId() && cum - r.pt < goalId()) cls += ' line80';
      h += '<tr class="' + cls + '"><td class="num">第' + r.dai + '問</td><td>' + esc(r.q) + '</td><td class="num">' + esc(r.no) + '</td><td>' + esc(r.topic) + '</td><td><a href="#unit-' + r.u + '">' + fx(UBY[r.u].name) + '</a></td><td class="num">' + r.pt + '</td><td class="num">' + yourText(it) + (it.conf === 'unsure' ? '<small>迷</small>' : '') + '</td><td class="num">' + keyText(keyOf(e.id, r)) + '</td><td class="num"><b>' + stLabel(it) + '</b>' + (it.st === 'part' ? '<small>' + it.got + '点</small>' : '') + '</td>' + (r.sei != null ? '<td class="rt">' + rateBar(r.sei) + '<span class="num">' + r.sei.toFixed(0) + '%</span></td><td>' + difTag(r.b) + '</td>' : '<td class="num">—</td><td>—</td>') + '</tr>';
    });
    h += '</tbody></table></div><p class="note">' + (!hasRate(e) ? '追試験は全国の正答率が公表されていないため、正答率と難易度の欄は「—」です。' : DG.sort === 'rate' ? '太線の行までの配点の合計が' + goalId() + '点（目標）です。' : '赤い行は、基本・標準（全国の正答率40%以上）なのに落とした小問です。') + '</p></section>';
    return h;
  }
  /* 採点した結果を「解く順番と記録」にも残す */
  function recordDiag(e) {
    var A = ansOf(e.id), o = diagEval(e), list = S.exams[e.id] || (S.exams[e.id] = []);
    var rec = { date: today(), s: o.dai.slice(), min: 60, auto: true };
    if (A._ri != null && list[A._ri] && list[A._ri].auto) list[A._ri] = rec; else { list.push(rec); A._ri = list.length - 1; }
  }

  /* ---------- 画面: 問題図鑑（全問題の一覧・絞り込み。先生用の一覧と印刷も兼ねる） ---------- */
  /* 高校化学の教科書の順: 化学基礎 → 理論（状態 → 反応） → 無機 → 有機 → 高分子（→ 総合） */
  var BOOK = [
    { id: 'kiso', name: '化学基礎', units: ['atom', 'bond', 'mol', 'acidbase', 'redox'] },
    { id: 'state', name: '理論（状態）', units: ['gas', 'structure', 'solution'] },
    { id: 'react', name: '理論（反応）', units: ['thermo', 'electro', 'kinetics', 'equilibrium', 'ksp'] },
    { id: 'muki', name: '無機', units: ['inogen', 'inorx', 'ionsep', 'nonmetal', 'metal', 'tmetal'],
      parts: [['一般論', '周期表の位置から、単体・化合物の性質を予想する', ['inogen']], ['反応論', '無機の反応式を「型」から作る', ['inorx', 'ionsep']], ['元素各論', '元素ごとの性質を、一般論・反応論とつなげて覚える', ['nonmetal', 'metal', 'tmetal']]] },
    { id: 'yuki', name: '有機・高分子', units: ['orgbasic', 'aliphatic', 'aromatic', 'natural', 'polymer'] },
    { id: 'sogo', name: '総合', units: ['data'] }
  ];
  var BOOKNOTE = {
    kiso: '原子の構造・化学結合・物質量・酸と塩基・酸化還元。原子と結合は第1問の知識問題の土台、残りはすべての計算の土台で、第1問・第2問を中心に毎回どこかで使う。',
    state: '主に第1問。化学結合と結晶・気体・溶液。用語と性質の知識に、気体・溶液の典型計算が加わる。',
    react: '主に第2問。エンタルピー・電池と電気分解・反応速度・化学平衡・溶解度積。計算の型が点に直結する。',
    muki: '主に第3問。A と B で約 76 %。一般論 → 反応論 → 元素各論の順に学ぶと、暗記の量が減る。',
    yuki: '主に第4問。A と B で約 81 %。反応の流れと検出反応で点になる。',
    sogo: '主に第5問。C が最も多い。定義の翻訳とグラフ読解で取る。'
  };
  function secOf(uid) { return SECBY[USEC[uid]] || { name: '' }; }
  var UORD = {}, USEC = {}, SECBY = {};
  BOOK.forEach(function (b, bi) { SECBY[b.id] = b; b.units.forEach(function (u, ui) { UORD[u] = bi * 100 + ui; USEC[u] = b.id; }); });
  var TORD = { A: 0, B: 1, C: 2 }, BORD = { K: 0, S: 1, H: 2 };
  /* 単元の中の並び順を決めたいときは C.unitSeq[単元] に、問題 id か大問 id を順に並べる */
  function seqOf(q) { var s = C.unitSeq && C.unitSeq[q.u]; return s ? s.indexOf(q.set || q.id) : -1; }
  function bookCmp(a, b) {
    var sa = seqOf(a), sb = seqOf(b);
    return (UORD[a.u] - UORD[b.u]) || (a.u === b.u && sa >= 0 && sb >= 0 ? sa - sb : 0) || (TORD[a.t] - TORD[b.t]) || (BORD[bandQ(a)] - BORD[bandQ(b)]) ||
      String(a.set || '').localeCompare(String(b.set || '')) || ((a.si || 0) - (b.si || 0)) || String(a.id).localeCompare(String(b.id));
  }
  var ZK = { f: 'all', u: 'all', b: 'all', t: 'all', st: 'all', kind: 'all', kw: '', all: false, open: {} };
  function plainText(s) { return String(s || '').replace(/\{\{([^|]*)\|([^}]*)\}\}/g, '$1/$2').replace(/[_^{}]/g, ''); }
  function zkList() {
    var kw = ZK.kw.trim();
    return groupSets(C.questions.filter(function (q) {
      if (ZK.f !== 'all' && USEC[q.u] !== ZK.f) return false;
      if (ZK.u !== 'all' && q.u !== ZK.u) return false;
      if (ZK.b !== 'all' && bandQ(q) !== ZK.b) return false;
      if (ZK.t !== 'all' && q.t !== ZK.t) return false;
      if (ZK.st !== 'all') { var lo = lastOk(q.id); if (ZK.st === 'new' ? lo !== null : ZK.st === 'ok' ? lo !== true : lo !== false) return false; }
      if (ZK.kind === 'fig' && !(q.fig || q.gc || q.ill || q.lfig || q.tbl || q.ltbl)) return false;
      if (ZK.kind === 'set' && !q.set) return false;
      if (ZK.kind === 'vary' && !(q.fam || q.set)) return false;
      if (kw && plainText((q.lead || '') + q.q + ' ' + q.c.join(' ') + ' ' + UBY[q.u].name + ' ' + (q.setTitle || '')).indexOf(kw) < 0) return false;
      return true;
    }).sort(bookCmp));
  }
  function zkChips(key, opts) {
    return '<div class="chips">' + opts.map(function (o) { return '<button class="chip sm' + (ZK[key] === o[0] ? ' on' : '') + '" data-act="zkset" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function vZukan() {
    var list = zkList(), total = C.questions.length;
    var h = '<header class="ph-head"><p class="eyebrow">全 ' + total + ' 問</p><h1>問題図鑑</h1><p class="lead">このアプリのすべての問題を一覧できます。分野・単元・難易度・種類などで絞り込み、「解く」でその問題だけを解けます。「答えと解説」を押すと、その場で正解・解説・はじきの手順が開きます。</p></header>';
    /* 絞り込み */
    var units = [];
    BOOK.forEach(function (b) { if (ZK.f === 'all' || ZK.f === b.id) b.units.forEach(function (u) { if (UBY[u]) units.push(UBY[u]); }); });
    h += '<section class="panel noprint zkbar"><div class="form">';
    h += '<div class="frow"><span class="fl">分野</span>' + zkChips('f', [['all', 'すべて']].concat(BOOK.map(function (b) { return [b.id, b.name]; }))) + '</div>';
    h += '<div class="frow"><span class="fl">単元</span><select id="zk-u"><option value="all">すべての単元</option>' + units.map(function (u) { return '<option value="' + u.id + '"' + (ZK.u === u.id ? ' selected' : '') + '>' + esc(plainText(u.name)) + '</option>'; }).join('') + '</select></div>';
    h += '<div class="frow"><span class="fl">難易度</span>' + zkChips('b', [['all', 'すべて']].concat(C.bands.map(function (b) { return [b.id, b.name]; }))) + '</div>';
    h += '<div class="frow"><span class="fl">種類</span>' + zkChips('t', [['all', 'すべて'], ['A', 'A 知識'], ['B', 'B 典型'], ['C', 'C 思考']]) + '</div>';
    h += '<div class="frow"><span class="fl">状態</span>' + zkChips('st', [['all', 'すべて'], ['new', '未着手'], ['ok', '前回 正解'], ['ng', '前回 不正解']]) + '</div>';
    h += '<div class="frow"><span class="fl">形式</span>' + zkChips('kind', [['all', 'すべて'], ['fig', '図・グラフ・表あり'], ['set', '大問（リード文つき）'], ['vary', '数値が変わる']]) + '</div>';
    h += '<div class="frow"><span class="fl">検索</span><input type="text" id="zk-kw" value="' + esc(ZK.kw) + '" placeholder="例: 電気分解、浸透圧、フェノール"></div>';
    h += '<div class="frow end"><span class="avail"><b class="num">' + list.length + '</b> / ' + total + ' 問</span><button class="btn ghost" data-act="zkreset">条件をはずす</button>' +
      (list.length ? '<button class="btn ghost" data-act="zkgo">この ' + Math.min(list.length, 20) + ' 問を解く</button>' : '') +
      '<button class="btn ghost" data-act="zkall">' + (ZK.all ? '答えを閉じる' : '答えをすべて開く（先生用）') + '</button><button class="btn" data-act="tprint">印刷</button></div></div></section>';
    if (!list.length) return h + '<p class="note">条件に合う問題がありません。</p>';
    h += '<div class="zkgrid">';
    var perU = {}; list.forEach(function (q) { perU[q.u] = (perU[q.u] || 0) + 1; });
    var lastSec = null, lastU = null;
    list.forEach(function (q, i) {
      if (USEC[q.u] !== lastSec) { lastSec = USEC[q.u]; h += '<div class="zksec">' + esc(SECBY[lastSec].name) + '</div>'; }
      if (q.u !== lastU) { lastU = q.u; h += '<div class="zkunit">' + fx(UBY[q.u].name) + '<small>' + perU[q.u] + '問</small></div>'; }
      var lo = lastOk(q.id), open = ZK.all || ZK.open[q.id];
      var tags = [];
      if (q.fig || q.gc || q.ill || q.lfig) tags.push(q.gc ? 'グラフを選ぶ' : '図あり');
      if (q.tbl || q.ltbl) tags.push('表あり');
      if (q.set) tags.push('大問「' + fx(q.setTitle) + '」' + (q.si + 1) + '/3');
      if (q.fam && !q.set) tags.push(/^tf/.test(q.fam.id) ? '記述が変わる' : '数値が変わる');
      if (q.ce) tags.push('選択肢ごとの解説');
      h += '<article class="zk' + (open ? ' open' : '') + '"><div class="zkh"><span class="qst ' + (lo === true ? 'ok' : lo === false ? 'ng' : '') + '" title="前回の結果">' + (lo === true ? '○' : lo === false ? '×' : '−') + '</span>' + tb(q.t) + difTag(bandQ(q)) + '<span class="zku">' + fx(UBY[q.u].name) + '</span><code>' + esc(q.id) + '</code></div>';
      if (!open) {
        h += '<p class="zq">' + fx(q.q) + '</p>' + (tags.length ? '<p class="ztags">' + tags.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</p>' : '');
        h += '<div class="zkb noprint"><button class="btn sm" data-act="one" data-id="' + q.id + '">解く</button><button class="btn sm ghost" data-act="zkopen" data-id="' + q.id + '">答えと解説</button></div>';
      } else {
        h += (tags.length ? '<p class="ztags">' + tags.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</p>' : '');
        h += '<div class="tbody">' + qHTML(q, { no: i + 1 }) + choicesHTML(q, null, true) + '<section><h3>解説</h3><p>' + fxb(q.e) + '</p></section>' + ceHTML(q) + '<section class="kbox"><h3>捉え方</h3><p>' + fx(q.k) + '</p></section>' + solveAid(q) + '</div>';
        h += '<div class="zkb noprint"><button class="btn sm" data-act="one" data-id="' + q.id + '">解く</button>' + (ZK.all ? '' : '<button class="btn sm ghost" data-act="zkopen" data-id="' + q.id + '">閉じる</button>') + ((q.fam || q.set) ? '<button class="lnkbtn" data-act="treroll" data-id="' + q.id + '">別の数値の例</button>' : '') + '</div>';
      }
      h += '</article>';
    });
    return h + '</div>';
  }

  /* ---------- 記録のファイル保存・読み込み ---------- */
  function saveBackup() {
    var name = '化学共テラボ_記録_' + today() + '.json', data = JSON.stringify(S);
    function fallback() {
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); S.prefs.backup = today(); save(); }
      catch (e) { toast('この画面では保存できません。文字列のコピーを使ってください'); }
    }
    var cl = window.claude;
    if (cl && typeof cl.use === 'function') {
      cl.use('downloads').then(function (dl) {
        if (!dl) { fallback(); return; }
        dl.save({ filename: name, data: data }).then(function () { S.prefs.backup = today(); save(); toast('記録をファイルに保存しました'); rerender(); }, function (err) {
          var c = err && err.code; if (c === 'declined') return;
          toast(c === 'rate_limited' ? '保存の確認が開いています' : 'この画面では保存できません。文字列のコピーを使ってください');
        });
      }, fallback);
    } else fallback();
  }
  function importText(v) {
    try { var o = JSON.parse(v); if (!o || o.v !== 1 || typeof o.q !== 'object') throw new Error('x'); var b = blank(); Object.keys(b).forEach(function (k) { if (o[k] == null) o[k] = b[k]; }); S = o; save(); toast('読み込みました'); render(); return true; }
    catch (e) { toast('読み込めませんでした。このアプリで保存したファイル（文字列）を使ってください'); return false; }
  }

  /* ---------- 画面: 難易度と正答率 ---------- */
  function bandPts(rows) { var o = { K: 0, S: 0, H: 0 }; rows.forEach(function (r) { o[r.b] += r.pt; }); return o; }
  function svgBands() {
    var ex = C.itemRates, rowH = 40, W = 460, x0 = 96, H = ex.length * rowH + 34;
    var g = '<svg class="chart" viewBox="0 0 ' + (x0 + W + 150) + ' ' + H + '" role="img" aria-label="年度別の難易度別配点">';
    [0, 20, 40, 60, 80, 100].concat([50, 70, 90].filter(function (v) { return v === goalId(); })).forEach(function (v) { var x = x0 + v / 100 * W; g += '<line x1="' + x + '" x2="' + x + '" y1="4" y2="' + (H - 24) + '" class="' + (v === goalId() ? 'goal' : 'grid') + '"/><text x="' + x + '" y="' + (H - 8) + '" class="tick" text-anchor="middle">' + v + '</text>'; });
    ex.forEach(function (e, i) {
      var y = 8 + i * rowH, x = x0, rows = RROWS.filter(function (r) { return r.ex === e; }), o = bandPts(rows);
      g += '<text x="' + (x0 - 10) + '" y="' + (y + 18) + '" class="lab" text-anchor="end">' + esc(e.name) + '</text>';
      C.bands.forEach(function (b) {
        var w = o[b.id] / 100 * W;
        g += '<rect x="' + (x + 1) + '" y="' + y + '" width="' + Math.max(0, w - 2) + '" height="26" rx="3" class="bs-' + b.id + '"><title>' + esc(e.name) + ' ' + b.name + '（' + b.rule + '）' + o[b.id] + '点</title></rect>';
        if (w > 28) g += '<text x="' + (x + w / 2) + '" y="' + (y + 18) + '" class="bsv bsv-' + b.id + '" text-anchor="middle">' + o[b.id] + '</text>';
        x += w;
      });
      g += '<text x="' + (x0 + W + 12) + '" y="' + (y + 18) + '" class="lab2">平均点 ' + e.avg + '</text>';
    });
    return g + '</svg>';
  }
  function myBand() {
    var o = { K: { n: 0, c: 0 }, S: { n: 0, c: 0 }, H: { n: 0, c: 0 } };
    C.questions.forEach(function (q) { var r = S.q[q.id]; if (r && r.h.length) { var b = bandQ(q); o[b].n++; if (r.h[r.h.length - 1] === 1) o[b].c++; } });
    return o;
  }
  var DIF = { ex: null, sort: 'no' };
  function vDifficulty() {
    var ex = C.itemRates || [];
    if (!ex.length) return '<p class="note">データがありません。</p>';
    var h = '<header class="ph-head"><p class="eyebrow">本試験 2023〜2026年・全受験生のデータ</p><h1>難易度の分析</h1><p class="lead">大学入試センターが公表した本試験の小問別正答率をもとに、すべての小問を3段階の難易度に分けました。アプリの問題も、同じ単元・同じ型の本番の小問から正答率を推定して、同じ3段階で表示しています。ページの下に、小問ごとの正答率の表があります。</p></header>';
    /* 3段階の説明 */
    h += '<section class="sec"><h2>3つの難易度</h2><div class="cards c3">';
    C.bands.forEach(function (b) {
      var pts = ex.map(function (e) { return bandPts(RROWS.filter(function (r) { return r.ex === e; }))[b.id]; });
      var avg = pts.reduce(function (s, x) { return s + x; }, 0) / pts.length;
      var n = C.questions.filter(function (q) { return bandQ(q) === b.id; }).length;
      h += '<div class="card static"><span class="c-top">' + difTag(b.id) + '<span>' + b.rule + '</span></span><b class="c-title">1回あたり 平均 <span class="num">' + avg.toFixed(1) + '</span> 点</b><span class="c-text">' + esc(b.msg) + '</span><span class="c-cnt"><em>年度別 ' + pts.join('・') + ' 点</em></span><button class="btn sm ghost" data-act="preset" data-k="' + b.id + '">' + b.name + 'の問題を解く（' + n + '問）</button></div>';
    });
    h += '</div></section>';
    /* 年度別グラフと目標の取り方 */
    h += '<section class="panel"><h2>年度別の難易度の内訳<small>1回100点・太い縦線は目標の' + goalId() + '点</small></h2><div class="legend">' + C.bands.map(function (b) { return '<span><i class="lg bs-' + b.id + '"></i>' + b.name + '（' + b.rule + '）</span>'; }).join('') + '</div><div class="chartwrap">' + svgBands() + '</div>';
    h += '<div class="tblwrap"><table class="dtbl"><thead><tr><th>試験</th><th>基本</th><th>標準</th><th>発展</th><th>基本＋標準</th><th>' + goalId() + '点に必要な発展の得点</th><th>平均点</th></tr></thead><tbody>';
    ex.forEach(function (e) {
      var o = bandPts(RROWS.filter(function (r) { return r.ex === e; })), ks = o.K + o.S, need = Math.max(0, goalId() - ks);
      h += '<tr><th>' + esc(e.name) + '</th><td class="num">' + o.K + '</td><td class="num">' + o.S + '</td><td class="num">' + o.H + '</td><td class="num"><b>' + ks + '</b></td><td class="num">' + (need ? need + ' / ' + o.H + ' 点（' + Math.round(need / o.H * 100) + '%）' : '不要（基本と標準で' + goalId() + '点以上）') + '</td><td class="num">' + e.avg + (e.avgRaw ? '<small>（調整前 ' + e.avgRaw + '）</small>' : '') + '</td></tr>';
    });
    var gb = G().band;
    h += '</tbody></table></div><ul class="bul"><li>' + esc(G().short) + 'の目安は「基本 ' + pct(gb.K) + '%・標準 ' + pct(gb.S) + '%・発展 ' + pct(gb.H) + '%」。基本と標準だけで毎年63〜85点あります。</li><li>発展が多い年（2023・2025年）は平均点も低くなっています。表の右から2列目は、基本と標準を全部取ったときに、発展で必要な点です。</li><li><a class="lnk" href="#plan">目標ごとの戦略</a>で、5割〜9割それぞれの取り方を見られます。</li></ul></section>';
    /* 型 × 難易度 */
    h += '<section class="panel"><h2>A・B・C と難易度の関係<small>4年分の合計（点）</small></h2><div class="tblwrap"><table class="dtbl"><thead><tr><th>型</th><th>基本</th><th>標準</th><th>発展</th><th>平均正答率</th></tr></thead><tbody>';
    ['A', 'B', 'C'].forEach(function (t) {
      var o = bandPts(RROWS.filter(function (r) { return r.t === t; }));
      h += '<tr><th>' + tb(t) + '</th><td class="num">' + o.K + '</td><td class="num">' + o.S + '</td><td class="num">' + o.H + '</td><td class="num"><b>' + R_T[t].toFixed(1) + '%</b></td></tr>';
    });
    h += '</tbody></table></div><p class="note">知識（A）でも正答率が60%に届かない小問が多く、B と C の平均正答率はほとんど同じです。「種類」と「難しさ」は別の軸なので、両方で弱点を見ます。</p></section>';
    /* 単元別 */
    var us = C.units.filter(function (u) { return R_U[u.id] != null; }).sort(function (a, b) { return R_U[a.id] - R_U[b.id]; });
    h += '<section class="panel"><h2>単元ごとの本番の正答率<small>低い順・配点で重みづけ</small></h2><ul class="ulist">';
    us.forEach(function (u) {
      var n = RROWS.filter(function (r) { return r.u === u.id; }).length, p = R_U[u.id];
      h += '<li><a href="#unit-' + u.id + '">' + fx(u.name) + '</a>' + rateBar(p) + '<b class="num">' + p.toFixed(0) + '%</b><small>' + n + '問</small></li>';
    });
    h += '</ul></section>';
    /* 小問別の正答率（正解は出さない） */
    if (!DIF.ex) DIF.ex = ex[ex.length - 1].id;
    var e = ex.filter(function (x) { return x.id === DIF.ex; })[0] || ex[ex.length - 1];
    var rows = RROWS.filter(function (r) { return r.ex === e; }).slice();
    if (DIF.sort === 'rate') rows.sort(function (a, b) { return b.sei - a.sei; });
    h += '<section class="panel" id="items"><h2>小問別の正答率<small>' + esc(e.name) + '・受験者 ' + esc(e.n) + ' 人・平均点 ' + e.avg + '</small></h2><div class="tbar"><div class="chips">';
    ex.forEach(function (x) { h += '<button class="chip sm' + (x.id === e.id ? ' on' : '') + '" data-act="difex" data-e="' + x.id + '">' + esc(x.name) + '</button>'; });
    h += '</div><div class="chips"><button class="chip sm' + (DIF.sort !== 'rate' ? ' on' : '') + '" data-act="difsort" data-s="no">解答番号順</button><button class="chip sm' + (DIF.sort === 'rate' ? ' on' : '') + '" data-act="difsort" data-s="rate">正答率の高い順</button></div><button class="btn sm ghost" data-act="difcsv">4年分を CSV で保存</button></div>';
    h += '<div class="tblwrap"><table class="dtbl items"><thead><tr><th>大問</th><th>設問</th><th>番号</th><th>内容</th><th>単元</th><th>型</th><th>配点</th><th>正答率</th><th>得点率</th><th>難易度</th></tr></thead><tbody>';
    var cum = 0;
    rows.forEach(function (r) {
      cum += r.pt;
      var line = DIF.sort === 'rate' && cum >= goalId() && cum - r.pt < goalId();
      h += '<tr' + (line ? ' class="line80"' : '') + '><td class="num">第' + r.dai + '問</td><td>' + esc(r.q) + '</td><td class="num">' + esc(r.no) + '</td><td>' + esc(r.topic) + '</td><td><a href="#unit-' + r.u + '">' + fx(UBY[r.u].name) + '</a></td><td>' + tb(r.t) + '</td><td class="num">' + r.pt + '</td><td class="rt">' + rateBar(r.sei) + '<span class="num">' + r.sei.toFixed(1) + '%</span></td><td class="num">' + r.tok.toFixed(1) + '%</td><td>' + difTag(r.b) + '</td></tr>';
    });
    h += '</tbody></table></div><p class="note">' + (DIF.sort === 'rate' ? '太線の行までの配点の合計が' + goalId() + '点（目標）です。この行より上の小問を取れば、目標に届きます。' : '正答率は完全に正解した人の割合、得点率は部分点を含む平均の割合です。自分の解答を入れて比べるときは「解く順番と記録」のタブへ。') + '</p></section>';
    /* 出典 */
    h += '<section class="panel"><h2>データの出典</h2><ul class="bul">' + (C.rateSources || []).map(function (s) { return '<li>' + esc(s.name) + '<small>（' + esc(s.note) + '）</small></li>'; }).join('') + '<li>単元と A・B・C の分類、難易度の区切り（60%・40%）は、このアプリによるものです。2025年は新課程の第1〜5問のみを集計しています。</li></ul></section>';
    return h;
  }
  function itemsCSV() {
    var head = ['試験', '大問', '設問', '解答番号', '配点', '正答率(%)', '得点率(%)', '難易度', '型', '単元', '内容'];
    var lines = [head.join(',')];
    RROWS.forEach(function (r) {
      lines.push([r.ex.name, '第' + r.dai + '問', r.q, r.no, r.pt, r.sei, r.tok, BBY[r.b].name, r.t, fx(UBY[r.u].name).replace(/<[^>]+>/g, ''), r.topic].map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','));
    });
    return '﻿' + lines.join('\r\n');
  }
  function saveCSV() {
    var name = '共通テスト化学_小問別正答率_2023-2026.csv', data = itemsCSV();
    function fallback() {
      try {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'text/csv' })); a.download = name;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      } catch (e) { toast('この画面では保存できません'); }
    }
    var cl = window.claude;
    if (cl && typeof cl.use === 'function') {
      cl.use('downloads').then(function (d) {
        if (!d) { fallback(); return; }
        d.save({ filename: name, data: data }).then(function () { toast('CSV を保存しました'); }, function (err) {
          var c = err && err.code;
          if (c === 'declined') return;
          toast(c === 'rate_limited' ? '保存の確認が開いています' : 'この画面では保存できません');
        });
      }, fallback);
    } else fallback();
  }

  /* ---------- 画面: 単元マップ ---------- */
  function vUnits() {
    var h = '<header class="ph-head"><p class="eyebrow">単元マップ</p><h1>単元から選ぶ</h1><p class="lead">ホームのレーダーチャートと同じ 6 分野です。★は8回分での出題の多さ、バーは最近解いた問題の正答率です。</p></header>';
    function card(uid) {
      var u = UBY[uid]; if (!u) return '';
      var st = unitStats(u.id);
      var cnt = { A: 0, B: 0, C: 0 }; C.questions.forEach(function (q) { if (q.u === u.id) cnt[q.t]++; });
      return '<a class="card" href="#unit-' + u.id + '"><span class="c-top">' + stars(u.star) + '<span>' + esc(u.freq) + '</span></span><b class="c-title">' + fx(u.name) + '</b>' +
        '<span class="c-cnt"><i class="k-A">A ' + cnt.A + '</i><i class="k-B">B ' + cnt.B + '</i><i class="k-C">C ' + cnt.C + '</i><em>' + (st.n ? '正答率 ' + pct(st.c / st.n) + '%' : '未着手') + '</em></span>' + meter(st.n ? st.c / st.n : 0, 'm-unit') + (R_U[u.id] != null ? '<span class="c-text">本番の正答率 平均 ' + R_U[u.id].toFixed(0) + '%</span>' : '') + '</a>';
    }
    BOOK.forEach(function (b) {
      var m = mastery(function (q) { return b.units.indexOf(q.u) >= 0; });
      h += '<section class="sec"><h2>' + esc(b.name) + '<small>理解度 ' + pct(m.v) + '%（' + m.c + ' / ' + m.total + ' 問）</small></h2><p class="note">' + esc(BOOKNOTE[b.id] || '') + '</p>';
      if (b.parts) b.parts.forEach(function (pt) { h += '<h3 class="setgrp">' + esc(pt[0]) + '<small>' + esc(pt[1]) + '</small></h3><div class="cards ucards">' + pt[2].map(card).join('') + '</div>'; });
      else h += '<div class="cards ucards">' + b.units.map(card).join('') + '</div>';
      h += '</section>';
    });
    return h;
  }
  /* タイトルの横の「前へ・次へ」（単元はレーダーの分野順、型は番号順） */
  function pgNav(list, id, kind, nameOf) {
    var i = list.indexOf(id), pv = list[i - 1], nx = list[i + 1];
    function a(t, cls, sym, lab) {
      if (!t) return '<span class="pgbtn off" aria-hidden="true">' + sym + '</span>';
      return '<a class="pgbtn ' + cls + '" href="#' + kind + '-' + t + '" title="' + lab + '：' + esc(nameOf(t)) + '" aria-label="' + lab + '：' + esc(nameOf(t)) + '">' + sym + '</a>';
    }
    return '<span class="pgnav">' + a(pv, 'prev', '‹', kind === 'unit' ? '前の単元' : kind === 'column' ? '前のコラム' : '前の型') + '<span class="pgpos num">' + (i + 1) + ' / ' + list.length + '</span>' + a(nx, 'next', '›', kind === 'unit' ? '次の単元' : kind === 'column' ? '次のコラム' : '次の型') + '</span>';
  }
  function plainName(s) { return String(s).replace(/_\{?(\d+)\}?/g, '$1').replace(/\^\{?([^}\s]*)\}?/g, '$1'); }
  function vUnit(id) {
    var u = UBY[id]; if (!u) return vUnits();
    var qs = C.questions.filter(function (q) { return q.u === id; });
    var gens = C.generators.filter(function (g) { return g.u === id; });
    var ufl = unitFlash(id);
    var h = '<a class="back" href="#units">← 単元マップ</a>';
    h += '<header class="ph-head"><p class="eyebrow">' + esc(secOf(id).name) + '　' + stars(u.star) + '　' + esc(u.freq) + '</p><div class="h1row"><h1>' + fx(u.name) + '</h1>' + pgNav([].concat.apply([], BOOK.map(function (b) { return b.units; })), id, 'unit', function (t) { return plainName(UBY[t].name); }) + '</div><p class="lead">' + fx(u.why) + '</p></header>';
    h += '<div class="ustat">';
    ['A', 'B', 'C'].forEach(function (t) { var st = statsFor(function (q) { return q.u === id && q.t === t; }); h += '<div>' + tb(t) + '<span class="num">' + (st.n ? pct(st.c / st.n) + '%' : '—') + '</span><small>' + st.n + '/' + st.total + '問</small></div>'; });
    C.bands.forEach(function (b) { var st = statsFor(function (q) { return q.u === id && bandQ(q) === b.id; }); if (st.total) h += '<div>' + difTag(b.id) + '<span class="num">' + (st.n ? pct(st.c / st.n) + '%' : '—') + '</span><small>' + st.n + '/' + st.total + '問</small></div>'; });
    h += '</div>';
    h += '<section class="panel"><h2>まず押さえる要点</h2><ol class="points">' + u.points.map(function (p) { return '<li>' + fxb(p) + '</li>'; }).join('') + '</ol></section>';
    if (UNIT_ILL[id]) { var ills = UNIT_ILL[id].map(function (n) { return C.draw.ill(n); }), wide = ills.some(function (x) { var m = /viewBox="0 0 (\d+)/.exec(x); return m && Number(m[1]) >= 500; }); h += '<section class="panel"><h2>図で確認</h2><div class="ills' + (wide ? ' pills' : '') + '">' + ills.join('') + '</div></section>'; }
    if (UNIT_HJ[id]) h += '<section class="panel">' + hajikiRow(UNIT_HJ[id], 'この単元で使うはじき公式').replace('<section class="hjsec">', '<div class="hjsec">').replace(/<\/section>$/, '</div>') + '<a class="lnk" href="#pattern-' + (HJPAT[UNIT_HJ[id][0]] || 'P01') + '">解法の型のページで、隠して練習する</a></section>';
    h += '<section class="panel"><h2>この単元で使う解法の型</h2><div class="pminis">' + u.patterns.map(function (p) { return patternMini(p, false); }).join('') + '</div></section>';
    h += '<section class="panel"><h2>演習</h2><div class="btnrow">' +
      '<button class="btn" data-act="unitgo" data-u="' + id + '">全部（' + qs.length + '問）</button>';
    ['A', 'B', 'C'].forEach(function (t) { var n = qs.filter(function (q) { return q.t === t; }).length; if (n) h += '<button class="btn ghost" data-act="unitgo" data-u="' + id + '" data-t="' + t + '">' + t + ' ' + C.types[t].name + '（' + n + '）</button>'; });
    C.bands.forEach(function (b) { var n = qs.filter(function (q) { return bandQ(q) === b.id; }).length; if (n) h += '<button class="btn ghost" data-act="unitgo" data-u="' + id + '" data-b="' + b.id + '">' + b.name + '（' + n + '）</button>'; });
    if (gens.length) h += '<button class="btn ghost" data-act="drillunit" data-u="' + id + '">計算ドリル 10問</button>';
    if (ufl.length) h += '<button class="btn ghost" data-act="flashunit" data-u="' + id + '">この単元の一問一答（' + ufl.length + '枚）</button>';
    h += '</div><ul class="qlist">';
    qs.forEach(function (q) {
      var lo = lastOk(q.id);
      h += '<li><span class="qst ' + (lo === true ? 'ok' : lo === false ? 'ng' : '') + '">' + (lo === true ? '○' : lo === false ? '×' : '−') + '</span>' + tb(q.t) + difTag(bandQ(q)) + '<button class="qlink" data-act="one" data-id="' + q.id + '">' + fx(q.q.split('\n')[0]) + '</button></li>';
    });
    h += '</ul></section>';
    var real = RROWS.filter(function (r) { return r.u === id; });
    if (real.length) {
      h += '<section class="panel"><h2>本番での出題と正答率<small>2023〜2026年 本試・全受験生</small></h2><ul class="simlist">' + real.map(function (r) {
        return '<li><span class="sl-ex">' + esc(rowLabel(r)) + '</span><span class="sl-t">' + esc(r.topic) + ' ' + tb(r.t) + '</span>' + rateBar(r.sei) + '<b class="num">' + r.sei.toFixed(0) + '%</b></li>';
      }).join('') + '</ul><p class="note">平均 ' + R_U[id].toFixed(0) + '%（全体の平均 ' + R_ALL.toFixed(0) + '%）。<a class="lnk" href="#difficulty">難易度と正答率のページへ</a></p></section>';
    }
    return h;
  }

  /* ---------- 画面: コラム ---------- */
  var COLS = C.columns || [], COLBY = {}; COLS.forEach(function (c) { COLBY[c.id] = c; });
  function vColumns() {
    var h = '<header class="ph-head"><p class="eyebrow">学ぶ</p><h1>コラム</h1><p class="lead">知っていると化学の見え方が変わる話と、共通テストで命拾いする知恵を集めました。問題を解く手を止めて、ときどき読んでください。</p></header>';
    (C.columnGroups || []).forEach(function (g) {
      h += '<section class="sec"><h2>' + esc(g.name) + '</h2><p class="note">' + esc(g.note) + '</p><div class="cards colcards">';
      COLS.filter(function (c) { return c.grp === g.id; }).forEach(function (c) {
        h += '<a class="card" href="#column-' + c.id + '"><b class="c-title">' + fx(c.t) + '</b><span class="c-text">' + fx(c.lead) + '</span></a>';
      });
      h += '</div></section>';
    });
    return h;
  }
  /* 電気陰性度の周期表（ポーリングの値） */
  var EN = [
    [['H', 2.2]],
    [['Li', 1.0], ['Be', 1.6], ['B', 2.0], ['C', 2.6], ['N', 3.0], ['O', 3.4], ['F', 4.0]],
    [['Na', 0.9], ['Mg', 1.3], ['Al', 1.6], ['Si', 1.9], ['P', 2.2], ['S', 2.6], ['Cl', 3.2]],
    [['K', 0.8], ['Ca', 1.0], ['Ga', 1.8], ['Ge', 2.0], ['As', 2.2], ['Se', 2.6], ['Br', 3.0]],
    [['Rb', 0.8], ['Sr', 1.0], ['In', 1.8], ['Sn', 2.0], ['Sb', 2.1], ['Te', 2.1], ['I', 2.7]]
  ];
  function enCell(e) { var a = Math.max(0, Math.min(1, (e[1] - 0.7) / 3.3)); return '<td style="--a:' + a.toFixed(2) + '"' + (a > 0.55 ? ' class="dk"' : '') + '><b>' + e[0] + '</b><span class="num">' + e[1].toFixed(1) + '</span></td>'; }
  function enFig() {
    var h = '<figure class="enfig"><div class="enwrap"><table class="entbl"><caption>典型元素の電気陰性度（ポーリングの値）。色が濃いほど大きい</caption><thead><tr><th scope="col">周期＼族</th>' + ['1', '2', '13', '14', '15', '16', '17'].map(function (g) { return '<th scope="col">' + g + '</th>'; }).join('') + '</tr></thead><tbody>';
    EN.forEach(function (row, i) {
      h += '<tr><th scope="row">' + (i + 1) + '</th>';
      if (i === 0) h += enCell(row[0]) + '<td class="na" colspan="6"></td>';
      else h += row.map(enCell).join('');
      h += '</tr>';
    });
    h += '</tbody></table></div><p class="enarrow"><span>右へ: 陽子が増える → 大きくなる</span><span>上へ: 核に近い → 大きくなる</span></p>';
    h += '<p class="note">遷移元素の例: Fe 1.8、Cu 1.9、Zn 1.7、Ag 1.9、Au 2.5（金属の中では Ag・Au・Cu が大きい）</p></figure>';
    return h;
  }
  function vColumn(id) {
    var c = COLBY[id]; if (!c) return vColumns();
    var g = (C.columnGroups || []).filter(function (x) { return x.id === c.grp; })[0] || { name: '' };
    var h = '<a class="back" href="#column">← コラム</a>';
    h += '<header class="ph-head"><p class="eyebrow">コラム　' + esc(g.name.split(' ―')[0]) + '</p><div class="h1row"><h1>' + fx(c.t) + '</h1>' + pgNav(COLS.map(function (x) { return x.id; }), id, 'column', function (t) { return plainText(COLBY[t].t); }) + '</div><p class="lead">' + fx(c.lead) + '</p></header>';
    h += '<article class="panel colbody">';
    c.secs.forEach(function (sc) {
      if (sc.box) { h += '<div class="altbox colbox"><b>' + fx(sc.box.t) + '</b><ul>' + sc.box.items.map(function (x) { return '<li>' + fx(x) + '</li>'; }).join('') + '</ul></div>'; return; }
      h += '<section' + (sc.why ? ' class="colwhy"' : '') + '>' + (sc.h ? '<h2>' + (sc.why ? '<span class="whytag">なぜ？</span>' : '') + fx(sc.h) + '</h2>' : '');
      (sc.p || []).forEach(function (x) { h += '<p>' + fxb(x) + '</p>'; });
      if (sc.list) h += '<ul class="collist">' + sc.list.map(function (x) { return '<li>' + fx(x) + '</li>'; }).join('') + '</ul>';
      if (sc.ill || sc.graph) h += '<figure class="colfig">' + (sc.ill ? (sc.illW ? C.draw.ill(sc.ill).replace('<svg ', '<svg style="max-width:' + sc.illW + 'px" ') : C.draw.ill(sc.ill)) : '') + (sc.graph ? '<div class="figw">' + C.draw.fig(sc.graph) + '</div>' : '') + (sc.cap ? '<figcaption>' + fx(sc.cap) + '</figcaption>' : '') + '</figure>';
      if (sc.fig === 'en') h += enFig();
      if (sc.tbl) h += '<div class="ptbl"><table><thead><tr>' + sc.tbl.head.map(function (x) { return '<th scope="col">' + fx(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        sc.tbl.rows.map(function (r) { return '<tr>' + r.map(function (x, i) { return i ? '<td>' + fx(x) + '</td>' : '<th scope="row">' + fx(x) + '</th>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      if (sc.ana) h += '<aside class="colana"><b>' + fx(sc.ana.t || 'たとえるなら') + '</b><p>' + fx(sc.ana.b) + '</p></aside>';
      if (sc.trivia) h += '<aside class="coltrivia"><b>' + fx(sc.trivia.t) + '</b><p>' + fx(sc.trivia.b) + '</p></aside>';
      if (sc.think) h += '<details class="colthink"><summary><span class="thinktag">考えてみよう</span>' + fx(sc.think.q) + '</summary><p><b>答え</b>' + fxb(sc.think.a) + '</p></details>';
      h += '</section>';
    });
    if (c.units && c.units.length) h += '<p class="uses">関係する単元: ' + c.units.filter(function (u) { return UBY[u]; }).map(function (u) { return '<a href="#unit-' + u + '">' + fx(UBY[u].name) + '</a>'; }).join('、') + '</p>';
    h += '</article>';
    return h;
  }

  /* ---------- 画面: 解法の型 ---------- */
  function vPatterns() {
    var h = '<header class="ph-head"><p class="eyebrow">一般化・抽象化</p><h1>解法の型</h1><p class="lead">共通テストの計算と判断は、ここにある' + C.patterns.length + 'の型の組み合わせでできています。問題を見たら、まず使う型の名前を言えるようにします。計算の4つの型（モル・濃度・反応速度・電気）には、はじき公式がついています。</p></header>';
    var groups = [];
    C.patterns.forEach(function (p) { if (groups.indexOf(p.group) < 0) groups.push(p.group); });
    groups.forEach(function (g) {
      h += '<section class="sec"><h2>' + esc(g) + '</h2><div class="cards">';
      C.patterns.filter(function (p) { return p.group === g; }).forEach(function (p) {
        var n = C.questions.filter(function (q) { return q.p.indexOf(p.id) >= 0; }).length;
        h += '<a class="card" href="#pattern-' + p.id + '"><span class="c-top"><span class="pid">' + p.id + '</span><span>' + (n ? n + ' 問' : '') + '</span></span><b class="c-title">' + fx(p.name) + '</b><span class="c-text">' + fx(p.cue) + '</span>' + (PAT_GROUP[p.id] ? '<span class="c-hj">' + C.hajiki.filter(function (x) { return x.group === PAT_GROUP[p.id]; }).map(function (hh) { return C.draw.hajiki(hh, null, false); }).join('') + '</span>' : '') + '</a>';
      });
      h += '</div></section>';
    });
    return h;
  }
  function vPattern(id) {
    var p = PBY[id]; if (!p) return vPatterns();
    var qs = C.questions.filter(function (q) { return q.p.indexOf(id) >= 0; });
    var us = C.units.filter(function (u) { return u.patterns.indexOf(id) >= 0; });
    var h = '<a class="back" href="#patterns">← 解法の型</a>';
    h += '<header class="ph-head"><p class="eyebrow">' + p.id + '　' + esc(p.group) + '</p><div class="h1row"><h1>' + fx(p.name) + '</h1>' + pgNav(C.patterns.map(function (x) { return x.id; }), id, 'pattern', function (t) { return t + ' ' + plainName(PBY[t].name); }) + '</div></header>';
    h += '<section class="panel pattern"><div class="cuebox"><b>こんな問題で使う（合図）</b><p>' + fx(p.cue) + '</p></div>';
    h += '<h2>手順</h2><ol class="steps">' + p.steps.map(function (s) { return '<li>' + fxb(s) + '</li>'; }).join('') + '</ol>';
    if (p.alt) h += '<div class="altbox"><b>' + esc(p.alt.t) + '</b><p>' + fx(p.alt.b) + '</p></div>';
    if (p.ills) h += '<h2>図で確認</h2><div class="ills pills">' + p.ills.map(function (n) { return C.draw.ill(n); }).join('') + '</div>';
    if (p.chains) h += '<h2>' + fx(p.chainsT || '反応の流れ') + '</h2><div class="chains">' + p.chains.map(function (g) {
      return '<section class="chg"><h3>' + fx(g.t) + '</h3>' + g.rows.map(function (r) {
        return '<div class="chain">' + r.map(function (x, i) {
          if (i % 2 === 0) return '<span class="chn">' + fx(x) + '</span>';
          var lab = String(x).split('\n');
          return '<span class="cha"><small>' + fx(lab[0]) + '</small><i aria-hidden="true">→</i>' + (lab[1] ? '<em>' + fx(lab[1]) + '</em>' : '') + '</span>';
        }).join('') + '</div>';
      }).join('') + '</section>';
    }).join('') + '</div>';
    var shHTML = p.sheet ? '<h2>' + fx(p.sheetT || '整理表') + '</h2><div class="sheet' + (p.sheetCols === 1 ? ' one' : '') + '">' + p.sheet.map(function (cd) {
      return '<section class="shc"><h3>' + fx(cd.h) + '</h3><table class="sht"><tbody>' + cd.rows.map(function (r) { return '<tr><th scope="row">' + fx(r[0]) + '</th><td>' + fx(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></section>';
    }).join('') + '</div>' : '';
    var tbHTML = (p.tables || []).map(function (t) {
      return '<div class="ptbl"><table><caption>' + fx(t.cap) + '</caption><thead><tr>' + t.head.map(function (x) { return '<th scope="col">' + fx(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i ? '<td>' + fx(c) + '</td>' : '<th scope="row">' + fx(c) + '</th>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    }).join('');
    h += p.tablesFirst ? tbHTML + shHTML : shHTML + tbHTML;
    h += hjTool(id);
    h += '<h2>例題</h2><p class="ex">' + fxb(p.example) + '</p>';
    if (p.exhs) h += hsHTML(p.exhs, '解き方' + (p.exhsT ? '：' + p.exhsT : ''));
    h += '<h2>よくあるミス</h2><ul class="traps">' + p.traps.map(function (t) { return '<li>' + fx(t) + '</li>'; }).join('') + '</ul>';
    if (PAT_HJ[id] && !p.exhs) h += hajikiRow(PAT_HJ[id], 'はじき公式で計算する');
    if (us.length) h += '<p class="uses">使う単元: ' + us.map(function (u) { return '<a href="#unit-' + u.id + '">' + fx(u.name) + '</a>'; }).join('、') + '</p>';
    h += '<div class="btnrow">' + (qs.length ? '<button class="btn" data-act="patgo" data-p="' + id + '">この型の問題を解く（' + qs.length + '問）</button>' : '') + (PAT_GROUP[id] ? '<button class="btn ghost" data-act="hjdrill">はじき公式ドリル 10問</button>' : '') + '</div></section>';
    return h;
  }

  /* ---------- 画面: はじき公式 ---------- */
  var HJ = {};
  function hjTool(pid) {
    var gid = PAT_GROUP[pid]; if (!gid) return '';
    var gr = (C.hajikiGroups || []).filter(function (g) { return g.id === gid; })[0], list = C.hajiki.filter(function (x) { return x.group === gid; });
    var h = '<h2>はじき公式</h2><p class="note">' + (gr ? fx(gr.desc) + ' ' : '') + '円の中は「上 ＝ 左下 × 右下」。求めたい量のところを押すと、そこが隠れて式が出ます。上下に分かれていれば割り算、横に並んでいれば掛け算。もう一度押すと元にもどります。</p>';
    if (gid === 'elec') h += '<div class="hjlink">' + hjCard(HBY.kyas) + '<div class="hjarrow" aria-label="C と F の換算"><span>× 96500</span><i class="al">←</i><i class="ar">→</i><span>÷ 96500</span><small>' + fx('{{C|96500}} = F') + '<br>' + fx('F × 96500 = C') + '</small></div>' + hjCard(HBY.fight) + '</div>';
    else h += '<div class="hjgrid">' + list.map(hjCard).join('') + '</div>';
    if (gid === 'mol') h += '<p class="hub"><b>つなぎ方</b>個 ⇄ <em>mol</em> ⇄ g、<em>mol</em> ⇄ L。どの量も一度 mol にしてから、目的の量に変えます。</p>';
    return h;
  }
  function hjCard(hh) {
    var hide = HJ[hh.id] || null;
    return '<div class="hjcard">' + C.draw.hajiki(hh, hide, true) + '<div class="hjtx"><b>' + esc(hh.name) + '</b><p class="hjf">' + fx(C.draw.hajikiFormula(hh, hide)) + '</p><p class="note">' + fx(hh.note) + '</p><p class="hjex"><span>例</span>' + fx(hh.ex) + '</p></div></div>';
  }
  function vHajiki() {
    var h = '<header class="ph-head"><p class="eyebrow">計算の入り口</p><h1>はじき公式</h1><p class="lead">円の中は「上 ＝ 左下 × 右下」。求めたい量のところを押すと、そこが隠れて式が出ます。上下に分かれていれば割り算、横に並んでいれば掛け算です。もう一度押すと元に戻ります。</p></header>';
    (C.hajikiGroups || []).forEach(function (gr) {
      var list = C.hajiki.filter(function (x) { return x.group === gr.id; });
      h += '<section class="panel"><h2>' + esc(gr.name) + '</h2><p class="note">' + fx(gr.desc) + '</p>';
      if (gr.id === 'elec') {
        h += '<div class="hjlink">' + hjCard(HBY.kyas) + '<div class="hjarrow" aria-label="C と F の換算"><span>× 96500</span><i class="al">←</i><i class="ar">→</i><span>÷ 96500</span><small>' + fx('{{C|96500}} = F') + '<br>' + fx('F × 96500 = C') + '</small></div>' + hjCard(HBY.fight) + '</div>';
      } else {
        h += '<div class="hjgrid">' + list.map(hjCard).join('') + '</div>';
      }
      if (gr.id === 'mol') h += '<p class="hub"><b>つなぎ方</b>個 ⇄ <em>mol</em> ⇄ g、<em>mol</em> ⇄ L。どの量も一度 mol にしてから、目的の量に変えます。</p>';
      if (gr.id === 'mol' && PBY.P01.exhs) h += '<div class="flow"><p class="flowt"><b>解き方はいつも同じ</b>はじき → 係数の比 → はじき</p>' + hsHTML(PBY.P01.exhs, '例: ' + PBY.P01.example) + '</div>';
      if (gr.id === 'elec' && PBY.P10.exhs) h += '<div class="flow"><p class="flowt"><b>電気分解の3ステップ</b>1. 生成物チェック（価数も）→ 2. キャスで C、96500 で割って F → 3. ファイトモルカーで mol、はじきで g・L</p>' + hsHTML(PBY.P10.exhs, '例: ' + PBY.P10.example) + '<div class="altbox"><b>' + esc(PBY.P10.alt.t) + '</b><p>' + fx(PBY.P10.alt.b) + '</p></div></div>';
      h += '</section>';
    });
    h += '<section class="panel"><h2>練習</h2><p class="note">はじき図を使う基本の計算を、数値を変えて出題します。解説にははじき図がつきます。</p><div class="btnrow"><button class="btn" data-act="hjdrill">はじき公式ドリル 10問</button><button class="btn ghost" data-act="patgo" data-p="P01">はじき → 比 → はじき の問題</button><button class="btn ghost" data-act="patgo" data-p="P10">電気分解の問題</button></div></section>';
    return h;
  }

  /* ---------- 画面: 大問演習 ---------- */
  /* 初見の題材（教科書で詳しく扱わない題材をリード文で説明する大問） */
  function isNewSet(st) { return st.fresh != null ? !!st.fresh : /^cm/.test(st.id); }
  function vSets() {
    var h = '<header class="ph-head"><p class="eyebrow">思考（C）の練習</p><h1>大問演習</h1><p class="lead">本番の第5問のように、リード文と資料（グラフ・表）を読み、連動する3問に答えます。初めて見る定義やデータを、知っている解き方に結びつける練習です。数値は出すたびに変わります。</p></header>';
    var nNew = (C.csets || []).filter(isNewSet).length;
    h += '<section class="sec"><h2>どれから解くか迷ったら</h2><div class="btnrow"><button class="btn" data-act="setrand">おすすめの大問を2題（約15分）</button>' + (nNew ? '<button class="btn ghost" data-act="setrand" data-k="new">初見の題材から2題</button>' : '') + '</div><p class="note">まだ解いていない大問、正答の少ない大問から選びます。本番の時間配分は、大問1題あたり7〜8分が目安です。「初見」の印は、質量分析・X線回折・溶媒抽出など、教科書では詳しく扱わない題材をリード文で説明する大問です（' + nNew + '題）。初めて見る題材でも、リード文を式や図に直せば解けることを練習します。</p></section>';
    h += '<section class="sec"><h2>大問を選ぶ<small>' + (C.csets || []).length + '題・各3問・教科書の順</small></h2>';
    BOOK.forEach(function (b) {
      var list = (C.csets || []).filter(function (st) { return USEC[st.u] === b.id; });
      if (!list.length) return;
      h += '<h3 class="setgrp">' + esc(b.name) + '<small>' + list.length + '題</small></h3><div class="cards">';
      list.forEach(function (st) {
        var ids = setIds(st.id), done = ids.filter(function (id) { return S.q[id]; }).length, ok = ids.filter(function (id) { return lastOk(id) === true; }).length;
        h += '<button class="card" data-act="setgo" data-s="' + st.id + '"><span class="c-top"><span>' + fx(UBY[st.u].name) + '</span><span>' + (isNewSet(st) ? '<i class="newtag">初見</i>' : '') + '3問</span></span><b class="c-title">' + fx(st.title) + '</b><span class="c-cnt"><em>' + (done ? '前回 ' + ok + ' / ' + ids.length + ' 正解' : '未着手') + '</em></span><span class="c-go">解く</span></button>';
      });
      h += '</div>';
    });
    return h + '</section>';
  }

  /* ---------- 画面: 演習の設定 ---------- */
  var PF = { types: ['A', 'B', 'C'], bands: ['K', 'S', 'H'], units: null, count: 10, order: 'weak' };
  function vPractice() {
    var h = '<header class="ph-head"><p class="eyebrow">演習</p><h1>問題を選んで解く</h1><p class="lead">全 ' + C.questions.length + ' 問（オリジナル問題）。各問題に「捉え方」と「解法の型」がついています。</p></header>';
    if (SES && SES.mode === 'q' && !SES.done) h += '<div class="resume"><span>「' + esc(SES.title) + '」の途中です（' + (SES.i + 1) + ' / ' + SES.items.length + '）</span><a class="btn sm" href="#session">続きから</a></div>';
    var tm = QSIZE === 'light' ? '<small class="sztime">10〜15分で終わる量</small>' : '';
    h += '<section class="sec"><h2>おすすめのセット' + tm + sizeSwitch() + '</h2><div class="cards">' +
      '<button class="card" data-act="preset" data-k="weak"><b class="c-title">苦手と未解答から ' + qsz('weak') + ' 問</b><span class="c-text">迷ったらこれ。A・B・C のすべてから選びます</span><span class="c-go">始める</span></button>' +
      '<button class="card" data-act="preset" data-k="A"><b class="c-title">知識（A）を ' + qsz('A') + ' 問</b><span class="c-text">正誤問題を速く判定する練習</span><span class="c-go">始める</span></button>' +
      '<button class="card" data-act="preset" data-k="B"><b class="c-title">典型（B）を ' + qsz('B') + ' 問</b><span class="c-text">解法の型を当てはめる練習</span><span class="c-go">始める</span></button>' +
      '<button class="card" data-act="preset" data-k="C"><b class="c-title">思考（C）を ' + qsz('C') + ' 問</b><span class="c-text">初見の定義やグラフを読む練習</span><span class="c-go">始める</span></button></div></section>';
    h += '<section class="sec"><h2>難易度で選ぶ<small>本番の正答率で区切った3段階</small>' + sizeSwitch() + '</h2><div class="cards c3">';
    C.bands.forEach(function (b) {
      var n = C.questions.filter(function (q) { return bandQ(q) === b.id; }).length;
      h += '<button class="card" data-act="preset" data-k="' + b.id + '"><span class="c-top">' + difTag(b.id) + '<span>' + b.rule + '</span></span><b class="c-title">' + b.name + 'を ' + qsz(b.id) + ' 問</b><span class="c-text">' + esc(b.msg) + '</span><span class="c-cnt"><em>対象 ' + n + ' 問</em></span><span class="c-go">始める</span></button>';
    });
    h += '</div><p class="note"><a class="lnk" href="#difficulty">難易度の決め方と、本番の小問別正答率を見る</a></p></section>';
    var units = PF.units || C.units.map(function (u) { return u.id; });
    h += '<details class="more"' + (PF.open ? ' open' : '') + '><summary>条件を細かく選ぶ</summary><div class="form"><div class="frow"><span class="fl">種類</span><div class="chips">';
    ['A', 'B', 'C'].forEach(function (t) { h += '<button class="chip' + (PF.types.indexOf(t) >= 0 ? ' on' : '') + ' chip-' + t + '" data-act="pftype" data-t="' + t + '" aria-pressed="' + (PF.types.indexOf(t) >= 0) + '">' + t + ' ' + C.types[t].name + '</button>'; });
    h += '</div></div><div class="frow"><span class="fl">難易度</span><div class="chips">';
    C.bands.forEach(function (b) { h += '<button class="chip chip-dif' + (PF.bands.indexOf(b.id) >= 0 ? ' on' : '') + '" data-act="pfband" data-b="' + b.id + '" aria-pressed="' + (PF.bands.indexOf(b.id) >= 0) + '">' + b.name + '<small>' + b.rule + '</small></button>'; });
    h += '</div></div><div class="frow"><span class="fl">単元</span><div class="ufields">';
    BOOK.forEach(function (f) {
      var us = f.units.map(function (u) { return UBY[u]; }).filter(Boolean);
      var allOn = us.every(function (u) { return units.indexOf(u.id) >= 0; });
      h += '<div class="uf"><button class="chip sm' + (allOn ? ' on' : '') + '" data-act="pffield" data-f="' + f.id + '">' + esc(f.name) + '</button><div class="chips">';
      us.forEach(function (u) { h += '<button class="chip sm' + (units.indexOf(u.id) >= 0 ? ' on' : '') + '" data-act="pfunit" data-u="' + u.id + '">' + fx(u.name) + '</button>'; });
      h += '</div></div>';
    });
    h += '</div></div><div class="frow"><span class="fl">問題数</span><div class="chips">';
    [5, 10, 15, 20, 0].forEach(function (n) { h += '<button class="chip' + (PF.count === n ? ' on' : '') + '" data-act="pfcount" data-n="' + n + '">' + (n ? n + '問' : '全部') + '</button>'; });
    h += '</div></div><div class="frow"><span class="fl">順番</span><div class="chips">';
    [['weak', '苦手・未解答から'], ['random', 'ランダム'], ['seq', '単元の順']].forEach(function (o) { h += '<button class="chip' + (PF.order === o[0] ? ' on' : '') + '" data-act="pforder" data-o="' + o[0] + '">' + o[1] + '</button>'; });
    var avail = buildSet({ units: units, types: PF.types, bands: PF.bands, order: 'seq' }).length;
    h += '</div></div><div class="frow end"><span class="avail">対象 <b class="num">' + avail + '</b> 問</span><button class="btn" data-act="pfstart"' + (avail ? '' : ' disabled') + '>この条件で始める</button></div></div></details>';
    return h;
  }

  /* ---------- 画面: 計算ドリル ---------- */
  var DF = { gens: [], n: 10 };
  function vDrill() {
    var sel = DF.gens || C.generators.map(function (g) { return g.id; });
    var h = '<header class="ph-head"><p class="eyebrow">B 典型の自動化</p><h1>計算ドリル</h1><p class="lead">数値が毎回変わるので何度でも解けます。誤りの選択肢は「よくあるミス」から作っています。1問の目安は1〜2分です。</p></header>';
    h += '<section class="panel"><h2>ドリルを選ぶ<small><button class="lnkbtn" data-act="dall">すべて選ぶ</button>・<button class="lnkbtn" data-act="dnone">すべて外す</button></small></h2><div class="dgrid">';
    C.generators.forEach(function (g) {
      var on = sel.indexOf(g.id) >= 0, d = S.ds[g.u];
      h += '<button class="dcard' + (on ? ' on' : '') + '" data-act="dtoggle" data-g="' + g.id + '" aria-pressed="' + on + '"><span class="dchk" aria-hidden="true">' + (on ? '✓' : '') + '</span><b>' + fx(g.name) + '</b><small>' + fx(UBY[g.u].name) + '・' + g.p.map(function (p) { return PBY[p].name; }).map(fx).join('／') + '</small></button>';
    });
    h += '</div><div class="frow end"><div class="chips">';
    [5, 10, 20].forEach(function (n) { h += '<button class="chip' + (DF.n === n ? ' on' : '') + '" data-act="dcount" data-n="' + n + '">' + n + '問</button>'; });
    h += '</div><button class="btn" data-act="dstart">始める</button></div></section>';
    h += '<section class="panel"><h2>単元別のドリル正答率<small>直近12問</small></h2><div class="dstats">';
    var us = []; C.generators.forEach(function (g) { if (us.indexOf(g.u) < 0) us.push(g.u); });
    us.forEach(function (u) { var d = S.ds[u]; var n = d ? d.h.length : 0, c = d ? d.h.reduce(function (a, b) { return a + b; }, 0) : 0; h += '<div class="dsr"><span>' + fx(UBY[u].name) + '</span>' + meter(n ? c / n : 0, 'm-B', 0.85) + '<span class="num">' + (n ? pct(c / n) + '%' : '—') + '</span></div>'; });
    h += '</div></section>';
    return h;
  }

  /* ---------- 画面: 一問一答 ---------- */
  var FF = { cats: [], mode: 'rec', n: 20 };
  /* カードのレベル: 未学習は -1。「覚えた」で +1、レベル5 を「定着」とする */
  var FL_DAYS = [0, 1, 3, 7, 14, 30];
  function flLevel(x) { var r = S.fl[x.c + '|' + x.f]; return r ? r.b : -1; }
  function flStage(x) { var b = flLevel(x); return b < 0 ? 'new' : b >= 5 ? 'done' : 'mid'; }
  function flCount(list) { var o = { new: 0, mid: 0, done: 0 }; list.forEach(function (x) { o[flStage(x)]++; }); return o; }
  function flBar(o) {
    var n = o.new + o.mid + o.done || 1;
    return '<span class="flbar" aria-hidden="true"><i class="fb-done" style="width:' + (o.done / n * 100).toFixed(1) + '%"></i><i class="fb-mid" style="width:' + (o.mid / n * 100).toFixed(1) + '%"></i></span>';
  }
  function vFlash() {
    var cats = FF.cats, t = today(), all = C.flash, tot = flCount(all), due = dueFlash().length;
    var h = '<header class="ph-head"><p class="eyebrow">A 知識の土台</p><h1>一問一答</h1><p class="lead">全 ' + all.length + ' 枚・' + C.flashCats.length + ' カテゴリ。答えの面には、理由や覚え方と、同じカテゴリのカードの一覧が出ます。</p></header>';
    h += '<section class="sec"><h2>すぐ始める</h2><div class="cards c3">' +
      '<button class="card" data-act="quick" data-k="flash"><b class="c-title">今日のおすすめ</b><span class="c-text">復習の日が来たカードを先に、残りは新しいカードから。いまの時期に合ったカテゴリを選びます。</span><span class="c-go">始める</span></button>' +
      '<button class="card" data-act="fdue"' + (due ? '' : ' disabled') + '><b class="c-title">復習待ちだけ（' + due + ' 枚）</b><span class="c-text">' + (due ? '今日もう一度見る日のカードです。' : '今日の復習はありません。') + '</span><span class="c-go">始める</span></button>' +
      '<button class="card" data-act="fweak"><b class="c-title">覚えていないカード</b><span class="c-text">「まだ」「あやふや」を押したカードを、全カテゴリからまとめて出します。</span><span class="c-go">始める</span></button></div></section>';
    /* 定着の条件 */
    var steps = [['0', 'まだ', '同じ日にもう一度'], ['1', '1日後', ''], ['2', '3日後', ''], ['3', '7日後', ''], ['4', '14日後', ''], ['5', '定着', '30日後に確認']];
    h += '<section class="panel"><h2>「定着」の条件</h2><ol class="flv">' + steps.map(function (st) { return '<li class="lv' + st[0] + '"><span class="num">' + st[0] + '</span><b>' + st[1] + '</b>' + (st[2] ? '<small>' + st[2] + '</small>' : '') + '</li>'; }).join('') + '</ol>';
    h += '<ul class="bul"><li><b>覚えた</b>レベルが1つ上がり、上の日数をあけて、もう一度出ます。</li><li><b>あやふや</b>レベル1にもどり、翌日に出ます。</li><li><b>まだ</b>レベル0にもどり、同じ日のうちにもう一度出ます。</li><li>1日・3日・7日・14日と間をあけても「覚えた」が続き、<b>レベル5</b>になったカードを「定着」とします（最短で約25日）。</li></ul>';
    h += '<div class="flsum"><span><i class="lg fb-done"></i>定着 <b class="num">' + tot.done + '</b></span><span><i class="lg fb-mid"></i>学習中 <b class="num">' + tot.mid + '</b></span><span><i class="lg fb-new"></i>未学習 <b class="num">' + tot.new + '</b></span></div>' + flBar(tot) + '</section>';
    /* カテゴリ */
    h += '<section class="panel"><h2>カテゴリを選んで始める<small>' + (cats.length ? cats.length + ' カテゴリを選択中' : 'まだ選んでいません') + '・<button class="lnkbtn" data-act="fall">すべて選ぶ</button>・<button class="lnkbtn" data-act="fnone">すべて外す</button></small></h2>';
    [['state', '理論（状態）'], ['react', '理論（反応）'], ['inorg', '無機'], ['org', '有機']].forEach(function (fd) {
      var cs = C.flashCats.filter(function (c) { return c.f === fd[0]; });
      var allOn = cs.every(function (c) { return cats.indexOf(c.id) >= 0; });
      h += '<div class="fgroup"><div class="fgh"><b>' + fd[1] + '</b><button class="chip sm' + (allOn ? ' on' : '') + '" data-act="fsetf" data-f="' + fd[0] + '">' + fd[1] + 'をすべて選ぶ</button></div><div class="fgrid">';
      cs.forEach(function (c) {
        var cards = all.filter(function (x) { return x.c === c.id; }), o = flCount(cards);
        var dn = cards.filter(function (x) { var r = S.fl[x.c + '|' + x.f]; return r && r.due <= t; }).length;
        var on = cats.indexOf(c.id) >= 0;
        h += '<button class="fcat' + (on ? ' on' : '') + '" data-act="ftoggle" data-c="' + c.id + '" aria-pressed="' + on + '"><span class="dchk" aria-hidden="true">' + (on ? '✓' : '') + '</span><b>' + esc(c.name) + '</b><small>' + cards.length + ' 枚・定着 ' + o.done + '・学習中 ' + o.mid + (dn ? '・<em>復習 ' + dn + '</em>' : '') + '</small>' + flBar(o) + '</button>';
      });
      h += '</div></div>';
    });
    h += '<div class="frow"><span class="fl">出し方</span><div class="chips">';
    [['rec', 'おすすめ（復習→新規）'], ['due', '復習のみ'], ['new', '新しいカード'], ['weak', '覚えていないもの'], ['rand', 'ランダム']].forEach(function (o) { h += '<button class="chip' + (FF.mode === o[0] ? ' on' : '') + '" data-act="fmode" data-m="' + o[0] + '">' + o[1] + '</button>'; });
    h += '</div></div><div class="frow"><span class="fl">枚数</span><div class="chips">';
    [10, 20, 30, 40, 0].forEach(function (n) { h += '<button class="chip' + (FF.n === n ? ' on' : '') + '" data-act="fcount" data-n="' + n + '">' + (n ? n + '枚' : '全部') + '</button>'; });
    var avail = cats.length ? buildFlash(cats, FF.mode, 0).length : 0;
    h += '</div></div><div class="frow end"><span class="avail">' + (cats.length ? '対象 <b class="num">' + avail + '</b> 枚' : 'カテゴリを選ぶと始められます') + '</span><button class="btn" data-act="fstart"' + (avail ? '' : ' disabled') + '>始める</button></div></section>';
    return h;
  }

  /* ---------- 画面: 復習 ---------- */
  var WHY = { know: '知識があいまい', calc: '計算ミス', read: '問題文の読み違い', how: '解き方が浮かばない' };
  var WHY_TIP = {
    know: '一問一答の「覚えていないもの」を毎日回し、単元ページの要点を声に出して読む。',
    calc: '計算ドリルで手順を固定する。単位（K・L・秒）と桁の検算を最後に必ず入れる。',
    read: '「誤り」「適当でない」「二つ」に丸をつける習慣を。C問題は問いを先に読む。',
    how: '解法の型の「合図」を覚える。問題を見たら、まず型の名前を言ってから解き始める。'
  };
  function vReview() {
    var due = dueQuestions(), fdue = dueFlash();
    var wrong = C.questions.filter(function (q) { return lastOk(q.id) === false; });
    var h = '<header class="ph-head"><p class="eyebrow">忘れる前にもう一度</p><h1>復習</h1><p class="lead">正解した問題は 1→2→4→7→14→30 日後、間違えた問題とヒントを見た問題は翌日に出ます。</p></header>';
    h += '<div class="g2"><section class="panel"><h2>今日の復習（問題）</h2><p class="bigline"><span class="num">' + due.length + '</span> 問</p><button class="btn" data-act="quick" data-k="review"' + (due.length ? '' : ' disabled') + '>復習を始める</button></section>';
    h += '<section class="panel"><h2>今日の復習（一問一答）</h2><p class="bigline"><span class="num">' + fdue.length + '</span> 枚</p><button class="btn" data-act="fdue"' + (fdue.length ? '' : ' disabled') + '>カードを復習する</button></section></div>';
    var tot = Object.keys(WHY).reduce(function (s, k) { return s + (S.why[k] || 0); }, 0);
    h += '<section class="panel"><h2>間違えた理由<small>不正解のあとに選んだ理由の集計</small></h2>';
    if (!tot) h += '<p class="note">まだ記録がありません。不正解のあとに理由を選ぶと、ここに対策が表示されます。</p>';
    else {
      var top = Object.keys(WHY).sort(function (a, b) { return (S.why[b] || 0) - (S.why[a] || 0); })[0];
      h += '<div class="whys">' + Object.keys(WHY).map(function (k) { var v = S.why[k] || 0; return '<div class="whyr"><span>' + WHY[k] + '</span>' + meter(v / tot, 'm-why') + '<span class="num">' + v + '</span></div>'; }).join('') + '</div>';
      h += '<p class="tip"><b>いちばん多いのは「' + WHY[top] + '」</b>' + WHY_TIP[top] + '</p>';
    }
    h += '</section>';
    h += '<section class="panel"><h2>最後に間違えたままの問題<small>' + wrong.length + '問</small></h2>';
    if (!wrong.length) h += '<p class="note">ありません。</p>';
    else {
      h += '<div class="btnrow"><button class="btn ghost" data-act="redo">まとめて解き直す</button></div><ul class="qlist">';
      wrong.forEach(function (q) { h += '<li><span class="qst ng">×</span>' + tb(q.t) + '<button class="qlink" data-act="one" data-id="' + q.id + '"><small>' + fx(UBY[q.u].name) + '</small> ' + fx(q.q.split('\n')[0]) + '</button></li>'; });
      h += '</ul>';
    }
    return h + '</section>';
  }

  /* ---------- 画面: ミニ模試 ---------- */
  function vMock() {
    var h = '<header class="ph-head"><p class="eyebrow">本番の配分で</p><h1>模試</h1><p class="lead">途中で解説は出ません。時間切れになると自動で採点します。終わったら、間違えた問題は翌日の復習に入ります。</p></header>';
    h += '<section class="sec"><div class="cards c2">' +
      '<div class="card static"><span class="c-top"><span>30分</span><span>20問・1問5点</span></span><b class="c-title">ミニ模試</b><span class="c-text">本番の分野と A・B・C の比率に合わせた20問（理論8・無機4・有機4・総合4）。平日の時間がない日に。</span><button class="btn" data-act="mockstart">ミニ模試を始める</button></div>' +
      '<div class="card static"><span class="c-top"><span>60分</span><span>大問5つ・100点</span></span><b class="c-title">本番形式の模試</b><span class="c-text">第1問 理論（状態）、第2問 理論（反応）、第3問 無機、第4問 有機、第5問 大問形式の思考問題（2題）。小問ごとに 3〜4 点の配点で、本番と同じ時間配分を練習します。</span><button class="btn" data-act="mockfull">本番形式で始める</button></div></div></section>';
    h += '<section class="panel"><h2>ルール</h2><ul class="bul"><li>1周目は A・B を先に。C は1分考えて方針が立たなければ、解答用紙の番号で飛ばして戻る。</li><li>本番形式の目安: 第1〜4問は各10分、第5問は15分、見直し5分。</li><li>残り5分で未解答をなくす（空欄は0点）。</li></ul></section>';
    if (S.mocks.length) {
      h += '<section class="panel"><h2>これまでの結果</h2><div class="chartwrap">' + svgExamLine(S.mocks.map(function (m, i) { return { v: m.score, label: m.date + (m.kind === 'full' ? ' 本番形式' : ' ミニ模試'), short: m.date.slice(5).replace('-', '/') }; })) + '</div>';
      h += '<div class="tblwrap"><table class="dtbl"><thead><tr><th>日付</th><th>種類</th><th>得点</th><th>A</th><th>B</th><th>C</th><th>時間</th></tr></thead><tbody>';
      S.mocks.slice().reverse().forEach(function (m) { h += '<tr><th>' + m.date + '</th><td>' + (m.kind === 'full' ? '本番形式' : 'ミニ') + '</td><td class="num"><b>' + m.score + '</b></td>' + ['A', 'B', 'C'].map(function (t) { var o = m.byT[t]; return '<td class="num">' + o[0] + '/' + o[1] + '</td>'; }).join('') + '<td class="num">' + mmss(m.sec) + '</td></tr>'; });
      h += '</tbody></table></div></section>';
    }
    return h;
  }

  /* ---------- 画面: 過去問記録 ---------- */
  var EXF = { open: null };
  function examTotal(r) { return r.s.reduce(function (a, b) { return a + (Number(b) || 0); }, 0); }
  function examById(id) { return C.exams.filter(function (x) { return x.id === id; })[0]; }
  function exForm(e) {
    var h = '<form class="exform" data-e="' + e.id + '"><div class="exgrid">';
    e.secs.forEach(function (sec, i) { h += '<label>第' + (i + 1) + '問<small>' + sec + '</small><input type="number" min="0" max="20" inputmode="numeric" id="ex-' + e.id + '-' + i + '" required></label>'; });
    return h + '<label>日付<input type="date" id="ex-' + e.id + '-d" value="' + today() + '"></label><label>かかった時間（分）<input type="number" min="1" max="120" id="ex-' + e.id + '-t" value="60"></label></div><button class="btn" type="submit">保存する</button></form>';
  }
  function exStatus(e) {
    var recs = S.exams[e.id] || [], best = recs.length ? Math.max.apply(null, recs.map(examTotal)) : null, de = DIAGBY[e.id];
    if (de) {
      var A = ansOf(e.id), nx = examNos(de).length, en = examNos(de).filter(function (y) { return A[y.n] && A[y.n].v != null; }).length;
      if (!A._checked && en) return { t: '入力中 ' + en + ' / ' + nx, best: best };
    }
    return { t: best != null ? '最高 ' + best + ' 点' : '未記録', best: best };
  }
  function vExams() {
    if (!DG.ex || !examById(DG.ex)) {
      var next = C.examOrder.filter(function (o) { return !(S.exams[o.id] || []).length; })[0];
      DG.ex = (next || C.examOrder[0]).id;
    }
    var e = examById(DG.ex), o = C.examOrder.filter(function (x) { return x.id === e.id; })[0], idx = C.examOrder.indexOf(o);
    var h = '<header class="ph-head"><p class="eyebrow">手元の過去問PDFと一緒に</p><h1>解く順番と記録</h1><p class="lead">8回分を下の順番で、60分ずつ解きます。解いたら、その回を選んでマークした番号と手ごたえを入れてください。自動で採点して記録し、診断を出します（全国の受験生との比較は本試験のみ）。大問1つあたりの目標は' + goalId() / 5 + '点（' + esc(G().short) + '）です。</p></header>';
    /* 解く順番（工程表）: 時期ごとに区切り、8回を1本の線でつなぐ */
    var PH_WHEN = { 1: '試験41日前まで', 2: '40〜21日前', 3: '20〜8日前', 4: '最後の7日' };
    var nextId = (C.examOrder.filter(function (x) { return !(S.exams[x.id] || []).length; })[0] || {}).id;
    h += '<section class="sec"><h2>解く順番<small>丸を押すと、その回の記録・解答の入力・診断に切り替わります</small></h2><div class="exflow" role="list">';
    var k = 0;
    C.phases.forEach(function (ph) {
      var list = C.examOrder.filter(function (x) { return x.phase === ph.id; });
      if (!list.length) return;
      h += '<div class="exph exph' + ph.id + '" style="flex:' + list.length + '"><div class="exphh"><b>第' + ph.id + '期</b><span>' + esc(ph.name) + '</span><small>' + PH_WHEN[ph.id] + '</small></div><ol class="exsteps">';
      list.forEach(function (x) {
        k++;
        var ee = examById(x.id), st = exStatus(ee), cls = 'exstep' + (k === 1 ? ' first' : '') + (st.best != null ? ' done' : '') + (ee.id === e.id ? ' on' : '');
        h += '<li class="' + cls + '" role="listitem"><button data-act="dgex" data-e="' + ee.id + '" aria-current="' + (ee.id === e.id ? 'step' : 'false') + '"><span class="dot num">' + (st.best != null ? '✓' : k) + '</span><b>' + esc(ee.name) + '</b><small class="num' + (st.best >= goalId() ? ' ok' : '') + '">' + esc(st.t) + '</small>' + (ee.id === nextId ? '<em>次はこれ</em>' : '') + '</button></li>';
      });
      h += '</ol></div>';
    });
    h += '</div></section>';
    /* 選んだ回: 解く理由と記録 */
    var recs = S.exams[e.id] || [];
    h += '<section class="panel"><h2>' + (idx + 1) + '. ' + esc(e.name) + '<small>第' + o.phase + '期・A ' + e.A + '　B ' + e.B + '　C ' + e.C + (e.avg ? '・平均点 ' + e.avg : '') + '</small></h2><p class="exwhy">' + esc(o.why) + '</p>';
    if (recs.length) {
      h += '<div class="tblwrap"><table class="dtbl sm"><thead><tr><th>日付</th>' + e.secs.map(function (sec, i) { return '<th>第' + (i + 1) + '問<small>' + sec + '</small></th>'; }).join('') + '<th>合計</th><th></th></tr></thead><tbody>';
      recs.forEach(function (r, ri) { h += '<tr><th>' + r.date + (r.auto ? '<small>採点から</small>' : '') + '</th>' + r.s.map(function (v) { return '<td class="num' + (Number(v) >= 16 ? ' good' : '') + '">' + v + '</td>'; }).join('') + '<td class="num"><b>' + examTotal(r) + '</b></td><td><button class="lnkbtn" data-act="exdel" data-e="' + e.id + '" data-i="' + ri + '">削除</button></td></tr>'; });
      h += '</tbody></table></div>';
    } else h += '<p class="note">まだ記録がありません。下のマークシートに解答を入れて採点してください。</p>';
    h += '<details class="more"' + (EXF.open === e.id ? ' open' : '') + '><summary>マークを入れずに、大問ごとの点数だけ記録する</summary>' + exForm(e) + '</details></section>';
    /* 解答の入力・採点・診断 */
    if (DIAGBY[e.id]) h += diagBody(DIAGBY[e.id]);
    /* 得点の推移 */
    var all = [];
    C.exams.forEach(function (ee) { (S.exams[ee.id] || []).forEach(function (r) { all.push({ e: ee, r: r }); }); });
    all.sort(function (a, b) { return a.r.date < b.r.date ? -1 : 1; });
    if (all.length) {
      h += '<section class="panel"><h2>得点の推移<small>これまでに記録したすべての回</small></h2><div class="chartwrap">' + svgExamLine(all.map(function (x) { return { v: examTotal(x.r), label: x.e.name + '（' + x.r.date + '）', short: x.e.name.replace(' 本試', '本').replace(' 追試', '追').replace('20', '') }; })) + '</div>';
      var sums = {}, cnts = {};
      all.forEach(function (x) { x.r.s.forEach(function (v, i) { var k = x.e.secs[i]; sums[k] = (sums[k] || 0) + (Number(v) || 0); cnts[k] = (cnts[k] || 0) + 1; }); });
      h += '<h3 class="sub">分野別の平均（大問1つ20点あたり）</h3><div class="secavg">';
      ['理論（状態）', '理論（反応）', '無機', '有機', '総合'].forEach(function (k) { if (!cnts[k]) return; var a = sums[k] / cnts[k]; h += '<div class="dsr"><span>' + k + '</span>' + meter(a / 20, a >= 16 ? 'm-ok' : 'm-B', 0.8) + '<span class="num">' + a.toFixed(1) + '</span></div>'; });
      h += '</div></section>';
    }
    return h;
  }

  /* ---------- 画面: 設定 ---------- */
  var RESET_ASK = false;
  function report() {
    var pr = predict(), lines = [];
    lines.push('化学共テラボ 学習レポート（' + today() + '）');
    lines.push('目標: ' + goalId() + '点（' + G().short + '）');
    if (S.prefs.name) lines.push('名前: ' + S.prefs.name);
    lines.push('試験まで: ' + daysLeft() + '日 / 予測得点: ' + (pr.attempts >= 15 ? pr.score + '点' : '？？（解いた問題が15問未満）'));
    ['A', 'B', 'C'].forEach(function (t) { var o = pr.byT[t]; lines.push(t + '（' + C.types[t].name + '）正答率: ' + (o.n ? pct(o.c / o.n) + '%（' + o.n + '問）' : '未着手')); });
    lines.push('連続学習日数: ' + streak() + '日');
    lines.push('--- 単元別（最近の正答率） ---');
    C.units.forEach(function (u) { var st = unitStats(u.id); lines.push(u.name.replace(/_\{?([^}\s]*)\}?/g, '$1') + ': ' + (st.n ? pct(st.c / st.n) + '%（' + st.n + '問）' : '未着手')); });
    var ex = [];
    C.exams.forEach(function (e) { (S.exams[e.id] || []).forEach(function (r) { ex.push(e.name + ' ' + r.date + ' ' + examTotal(r) + '点 [' + r.s.join('/') + ']'); }); });
    if (ex.length) { lines.push('--- 過去問 ---'); lines = lines.concat(ex); }
    if (S.mocks.length) { lines.push('--- ミニ模試 ---'); S.mocks.forEach(function (m) { lines.push(m.date + ' ' + m.score + '点'); }); }
    return lines.join('\n');
  }
  function vPrefs() {
    var h = '<header class="ph-head"><p class="eyebrow">設定とデータ</p><h1>設定</h1></header>';
    h += '<section class="panel"><h2>基本</h2><form class="form" id="prefform"><label class="lf">名前（ホームに表示）<input type="text" id="pf-name" value="' + esc(S.prefs.name) + '" maxlength="20"></label>' +
      '<label class="lf">目標の得点率<select id="pf-goal">' + C.goals.map(function (g) { return '<option value="' + g.id + '"' + (g.id === goalId() ? ' selected' : '') + '>' + g.short + '（' + g.id + '点）</option>'; }).join('') + '</select></label>' +
      '<label class="lf">試験日（化学を受ける日）<input type="date" id="pf-date" value="' + esc(S.prefs.examDate) + '"></label><p class="note">初期値は 2027年1月17日（共通テスト2日目）です。正式な日程は大学入試センターの発表で確認してください。</p><button class="btn" type="submit">保存する</button></form></section>';
    h += '<section class="panel"><h2>先生に送る学習レポート</h2><p class="note">下の文章をコピーして、先生に送ってください。</p><textarea id="rep" class="mono" rows="10" readonly>' + esc(report()) + '</textarea><button class="btn" data-act="copy" data-src="rep">レポートをコピー</button></section>';
    h += '<section class="panel"><h2>記録のバックアップ</h2><p class="note">学習記録はこのブラウザの中だけに保存されます。ブラウザの履歴やデータを消すと記録も消えるので、週に1回はファイルに保存してください。' + (S.prefs.backup ? '前回の保存: ' + S.prefs.backup : 'まだ保存していません') + '</p><div class="btnrow"><button class="btn" data-act="backup">記録をファイルに保存</button><label class="btn ghost filebtn">ファイルから読み込む<input type="file" id="impfile" accept=".json,application/json"></label></div></section>';
    h += '<section class="panel"><h2>データの引き継ぎ（文字列）</h2><p class="note">ファイルが使えないときは、下の文字列をコピーして、移動先の「読み込む」欄に貼り付けてください。</p><textarea id="exp" class="mono" rows="4" readonly>' + esc(JSON.stringify(S)) + '</textarea><button class="btn ghost" data-act="copy" data-src="exp">書き出した文字列をコピー</button>' +
      '<label class="lf">読み込む<textarea id="imp" class="mono" rows="4" placeholder="ここに貼り付け"></textarea></label><button class="btn ghost" data-act="import">読み込む</button></section>';
    h += '<section class="panel danger"><h2>記録の消去</h2><p class="note">すべての学習記録を消します。元に戻せません。</p>' +
      (RESET_ASK ? '<div class="btnrow"><button class="btn bad" data-act="resetyes">本当に消去する</button><button class="btn ghost" data-act="resetno">やめる</button></div>' : '<button class="btn ghost" data-act="reset">記録を消去する</button>') + '</section>';
    h += '<section class="panel"><h2>このアプリについて</h2><ul class="bul"><li>問題・一問一答・ドリルはすべてオリジナルです。過去問の出題パターンと8回分の分析をもとに作っています。</li><li>過去問そのものは、手元のPDFで解いて「過去問分析」に点数を入れてください。</li><li>予測得点は、最近解いた結果を8回分の平均配点で重みづけした目安です。</li></ul></section>';
    return h;
  }

  /* ---------- 画面: セッション ---------- */
  function qHTML(q, opt) {
    var h = '<div class="qmeta">' + tb(q.t) + '<span class="qunit">' + fx(UBY[q.u].name) + '</span>' + difTag(bandQ(q)) + (opt && opt.timer ? '<span class="qtime num" id="qtime" data-goal="' + (q.sec || C.types[q.t].sec) + '">0:00<small> / 目安 ' + mmss(q.sec || C.types[q.t].sec) + '</small></span>' : '') + '</div>';
    var no = (opt && opt.no) || 1;
    h += leadHTML(q);
    h += '<div class="qtext"><span class="qmon">問' + toZen(no) + '</span>' + fx(q.q) + '<span class="ansbox" aria-label="解答番号' + no + '">' + no + '</span></div>';
    if (q.ill) h += C.draw.ill(q.ill);
    if (q.fig) h += '<figure class="figw">' + C.draw.fig(q.fig) + '</figure>';
    if (q.tbl) h += tableHTML(q.tbl);
    if (q.gc) h += '<div class="gchoices">' + q.gc.map(function (pts, i) { return C.draw.choiceGraph(pts, q.gax, i); }).join('') + '</div>';
    return h;
  }
  /* 試験冊子の選択肢（押してもマークできる） */
  function choicesHTML(q, picked, answered, cur) {
    var h = '<ol class="choices" role="list">';
    q.c.forEach(function (c, i) {
      var cls = 'choice';
      if (picked === i) cls += ' picked';
      if (!answered && cur === i) cls += ' kcur';
      if (answered) { if (i === q.a) cls += ' right'; else if (picked === i) cls += ' wrong'; }
      h += '<li><button class="' + cls + '" data-act="pick" data-i="' + i + '"' + (answered ? ' disabled' : '') + '><span class="cn" aria-hidden="true">' + CIRC[i] + '</span><span class="ctext">' + fx(c) + '</span>' + (answered && i === q.a ? '<span class="mk ok">正解</span>' : '') + (answered && picked === i && i !== q.a ? '<span class="mk ng">あなたのマーク</span>' : '') + '</button></li>';
    });
    return h + '</ol>';
  }
  /* マークシートの1行（解答番号＋ 1〜9, 0 の楕円） */
  var DIGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  function markRow(no, n, picked, correct, act, qi) {
    var h = '<div class="mrow"><span class="mno num">' + no + '</span><span class="movs">';
    DIGS.forEach(function (d) {
      var idx = d === 0 ? 9 : d - 1, ok = idx < n;
      var cls = 'ov' + (picked === idx ? ' on' : '') + (correct === idx ? ' ans' : '') + (ok ? '' : ' na');
      h += '<button class="' + cls + '" data-act="' + act + '" data-i="' + idx + '"' + (qi != null ? ' data-q="' + qi + '"' : '') + (ok && correct == null ? '' : ' disabled') + ' aria-label="' + d + 'をマーク">' + d + '</button>';
    });
    return h + '</span></div>';
  }
  function markSheet(no, n, picked, correct) {
    return '<div class="msheet"><div class="mshead"><span>解答<br>番号</span><span class="mslab">解　答　欄</span></div>' + markRow(no, n, picked, correct, 'pick') + '</div>';
  }
  function curQ() { var it = SES.items[SES.i]; return SES.mode === 'drill' ? it : IQ(it); }

  function vSession() {
    if (!SES) { return '<div class="empty"><p>進行中の演習はありません。</p><a class="btn" href="#practice">演習を選ぶ</a></div>'; }
    if (SES.mode === 'flash') return vFlashSession();
    if (SES.mode === 'mock') return vMockSession();
    if (SES.done) return vSessionEnd();
    var it = SES.items[SES.i], q = curQ();
    var n = SES.items.length;
    var h = '<div class="stop"><button class="lnkbtn" data-act="quit">' + (SES.back === '@prev' ? '← 結果にもどる' : '← 終了') + '</button><span class="stitle">' + esc(SES.title) + '</span><span class="sprog num">' + (SES.i + 1) + ' / ' + n + '</span></div>' + meter(SES.i / n, 'm-prog');
    var no = SES.i + 1;
    h += '<article class="qcard' + (it.answered ? ' answered' : '') + (it.answered && it.showCalc ? ' showcalc' : '') + '">' + inkBar() + '<div class="' + zoneCls() + '"><div class="qcol">' + qHTML(q, { timer: !it.answered, no: no });
    h += choicesHTML(q, it.picked, it.answered, it.cur);
    h += markSheet(no, q.c.length, it.picked, it.answered ? q.a : null);
    if (!it.answered) {
      h += '<div class="qtools"><button class="lnkbtn" data-act="hint">' + (it.hint ? 'ヒントを表示中' : '捉え方のヒントを見る') + '</button><button class="lnkbtn" data-act="giveup">わからない（解説を見る）</button><span class="kbd">キーボード: ↑↓ で選んで Enter／1〜' + q.c.length + ' で直接マーク</span></div>';
      if (it.hint) h += '<div class="hintbox"><b>捉え方</b>' + fx(q.k) + '</div>';
    } else {
      h += '<div class="qtools calcview"><button class="lnkbtn" data-act="showcalc">' + (it.showCalc ? '解説にもどる' : '解説を閉じて、自分の計算を見る') + '</button><span class="kbd">Enter で次へ</span></div>';
    }
    h += '</div>' + CALC + '</div>';
    if (it.answered) {
      var ok = it.picked === q.a;
      h += '<div class="fb ' + (ok ? 'ok' : 'ng') + '" tabindex="-1"><div class="fbh"><span class="fbm" aria-hidden="true">' + (ok ? '○' : '×') + '</span><span class="fbr">' + (ok ? '正解' : '不正解　正解は ' + CIRC[q.a]) + '</span><span class="fbt num">' + mmss(it.sec) + '（目安 ' + mmss(q.sec || C.types[q.t].sec) + '）</span></div>';
      h += '<section><h3>解説</h3><p>' + fxb(q.e) + '</p></section>';
      h += '<section class="kbox"><h3>この問題の捉え方</h3><p>' + fx(q.k) + '</p></section>';
      h += ceHTML(q) + solveAid(q) + simHTML(q);
      h += '<section><h3>使う解法の型</h3><div class="pminis">' + q.p.map(function (p, i) { return patternMini(p, i === 0 && !ok); }).join('') + '</div></section>';
      if (SES.mode === 'q') {
        if (!ok) {
          h += '<div class="why"><span>間違えた理由は？</span><div class="chips">' + Object.keys(WHY).map(function (k) { return '<button class="chip sm' + (it.why === k ? ' on' : '') + '" data-act="why" data-w="' + k + '">' + WHY[k] + '</button>'; }).join('') + '</div></div>';
        } else if (!it.hintUsed) {
          h += '<div class="why"><span>手ごたえは？</span><div class="chips"><button class="chip sm' + (it.conf === 'sure' ? ' on' : '') + '" data-act="conf" data-v="sure">自信あり</button><button class="chip sm' + (it.conf === 'lucky' ? ' on' : '') + '" data-act="conf" data-v="lucky">まぐれ・迷った</button></div><small>「まぐれ」を選ぶと明日もう一度出ます</small></div>';
        }
      }
      h += '<div class="fbnext"><button class="btn" data-act="next" id="nextbtn">' + (SES.i + 1 < n ? '次の問題へ' : '結果を見る') + '</button></div></div>';
    }
    h += '</article>';
    return h;
  }
  function vSessionEnd() {
    var items = SES.items, n = items.length;
    var ok = 0, byT = { A: [0, 0], B: [0, 0], C: [0, 0] }, wrongIds = [];
    items.forEach(function (it) {
      var q = SES.mode === 'drill' ? it : IQ(it);
      if (!it.answered) return;
      var good = it.picked === q.a;
      if (good) ok++;
      byT[q.t][1]++; if (good) byT[q.t][0]++;
      if (!good && SES.mode === 'q') wrongIds.push(it.id);
    });
    var done = items.filter(function (it) { return it.answered; }).length;
    var h = '<div class="endcard"><p class="eyebrow">' + esc(SES.title) + '</p><h1><span class="num">' + ok + '</span> / ' + done + ' 問 正解</h1>';
    h += '<div class="abc">' + ['A', 'B', 'C'].filter(function (t) { return byT[t][1]; }).map(function (t) { return '<div class="abcrow">' + tb(t) + meter(byT[t][0] / byT[t][1], 'm-' + t, tgoal(t)) + '<span class="abcv num">' + byT[t][0] + '/' + byT[t][1] + '</span></div>'; }).join('') + '</div>';
    if (SES.mode === 'q') {
      h += '<ul class="qlist">' + items.map(function (it) { var q = IQ(it); if (!it.answered) return ''; var g = it.picked === q.a; return '<li><span class="qst ' + (g ? 'ok' : 'ng') + '">' + (g ? '○' : '×') + '</span>' + tb(q.t) + '<button class="qlink" data-act="one" data-id="' + q.id + '"><small>' + fx(UBY[q.u].name) + '</small> ' + fx(q.q.split('\n')[0]) + '</button></li>'; }).join('') + '</ul>';
    }
    h += '<div class="btnrow">' + (wrongIds.length ? '<button class="btn" data-act="redoses">間違えた ' + wrongIds.length + ' 問を解き直す</button>' : '') +
      (SES.mode === 'drill' ? '<button class="btn" data-act="dstart">もう一度ドリル</button>' : '') +
      '<a class="btn ghost" href="#home">ホームへ</a><button class="btn ghost" data-act="sesback">' + (SES.back === '@prev' ? '結果にもどる' : '戻る') + '</button></div></div>';
    return h;
  }
  function vFlashSession() {
    var n = SES.items.length;
    if (SES.done || SES.i >= n) {
      var t = SES.tally;
      return '<div class="endcard"><p class="eyebrow">' + esc(SES.title) + '</p><h1>おつかれさまでした</h1><div class="ftally"><div><span class="num">' + t.know + '</span>覚えた</div><div><span class="num">' + t.unsure + '</span>あやふや</div><div><span class="num">' + t.no + '</span>まだ</div></div><div class="btnrow">' + (SES.back && SES.back !== 'flash' && SES.back !== 'home' ? '<button class="btn" data-act="sesback">戻る</button>' : '') + '<a class="btn' + (SES.back && SES.back !== 'flash' && SES.back !== 'home' ? ' ghost' : '') + '" href="#flash">一問一答へ</a><a class="btn ghost" href="#home">ホームへ</a></div></div>';
    }
    /* 単語カードの見開き: 右ページ = 問題の面、左ページ = めくった答えの面。束の厚みは残り・済みの枚数 */
    var it = SES.items[SES.i], x = it.x, cat = flCat(x), flipped = !!it.flip;
    var doneN = SES.i + (flipped ? 1 : 0), restN = n - SES.i - (flipped ? 1 : 0);
    var h = '<div class="stop"><button class="lnkbtn" data-act="quit">← 終了</button><span class="stitle">' + esc(SES.title) + '</span><span class="sprog num">' + (SES.i + 1) + ' / ' + n + '</span></div>' + meter(SES.i / n, 'm-prog');
    h += '<div class="fbook' + (flipped ? ' flipped' : '') + '">';
    /* 左ページ（めくったカードの束） */
    h += '<div class="fpage fl-left"><div class="fstack" style="' + flStack(doneN, -1) + '">';
    if (flipped) h += wcardBack(x, cat, null, '');
    else if (SES.i > 0) h += '<div class="wcard cover"><p class="wempty">めくったカード</p></div>';
    else h += '<div class="wcard blank"><p class="wempty">めくったカードの答えが、ここに重なっていきます</p></div>';
    h += '</div><p class="fcount num">めくった <b>' + doneN + '</b> 枚</p></div>';
    h += '<div class="fspine" aria-hidden="true"><i></i><i></i></div>';
    /* 右ページ（これからのカードの束） */
    h += '<div class="fpage fl-right"><div class="fstack" style="' + flStack(restN, 1) + '">';
    if (!flipped) h += wcardFront(x, cat, '');
    else if (restN > 0) h += '<div class="wcard cover"><p class="wempty">次のカード</p></div>';
    else h += '<div class="wcard blank"><p class="wempty">これが最後のカードでした</p></div>';
    h += '</div><p class="fcount num">のこり <b>' + restN + '</b> 枚</p></div></div>';
    /* 操作 */
    if (flipped) {
      var lv = flLevel(x), sib = C.flash.filter(function (y) { return y.c === x.c; });
      h += '<div class="rate"><button class="btn rate-no" data-act="rate" data-v="no">まだ<small>1</small></button><button class="btn rate-unsure" data-act="rate" data-v="unsure">あやふや<small>2</small></button><button class="btn rate-know" data-act="rate" data-v="know">覚えた<small>3</small></button></div>';
      h += '<div class="fextra">';
      if (x.n) h += '<p class="fnote"><b>理由・覚え方</b>' + fx(x.n) + '</p>';
      h += '<p class="flvnow">いまのレベル ' + (lv < 0 ? '0（はじめて）' : lv) + '　→「覚えた」なら次は ' + FL_DAYS[Math.min(5, Math.max(0, lv) + 1)] + ' 日後</p>';
      if (sib.length > 1) h += '<details class="fsib"><summary>「' + esc(cat ? cat.name : '') + '」をまとめて見る（' + sib.length + ' 枚）</summary><div class="tblwrap"><table class="dtbl sm"><tbody>' + sib.map(function (y) { return '<tr' + (y === x ? ' class="cur"' : '') + '><th>' + fx(y.f) + '</th><td>' + fx(y.b) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
      h += '</div>';
    } else h += '<button class="btn wide fflip" data-act="flip">めくって答えを見る<small>Space</small></button>';
    return h;
  }
  function flCat(x) { return C.flashCats.filter(function (c) { return c.id === x.c; })[0]; }
  /* 束の厚み: 枚数に応じて、カードの縁を何層か重ねて見せる（最大 14 層） */
  function flStack(cnt, dir) {
    var L = Math.min(14, Math.ceil(cnt / 2)), sh = [];
    for (var k = 1; k <= L; k++) sh.push((dir * k * 0.6).toFixed(1) + 'px ' + (k * 2.2).toFixed(1) + 'px 0 0 ' + (k % 2 ? '#FBF8EF' : '#D8D0BC'));
    return sh.length ? '--stack:' + sh.join(',') + ';--stackh:' + (L * 2.2).toFixed(1) + 'px' : '--stack:none;--stackh:0px';
  }
  var RATED = { know: '覚えた', unsure: 'あやふや', no: 'まだ' };
  function wcardFront(x, cat, cls) {
    return '<div class="wcard wfront f-' + (cat ? cat.f : 'state') + (cls || '') + '"><span class="whole" aria-hidden="true"></span><span class="wcat">' + esc(cat ? cat.name : '') + '</span><p class="wq">' + fx(x.f) + '</p></div>';
  }
  /* 一問一答の答えの改行: 「。」の後、「A は〜、B は〜」のような組の「、」、長い（説明）の前 */
  function flBr(b) {
    return String(b).split('\n').map(function (para) {
      var sents = para.match(/[^。]+。?/g) || [para];
      return sents.map(function (t) {
        t = t.trim();
        var parts = [''], dep = 0; t.split('').forEach(function (ch) { if (ch === '（') dep++; if (ch === '）') dep--; if (ch === '、' && !dep) parts.push(''); else parts[parts.length - 1] += ch; });
        if (parts.length > 1 && parts.every(function (x) { return /\S\s+\S/.test(x.replace(/（[^）]*）/g, '')); })) t = parts.join('、\n');
        return t.replace(/(\S)（([^）]{11,})）$/, '$1\n（$2）');
      }).join('\n');
    }).join('\n');
  }
  function wcardBack(x, cat, rated, cls) {
    return '<div class="wcard wback f-' + (cat ? cat.f : 'state') + (cls || '') + '"><span class="whole" aria-hidden="true"></span><span class="wcat">' + esc(cat ? cat.name : '') + '</span><p class="wqs">' + fx(x.f) + '</p><p class="wa">' + fx(flBr(x.b)) + '</p>' + (rated ? '<span class="wstamp st-' + rated + '">' + RATED[rated] + '</span>' : '') + '</div>';
  }
  function vMockSession() {
    if (SES.done) return vMockResult();
    var n = SES.items.length, it = SES.items[SES.i], q = IQ(it);
    var left = (SES.deadline - Date.now()) / 1000;
    var answered = SES.items.filter(function (x) { return x.ans != null; }).length;
    var h = '<div class="stop"><button class="lnkbtn" data-act="mquit">← やめる</button><span class="stitle">' + esc(SES.title) + (SES.full ? '　' + FULL[it.dai].name + '（' + FULL[it.dai].f + '）' : '') + '</span><span class="mtime num' + (left < 300 ? ' low' : '') + '" id="mocktime">残り ' + mmss(left) + '</span><span class="sprog num">' + answered + ' / ' + n + ' 解答</span></div>';
    if (SES.quitAsk) h += '<div class="mquitbar" role="alertdialog" aria-label="模試をやめる"><span>' + esc(SES.full ? '本番形式の模試' : 'ミニ模試') + 'をやめますか？ ここまでの解答は採点も記録もされません。</span><button class="btn" data-act="mquit2">やめる</button><button class="btn ghost" data-act="mquitno">続ける</button></div>';
    h += '<div class="mockgrid"><div class="mockq"><article class="qcard">' + inkBar() + '<div class="' + zoneCls() + '"><div class="qcol">' + qHTML(q, { no: SES.i + 1 }) + choicesHTML(q, it.ans, false) + '</div>' + CALC + '</div></article>';
    h += '<div class="mnav"><button class="btn ghost" data-act="mprev"' + (SES.i ? '' : ' disabled') + '>← 前の問題</button><button class="btn ghost" data-act="mflag">' + (it.flag ? '見直し印を外す' : '見直し印をつける') + '</button><button class="btn ghost" data-act="mnext"' + (SES.i + 1 < n ? '' : ' disabled') + '>次の問題 →</button></div></div>';
    /* 解答用紙 */
    h += '<aside class="sheetbox" aria-label="解答用紙"><div class="shh"><b>化学　解答用紙</b><small>番号を押すとその問題へ移動</small></div><div class="mshead"><span>解答<br>番号</span><span class="mslab">解　答　欄</span></div>';
    SES.items.forEach(function (x, i) {
      var qq = IQ(x);
      if (SES.full && (i === 0 || SES.items[i - 1].dai !== x.dai)) h += '<div class="mdai">' + FULL[x.dai].name + '<small>' + FULL[x.dai].f + '</small></div>';
      h += '<div class="mline' + (i === SES.i ? ' cur' : '') + (x.flag ? ' flag' : '') + '"><button class="mjump num" data-act="mjump" data-i="' + i + '" aria-label="' + (i + 1) + '問目へ">' + (i + 1) + '</button>' + markRow(i + 1, qq.c.length, x.ans, null, 'mmark', i).replace(/<span class="mno num">\d+<\/span>/, '') + '</div>';
    });
    h += '<div class="msubmit">' + (SES.confirm ? '<span>未解答 ' + (n - answered) + ' 問。採点しますか？</span><button class="btn" data-act="msubmit2">採点する</button><button class="btn ghost" data-act="mcancel">続ける</button>' : '<button class="btn" data-act="msubmit">解答を終えて採点する</button>') + '</div></aside></div>';
    return h;
  }
  function vMockResult() {
    var r = SES.result;
    var h = '<div class="endcard"><p class="eyebrow">ミニ模試の結果</p><h1><span class="num">' + r.score + '</span> 点</h1><p class="lead">' + r.c + ' / ' + r.n + ' 問正解・' + mmss(r.sec) + '</p>';
    h += '<div class="abc">' + ['A', 'B', 'C'].map(function (t) { var o = r.byT[t]; return o[1] ? '<div class="abcrow">' + tb(t) + meter(o[0] / o[1], 'm-' + t, tgoal(t)) + '<span class="abcv num">' + o[0] + '/' + o[1] + '</span></div>' : ''; }).join('') +
      (r.byB ? C.bands.map(function (b) { var o = r.byB[b.id]; return o[1] ? '<div class="abcrow">' + difTag(b.id) + meter(o[0] / o[1], 'm-dif', G().band[b.id]) + '<span class="abcv num">' + o[0] + '/' + o[1] + '</span></div>' : ''; }).join('') : '') + '</div>';
    if (r.byDai) h += '<div class="tblwrap"><table class="dtbl"><thead><tr><th>大問</th><th>分野</th><th>得点</th><th>配点</th></tr></thead><tbody>' + r.byDai.map(function (o, i) { return '<tr><th>' + FULL[i].name + '</th><td>' + FULL[i].f + '</td><td class="num"><b>' + o[0] + '</b></td><td class="num">' + o[1] + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '</div>';
    h += '<section class="panel"><h2>解き直し</h2><ol class="mres">';
    SES.items.forEach(function (it, i) {
      var q = IQ(it), ok = it.ans === q.a;
      h += '<li><details><summary><span class="qst ' + (ok ? 'ok' : 'ng') + '">' + (ok ? '○' : '×') + '</span><b>第' + (i + 1) + '問</b>' + tb(q.t) + '<span class="msum">' + fx(UBY[q.u].name) + '　あなた ' + (it.ans == null ? '未解答' : CIRC[it.ans]) + ' / 正解 ' + CIRC[q.a] + '</span></summary>' +
        '<div class="mdet">' + qHTML(q, { no: i + 1 }) + choicesHTML(q, it.ans, true) + '<section><h3>解説</h3><p>' + fxb(q.e) + '</p></section><section class="kbox"><h3>この問題の捉え方</h3><p>' + fx(q.k) + '</p></section>' + ceHTML(q) + solveAid(q) + simHTML(q) + '</div></details></li>';
    });
    h += '</ol><div class="btnrow"><a class="btn" href="#home">ホームへ</a><a class="btn ghost" href="#mock">模試へ</a></div></section>';
    return h;
  }
  function gradeMock() {
    stopTick();
    var lim = SES.limit || 1800;
    var r = { n: SES.items.length, c: 0, byT: { A: [0, 0], B: [0, 0], C: [0, 0] }, byB: { K: [0, 0], S: [0, 0], H: [0, 0] }, sec: Math.min(lim, Math.round((Date.now() - (SES.deadline - lim * 1000)) / 1000)) };
    var got = 0, tot = 0;
    if (SES.full) r.byDai = FULL.map(function () { return [0, 0]; });
    SES.items.forEach(function (it) {
      var q = IQ(it), ok = it.ans === q.a, b = bandQ(q);
      r.byB[b][1]++; if (ok) r.byB[b][0]++;
      if (SES.full) { tot += it.pt; r.byDai[it.dai][1] += it.pt; if (ok) { got += it.pt; r.byDai[it.dai][0] += it.pt; } }
      r.byT[q.t][1]++; if (ok) { r.c++; r.byT[q.t][0]++; }
      recordQ(q.id, ok, false);
      if (!ok) { var rr = S.q[q.id]; rr.due = addDays(today(), 1); }
    });
    r.score = SES.full ? Math.round(got * 100 / tot) : Math.round(r.c * 100 / r.n);
    S.mocks.push({ date: today(), kind: SES.full ? 'full' : 'mini', score: r.score, n: r.n, c: r.c, byT: r.byT, byB: r.byB, byDai: r.byDai || null, sec: r.sec });
    save();
    SES.result = r; SES.done = true;
  }

  /* ---------- ルーター ---------- */
  var NAV = [
    ['home', 'ホーム'], ['plan', '戦略'], ['units', '単元マップ'], ['patterns', '解法の型'], ['column', 'コラム'], ['hajiki', 'はじき公式'], ['practice', '演習'], ['drill', '計算ドリル'],
    ['zukan', '問題図鑑'], ['flash', '一問一答'], ['review', '復習'], ['mock', '模試'], ['exams', '過去問記録'], ['diag', '過去問の小問診断'], ['teacher', '先生用 問題一覧'], ['analysis', '8回分の分析'], ['difficulty', '難易度と正答率'], ['prefs', '設定・データ']
  ];
  /* 関連するページは、上部のタブでまとめる */
  var SUB = {
    practice: [['practice', '問題演習'], ['sets', '大問演習'], ['drill', '計算ドリル'], ['review', '復習']],
    exams: [['exams', '解く順番と記録'], ['analysis', 'A・B・C の分析'], ['difficulty', '難易度の分析']],
  };
  var PARENT = {};
  Object.keys(SUB).forEach(function (k) { SUB[k].forEach(function (t) { PARENT[t[0]] = k; }); });
  function go(h) { if (location.hash.slice(1) === h) render(); else location.hash = h; }
  function render() {
    stopTick();
    var h = location.hash.slice(1) || 'home';
    var ALIAS = { hajiki: 'patterns', diag: 'exams', teacher: 'zukan' };
    if (ALIAS[h]) { h = ALIAS[h]; try { history.replaceState(null, '', '#' + h); } catch (e) { /* noop */ } }
    var view = $('#view'), html;
    var base = h.split('-')[0];
    if (h !== 'plan') PLAN.tab = null;
    if (h.indexOf('unit-') === 0) html = vUnit(h.slice(5));
    else if (h.indexOf('pattern-') === 0) html = vPattern(h.slice(8));
    else if (h.indexOf('column-') === 0) html = vColumn(h.slice(7));
    else html = ({ home: vHome, plan: vPlan, column: vColumns, analysis: vAnalysis, difficulty: vDifficulty, zukan: vZukan, sets: vSets, units: vUnits, patterns: vPatterns, hajiki: vPatterns, practice: vPractice, drill: vDrill, flash: vFlash, review: vReview, mock: vMock, exams: vExams, prefs: vPrefs, session: vSession }[h] || vHome)();
    var navKey = base === 'unit' ? 'units' : base === 'pattern' ? 'patterns' : (PARENT[base] || base);
    if (SUB[navKey] && h !== 'session') {
      var due = dueQuestions().length;
      html = '<nav class="subtabs" aria-label="このグループのページ">' + SUB[navKey].map(function (t) { return '<a href="#' + t[0] + '"' + (t[0] === base ? ' class="on" aria-current="page"' : '') + '>' + t[1] + (t[0] === 'review' && due ? '<b>' + due + '</b>' : '') + '</a>'; }).join('') + '</nav>' + html;
    }
    view.innerHTML = html;
    document.querySelectorAll('[data-nav]').forEach(function (a) { var on = a.getAttribute('data-nav') === navKey || a.getAttribute('data-nav') === base; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var rs = $('#resumechip');
    rs.hidden = !(SES && !SES.done && h !== 'session');
    $('#drawer').hidden = true;
    document.body.classList.toggle('in-session', h === 'session');
    if (h === 'session') { bindSessionTick(); bindInk(); fitFb(); }
    if (!render._keep) window.scrollTo(0, 0);
    render._keep = false;
  }
  function rerender() { var y = window.scrollY; render._keep = true; render(); window.scrollTo(0, y); }

  function bindSessionTick() {
    if (!SES) return;
    if (SES.mode === 'mock' && !SES.done) {
      TICK = setInterval(function () {
        var left = (SES.deadline - Date.now()) / 1000;
        var el = $('#mocktime');
        if (left <= 0) { gradeMock(); render(); return; }
        if (el) { el.textContent = '残り ' + mmss(left); el.classList.toggle('low', left < 300); }
      }, 1000);
    } else if ((SES.mode === 'q' || SES.mode === 'drill') && !SES.done) {
      var it = SES.items[SES.i];
      if (it.answered) return;
      if (!it.t0) it.t0 = Date.now();
      var el0 = $('#qtime');
      var goal = el0 ? Number(el0.getAttribute('data-goal')) : 120;
      var upd = function () {
        var el = $('#qtime'); if (!el) return;
        var s = (Date.now() - it.t0) / 1000;
        el.firstChild.nodeValue = mmss(s);
        el.classList.toggle('over', s > goal);
      };
      upd(); TICK = setInterval(upd, 1000);
    }
  }

  /* ---------- 書き込み（ペン） ----------
     問題文・図・選択肢・計算用の余白に、ペンで書き込める。書いた線は問題ごとに保存する。
     ペンを使うと自動で書き込みがオンになり、指（手のひら）では書かない。解答はマーク欄をタップ。 */
  var INK = { on: false, tool: 'pen', color: '#1A1A1A', penSeen: false };
  try { INK.on = localStorage.getItem('chem80_ink') === '1'; INK.penSeen = localStorage.getItem('chem80_pen') === '1'; } catch (e) { /* noop */ }
  function inkPref() { try { localStorage.setItem('chem80_ink', INK.on ? '1' : '0'); localStorage.setItem('chem80_pen', INK.penSeen ? '1' : '0'); } catch (e) { /* noop */ } }
  var CALC = '<div class="calcspace" aria-hidden="true"><span>計算用の余白</span></div>';
  /* 計算用の余白: 幅が足りるときは問題の右（左利きなら左）に置く */
  var CALCSIDE = 'right';
  try { if (localStorage.getItem('chem80_calc') === 'left') CALCSIDE = 'left'; } catch (e) { /* noop */ }
  function zoneCls() { return 'inkzone' + (CALCSIDE === 'left' ? ' calc-left' : ''); }
  function inkBar() {
    function tool(t, c, label) {
      var on = INK.tool === t && (t !== 'pen' || INK.color === c);
      return '<button class="ib' + (on ? ' on' : '') + '" data-act="inktool" data-t="' + t + '"' + (c ? ' data-c="' + c + '"' : '') + '>' + (c ? '<i style="background:' + c + '"></i>' : '') + label + '</button>';
    }
    return '<div class="inkbar" role="toolbar" aria-label="書き込みの道具">' +
      '<button class="ib sw' + (INK.on ? ' on' : '') + '" data-act="inktoggle" aria-pressed="' + INK.on + '">書き込み ' + (INK.on ? 'オン' : 'オフ') + '</button>' +
      tool('pen', '#1A1A1A', '鉛筆') + tool('pen', '#C41E3A', '赤') + tool('eraser', null, '消しゴム') +
      '<button class="ib" data-act="inkclear">この問題の書き込みを消す</button>' +
      '<button class="ib calcsw" data-act="calcside" title="幅の広い画面で、計算用の余白を置く側">計算欄 ' + (CALCSIDE === 'left' ? '左' : '右') + '</button>' +
      '<span class="ibnote">' + (INK.on ? '本文・図・選択肢・余白に書けます。解答はマーク欄をタップします。' : 'ペンで書くと自動でオンになります。') + '</span></div>';
  }
  function inkItem() { return SES && SES.items && SES.items[SES.i]; }
  function bindInk() {
    var zone = document.querySelector('.inkzone'); var it = inkItem();
    if (!zone || !it) return;
    if (!it.ink) it.ink = [];
    var cv = document.createElement('canvas'); cv.className = 'inkcv'; cv.setAttribute('aria-hidden', 'true'); zone.appendChild(cv);
    var ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
    function line(s, from) {
      ctx.strokeStyle = s.c; ctx.lineWidth = s.w * dpr; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      var p = s.p, i0 = Math.max(0, from || 0);
      ctx.moveTo(p[i0][0] * dpr, p[i0][1] * dpr);
      if (p.length === 1) ctx.lineTo(p[0][0] * dpr + 0.5, p[0][1] * dpr + 0.5);
      for (var i = i0 + 1; i < p.length; i++) ctx.lineTo(p[i][0] * dpr, p[i][1] * dpr);
      ctx.stroke();
    }
    function redraw() { ctx.clearRect(0, 0, cv.width, cv.height); it.ink.forEach(function (s) { line(s, 0); }); }
    function size() {
      var r = zone.getBoundingClientRect();
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; redraw();
    }
    size();
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { size(); }); ro.observe(zone); }
    /* 書き込みが使えるあいだは、ブラウザのスクロール判定を止める（touch-action: none）。
       pan-y のままだと、縦の線を描くとスクロールと判定されて線が途切れる（Chromebook など、
       ペンが近づいたことを知らせない端末で起きる）。指でのスクロールは下の pan で自前で行う。 */
    function setTouch() { zone.style.touchAction = (INK.on || INK.penSeen) ? 'none' : ''; }
    setTouch();
    zone.classList.toggle('inking', INK.on);
    function pos(e) { var r = zone.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function erase(q) {
      var n = it.ink.length;
      it.ink = it.ink.filter(function (s) { return !s.p.some(function (pt) { return Math.abs(pt[0] - q[0]) < 12 && Math.abs(pt[1] - q[1]) < 12; }); });
      if (it.ink.length !== n) redraw();
    }
    var cur = null, pan = null;
    zone.addEventListener('pointerdown', function (e) {
      /* 指: ペンを使う端末や書き込みオフのときは書かず、ページをスクロールする */
      if (e.pointerType === 'touch' && (INK.penSeen || !INK.on)) {
        if (zone.style.touchAction === 'none' && !cur) { pan = { id: e.pointerId, y: e.clientY }; try { zone.setPointerCapture(e.pointerId); } catch (err) { /* noop */ } }
        return;
      }
      if (e.target.closest && e.target.closest('.msheet, .qtools')) return;
      if (e.pointerType === 'pen') {
        if (!INK.penSeen || !INK.on) { INK.penSeen = true; INK.on = true; inkPref(); zone.classList.add('inking'); var bar = document.querySelector('.inkbar'); if (bar) bar.outerHTML = inkBar(); }
        zone.style.touchAction = 'none';
      } else if (!INK.on) {
        return; /* オフのときは書かない */
      }
      if (e.button > 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      try { zone.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      var q = pos(e);
      if (INK.tool === 'eraser' || e.button === 5 || (e.buttons & 32)) { cur = { erase: true }; erase(q); return; }
      cur = { c: INK.color, w: e.pointerType === 'pen' ? 1.2 + (e.pressure || .5) * 1.6 : 2, p: [q] };
      it.ink.push(cur); line(cur, 0);
    });
    zone.addEventListener('pointermove', function (e) {
      if (pan && e.pointerId === pan.id) { if (!cur) window.scrollBy(0, pan.y - e.clientY); pan.y = e.clientY; return; }
      if (!cur) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!evs.length) evs = [e];
      evs.forEach(function (ev) {
        var q = pos(ev);
        if (cur.erase) { erase(q); return; }
        cur.p.push(q); line(cur, cur.p.length - 2);
      });
    });
    function end(e) { if (pan && e && e.pointerId === pan.id) { pan = null; return; } cur = null; }
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    /* 書いている途中は、タッチによるスクロールを止める（touch-action を無視する端末への保険） */
    zone.addEventListener('touchmove', function (e) { if (cur) e.preventDefault(); }, { passive: false });
    /* 書き込み中は、選択肢の文字に触れても解答にしない（解答はマーク欄で） */
    zone.addEventListener('click', function (e) {
      if (INK.on && e.target.closest('.choice')) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  /* 解説が計算欄の位置（横）に開いているとき、画面の下端までの高さにする */
  function fbSide() { var fb = $('.qcard.answered .fb'), z = $('.qcard .inkzone'); return !!(fb && z && fb.getBoundingClientRect().left > z.getBoundingClientRect().left + 40); }
  function fitFb() {
    var card = $('.qcard.answered'); if (!card) return;
    var fb = card.querySelector('.fb'), z = card.querySelector('.inkzone'); if (!fb || !z) return;
    if (!fbSide()) { card.style.removeProperty('--fbmax'); return; }
    var top = z.getBoundingClientRect().top + window.scrollY;
    var mn = document.querySelector('.main'), pb = mn ? parseFloat(getComputedStyle(mn).paddingBottom) || 0 : 0;
    var room = window.innerHeight - top - pb - 2;
    card.style.setProperty('--fbmax', Math.max(z.offsetHeight, room, 320) + 'px');
  }
  window.addEventListener('resize', function () { if (location.hash === '#session') fitFb(); });

  /* ---------- 操作 ---------- */
  function answer(i) {
    var it = SES.items[SES.i]; if (it.answered) return;
    var q = curQ();
    it.picked = i; it.answered = true; it.sec = Math.round((Date.now() - (it.t0 || Date.now())) / 1000);
    it.hintUsed = !!it.hint;
    var ok = i === q.a;
    if (SES.mode === 'drill') recordDrill(q.u, ok);
    else recordQ(it.id, ok, it.hint);
    stopTick();
    rerender();
    var fb = $('.fb'); if (fb && !fbSide() && fb.getBoundingClientRect().top > window.innerHeight * 0.75) fb.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /* 演習を抜ける。'@prev' は「結果画面から開いた1問」→ 元の結果画面へ */
  function leave(b) {
    if (b === '@prev') { if (SES && SES.parent) { SES = SES.parent; go('session'); } else go('home'); return; }
    go(b || 'home');
  }
  function nextQ() {
    if (SES.i + 1 < SES.items.length) { SES.i++; render(); } else { SES.done = true; render(); }
  }
  var ACT = {
    quick: function (el) { quick(el.dataset.k); },
    showcalc: function () { var it = SES && SES.items[SES.i]; if (!it) return; it.showCalc = !it.showCalc; rerender(); },
    setgoal: function (el) { var g = Number(el.dataset.g); if (!C.goalBy[g]) return; S.prefs.goal = g; PLAN.tab = null; save(); buildNav(); toast('目標を「' + G().short + '（' + g + '点）」にしました'); rerender(); },
    plantab: function (el) { PLAN.tab = Number(el.dataset.g); rerender(); },
    unitgo: function (el) { var t = el.dataset.t, b = el.dataset.b; startQSession(buildSet({ units: [el.dataset.u], types: t ? [t] : null, bands: b ? [b] : null, order: 'weak' }), fx(UBY[el.dataset.u].name).replace(/<[^>]+>/g, '') + (t ? '（' + t + '）' : '') + (b ? '（' + BBY[b].name + '）' : ''), { back: 'unit-' + el.dataset.u }); },
    patgo: function (el) { startQSession(buildSet({ pattern: el.dataset.p, order: 'weak' }), PBY[el.dataset.p].name.replace(/[_^{}]/g, ''), { back: 'pattern-' + el.dataset.p }); },
    one: function (el) {
      /* 結果画面から開いたときは、その演習を親として覚えておき、終わったら結果画面に戻る */
      var parent = (location.hash === '#session' && SES && SES.done) ? SES : null;
      startQSession([el.dataset.id], '1問だけ解く', { back: parent ? '@prev' : (location.hash.slice(1) || 'home') });
      if (parent) SES.parent = parent;
    },
    sesback: function () { leave(SES ? SES.back : 'home'); },
    drillunit: function (el) { var u = el.dataset.u; startDrill(C.generators.filter(function (g) { return g.u === u; }).map(function (g) { return g.id; }), 10, 'unit-' + u); },
    flashunit: function (el) { var u = el.dataset.u; startFlash(buildFlash(unitFlash(u), 'rec', 20), plainText(UBY[u].name) + 'の一問一答', 'unit-' + u); },
    preset: function (el) {
      var k = el.dataset.k, n = qsz(k);
      if (k === 'weak') startQSession(buildSet({ order: 'weak', count: n }), '苦手・未解答から');
      else if (BBY[k]) startQSession(buildSet({ bands: [k], order: 'weak', count: n }), BBY[k].name + '（' + BBY[k].rule + '）の演習');
      else startQSession(buildSet({ types: [k], order: 'weak', count: n }), C.types[k].long + 'の演習');
    },
    qsize: function (el) { QSIZE = el.dataset.v === 'light' ? 'light' : 'normal'; try { localStorage.setItem('chem80_size', QSIZE); } catch (e) { /* noop */ } rerender(); },
    pftype: function (el) { PF.open = true; var t = el.dataset.t, i = PF.types.indexOf(t); if (i >= 0) { if (PF.types.length > 1) PF.types.splice(i, 1); } else PF.types.push(t); rerender(); },
    pffield: function (el) { PF.open = true;
      var us = (SECBY[el.dataset.f] || { units: [] }).units.slice();
      var cur = PF.units || C.units.map(function (u) { return u.id; });
      var allOn = us.every(function (u) { return cur.indexOf(u) >= 0; });
      if (allOn) cur = cur.filter(function (u) { return us.indexOf(u) < 0; }); else us.forEach(function (u) { if (cur.indexOf(u) < 0) cur.push(u); });
      PF.units = cur; rerender();
    },
    pfunit: function (el) { PF.open = true; var cur = PF.units || C.units.map(function (u) { return u.id; }); var i = cur.indexOf(el.dataset.u); if (i >= 0) cur.splice(i, 1); else cur.push(el.dataset.u); PF.units = cur; rerender(); },
    pfcount: function (el) { PF.open = true; PF.count = Number(el.dataset.n); rerender(); },
    pforder: function (el) { PF.open = true; PF.order = el.dataset.o; rerender(); },
    pfstart: function () { startQSession(buildSet({ units: PF.units, types: PF.types, bands: PF.bands, count: PF.count, order: PF.order }), '選んだ条件の演習'); },
    difcsv: function () { saveCSV(); },
    pfband: function (el) { PF.open = true; var b = el.dataset.b, i = PF.bands.indexOf(b); if (i >= 0) { if (PF.bands.length > 1) PF.bands.splice(i, 1); } else PF.bands.push(b); rerender(); },
    dtoggle: function (el) { var cur = DF.gens || C.generators.map(function (g) { return g.id; }); var i = cur.indexOf(el.dataset.g); if (i >= 0) cur.splice(i, 1); else cur.push(el.dataset.g); DF.gens = cur; rerender(); },
    dall: function () { DF.gens = C.generators.map(function (g) { return g.id; }); rerender(); },
    dnone: function () { DF.gens = []; rerender(); },
    dcount: function (el) { DF.n = Number(el.dataset.n); rerender(); },
    dstart: function () {
      /* 結果画面の「もう一度ドリル」は、さっきと同じドリルで */
      if (SES && SES.mode === 'drill' && SES.done && SES.gens) { startDrill(shuffle(SES.gens.slice()), SES.n || DF.n, SES.back); return; }
      startDrill(shuffle((DF.gens || []).slice()), DF.n);
    },
    ftoggle: function (el) { var cur = FF.cats; var i = cur.indexOf(el.dataset.c); if (i >= 0) cur.splice(i, 1); else cur.push(el.dataset.c); rerender(); },
    fall: function () { FF.cats = C.flashCats.map(function (c) { return c.id; }); rerender(); },
    fnone: function () { FF.cats = []; rerender(); },
    fsetf: function (el) {
      var ids = C.flashCats.filter(function (c) { return c.f === el.dataset.f; }).map(function (c) { return c.id; });
      var allOn = ids.every(function (id) { return FF.cats.indexOf(id) >= 0; });
      FF.cats = allOn ? FF.cats.filter(function (id) { return ids.indexOf(id) < 0; }) : FF.cats.concat(ids.filter(function (id) { return FF.cats.indexOf(id) < 0; }));
      rerender();
    },
    fweak: function () { startFlash(buildFlash(C.flashCats.map(function (c) { return c.id; }), 'weak', 40), '覚えていないカード'); },
    fmode: function (el) { FF.mode = el.dataset.m; rerender(); },
    fcount: function (el) { FF.n = Number(el.dataset.n); rerender(); },
    fstart: function () { if (!FF.cats.length) { toast('カテゴリを選んでください'); return; } startFlash(buildFlash(FF.cats, FF.mode, FF.n), '一問一答'); },
    fdue: function () { startFlash(shuffle(dueFlash()), 'カードの復習'); },
    redo: function () { startQSession(C.questions.filter(function (q) { return lastOk(q.id) === false; }).map(function (q) { return q.id; }), '間違えた問題の解き直し', { back: 'review' }); },
    redoses: function () { var p = SES.parent, ids = SES.items.filter(function (it) { return it.answered && it.picked !== IQ(it).a; }).map(function (it) { return it.id; }); startQSession(ids, '解き直し', { back: SES.back }); if (p) SES.parent = p; },
    pick: function (el) {
      var i = Number(el.dataset.i);
      if (SES.mode === 'mock') { var it = SES.items[SES.i]; it.ans = it.ans === i ? null : i; rerender(); return; }
      answer(i);
    },
    hint: function () { var it = SES.items[SES.i]; it.hint = true; rerender(); },
    giveup: function () { var it = SES.items[SES.i]; it.hint = true; answer(-1); },
    next: function () { nextQ(); },
    why: function (el) { var it = SES.items[SES.i]; if (it.why) S.why[it.why] = Math.max(0, (S.why[it.why] || 1) - 1); it.why = el.dataset.w; S.why[it.why] = (S.why[it.why] || 0) + 1; save(); rerender(); },
    conf: function (el) {
      var it = SES.items[SES.i]; it.conf = el.dataset.v;
      var r = S.q[it.id];
      if (r) { if (it.conf === 'lucky') { r.s = 0; r.due = addDays(today(), 1); } else if (r.s === 0) { r.s = 1; r.due = addDays(today(), QI[0]); } save(); }
      rerender();
    },
    quit: function () { var b = SES ? SES.back : 'home'; if (SES && SES.mode === 'flash') SES.done = true; if (SES && (SES.mode !== 'mock')) SES.done = SES.done || SES.items.every(function (x) { return x.answered; }); leave(b); },
    flip: function () { SES.items[SES.i].flip = true; rerender(); },
    rate: function (el) {
      var it = SES.items[SES.i], v = el.dataset.v;
      rateFlash(it.key, v); SES.tally[v]++; it.rated = v;
      if (v === 'no' && it.again < 2) SES.items.push({ x: it.x, key: it.key, again: it.again + 1 });
      SES.i++; if (SES.i >= SES.items.length) SES.done = true; render();
    },
    mockstart: function () { startMock(); },
    mockfull: function () { startFullMock(); },
    setgo: function (el) { var st = SETBY[el.dataset.s]; startQSession(setIds(st.id), '大問「' + plainText(st.title) + '」', { back: 'sets' }); },
    setrand: function (el) {
      var onlyNew = el && el.dataset && el.dataset.k === 'new', ids = [];
      shuffle((C.csets || []).filter(function (st) { return !onlyNew || isNewSet(st); })).sort(function (a, b) { return setSeen(a.id) - setSeen(b.id); }).slice(0, 2).forEach(function (st) { ids = ids.concat(setIds(st.id)); });
      startQSession(ids, onlyNew ? '初見の題材（2題）' : '大問演習（2題）', { back: 'sets' });
    },
    dgex: function (el) { DG.ex = el.dataset.e; EXF.open = null; rerender(); },
    dgsort: function (el) { DG.sort = el.dataset.s; rerender(); },
    difex: function (el) { DIF.ex = el.dataset.e; rerender(); },
    difsort: function (el) { DIF.sort = el.dataset.s; rerender(); },
    dgopen: function (el) { DG.ex = el.dataset.e; go('exams'); },
    aset: function (el) {
      var A = ansOf(DG.ex), n = el.dataset.n, v = el.dataset.v, a = A[n] || (A[n] = {});
      if (a.v === v) delete A[n]; else { a.v = v; if (v === 'x') delete a.c; else if (!a.c) a.c = 'sure'; }
      save(); rerender();
    },
    aconf: function (el) { var a = ansOf(DG.ex)[el.dataset.n]; if (!a || a.v == null || a.v === 'x') return; a.c = a.c === 'unsure' ? 'sure' : 'unsure'; save(); rerender(); },
    acheck: function () { var e = DIAGBY[DG.ex], A = ansOf(e.id); A._checked = true; recordDiag(e); save(); toast('採点しました（' + diagEval(e).got + '点）'); render(); window.scrollTo(0, 0); },
    aedit: function () { ansOf(DG.ex)._checked = false; save(); render(); },
    areset: function () { S.ans[DG.ex] = {}; save(); render(); },
    zkset: function (el) { ZK[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'f') ZK.u = 'all'; rerender(); },
    zkreset: function () { ZK.f = ZK.u = ZK.b = ZK.t = ZK.st = ZK.kind = 'all'; ZK.kw = ''; rerender(); },
    zkopen: function (el) { var id = el.dataset.id; ZK.open[id] = !ZK.open[id]; rerender(); },
    zkall: function () { ZK.all = !ZK.all; ZK.open = {}; rerender(); },
    zkgo: function () { startQSession(zkList().slice(0, 20).map(function (q) { return q.id; }), '問題図鑑から', { back: 'zukan' }); },
    tprint: function () { try { window.print(); } catch (e) { toast('この画面では印刷できません'); } },
    treroll: function (el) { var q = QBY[el.dataset.id]; if (q.set && SETBY[q.set]) { var inst = SETBY[q.set].gen(); C.questions.forEach(function (x) { if (x.set === q.set) Object.assign(x, inst.qs[x.si], { lead: inst.lead, lfig: inst.fig || null, ltbl: inst.tbl || null }); }); } else if (q.fam) Object.assign(q, q.fam.gen()); rerender(); },
    backup: function () { saveBackup(); },
    inktoggle: function () { INK.on = !INK.on; inkPref(); rerender(); },
    calcside: function () { CALCSIDE = CALCSIDE === 'left' ? 'right' : 'left'; try { localStorage.setItem('chem80_calc', CALCSIDE); } catch (e) { /* noop */ } rerender(); },
    inktool: function (el) { INK.tool = el.dataset.t; if (el.dataset.c) INK.color = el.dataset.c; if (!INK.on) INK.on = true; inkPref(); rerender(); },
    inkclear: function () { var it = inkItem(); if (it) it.ink = []; rerender(); },
    mmark: function (el) { var qi = Number(el.dataset.q), it = SES.items[qi], i = Number(el.dataset.i); it.ans = it.ans === i ? null : i; SES.i = qi; SES.confirm = false; rerender(); },
    hj: function (el) { var id = el.getAttribute('data-id'), part = el.getAttribute('data-part'); HJ[id] = HJ[id] === part ? null : part; rerender(); },
    hjdrill: function () { startDrill(['g-hajiki'], 10, here()); },
    exsel: function (el) { EXSEL = el.dataset.e; rerender(); },
    mjump: function (el) { SES.i = Number(el.dataset.i); SES.confirm = false; render(); },
    mprev: function () { if (SES.i) { SES.i--; render(); } },
    mnext: function () { if (SES.i + 1 < SES.items.length) { SES.i++; render(); } },
    mflag: function () { var it = SES.items[SES.i]; it.flag = !it.flag; rerender(); },
    msubmit: function () { SES.confirm = true; rerender(); },
    mcancel: function () { SES.confirm = false; rerender(); },
    mquit: function () { SES.quitAsk = true; SES.confirm = false; rerender(); window.scrollTo(0, 0); },
    mquitno: function () { SES.quitAsk = false; rerender(); },
    mquit2: function () { stopTick(); SES = null; toast('模試をやめました（記録はしていません）'); go('mock'); },
    msubmit2: function () { gradeMock(); render(); },
    exopen: function (el) { EXF.open = EXF.open === el.dataset.e ? null : el.dataset.e; rerender(); },
    exdel: function (el) { var a = S.exams[el.dataset.e]; a.splice(Number(el.dataset.i), 1); save(); rerender(); toast('記録を削除しました'); },
    copy: function (el) {
      var ta = document.getElementById(el.dataset.src);
      var done = function () { toast('コピーしました'); };
      try { navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); toast('選択しました。コピーしてください'); }); }
      catch (e) { ta.select(); toast('選択しました。コピーしてください'); }
    },
    import: function () {
      importText($('#imp').value.trim());
    },
    reset: function () { RESET_ASK = true; rerender(); },
    resetno: function () { RESET_ASK = false; rerender(); },
    resetyes: function () { var p = S.prefs; S = blank(); S.prefs = p; save(); RESET_ASK = false; SES = null; toast('記録を消去しました'); render(); },
    menu: function () { var d = $('#drawer'); d.hidden = !d.hidden; },
    closemenu: function () { $('#drawer').hidden = true; }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var f = ACT[el.dataset.act]; if (!f) return;
    e.preventDefault(); f(el, e);
  });
  var ZK_T = null;
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'zk-kw') return;
    ZK.kw = e.target.value; clearTimeout(ZK_T);
    ZK_T = setTimeout(function () { rerender(); var k = document.getElementById('zk-kw'); if (k) { k.focus(); k.setSelectionRange(k.value.length, k.value.length); } }, 300);
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'zk-u') { ZK.u = t.value; rerender(); }
    else if (t.id === 'impfile' && t.files && t.files[0]) {
      var rd = new FileReader();
      rd.onload = function () { importText(String(rd.result || '').trim()); };
      rd.onerror = function () { toast('ファイルを読み込めませんでした'); };
      rd.readAsText(t.files[0]);
    }
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.id === 'prefform') {
      S.prefs.name = $('#pf-name').value.trim();
      var d = $('#pf-date').value; if (/^\d{4}-\d{2}-\d{2}$/.test(d)) S.prefs.examDate = d;
      var gv = Number($('#pf-goal').value); if (C.goalBy[gv]) { S.prefs.goal = gv; PLAN.tab = null; buildNav(); }
      save(); toast('保存しました'); render();
    } else if (f.classList.contains('exform')) {
      var id = f.dataset.e, ex = C.exams.filter(function (x) { return x.id === id; })[0];
      var s = ex.secs.map(function (_, i) { return Math.max(0, Math.min(20, Number($('#ex-' + id + '-' + i).value) || 0)); });
      var rec = { date: $('#ex-' + id + '-d').value || today(), s: s, min: Number($('#ex-' + id + '-t').value) || 60 };
      (S.exams[id] || (S.exams[id] = [])).push(rec); save(); EXF.open = null; toast('保存しました（' + examTotal(rec) + '点）'); rerender();
    }
  });
  document.addEventListener('keydown', function (e) {
    var tg = e.target;
    if (tg && tg.getAttribute && tg.getAttribute('role') === 'button' && tg.dataset && tg.dataset.act && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); var f0 = ACT[tg.dataset.act]; if (f0) f0(tg, e); return; }
    if (!SES || location.hash.slice(1) !== 'session') return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var k = e.key;
    if (SES.mode === 'flash' && !SES.done && SES.i < SES.items.length) {
      var it = SES.items[SES.i];
      if (!it.flip && (k === ' ' || k === 'Enter')) { e.preventDefault(); ACT.flip(); }
      else if (it.flip && (k === '1' || k === '2' || k === '3')) { ACT.rate({ dataset: { v: ['no', 'unsure', 'know'][Number(k) - 1] } }); }
      return;
    }
    if ((SES.mode === 'q' || SES.mode === 'drill') && !SES.done) {
      var it2 = SES.items[SES.i], q = curQ();
      if (!it2.answered && /^[1-8]$/.test(k) && Number(k) <= q.c.length) { answer(Number(k) - 1); }
      else if (!it2.answered && (k === 'ArrowDown' || k === 'ArrowUp')) {
        e.preventDefault();
        var n0 = q.c.length, c0 = it2.cur, cbs = document.querySelectorAll('.choices .choice');
        it2.cur = c0 == null ? (k === 'ArrowDown' ? 0 : n0 - 1) : (c0 + (k === 'ArrowDown' ? 1 : n0 - 1)) % n0;
        Array.prototype.forEach.call(cbs, function (b, bi) { b.classList.toggle('kcur', bi === it2.cur); });
        var cb = cbs[it2.cur]; if (cb) { var r0 = cb.getBoundingClientRect(); if (r0.top < 60 || r0.bottom > window.innerHeight - 70) cb.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      }
      else if (!it2.answered && k === 'Enter' && it2.cur != null) { e.preventDefault(); answer(it2.cur); }
      else if (it2.answered && (k === 'Enter' || k === 'ArrowRight')) { e.preventDefault(); nextQ(); }
    } else if (SES.mode === 'mock' && !SES.done) {
      var q2 = curQ();
      if (/^[1-8]$/.test(k) && Number(k) <= q2.c.length) { ACT.pick({ dataset: { i: Number(k) - 1 } }); }
      else if (k === 'ArrowRight') ACT.mnext(); else if (k === 'ArrowLeft') ACT.mprev();
      else if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        var it3 = SES.items[SES.i], n1 = q2.c.length;
        it3.ans = it3.ans == null ? (k === 'ArrowDown' ? 0 : n1 - 1) : (it3.ans + (k === 'ArrowDown' ? 1 : n1 - 1)) % n1; rerender();
      }
    }
  });
  window.addEventListener('hashchange', render);

  /* ナビゲーションを組み立てる */
  function buildNav() {
    var groups = [['', ['home', 'plan']], ['学ぶ', ['units', 'patterns', 'column']], ['解く', ['practice', 'zukan', 'flash']], ['本番', ['mock', 'exams']], ['', ['prefs']]];
    var label = {}; NAV.forEach(function (n) { label[n[0]] = n[1]; });
    label.practice = '演習'; label.exams = '過去問分析'; label.prefs = '設定'; label.plan = G().short + 'の戦略';
    var side = groups.map(function (g) { return '<div class="navg">' + (g[0] ? '<p class="navl">' + g[0] + '</p>' : '') + g[1].map(function (k) { return '<a href="#' + k + '" data-nav="' + k + '">' + label[k] + '</a>'; }).join('') + '</div>'; }).join('');
    $('#sidenav').innerHTML = side;
    $('#drawernav').innerHTML = side;
  }

  /* 公開中のページ更新で、進行中の演習を引き継ぐ */
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(function () { return { SES: SES }; }); } catch (e) { /* noop */ } }
  function start(data) {
    if (data && data.SES) SES = data.SES;
    buildNav();
    render();
  }
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});

  /* オフライン対応: Web サーバー（GitHub Pages など）に置いたときだけ、sw.js でファイルを端末に保存する */
  try {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window && !/claude/.test(location.hostname)) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sw.js がなければ何もしない */ }); });
    }
  } catch (e) { /* noop */ }
})();
