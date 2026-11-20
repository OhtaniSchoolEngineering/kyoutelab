/* 数値とリード文が毎回変わる計算問題（ファミリー）
   解説は「はじき → 比 → はじき」の1本の考え方でそろえる。
   hs: はじきで解く手順（h: はじき図 / r: 比 / c: 計算） */
window.CHEM = window.CHEM || {};
(function () {
  'use strict';
  var C = window.CHEM, fmt = C.fmt, mk = C.mkChoices, pick = C.pick;
  var HALFEQ = { KMnO_4: 'MnO_4^{-} + 8H^{+} + 5e^{-} -> Mn^{2+} + 4H_2O', K_2Cr_2O_7: 'Cr_2O_7^{2-} + 14H^{+} + 6e^{-} -> 2Cr^{3+} + 7H_2O', H_2O_2: 'H_2O_2 -> O_2 + 2H^{+} + 2e^{-}', '(COOH)_2': '(COOH)_2 -> 2CO_2 + 2H^{+} + 2e^{-}', FeSO_4: 'Fe^{2+} -> Fe^{3+} + e^{-}' };
  function f(x, s) { return fmt(x, s || 2); }
  /* ---- はじきの手順を作る部品 ---- */
  function guten(who, g, M, find, mol) {
    if (find === 'bl') return { h: 'guten', who: who, v: { top: f(g, 3), br: String(M) }, find: 'bl', eq: 'mol = {{' + f(g, 3) + '|' + M + '}} = ' + f(mol) + ' mol' };
    return { h: 'guten', who: who, v: { bl: f(mol), br: String(M) }, find: 'top', eq: 'g = ' + f(mol) + ' × ' + M + ' = ' + f(g, 3) + ' g' };
  }
  function elmo(who, L, mol, find) {
    if (find === 'bl') return { h: 'elmo', who: who, v: { top: f(L, 3) }, find: 'bl', eq: 'mol = {{' + f(L, 3) + '|22.4}} = ' + f(mol) + ' mol' };
    return { h: 'elmo', who: who, v: { bl: f(mol) }, find: 'top', eq: 'L = ' + f(mol) + ' × 22.4 = ' + f(L, 3) + ' L' };
  }
  function komoru(who, N, mol, find) {
    if (find === 'bl') return { h: 'komoru', who: who, v: { top: f(N) }, find: 'bl', eq: 'mol = {{' + f(N) + '|6.0×10^{23}}} = ' + f(mol) + ' mol' };
    return { h: 'komoru', who: who, v: { bl: f(mol) }, find: 'top', eq: '個 = ' + f(mol) + ' × 6.0×10^{23} = ' + f(N) + ' 個' };
  }
  function shieno(who, mol, L, c, find) {
    if (find === 'top') return { h: 'shieno_mol', who: who, v: { bl: f(L, 3), br: f(c) }, find: 'top', eq: 'mol = ' + f(L, 3) + ' × ' + f(c) + ' = ' + f(mol) + ' mol' };
    if (find === 'bl') return { h: 'shieno_mol', who: who, v: { top: f(mol), br: f(c) }, find: 'bl', eq: 'L = {{' + f(mol) + '|' + f(c) + '}} = ' + f(L, 3) + ' L' };
    return { h: 'shieno_mol', who: who, v: { top: f(mol), bl: f(L, 3) }, find: 'br', eq: 'mol/L = {{' + f(mol) + '|' + f(L, 3) + '}} = ' + f(c) + ' mol/L' };
  }
  function kyas(I, t, Q, find) {
    if (find === 'top') return { h: 'kyas', v: { bl: f(I), br: String(t) }, find: 'top', eq: 'C = ' + f(I) + ' × ' + t + ' = ' + f(Q, 3) + ' C' };
    return { h: 'kyas', v: { top: f(Q, 3), bl: f(I) }, find: 'br', eq: 's = {{' + f(Q, 3) + '|' + f(I) + '}} = ' + f(t, 3) + ' 秒' };
  }
  function fight(who, F, mol, z, find) {
    if (find === 'bl') return { h: 'fight', who: who, v: { top: f(F), br: String(z) }, find: 'bl', eq: 'mol = {{' + f(F) + '|' + z + '}} = ' + f(mol) + ' mol' };
    return { h: 'fight', who: who, v: { bl: f(mol), br: String(z) }, find: 'top', eq: 'F = ' + f(mol) + ' × ' + z + ' = ' + f(F) + ' mol' };
  }
  function ratio(r, ans) { return { r: r, ans: ans }; }
  /* 反応式の下に並べる表（k: 'mol' 3行 / 'ex' 過不足5行 / 'eq' 平衡5行） */
  function rx(eq, k, o) { var s = { rx: eq, k: k }; Object.keys(o || {}).forEach(function (x) { s[x] = o[x]; }); return s; }
  function calc(c, t) { return { c: c, t: t }; }
  function coef(x) { return x === 1 ? '' : (Math.round(x) === x ? String(x) : '{{' + (x * 2) + '|2}} '); }
  var RULE = 'はじき → 比 → はじき。与えられた量をはじきで mol にし、係数の比で目的の物質の mol にして、もう一度はじきで問われた量にする。';

  var fams = [
    /* 1. 燃焼の量的関係 */
    { id: 'mol01', u: 'mol', t: 'B', lv: 1, p: ['P01', 'P02'], name: '燃焼の量的関係', sec: 90,
      gen: function () {
        var fu = pick([{ n: 'メタン', f: 'CH_4', C: 1, H: 4, M: 16 }, { n: 'エタン', f: 'C_2H_6', C: 2, H: 6, M: 30 }, { n: 'プロパン', f: 'C_3H_8', C: 3, H: 8, M: 44 }, { n: 'エチレン', f: 'C_2H_4', C: 2, H: 4, M: 28 }, { n: 'ブタン', f: 'C_4H_{10}', C: 4, H: 10, M: 58 }]);
        var n = pick([0.050, 0.10, 0.20, 0.25, 0.50]), w = n * fu.M, x = fu.C, y = fu.H, o2 = x + y / 4;
        var m = Math.round(o2) === o2 ? 1 : 2;
        function k1(c) { return c === 1 ? '' : String(c); }
        var eq = k1(m) + fu.f + ' + ' + k1(o2 * m) + 'O_2 -> ' + k1(x * m) + 'CO_2 + ' + k1(y / 2 * m) + 'H_2O';
        var mode = pick(['co2g', 'co2L', 'h2o', 'o2']);
        var head = fu.n + ' ' + fu.f + '（分子量 ' + fu.M + '）' + f(w, 3) + ' g ';
        var r, q, a, wr, unit, last;
        var s1 = guten(fu.f, w, fu.M, 'bl', n);
        if (mode === 'co2g') {
          a = n * x * 44; wr = [n * 44, w * x, a * 2, n * x * 22.4]; unit = ' g';
          q = pick([head + 'を完全燃焼させたとき、生じる二酸化炭素は何 g か。', head + 'を酸素中で完全に燃焼させた。生成した CO_2 の質量は何 g か。']);
          r = ratio(fu.f + ' : CO_2 = 1 : ' + x, 'CO_2 = ' + f(n) + ' × ' + x + ' = ' + f(n * x) + ' mol'); last = guten('CO_2', a, 44, 'top', n * x);
        } else if (mode === 'co2L') {
          a = n * x * 22.4; wr = [n * 22.4, a * 2, a / 2, n * x * 44]; unit = ' L';
          q = pick([head + 'を完全燃焼させたとき、生じる二酸化炭素の体積は 0℃、1.013×10^{5} Pa で何 L か。', head + 'が完全に燃焼した。発生した CO_2 は 0℃、1.013×10^{5} Pa で何 L か。']);
          r = ratio(fu.f + ' : CO_2 = 1 : ' + x, 'CO_2 = ' + f(n) + ' × ' + x + ' = ' + f(n * x) + ' mol'); last = elmo('CO_2', a, n * x, 'top');
        } else if (mode === 'h2o') {
          a = n * y / 2 * 18; wr = [n * y * 18, n * 18, a * 2, a / 2]; unit = ' g';
          q = pick([head + 'を完全燃焼させたとき、生じる水は何 g か。', head + 'を空気中で完全に燃焼させた。このとき生成する H_2O は何 g か。']);
          r = ratio(fu.f + ' : H_2O = 1 : ' + (y / 2), 'H_2O = ' + f(n) + ' × ' + (y / 2) + ' = ' + f(n * y / 2) + ' mol'); last = guten('H_2O', a, 18, 'top', n * y / 2);
        } else {
          a = n * o2; wr = [n, n * x, n * (x + y / 2), n * o2 * 2]; unit = ' mol';
          q = pick([head + 'を完全燃焼させるのに必要な酸素は何 mol か。', head + 'をすべて燃焼させるには、少なくとも何 mol の O_2 が必要か。']);
          r = ratio(fu.f + ' : O_2 = 1 : ' + coef(o2).replace(/ $/, '') + (o2 === 1 ? '1' : ''), 'O_2 = ' + f(n) + ' × ' + o2 + ' = ' + f(a) + ' mol'); last = null;
        }
        var ch = mk(a, wr, mode === 'o2' ? 2 : 3, unit);
        var askI = { co2g: 2, co2L: 2, h2o: 3, o2: 1 }[mode];
        var hs = [s1, rx(eq, 'mol', { base: [0, n], ask: [askI], note: r.ans })]; if (last) hs.push(last);
        return { q: q + '（H = 1.0, C = 12, O = 16）', c: ch.c, a: ch.a, hs: hs,
          e: '反応式 ' + eq + '\n' + fu.f + ' は ' + f(n) + ' mol。係数の比で目的の物質の mol を出し、はじきで答えの単位にする。',
          k: RULE + ' 燃焼では、C の数だけ CO_2、H の数の半分だけ H_2O ができる。' };
      } },
    /* 2. 気体の量の変換（g・L・個） */
    { id: 'mol02', u: 'mol', t: 'B', lv: 1, p: ['P01'], name: '気体の g・L・個の変換', sec: 60,
      gen: function () {
        var g = pick([['酸素', 'O_2', 32], ['窒素', 'N_2', 28], ['二酸化炭素', 'CO_2', 44], ['メタン', 'CH_4', 16], ['アンモニア', 'NH_3', 17]]);
        var n = pick([0.10, 0.20, 0.25, 0.50, 1.5]), w = n * g[2], L = n * 22.4, N = n * 6.0e23;
        var mode = pick(['L2g', 'g2L', 'g2N', 'g2A', 'L2N']), q, a, wr, unit, hs, sig = 2;
        var AT = { O_2: ['O', 2], N_2: ['N', 2], CO_2: ['O', 2], CH_4: ['H', 4], NH_3: ['H', 3] }[g[1]];
        var std = '0℃、1.013×10^{5} Pa';
        if (mode === 'L2g') { q = pick([std + ' で ' + f(L, 3) + ' L を占める' + g[0] + ' ' + g[1] + ' の質量は何 g か。', std + ' において体積が ' + f(L, 3) + ' L の ' + g[1] + ' は何 g か。']); a = w; wr = [L * g[2], L / g[2] * 10, w * 2, n]; unit = ' g'; hs = [elmo(g[1], L, n, 'bl'), guten(g[1], w, g[2], 'top', n)]; sig = 3; }
        else if (mode === 'g2L') { q = pick([g[0] + ' ' + g[1] + ' ' + f(w, 3) + ' g は、' + std + ' で何 L を占めるか。', g[1] + ' ' + f(w, 3) + ' g の体積は ' + std + ' で何 L か。']); a = L; wr = [w * 22.4, w / 22.4, L * 2, L / 2]; unit = ' L'; hs = [guten(g[1], w, g[2], 'bl', n), elmo(g[1], L, n, 'top')]; sig = 3; }
        else if (mode === 'g2A') { var NA = N * AT[1]; q = g[0] + ' ' + g[1] + ' ' + f(w, 3) + ' g の中に、' + AT[0] + ' 原子は何個あるか。'; a = NA; wr = [N, NA * 2, w * AT[1] * 6.0e23, NA / 2]; unit = ' 個';
          hs = [guten(g[1], w, g[2], 'bl', n), calc(g[1] + ' 1 分子に ' + AT[0] + ' 原子は ' + AT[1] + ' 個 → ' + AT[0] + ' 原子 = ' + f(n) + ' × ' + AT[1] + ' = ' + f(n * AT[1]) + ' mol', '分子 → 原子'), komoru(AT[0] + ' 原子', NA, n * AT[1], 'top')]; }
        else if (mode === 'g2N') { q = pick([g[0] + ' ' + g[1] + ' ' + f(w, 3) + ' g に含まれる分子の数は何個か。', g[0] + ' ' + f(w, 3) + ' g に含まれる ' + g[1] + ' 分子の数は何個か。']); a = N; wr = [w * 6.0e23, N * 2, N / 10, N / 2]; unit = ' 個'; hs = [guten(g[1], w, g[2], 'bl', n), komoru(g[1], N, n, 'top')]; }
        else { q = pick([std + ' で ' + f(L, 3) + ' L の' + g[0] + 'に含まれる分子は何個か。', std + ' で ' + f(L, 3) + ' L を占める ' + g[1] + ' の分子の数は何個か。']); a = N; wr = [L * 6.0e23, N * 2, N / 2, N * 10]; unit = ' 個'; hs = [elmo(g[1], L, n, 'bl'), komoru(g[1], N, n, 'top')]; }
        var ch = mk(a, wr, sig, unit);
        return { q: q + '（H = 1.0, C = 12, N = 14, O = 16、アボガドロ定数 6.0×10^{23}/mol）', c: ch.c, a: ch.a, hs: hs,
          e: '与えられた量をはじきで mol にしてから、もう一度はじきで問われた量にする。' + (mode === 'g2A' ? '原子の数は「分子の mol × 1 分子中の原子の数」。' : ''), k: 'g はグーテンモルゲン、L（0℃・1.013×10^{5} Pa）はエルモ22.4、個はこもるアボガドロ。どれも mol を通ってつながる。原子を問われたら、1 分子中の数を掛ける。' };
      } },
    /* 3. 過不足のある反応 */
    { id: 'mol03', u: 'mol', t: 'B', lv: 2, p: ['P01', 'P02'], name: '過不足のある反応', sec: 120,
      gen: function () {
        var R = pick([
          { A: 'H_2', An: '水素', MA: 2.0, B: 'O_2', Bn: '酸素', MB: 32, cA: 2, cB: 1, P: 'H_2O', Pn: '水', MP: 18, cP: 2, eq: '2H_2 + O_2 -> 2H_2O' },
          { A: 'CH_4', An: 'メタン', MA: 16, B: 'O_2', Bn: '酸素', MB: 32, cA: 1, cB: 2, P: 'CO_2', Pn: '二酸化炭素', MP: 44, cP: 1, eq: 'CH_4 + 2O_2 -> CO_2 + 2H_2O' }
        ]);
        var nA = pick([0.20, 0.50, 1.0, 1.5]), nB = pick([0.20, 0.50, 1.0, 1.5]);
        if (Math.abs(nA / R.cA - nB / R.cB) < 1e-9) nB = nB === 1.5 ? 1.0 : nB + 0.5;
        var wA = nA * R.MA, wB = nB * R.MB;
        var limA = nA / R.cA < nB / R.cB, k = limA ? nA / R.cA : nB / R.cB;
        var nP = k * R.cP, wP = nP * R.MP;
        var left = limA ? R.Bn : R.An, other = limA ? R.An : R.Bn;
        var wrongP = (limA ? nB / R.cB : nA / R.cA) * R.cP * R.MP;
        var opts = [f(wP, 3) + ' g、' + left + 'が残る', f(wP, 3) + ' g、' + other + 'が残る', f(wrongP, 3) + ' g、' + left + 'が残る', f(wrongP, 3) + ' g、どちらも残らない'];
        var uniq = []; opts.forEach(function (o) { if (uniq.indexOf(o) < 0) uniq.push(o); });
        var ok = uniq[0]; uniq = C.shuffle(uniq);
        var q = pick([R.An + ' ' + f(wA, 3) + ' g と' + R.Bn + ' ' + f(wB, 3) + ' g を反応させた。生じる' + R.Pn + 'の質量と、反応後に残る気体の組合せとして正しいものはどれか。',
          R.A + ' ' + f(wA, 3) + ' g と ' + R.B + ' ' + f(wB, 3) + ' g を混合して完全に反応させた。' + R.P + ' の質量と、余る物質はどれか。']);
        var iP = R.eq.split(/ -> | \+ /).map(function (t) { return t.replace(/^\d+/, ''); }).indexOf(R.P);
        var hs = [guten(R.A, wA, R.MA, 'bl', nA), guten(R.B, wB, R.MB, 'bl', nB),
          rx(R.eq, 'ex', { s: R.eq.split(/ -> | \+ /).map(function (t, i) { return i === 0 ? nA : i === 1 ? nB : 0; }), x: k, ask: [iP],
            note: (limA ? R.A + ' ' + f(nA) + ' mol と反応する ' + R.B + ' は ' + f(nA * R.cB / R.cA) + ' mol（' + R.B + ' は ' + f(nB) + ' mol あるので余る）→ 足りない ' + R.A + ' がすべて反応する。' : R.B + ' ' + f(nB) + ' mol と反応する ' + R.A + ' は ' + f(nB * R.cA / R.cB) + ' mol（' + R.A + ' は ' + f(nA) + ' mol あるので余る）→ 足りない ' + R.B + ' がすべて反応する。') + '反応後に 0 になる方が足りない方。' }),
          guten(R.P, wP, R.MP, 'top', nP)];
        return { q: q + '（H = 1.0, C = 12, O = 16）', c: uniq, a: uniq.indexOf(ok), hs: hs,
          e: '反応式 ' + R.eq + '\nどちらも mol にし、係数の比で「足りない方」を見つける。生成量は足りない方で決まる。',
          k: '量が2つ与えられたら過不足。はじきで両方 mol にして、係数の比で比べる。' };
      } },
    /* 4. 濃度の換算（質量パーセント → モル濃度） */
    { id: 'mol04', u: 'mol', t: 'B', lv: 2, p: ['P03', 'P01'], name: '濃度の換算', sec: 120,
      gen: function () {
        var s = pick([['濃硫酸', 'H_2SO_4', 98, 98, 1.8], ['濃塩酸', 'HCl', 36.5, 36.5, 1.2], ['濃硝酸', 'HNO_3', 63, 63, 1.4], ['水酸化ナトリウム水溶液', 'NaOH', 40, 20, 1.2], ['アンモニア水', 'NH_3', 17, 17, 0.90]]);
        var M = s[2], p = s[3], d = s[4], mass = 1000 * d, sol = mass * p / 100, mol = sol / M;
        var SOL = String(Math.round(sol * 10) / 10), MASS = String(Math.round(mass * 10) / 10);
        var dens = { h: 'mitsudo', who: '溶液（もし 1 L = 1000 mL）', v: { bl: '1000', br: String(d) }, find: 'top', eq: 'g = 1000 × ' + d + ' = ' + MASS + ' g' };
        var K = '濃度変換は「しえのセット」。もし溶液が 1 L なら、密度で溶液の g（下の矢印）、分子量で溶質の g と mol を行き来する（上の矢印）。';
        if (Math.random() < 0.6) {
          var q = pick(['質量パーセント濃度 ' + p + '%、密度 ' + d + ' g/cm^{3} の' + s[0] + 'のモル濃度は何 mol/L か。（' + s[1] + ' = ' + M + '）',
            s[0] + '（' + s[1] + ' の質量パーセント濃度 ' + p + '%、密度 ' + d + ' g/cm^{3}）は何 mol/L か。（' + s[1] + ' = ' + M + '）']);
          var ch = mk(mol, [1000 * p / 100 / M, mass / M, mol * 10, mol / 2], 2, ' mol/L');
          return { q: q, c: ch.c, a: ch.a,
            hs: [dens, { set: 'conv', dir: 'p2m', a: { h: 'shieno_g', v: { top: SOL, bl: MASS, br: f(p / 100) } }, b: { h: 'shieno_mol', v: { top: f(mol), bl: '1' }, find: 'br' },
              top: '÷ 分子量 ' + M, bot: '× 密度 ' + d + '（1000 mL → ' + MASS + ' g）',
              eq: '① もし 1 L → × 密度で溶液 ' + MASS + ' g（下の矢印）\n② しえの（％）: 溶質 = ' + MASS + ' × ' + f(p / 100) + ' = ' + SOL + ' g\n③ ÷ 分子量 ' + M + ': {{' + SOL + '|' + M + '}} = ' + f(mol) + ' mol（上の矢印）\n④ しえの（mol/L）: {{' + f(mol) + ' mol|1 L}} = ' + f(mol) + ' mol/L' }],
            e: 'もし溶液が 1 L なら → 密度で溶液 ' + MASS + ' g → しえの（％）で溶質 ' + SOL + ' g → 分子量で割って ' + f(mol) + ' mol。1 L あたりの mol がモル濃度。', k: K };
        }
        var q2 = pick([f(mol) + ' mol/L、密度 ' + d + ' g/cm^{3} の' + s[0] + 'の質量パーセント濃度は何%か。（' + s[1] + ' = ' + M + '）',
          s[0] + '（' + s[1] + ' のモル濃度 ' + f(mol) + ' mol/L、密度 ' + d + ' g/cm^{3}）の質量パーセント濃度は何%か。（' + s[1] + ' = ' + M + '）']);
        var ch2 = mk(p, [p / d, p * d, mol * M / 10, p / 2], p % 1 ? 3 : 2, ' %');
        return { q: q2, c: ch2.c, a: ch2.a,
          hs: [dens, { set: 'conv', dir: 'm2p', a: { h: 'shieno_g', v: { top: SOL, bl: MASS }, find: 'br' }, b: { h: 'shieno_mol', v: { top: f(mol), bl: '1', br: f(mol) } },
            top: '× 分子量 ' + M, bot: '× 密度 ' + d + '（1000 mL → ' + MASS + ' g）',
            eq: '① もし 1 L → しえの（mol/L）: 溶質 = 1 × ' + f(mol) + ' = ' + f(mol) + ' mol\n② × 分子量 ' + M + ': 溶質 = ' + f(mol) + ' × ' + M + ' = ' + SOL + ' g（上の矢印）\n③ × 密度で溶液 ' + MASS + ' g（下の矢印）\n④ しえの（％）: 濃度 = {{' + SOL + '|' + MASS + '}} = ' + f(p / 100) + ' → ' + p + ' %' }],
          e: 'もし溶液が 1 L なら → 溶質 ' + f(mol) + ' mol = ' + SOL + ' g、溶液は密度で ' + MASS + ' g。質量パーセント濃度 = {{' + SOL + '|' + MASS + '}} × 100 = ' + p + ' %。', k: K };
      } },
    /* 5. 溶液の調製（必要な質量・できた濃度） */
    { id: 'mol05', u: 'mol', t: 'B', lv: 1, p: ['P03', 'P01'], name: '溶液の調製', sec: 90,
      gen: function () {
        var s = pick([['水酸化ナトリウム', 'NaOH', 40, 'NaOH'], ['塩化ナトリウム', 'NaCl', 58.5, 'NaCl'], ['グルコース', 'C_6H_{12}O_6', 180, 'グルコース'], ['硫酸銅(II) 五水和物', 'CuSO_4・5H_2O', 250, 'CuSO_4'], ['シュウ酸二水和物', '(COOH)_2・2H_2O', 126, 'シュウ酸']]);
        var c = pick([0.050, 0.10, 0.20, 0.50]), V = pick([100, 200, 250, 500]), L = V / 1000, n = c * L, w = n * s[2];
        var hyd = s[1].indexOf('H_2O') > 0 ? '（水和物 1 mol から ' + s[3] + ' は 1 mol）' : '';
        var r = Math.random();
        var DK = '希釈は「しえのセット」。濃い液と薄い液で溶質（上の段）は等しい。わかっている方のしえので溶質を出し、もう一方のしえのに入れる。';
        if (r < 0.2) {
          var A = pick([['塩酸', 'HCl'], ['水酸化ナトリウム水溶液', 'NaOH'], ['硫酸', 'H_2SO_4']]);
          var c0 = pick([6.0, 2.0, 1.0]), c1 = pick([0.10, 0.20, 0.50].filter(function (x) { return x < c0; })), V1 = pick([100, 200, 250, 500]);
          var nd = c1 * V1 / 1000, V0 = nd / c0 * 1000;
          var chd = mk(V0, [c0 * V1 / c1, V1 - V0, c1 * V1, V0 * 10], 2, ' mL');
          return { q: pick([f(c0) + ' mol/L の' + A[0] + 'を水でうすめて、' + f(c1) + ' mol/L の' + A[0] + 'を ' + V1 + ' mL つくりたい。必要な ' + f(c0) + ' mol/L の' + A[0] + 'は何 mL か。',
              f(c1) + ' mol/L の ' + A[1] + ' 水溶液 ' + V1 + ' mL を、' + f(c0) + ' mol/L の ' + A[1] + ' 水溶液をうすめてつくる。' + f(c0) + ' mol/L の水溶液を何 mL とればよいか。']),
            c: chd.c, a: chd.a,
            hs: [{ set: 'pair', a: { h: 'shieno_mol', v: { top: f(nd), br: f(c0) }, find: 'bl' }, b: { h: 'shieno_mol', v: { top: f(nd), bl: f(V1 / 1000, 3), br: f(c1) } }, la: '濃い液（' + f(c0) + ' mol/L）', lb: '薄い液（' + f(c1) + ' mol/L）',
              eq: '① 薄い液: 溶質 = ' + f(V1 / 1000, 3) + ' L × ' + f(c1) + ' = ' + f(nd) + ' mol\n② 溶質は等しい → 濃い液も ' + f(nd) + ' mol\n③ 濃い液: L = {{' + f(nd) + '|' + f(c0) + '}} = ' + f(V0 / 1000) + ' L = ' + f(V0) + ' mL' }],
            e: 'うすめても溶質の mol は変わらない。薄い液の溶質 ' + f(nd) + ' mol を、濃い液から ' + f(V0) + ' mL とればよい。', k: DK };
        }
        if (r < 0.4) {
          var p0 = pick([20, 15, 10]), W0 = pick([100, 150, 200, 300]), p1 = pick([5, 4]);
          if (Math.round(W0 * p0 / p1) !== W0 * p0 / p1) p1 = 5;
          var sw = W0 * p0 / 100, W1 = W0 * p0 / p1, add = W1 - W0;
          var chp = mk(add, [W1, W0 * p0 / p1 / 2, W0 * (p0 - p1) / 100, add / 2], 3, ' g');
          return { q: pick(['質量パーセント濃度 ' + p0 + ' % の塩化ナトリウム水溶液 ' + W0 + ' g に水を加えて、' + p1 + ' % にした。加えた水は何 g か。',
              p0 + ' % の食塩水 ' + W0 + ' g をうすめて ' + p1 + ' % の食塩水をつくりたい。水を何 g 加えればよいか。']),
            c: chp.c, a: chp.a,
            hs: [{ set: 'pair', a: { h: 'shieno_g', v: { top: f(sw, 3), bl: String(W0), br: f(p0 / 100) } }, b: { h: 'shieno_g', v: { top: f(sw, 3), br: f(p1 / 100) }, find: 'bl' }, la: '濃い液（' + p0 + ' %）', lb: '薄い液（' + p1 + ' %）',
              eq: '① 濃い液: 溶質 = ' + W0 + ' × ' + f(p0 / 100) + ' = ' + f(sw, 3) + ' g\n② 溶質は等しい → 薄い液も ' + f(sw, 3) + ' g\n③ 薄い液: 溶液 = {{' + f(sw, 3) + '|' + f(p1 / 100) + '}} = ' + f(W1, 3) + ' g' },
              calc('加えた水 = ' + f(W1, 3) + ' − ' + W0 + ' = ' + f(add, 3) + ' g', '問われているのは水')],
            e: '溶質 ' + f(sw, 3) + ' g は変わらない。' + p1 + ' % になるときの溶液は ' + f(W1, 3) + ' g なので、加えた水は ' + f(add, 3) + ' g。', k: DK };
        }
        if (r < 0.7) {
          var ch = mk(w, [c * V * s[2], c * s[2], w * 2, n], 3, ' g');
          return { q: pick([f(c) + ' mol/L の' + s[3] + '水溶液を ' + V + ' mL つくるのに必要な' + s[0] + '（' + s[1] + '、式量 ' + s[2] + '）は何 g か。', s[0] + '（式量 ' + s[2] + '）を水に溶かして、' + f(c) + ' mol/L の水溶液を ' + V + ' mL つくりたい。何 g 量り取ればよいか。']),
            c: ch.c, a: ch.a, hs: [shieno(s[3], n, L, c, 'top'), guten(s[1], w, s[2], 'top', n)],
            e: 'しえので溶質の mol、グーテンモルゲンで g。' + hyd, k: 'mL は L に直す。しえの（mol = L × mol/L）→ グーテンモルゲン（g = mol × モル質量）。' };
        }
        var ch2 = mk(c, [n / V, w / s[2], c * 10, c / 2], 2, ' mol/L');
        return { q: pick([s[0] + '（' + s[1] + '、式量 ' + s[2] + '）' + f(w, 3) + ' g を水に溶かして ' + V + ' mL にした。' + s[3] + 'のモル濃度は何 mol/L か。', s[0] + ' ' + f(w, 3) + ' g を溶かした ' + V + ' mL の水溶液は、何 mol/L か。（式量 ' + s[2] + '）']),
          c: ch2.c, a: ch2.a, hs: [guten(s[1], w, s[2], 'bl', n), shieno(s[3], n, L, c, 'br')],
          e: 'グーテンモルゲンで mol、しえので mol/L。' + hyd, k: '水和物は水和物の式量で割る。mL は L に直す。' };
      } },
    /* 6. 凝固点降下・沸点上昇（Δt = Kmi） */
    { id: 'sol02', u: 'solution', t: 'B', lv: 2, p: ['P08'], name: '凝固点降下・沸点上昇', sec: 120,
      gen: function () {
        var s = pick([['尿素', 60, 1], ['グルコース', 180, 1], ['スクロース', 342, 1], ['塩化ナトリウム NaCl', 58.5, 2], ['塩化カルシウム CaCl_2', 111, 3], ['硫酸ナトリウム Na_2SO_4', 142, 3]]);
        var g = pick([100, 200, 250, 500]), m = pick([0.050, 0.10, 0.20]), mol = m * g / 1000, w = mol * s[1], i = s[2];
        var bp = Math.random() < 0.35, K = bp ? 0.52 : 1.85, dt = K * m * i;
        var what = bp ? '沸点上昇度' : '凝固点降下度';
        var ask = pick(['何 K か', 'いくらか（K）']);
        var ch = mk(dt, [K * m, K * mol * i, dt * 2, K * m * i / 10], 2, ' K');
        var istr = i === 1 ? '非電解質なので i = 1' : '水中で ' + i + ' 個のイオンに電離するので i = ' + i;
        return { q: '水 ' + g + ' g に' + s[0] + '（式量 ' + s[1] + '）' + f(w, 3) + ' g を溶かした水溶液の' + what + 'は' + ask + '。' + (i > 1 ? '電解質は完全に電離するものとする。' : '') + '（水のモル' + (bp ? '沸点上昇' : '凝固点降下') + ' ' + K + ' K・kg/mol）',
          c: ch.c, a: ch.a,
          hs: [guten(s[0].split(' ')[0], w, s[1], 'bl', mol), { h: 'shibano', who: '水溶液', v: { top: f(mol), bl: String(g / 1000) }, find: 'br', eq: 'mol/kg = {{' + f(mol) + '|' + (g / 1000) + '}} = ' + f(m) + ' mol/kg' }, calc(istr, 'ファントホッフ係数 i'), calc('Δt = K m i = ' + K + ' × ' + f(m) + ' × ' + i + ' = ' + f(dt) + ' K', '公式')],
          e: 'Δt = K m i。m は溶媒 1 kg あたりの mol、i は溶質 1 個が水中で何個の粒子になるか。', k: '希薄溶液は Δt = K m i（浸透圧は Π = cRTi）。i を掛け忘れない。溶媒は kg に直す。' };
      } },
    /* 7. 浸透圧（Π = cRTi） */
    { id: 'sol05', u: 'solution', t: 'B', lv: 2, p: ['P08'], name: '浸透圧', sec: 120,
      gen: function () {
        var s = pick([['グルコース', 180, 1], ['尿素', 60, 1], ['塩化ナトリウム NaCl', 58.5, 2], ['塩化カルシウム CaCl_2', 111, 3]]);
        var c = pick([0.010, 0.020, 0.050, 0.10]), t = pick([27, 37]), T = t + 273, i = s[2], Pi = c * 8.3e3 * T * i;
        var useMass = Math.random() < 0.45, V = pick([0.50, 1.0, 2.0]), mol = c * V, w = mol * s[1];
        var head = useMass ? s[0] + '（式量 ' + s[1] + '）' + f(w, 3) + ' g を水に溶かして ' + f(V) + ' L にした水溶液' : f(c) + ' mol/L の' + s[0] + '水溶液';
        var ch = mk(Pi, [c * 8.3e3 * T, c * 8.3e3 * t * i, Pi * 2, Pi / 10], 2, ' Pa');
        var hs = [];
        if (useMass) { hs.push(guten(s[0].split(' ')[0], w, s[1], 'bl', mol)); hs.push(shieno(s[0].split(' ')[0], mol, V, c, 'br')); }
        hs.push(calc(i === 1 ? '非電解質なので i = 1' : i + ' 個のイオンに電離するので i = ' + i, 'ファントホッフ係数 i'));
        hs.push(calc('Π = cRTi = ' + f(c) + ' × 8.3×10^{3} × ' + T + ' × ' + i + ' = ' + f(Pi) + ' Pa', '公式'));
        return { q: head + 'の ' + t + '℃ における浸透圧は何 Pa か。' + (i > 1 ? '電解質は完全に電離するものとする。' : '') + '（R = 8.3×10^{3} Pa・L/(K・mol)）', c: ch.c, a: ch.a, hs: hs,
          e: 'Π = cRTi。c は mol/L、T は絶対温度（' + t + ' + 273）、i は粒子の数の倍率。', k: '浸透圧も「粒子の数」で決まるので i を掛ける。T は K に直す。' };
      } },
    /* 8. 状態方程式 */
    { id: 'gas01', u: 'gas', t: 'B', lv: 1, p: ['P04'], name: '気体の状態方程式', sec: 90,
      gen: function () {
        var t = pick([27, 77, 127, 0]), T = t + 273, n = pick([0.10, 0.20, 0.050, 0.40]), P = pick([1.0e5, 2.0e5, 8.3e4, 5.0e4]);
        var V = n * 8.3e3 * T / P, mode = pick(['n', 'V', 'M']);
        if (mode === 'V') {
          var chV = mk(V, [n * 8.3e3 * t / P, V * 2, V / 10, P / (n * 8.3e3 * T)], 2, ' L');
          return { q: pick([f(n) + ' mol の気体が ' + t + '℃、' + f(P) + ' Pa で占める体積は何 L か。', t + '℃、' + f(P) + ' Pa で、' + f(n) + ' mol の理想気体の体積は何 L か。']) + '（R = 8.3×10^{3} Pa・L/(K・mol)）', c: chV.c, a: chV.a,
            hs: [calc('T = ' + t + ' + 273 = ' + T + ' K', '温度'), calc('V = {{nRT|P}} = {{' + f(n) + ' × 8.3×10^{3} × ' + T + '|' + f(P) + '}} = ' + f(V) + ' L', '公式')],
            e: 'PV = nRT を V について解く。', k: '温度は K。PV = nRT を求めたい文字について解いてから代入する。' };
        }
        var Vr = Number(V.toPrecision(3));
        if (mode === 'n') {
          var nn = P * Vr / (8.3e3 * T), chN = mk(nn, [t ? P * Vr / (8.3e3 * t) : nn * 10, nn * 2, nn / 2, 8.3e3 * T / (P * Vr)], 2, ' mol');
          return { q: t + '℃、' + f(P) + ' Pa で ' + f(Vr, 3) + ' L を占める気体の物質量は何 mol か。（R = 8.3×10^{3} Pa・L/(K・mol)）', c: chN.c, a: chN.a,
            hs: [calc('T = ' + t + ' + 273 = ' + T + ' K', '温度'), calc('n = {{PV|RT}} = {{' + f(P) + ' × ' + f(Vr, 3) + '|8.3×10^{3} × ' + T + '}} = ' + f(nn) + ' mol', '公式')],
            e: 'PV = nRT を n について解く。', k: '温度は K。' };
        }
        var M = pick([16, 28, 32, 44, 64]), w = n * M, Mc = w * 8.3e3 * T / (P * Vr);
        var chM = mk(Mc, [Mc * 2, Mc / 2, w * 8.3e3 * (t || 1) / (P * Vr), Mc + 12], 2, '');
        return { q: 'ある気体 ' + f(w, 3) + ' g は、' + t + '℃、' + f(P) + ' Pa で ' + f(Vr, 3) + ' L を占めた。この気体の分子量はいくらか。（R = 8.3×10^{3} Pa・L/(K・mol)）', c: chM.c, a: chM.a,
          hs: [calc('PV = {{w|M}}RT より M = {{wRT|PV}}', '公式'), calc('M = {{' + f(w, 3) + ' × 8.3×10^{3} × ' + T + '|' + f(P) + ' × ' + f(Vr, 3) + '}} ≒ ' + f(Mc) , '代入')],
          e: 'n = {{w|M}} を PV = nRT に入れて M について解く。', k: '分子量は M = {{wRT|PV}}。グーテンモルゲン（mol = {{g|M}}）を状態方程式に入れた形。' };
      } },
    /* 9. 電気分解（先生の3ステップ） */
    { id: 'ele02', u: 'electro', t: 'B', lv: 2, p: ['P10'], name: '電気分解の量計算', sec: 150,
      gen: function () {
        var S = pick([
          { sol: '硫酸銅(II) 水溶液', el: '白金電極', ca: { n: '銅', f: 'Cu', M: 63.5, z: 2, g: true }, an: { n: '酸素', f: 'O_2', z: 4 }, ce: 'Cu^{2+} + 2e^{-} -> Cu', ae: '2H_2O -> O_2 + 4H^{+} + 4e^{-}' },
          { sol: '硝酸銀水溶液', el: '白金電極', ca: { n: '銀', f: 'Ag', M: 108, z: 1, g: true }, an: { n: '酸素', f: 'O_2', z: 4 }, ce: 'Ag^{+} + e^{-} -> Ag', ae: '2H_2O -> O_2 + 4H^{+} + 4e^{-}' },
          { sol: '塩化銅(II) 水溶液', el: '炭素電極', ca: { n: '銅', f: 'Cu', M: 63.5, z: 2, g: true }, an: { n: '塩素', f: 'Cl_2', z: 2 }, ce: 'Cu^{2+} + 2e^{-} -> Cu', ae: '2Cl^{-} -> Cl_2 + 2e^{-}' },
          { sol: '塩化ナトリウム水溶液', el: '炭素電極', ca: { n: '水素', f: 'H_2', z: 2 }, an: { n: '塩素', f: 'Cl_2', z: 2 }, ce: '2H_2O + 2e^{-} -> H_2 + 2OH^{-}', ae: '2Cl^{-} -> Cl_2 + 2e^{-}' },
          { sol: '希硫酸', el: '白金電極', ca: { n: '水素', f: 'H_2', z: 2 }, an: { n: '酸素', f: 'O_2', z: 4 }, ce: '2H^{+} + 2e^{-} -> H_2', ae: '2H_2O -> O_2 + 4H^{+} + 4e^{-}' }
        ]);
        var I = pick([0.50, 1.0, 2.0]), t = pick([965, 1930, 3860, 4825, 9650]), Q = I * t, F = Q / 9.65e4;
        var tm = Math.floor(t / 60) + ' 分' + (t % 60 ? ' ' + (t % 60) + ' 秒' : '');
        var check = calc('陰極 ' + S.ce + '（価数 ' + S.ca.z + '）\n陽極 ' + S.ae + '（価数 ' + S.an.z + '）', '1. 生成物チェック');
        var mode = S.ca.g ? pick(['cath', 'an', 'rev']) : pick(['cath', 'an']);
        var head = S.sol + 'を' + S.el + 'を用いて ' + f(I) + ' A の電流で ' + tm + '（' + t + ' 秒）電気分解した。';
        var tail = '（F = 9.65×10^{4} C/mol' + (S.ca.g ? '、' + S.ca.f + ' = ' + S.ca.M : '') + '）';
        if (mode === 'rev') {
          var molM = F / S.ca.z, w = molM * S.ca.M;
          var chR = mk(t, [t * S.ca.z, t / S.ca.z, t / 60, t * 2], 3, ' 秒');
          return { q: S.sol + 'を' + S.el + 'で、' + f(I) + ' A の一定電流で電気分解したところ、陰極に' + S.ca.n + 'が ' + f(w, 3) + ' g 析出した。電流を流した時間は何秒か。' + tail, c: chR.c, a: chR.a,
            hs: [check, guten(S.ca.f, w, S.ca.M, 'bl', molM), fight(S.ca.f, F, molM, S.ca.z, 'top'), calc('C = F × 96500 = ' + f(F) + ' × 96500 = ' + f(Q, 3) + ' C', 'F → C'), kyas(I, t, Q, 'br')],
            e: 'すぐ C が求まらないときは、問題文の g から mol を出し、価数を使って先に F を出す（ファイトモルカー）→ 96500 を掛けて C → キャスで秒。', k: 'すぐ C が出ないときは逆向き。g → mol → F（× 価数）→ C（× 96500）→ s（÷ A）。' };
        }
        var who = mode === 'cath' ? S.ca : S.an, mol = F / who.z, hs = [check, kyas(I, t, Q, 'top'), calc('F = {{' + f(Q, 3) + '|96500}} = ' + f(F) + ' mol', '2. C → F'), fight(who.f, F, mol, who.z, 'bl')];
        var place = mode === 'cath' ? '陰極' : '陽極', q, a, wr, unit, sig = 2;
        if (who.g) { a = mol * who.M; wr = [F * who.M, a * 2, a / 2, I * (t / 60) / 9.65e4 / who.z * who.M]; unit = ' g'; hs.push(guten(who.f, a, who.M, 'top', mol)); q = head + place + 'に析出する' + who.n + 'は何 g か。'; sig = 3; }
        else { var L = mol * 22.4; a = L * 1000; wr = [F * 22.4 * 1000, a * 2, a / 2, a * who.z]; unit = ' mL'; hs.push(elmo(who.f, L, mol, 'top')); hs.push(calc(f(L, 3) + ' L = ' + f(a, 3) + ' mL', '単位')); q = head + place + 'で発生する' + who.n + 'は、0℃、1.013×10^{5} Pa で何 mL か。'; sig = 3; }
        var ch = mk(a, wr, sig, unit);
        return { q: q + tail, c: ch.c, a: ch.a, hs: hs,
          e: '1. 生成物チェック（価数も書く）→ 2. A・s で C、96500 で割って F → 3. ファイトモルカーで mol、はじきで g・L。', k: '電気分解は3ステップ。生成物と価数 → C → F → mol → g・L。' };
      } },
    /* 10. 中和（カノウタイカノウタイ） */
    { id: 'ab05', u: 'acidbase', t: 'B', lv: 1, p: ['P13'], name: '中和の量的関係', sec: 90,
      gen: function () {
        var A = pick([['塩酸', 'HCl', 1], ['硫酸', 'H_2SO_4', 2], ['酢酸水溶液', 'CH_3COOH', 1], ['シュウ酸水溶液', '(COOH)_2', 2]]);
        var B = pick([['水酸化ナトリウム水溶液', 'NaOH', 1], ['水酸化バリウム水溶液', 'Ba(OH)_2', 2]]);
        var ca = pick([0.050, 0.10, 0.20]), Va = pick([10, 20, 25]), cb = pick([0.10, 0.20, 0.050]);
        var na = ca * Va / 1000, H = na * A[2], nb = H / B[2], Vb = nb / cb * 1000;
        if (Math.random() < 0.5) {
          var ch = mk(Vb, [ca * Va / cb, Vb * 2, Vb / 2, Vb * A[2] * B[2]], 3, ' mL');
          return { q: pick([f(ca) + ' mol/L の' + A[0] + ' ' + Va + ' mL を中和するのに必要な ' + f(cb) + ' mol/L の' + B[0] + 'は何 mL か。', f(ca) + ' mol/L の' + A[0] + ' ' + Va + ' mL に ' + f(cb) + ' mol/L の' + B[0] + 'を加えていくと、何 mL で中和点に達するか。']),
            c: ch.c, a: ch.a,
            hs: [calc(A[1] + ' は ' + A[2] + ' 価、' + B[1] + ' は ' + B[2] + ' 価（1 個が出せる H^{+}・受け取れる H^{+} の数）', '1. 価数を確かめる'),
              calc('濃度と体積しかわからない → カノウタイカノウタイ\n酸の（価数 × 濃度 × 体積）＝ 塩基の（価数 × 濃度 × 体積）', '2. 式を選ぶ'),
              calc(A[2] + ' × ' + f(ca) + ' mol/L × ' + Va + ' mL ＝ ' + B[2] + ' × ' + f(cb) + ' mol/L × V mL', '3. 代入する（体積は両辺 mL のまま）'),
              calc('V = {{' + A[2] + ' × ' + f(ca) + ' × ' + Va + '|' + B[2] + ' × ' + f(cb) + '}}\n　= ' + f(Vb, 3) + ' mL', '4. V について解く')],
            e: '中和は「H^{+} の mol ＝ OH^{-} の mol」。mol が出ていないので、カノウタイカノウタイ（酸の 価数 × 濃度 × 体積 ＝ 塩基の 価数 × 濃度 × 体積）で一気につなぐ。' + (A[1].indexOf('CH_3COOH') >= 0 ? '酢酸は弱酸だが、価数は 1 のまま（必要な塩基の量は強酸と同じ）。' : ''), k: 'mol が出ていない中和は、カノウタイカノウタイ。価数 → 濃度 → 体積の順に、両辺に同じ形で並べる。' };
        }
        var Vt = pick([8.0, 10.0, 12.5, 16.0]), nb2 = cb * Vt / 1000, OH = nb2 * B[2], na2 = OH / A[2], ca2 = na2 / (Va / 1000);
        var ch2 = mk(ca2, [ca2 * A[2], ca2 / B[2], ca2 * 2, ca2 / 2], 2, ' mol/L');
        return { q: '濃度不明の' + A[0] + ' ' + Va + ' mL を ' + f(cb) + ' mol/L の' + B[0] + 'で滴定したところ、' + f(Vt, 3) + ' mL で中和点に達した。' + A[0] + 'のモル濃度は何 mol/L か。', c: ch2.c, a: ch2.a,
          hs: [calc(A[1] + ' は ' + A[2] + ' 価、' + B[1] + ' は ' + B[2] + ' 価', '1. 価数を確かめる'),
            calc('濃度と体積しかわからない → カノウタイカノウタイ\n酸の（価数 × 濃度 × 体積）＝ 塩基の（価数 × 濃度 × 体積）', '2. 式を選ぶ'),
            calc(A[2] + ' × c × ' + Va + ' mL ＝ ' + B[2] + ' × ' + f(cb) + ' mol/L × ' + f(Vt, 3) + ' mL', '3. 代入する（体積は両辺 mL のまま）'),
            calc('c = {{' + B[2] + ' × ' + f(cb) + ' × ' + f(Vt, 3) + '|' + A[2] + ' × ' + Va + '}}\n　= ' + f(ca2) + ' mol/L', '4. c について解く')],
          e: '中和は「H^{+} の mol ＝ OH^{-} の mol」。mol が出ていないので、カノウタイカノウタイ（酸の 価数 × 濃度 × 体積 ＝ 塩基の 価数 × 濃度 × 体積）で、わからない濃度 c を求める。', k: 'mol が出ていない中和は、カノウタイカノウタイ。電気分解のファイトモルカーと同じく「価数を掛けてそろえる」考え方。' };
      } },
    /* 11. 酸化還元滴定（カノウタイカノウタイ。価数 = 半反応式の e^- の数） */
    { id: 'rdx03', u: 'redox', t: 'B', lv: 2, p: ['P12'], name: '酸化還元滴定', sec: 150,
      gen: function () {
        var O = pick([['過マンガン酸カリウム', 'KMnO_4', 5], ['二クロム酸カリウム', 'K_2Cr_2O_7', 6]]);
        var R = pick(O[1] === 'KMnO_4' ? [['過酸化水素水', 'H_2O_2', 2], ['シュウ酸水溶液', '(COOH)_2', 2], ['硫酸鉄(II) 水溶液', 'FeSO_4', 1]] : [['硫酸鉄(II) 水溶液', 'FeSO_4', 1]]);
        var ck = pick([0.010, 0.020, 0.040]), Vk = pick([10.0, 12.0, 16.0, 20.0]), Vx = pick([10.0, 20.0, 25.0]);
        var nk = ck * Vk / 1000, e = nk * O[2], nx = e / R[2], cx = nx / (Vx / 1000);
        var ch = mk(cx, [ck * Vk / Vx, cx * R[2] * R[2] / O[2], cx * 2, cx / 2], 2, ' mol/L');
        return { q: pick(['濃度未知の' + R[0] + ' ' + Vx.toFixed(1) + ' mL を硫酸酸性にし、' + f(ck) + ' mol/L の' + O[0] + '水溶液で滴定したところ、' + Vk.toFixed(1) + ' mL で終点に達した。' + R[0] + 'のモル濃度は何 mol/L か。',
          f(ck) + ' mol/L の ' + O[1] + ' 水溶液（硫酸酸性）を用いて ' + R[0] + ' ' + Vx.toFixed(1) + ' mL を滴定すると、' + Vk.toFixed(1) + ' mL 加えたところで反応が終わった。' + R[0] + 'は何 mol/L か。']) + '（' + O[1] + ' は 1 mol あたり e^{-} を ' + O[2] + ' mol 受け取り、' + R[1] + ' は 1 mol あたり ' + R[2] + ' mol 出す）',
          c: ch.c, a: ch.a,
          hs: [calc(HALFEQ[O[1]] + '　→ ' + O[1] + ' の価数 ' + O[2] + '\n' + HALFEQ[R[1]] + '　→ ' + R[1] + ' の価数 ' + R[2], '1. 半反応式から価数（e^{-} の数）を読む'),
            calc('濃度と体積しかわからない → カノウタイカノウタイ\n酸化剤の（価数 × 濃度 × 体積）＝ 還元剤の（価数 × 濃度 × 体積）', '2. 式を選ぶ'),
            calc(O[2] + ' × ' + f(ck) + ' mol/L × ' + Vk.toFixed(1) + ' mL ＝ ' + R[2] + ' × c × ' + Vx.toFixed(1) + ' mL', '3. 代入する（体積は両辺 mL のまま）'),
            calc('c = {{' + O[2] + ' × ' + f(ck) + ' × ' + Vk.toFixed(1) + '|' + R[2] + ' × ' + Vx.toFixed(1) + '}}\n　= ' + f(cx) + ' mol/L', '4. c について解く')],
          e: '酸化剤が受け取る e^{-} の mol ＝ 還元剤が出す e^{-} の mol。価数（e^{-} の数）を掛けてそろえる。mol が出ていないので、中和と同じカノウタイカノウタイで一気につなぐ。', k: '酸化還元滴定も中和と同じ形。価数のかわりに「半反応式の e^{-} の数」を使う。' };
      } },
    /* 12. アルコール発酵 */
    { id: 'na05', u: 'natural', t: 'B', lv: 1, p: ['P01'], name: 'アルコール発酵', sec: 90,
      gen: function () {
        var n = pick([0.10, 0.25, 0.50, 1.0]), w = n * 180, mode = pick(['L', 'g']);
        var hs = [guten('C_6H_{12}O_6', w, 180, 'bl', n)];
        if (mode === 'L') {
          var L = n * 2 * 22.4, ch = mk(L, [n * 22.4, L * 2, L / 2, n * 2 * 44], 3, ' L');
          hs.push(rx('C_6H_{12}O_6 -> 2C_2H_5OH + 2CO_2', 'mol', { base: [0, n], ask: [2] })); hs.push(elmo('CO_2', L, n * 2, 'top'));
          return { q: pick(['グルコース ' + f(w, 3) + ' g がすべてアルコール発酵したとき、生じる二酸化炭素は 0℃、1.013×10^{5} Pa で何 L か。', 'グルコース ' + f(w, 3) + ' g を酵母でアルコール発酵させた。発生した CO_2 の体積は 0℃、1.013×10^{5} Pa で何 L か。']) + '（C_6H_{12}O_6 = 180）', c: ch.c, a: ch.a, hs: hs,
            e: 'アルコール発酵の反応式は\nC_6H_{12}O_6 -> 2C_2H_5OH + 2CO_2\nグルコース 1 分子から、エタノール 2 分子と二酸化炭素 2 分子ができる。係数の比 1 : 2 : 2 が物質量の比になる。', k: RULE };
        }
        var g = n * 2 * 46, ch2 = mk(g, [n * 46, g * 2, g / 2, n * 2 * 44], 3, ' g');
        hs.push(rx('C_6H_{12}O_6 -> 2C_2H_5OH + 2CO_2', 'mol', { base: [0, n], ask: [1] })); hs.push(guten('C_2H_5OH', g, 46, 'top', n * 2));
        return { q: 'グルコース ' + f(w, 3) + ' g がすべてアルコール発酵したとき、生じるエタノールは何 g か。（C_6H_{12}O_6 = 180、C_2H_5OH = 46）', c: ch2.c, a: ch2.a, hs: hs, e: 'アルコール発酵の反応式は\nC_6H_{12}O_6 -> 2C_2H_5OH + 2CO_2\nグルコース 1 分子から、エタノール 2 分子と二酸化炭素 2 分子ができる。係数の比 1 : 2 : 2 が物質量の比になる。', k: RULE };
      } },
    /* 13. 油脂のけん化 */
    { id: 'al04', u: 'aliphatic', t: 'B', lv: 2, p: ['P01'], name: '油脂のけん化', sec: 90,
      gen: function () {
        var M = pick([884, 890, 806]), n = pick([0.010, 0.020, 0.050]), w = n * M, B = pick([['KOH', 56], ['NaOH', 40]]), a = n * 3 * B[1];
        var ch = mk(a, [n * B[1], a * 2, a / 3 * 2, a * 3], 3, ' g');
        return { q: pick(['分子量 ' + M + ' の油脂 ' + f(w, 3) + ' g を完全にけん化するのに必要な ' + B[0] + ' は何 g か。（' + B[0] + ' = ' + B[1] + '）', '分子量 ' + M + ' の油脂 ' + f(w, 3) + ' g に ' + B[0] + ' 水溶液を加えて完全にけん化した。反応した ' + B[0] + ' は何 g か。（' + B[0] + ' = ' + B[1] + '）']),
          c: ch.c, a: ch.a, hs: [guten('油脂', w, M, 'bl', n), rx('C_3H_5(OCOR)_3 + 3' + B[0] + ' -> C_3H_5(OH)_3 + 3RCOO' + (B[0] === 'KOH' ? 'K' : 'Na'), 'mol', { base: [0, n], ask: [1], note: '油脂 C_3H_5(OCOR)_3 はエステル結合が 3 つ → 塩基は 3 倍の mol' }), guten(B[0], a, B[1], 'top', n * 3)],
          e: '油脂はエステル結合を3つもつので、油脂 1 mol に塩基 3 mol。', k: RULE + ' 油脂は 1 : 3。' };
      } }
  ];

  C.families = fams;
  fams.forEach(function (fm) {
    var q = { id: fm.id, u: fm.u, t: fm.t, lv: fm.lv, p: fm.p, fam: fm };
    Object.assign(q, fm.gen());
    C.questions.push(q);
  });
  /* 出すたびに数値とリード文を作り直す */
  C.refreshFam = function (q) { if (q && q.fam) Object.assign(q, q.fam.gen()); };
  /* 計算ドリルでも同じファミリーを使う（似た旧ドリルは置き換え） */
  var replaced = ['g-mol', 'g-stp', 'g-comb', 'g-elec', 'g-neut', 'g-fp', 'g-redox', 'g-pv'];
  C.generators = C.generators.filter(function (g) { return replaced.indexOf(g.id) < 0; })
    .concat(fams.map(function (fm) { return { id: fm.id, name: fm.name, u: fm.u, p: fm.p, sec: fm.sec || 120, gen: fm.gen, fam: true }; }));
})();
