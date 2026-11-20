/* 計算ドリル: 数値をランダムに変えて何度でも出題する。
   誤答の選択肢は「よくある計算ミス」から作る。 */
window.CHEM = window.CHEM || {};
(function () {
  'use strict';
  var R = 8.3e3, F = 9.65e4, NA = 6.0e23;

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* 有効数字 sig 桁で表記（チェム記法）。大きい・小さい数は ×10^{n} */
  function fmt(x, sig) {
    sig = sig || 2;
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    var neg = x < 0; x = Math.abs(x);
    var e = Math.floor(Math.log10(x));
    var m = x / Math.pow(10, e);
    m = Number(m.toFixed(sig - 1));
    if (m >= 10) { m = m / 10; e += 1; m = Number(m.toFixed(sig - 1)); }
    var s;
    if (e >= -2 && e <= 3) {
      var dec = Math.max(0, sig - 1 - e);
      s = (m * Math.pow(10, e)).toFixed(dec);
    } else {
      s = m.toFixed(sig - 1) + '×10^{' + e + '}';
    }
    return (neg ? '−' : '') + s;
  }
  CHEM.fmt = fmt;

  /* 正解と誤答候補から4択を作る */
  function choices(correct, wrongs, sig, unit) {
    unit = unit || '';
    var ok = fmt(correct, sig);
    var seen = {}; seen[ok] = 1;
    var list = [];
    wrongs.forEach(function (w) {
      var s = fmt(w, sig);
      if (!seen[s] && isFinite(w) && w !== 0) { seen[s] = 1; list.push(s); }
    });
    var fill = [2, 0.5, 10, 0.1, 3, 1 / 3, 4, 0.25];
    for (var i = 0; list.length < 3 && i < fill.length; i++) {
      var s2 = fmt(correct * fill[i], sig);
      if (!seen[s2]) { seen[s2] = 1; list.push(s2); }
    }
    list = list.slice(0, 3);
    var all = shuffle(list.concat([ok]));
    return { c: all.map(function (s) { return s + unit; }), a: all.indexOf(ok) };
  }

  var gens = [
    {
      id: 'g-mol', name: '質量 → 物質量 → 粒子数', u: 'mol', p: ['P01'], sec: 60,
      gen: function () {
        var sub = pick([['H_2O', 18], ['CO_2', 44], ['CH_4', 16], ['NH_3', 17], ['O_2', 32], ['C_6H_{12}O_6', 180], ['CaCO_3', 100], ['NaOH', 40]]);
        var n = pick([0.10, 0.20, 0.25, 0.40, 0.50, 1.5, 2.0, 2.5]);
        var w = n * sub[1];
        if (Math.random() < 0.5) {
          var ch = choices(n, [w * sub[1], sub[1] / w, n * 2, n / 2], 2, ' mol');
          return { q: sub[0] + '（分子量 ' + sub[1] + '）' + fmt(w, 2) + ' g の物質量は何 mol か。', c: ch.c, a: ch.a,
            e: fmt(w, 2) + ' ÷ ' + sub[1] + ' = ' + fmt(n, 2) + ' mol', k: 'mol = {{質量|モル質量}}。掛けてしまうミスが最も多い。' };
        }
        var N = n * NA;
        var ch2 = choices(N, [w * NA, N * 2, NA / n, n * 6.0e22], 2, ' 個');
        return { q: sub[0] + '（分子量 ' + sub[1] + '）' + fmt(w, 2) + ' g に含まれる分子の数は何個か。（アボガドロ定数 6.0×10^{23}/mol）', c: ch2.c, a: ch2.a,
          e: fmt(w, 2) + ' ÷ ' + sub[1] + ' = ' + fmt(n, 2) + ' mol → ' + fmt(n, 2) + ' × 6.0×10^{23} = ' + fmt(N, 2) + ' 個',
          k: 'まず mol、次に N_A を掛ける。直接質量に N_A を掛けない。' };
      }
    },
    {
      id: 'g-stp', name: '気体の体積（標準状態）', u: 'mol', p: ['P01'], sec: 60,
      gen: function () {
        var g = pick([['O_2', 32], ['N_2', 28], ['CO_2', 44], ['CH_4', 16], ['NH_3', 17], ['H_2', 2.0]]);
        var n = pick([0.050, 0.10, 0.20, 0.25, 0.50, 1.5]);
        var w = n * g[1];
        var V = n * 22.4;
        var ch = choices(V, [w * 22.4, 22.4 / n, w / 22.4, V * 2], 2, ' L');
        return { q: g[0] + '（分子量 ' + g[1] + '）' + fmt(w, 2) + ' g が 0℃、1.013×10^{5} Pa で占める体積は何 L か。', c: ch.c, a: ch.a,
          e: fmt(w, 2) + ' ÷ ' + g[1] + ' = ' + fmt(n, 2) + ' mol → × 22.4 = ' + fmt(V, 2) + ' L', k: '質量 → mol → ×22.4 L/mol。' };
      }
    },
    {
      id: 'g-comb', name: '燃焼の量的関係', u: 'mol', p: ['P01', 'P02'], sec: 90,
      gen: function () {
        var h = pick([['CH_4', 1, 4, 16], ['C_2H_6', 2, 6, 30], ['C_3H_8', 3, 8, 44], ['C_2H_4', 2, 4, 28], ['C_4H_{10}', 4, 10, 58]]);
        var n = pick([0.050, 0.10, 0.20, 0.25, 0.50]);
        var w = n * h[3];
        if (Math.random() < 0.5) {
          var m = n * h[1] * 44;
          var ch = choices(m, [n * 44, n * h[1] * 12, w * h[1], m * 2], 2, ' g');
          return { q: h[0] + ' ' + fmt(w, 2) + ' g を完全燃焼させたとき、生じる CO_2 は何 g か。（H = 1.0, C = 12, O = 16）', c: ch.c, a: ch.a,
            e: h[0] + ' は ' + fmt(n, 2) + ' mol。C 原子 ' + h[1] + ' 個 → CO_2 ' + fmt(n * h[1], 2) + ' mol → ×44 = ' + fmt(m, 2) + ' g',
            k: 'C の数だけ CO_2 ができる（C 原子の保存）。反応式を全部書かなくてもよい。' };
        }
        var mw = n * h[2] / 2 * 18;
        var ch2 = choices(mw, [n * h[2] * 18, n * 18, n * h[2] / 2 * 9, mw * 2], 2, ' g');
        return { q: h[0] + ' ' + fmt(w, 2) + ' g を完全燃焼させたとき、生じる H_2O は何 g か。（H = 1.0, C = 12, O = 16）', c: ch2.c, a: ch2.a,
          e: h[0] + ' は ' + fmt(n, 2) + ' mol。H 原子 ' + h[2] + ' 個 → H_2O は ' + h[2] + '÷2 = ' + (h[2] / 2) + ' 倍 → ' + fmt(n * h[2] / 2, 2) + ' mol → ×18 = ' + fmt(mw, 2) + ' g',
          k: 'H 原子2個で H_2O 1分子。H_2O の数 = {{H の数|2}}。' };
      }
    },
    {
      id: 'g-pv', name: '状態方程式 PV = nRT', u: 'gas', p: ['P04'], sec: 90,
      gen: function () {
        var t = pick([27, 77, 127, 0, 47]);
        var T = t + 273;
        var n = pick([0.10, 0.20, 0.050, 0.40, 0.25]);
        var P = pick([1.0e5, 2.0e5, 8.3e4, 5.0e4]);
        var V = n * R * T / P;
        if (Math.random() < 0.5) {
          var ch = choices(V, [n * R * t / P, V * 2, n * R * T / P / 1000, P * V / (R * T)], 2, ' L');
          return { q: fmt(n, 2) + ' mol の気体が ' + t + '℃、' + fmt(P, 2) + ' Pa で占める体積は何 L か。（R = 8.3×10^{3} Pa・L/(K・mol)）', c: ch.c, a: ch.a,
            e: 'V = {{nRT|P}} = {{' + fmt(n, 2) + ' × 8.3×10^{3} × ' + T + '|' + fmt(P, 2) + '}} = ' + fmt(V, 2) + ' L', k: '温度は ' + t + ' + 273 = ' + T + ' K。℃のまま入れると誤答になる。' };
        }
        var Vr = Number(V.toPrecision(3));
        var nn = P * Vr / (R * T);
        var ch2 = choices(nn, [t ? P * Vr / (R * t) : nn * 10, nn * 2, R * T / (P * Vr), nn / 2], 2, ' mol');
        return { q: t + '℃、' + fmt(P, 2) + ' Pa で ' + fmt(Vr, 3) + ' L を占める気体の物質量は何 mol か。（R = 8.3×10^{3} Pa・L/(K・mol)）', c: ch2.c, a: ch2.a,
          e: 'n = {{PV|RT}} = {{' + fmt(P, 2) + ' × ' + fmt(Vr, 3) + '|8.3×10^{3} × ' + T + '}} = ' + fmt(nn, 2) + ' mol', k: 'n = {{PV|RT}}。T は絶対温度。' };
      }
    },
    {
      id: 'g-pp', name: '分圧と全圧', u: 'gas', p: ['P04'], sec: 60,
      gen: function () {
        var a = pick([0.10, 0.20, 0.30, 0.40]);
        var b = pick([0.10, 0.20, 0.30, 0.60]);
        var Pt = pick([1.0e5, 2.0e5, 1.2e5, 3.0e5]);
        var p = Pt * b / (a + b);
        var ch = choices(p, [Pt * b / a, Pt * a / (a + b), Pt * b, p * 2], 2, ' Pa');
        return { q: '窒素 ' + fmt(a, 2) + ' mol と酸素 ' + fmt(b, 2) + ' mol の混合気体の全圧が ' + fmt(Pt, 2) + ' Pa のとき、酸素の分圧は何 Pa か。', c: ch.c, a: ch.a,
          e: '酸素のモル分率 = {{' + fmt(b, 2) + '|' + fmt(a + b, 2) + '}}。分圧 = ' + fmt(Pt, 2) + ' × ' + fmt(b / (a + b), 3) + ' = ' + fmt(p, 2) + ' Pa', k: '分圧 = 全圧 × モル分率。分母は合計の mol。' };
      }
    },
    {
      id: 'g-vap', name: '蒸気圧の判定', u: 'gas', p: ['P05'], sec: 120,
      gen: function () {
        var pv = pick([[27, 3.6e3], [47, 1.1e4], [57, 1.7e4], [77, 4.2e4]]);
        var T = pv[0] + 273;
        var V = pick([8.3, 16.6, 4.15, 24.9]);
        var n = pick([0.010, 0.020, 0.050, 0.10, 0.005]);
        var Pc = n * R * T / V;
        var ans = Math.min(Pc, pv[1]);
        var ch = choices(ans, [Pc > pv[1] ? Pc : pv[1], n * R * pv[0] / V, pv[1] / 2, ans * 2], 2, ' Pa');
        return { q: '容積 ' + fmt(V, 3) + ' L の真空容器に水 ' + fmt(n, 2) + ' mol を入れ、' + pv[0] + '℃ に保った。容器内の水蒸気の圧力は何 Pa か。（' + pv[0] + '℃ の飽和水蒸気圧 ' + fmt(pv[1], 2) + ' Pa、R = 8.3×10^{3} Pa・L/(K・mol)）', c: ch.c, a: ch.a,
          e: '全部気体と仮定: P = {{nRT|V}} = {{' + fmt(n, 2) + ' × 8.3×10^{3} × ' + T + '|' + fmt(V, 3) + '}} = ' + fmt(Pc, 2) + ' Pa\n' + (Pc > pv[1] ? 'これは飽和水蒸気圧より大きいので液体が残る → 圧力は ' + fmt(pv[1], 2) + ' Pa' : 'これは飽和水蒸気圧以下なので、すべて気体 → ' + fmt(Pc, 2) + ' Pa'),
          k: '「全部気体と仮定 → 飽和蒸気圧と比べる」。大きければ頭打ち。' };
      }
    },
    {
      id: 'g-fp', name: '凝固点降下・沸点上昇', u: 'solution', p: ['P08'], sec: 90,
      gen: function () {
        var s = pick([['尿素', 60, 1], ['グルコース', 180, 1], ['NaCl', 58.5, 2], ['CaCl_2', 111, 3]]);
        var g = pick([100, 200, 250, 500]);
        var mlk = pick([0.050, 0.10, 0.20]);
        var mol = mlk * g / 1000;
        var w = mol * s[1];
        var dt = 1.85 * mlk * s[2];
        var ch = choices(dt, [1.85 * mlk, 1.85 * mol * s[2], dt * 2, 1.85 * mlk * s[2] / 1000 * g], 2, ' K');
        return { q: '水 ' + g + ' g に ' + s[0] + '（式量 ' + s[1] + '）' + fmt(w, 2) + ' g を溶かした水溶液の凝固点降下度は何 K か。' + (s[2] > 1 ? '電解質は完全に電離するものとする。' : '') + '（水のモル凝固点降下 1.85 K・kg/mol）', c: ch.c, a: ch.a,
          hs: [{ h: 'guten', who: s[0], v: { top: fmt(w, 2), br: String(s[1]) }, find: 'bl', eq: 'mol = {{' + fmt(w, 2) + '|' + s[1] + '}} = ' + fmt(mol, 2) + ' mol' },
            { h: 'shibano', who: '水溶液', v: { top: fmt(mol, 2), bl: String(g / 1000) }, find: 'br', eq: 'mol/kg = {{' + fmt(mol, 2) + '|' + (g / 1000) + '}} = ' + fmt(mlk, 2) + ' mol/kg' },
            { c: 'Δt = K m i = 1.85 × ' + fmt(mlk, 2) + ' × ' + s[2] + ' = ' + fmt(dt, 2) + ' K', t: '公式（i = ' + s[2] + '）' }],
          e: s[0] + ' ' + fmt(mol, 2) + ' mol ÷ ' + (g / 1000) + ' kg = ' + fmt(mlk, 2) + ' mol/kg' + (s[2] > 1 ? '、粒子は ' + s[2] + ' 倍' : '') + '\nΔt = 1.85 × ' + fmt(mlk * s[2], 2) + ' = ' + fmt(dt, 2) + ' K',
          k: (s[2] > 1 ? '電解質は粒子数（' + s[2] + '倍）で効く。' : '非電解質はそのまま。') + '溶媒を kg に直す。' };
      }
    },
    {
      id: 'g-bond', name: '結合エネルギーと ΔH', u: 'thermo', p: ['P09'], sec: 120,
      gen: function () {
        var r = pick([
          { eq: 'H_2 + Cl_2 -> 2HCl', bonds: 'H−H 436、Cl−Cl 243、H−Cl 432', L: 436 + 243, Rr: 2 * 432, txt: '(436 + 243) − 2 × 432', g: [['H_2', 'H_2 -> 2H', 436, 1], ['Cl_2', 'Cl_2 -> 2Cl', 243, 1], ['HCl', 'HCl -> H + Cl', 432, -2]], ign: 'H・Cl（原子）' },
          { eq: 'H_2 + Br_2(気) -> 2HBr', bonds: 'H−H 436、Br−Br 193、H−Br 366', L: 436 + 193, Rr: 2 * 366, txt: '(436 + 193) − 2 × 366', g: [['H_2', 'H_2 -> 2H', 436, 1], ['Br_2', 'Br_2 -> 2Br', 193, 1], ['HBr', 'HBr -> H + Br', 366, -2]], ign: 'H・Br（原子）' },
          { eq: 'N_2 + 3H_2 -> 2NH_3', bonds: 'N≡N 945、H−H 436、N−H 391', L: 945 + 3 * 436, Rr: 6 * 391, txt: '(945 + 3 × 436) − 6 × 391', g: [['N_2', 'N_2 -> 2N', 945, 1], ['H_2', 'H_2 -> 2H', 436, 3], ['NH_3', 'NH_3 -> N + 3H（N−H を 3 本切る: 3 × 391）', 3 * 391, -2]], ign: 'N・H（原子）' },
          { eq: '2H_2 + O_2 -> 2H_2O(気)', bonds: 'H−H 436、O=O 498、O−H 463', L: 2 * 436 + 498, Rr: 4 * 463, txt: '(2 × 436 + 498) − 4 × 463', g: [['H_2', 'H_2 -> 2H', 436, 2], ['O_2', 'O_2 -> 2O', 498, 1], ['H_2O(気)', 'H_2O(気) -> 2H + O（O−H を 2 本切る: 2 × 463）', 2 * 463, -2]], ign: 'H・O（原子）' },
          { eq: 'H_2 + I_2(気) -> 2HI', bonds: 'H−H 436、I−I 151、H−I 299', L: 436 + 151, Rr: 2 * 299, txt: '(436 + 151) − 2 × 299', g: [['H_2', 'H_2 -> 2H', 436, 1], ['I_2', 'I_2 -> 2I', 151, 1], ['HI', 'HI -> H + I', 299, -2]], ign: 'H・I（原子）' }
        ]);
        var dH = r.L - r.Rr;
        var opts = [dH, -dH, r.L - r.Rr / 2, r.Rr - r.L / 2];
        var seen = {}, list = [];
        opts.forEach(function (v) { var s = (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(Math.round(v)) + ' kJ'; if (!seen[s]) { seen[s] = 1; list.push(s); } });
        var okS = list[0];
        while (list.length < 4) { var v2 = dH + (list.length * 37); var s3 = (v2 > 0 ? '+' : '−') + Math.abs(v2) + ' kJ'; if (!seen[s3]) { seen[s3] = 1; list.push(s3); } }
        list = shuffle(list);
        var CIR = ['①', '②', '③'], sg = function (v) { return (v > 0 ? '+' : '−') + Math.abs(v); };
        var hsB = [{ c: r.eq + '　ΔH = x', t: '1. ゴール式（すべて気体）' },
          { c: r.g.map(function (x, i) { return CIR[i] + ' ' + x[1] + '　ΔH = ' + sg(x[2]) + ' kJ'; }).join('\n'), t: '2. 与式（結合を切る向き。ΔH は ＋）' },
          { c: r.g.map(function (x, i) { return x[0] + ': ' + CIR[i] + ' だけ。' + (x[3] < 0 ? 'ゴールは右辺、' + CIR[i] + ' は左辺' : '左辺どうし') + (Math.abs(x[3]) > 1 ? '、ゴールは ' + Math.abs(x[3]) + ' 個' : '') + ' → ' + CIR[i] + ' × ' + (x[3] < 0 ? '(−' + (-x[3]) + ')' : x[3]); }).join('\n') + '\n' + r.ign + ': 2 つ以上の式に出てくる → 無視', t: '3. ゴールの素材で倍数を決める' },
          { c: 'x = ' + r.g.map(function (x) { return x[2] + ' × ' + (x[3] < 0 ? '(−' + (-x[3]) + ')' : x[3]); }).join(' + ') + '\n　= ' + sg(dH) + ' kJ', t: '4. 倍数 × ΔH を足す' }];
        return { q: '次の結合エネルギー〔kJ/mol〕を用いて、' + r.eq + '（すべて気体）の反応エンタルピーを求めよ。\n' + r.bonds, c: list, a: list.indexOf(okS), hs: hsB,
          e: 'ΔH = (反応物の結合エネルギーの和) − (生成物の和) = ' + r.txt + ' = ' + (dH > 0 ? '+' : '−') + Math.abs(dH) + ' kJ',
          k: '結合エネルギー型は「切る − できる」。符号が逆の選択肢は向きを間違えたときの答え。' };
      }
    },
    {
      id: 'g-elec', name: '電気分解の量計算', u: 'electro', p: ['P10'], sec: 120,
      gen: function () {
        var I = pick([0.50, 1.0, 2.0, 0.25]);
        var t = pick([965, 1930, 3860, 4825, 9650]);
        var met = pick([['Cu', 63.5, 2, 'CuSO_4'], ['Ag', 108, 1, 'AgNO_3']]);
        var e = I * t / F;
        var m = e / met[2] * met[1];
        var mm = Math.floor(t / 60), ss = t % 60;
        var ch = choices(m, [e * met[1], e / 2 * met[1] * (met[2] === 1 ? 1 : 4), I * (t / 60) / F / met[2] * met[1], m * 2], 2, ' g');
        return { q: met[3] + ' 水溶液を白金電極で ' + fmt(I, 2) + ' A の電流で ' + mm + ' 分 ' + (ss ? ss + ' 秒' : '') + '間電気分解した。陰極に析出する ' + met[0] + ' は何 g か。（' + met[0] + ' = ' + met[1] + '、F = 9.65×10^{4} C/mol）', c: ch.c, a: ch.a,
          e: 'Q = ' + fmt(I, 2) + ' × ' + t + ' = ' + fmt(I * t, 3) + ' C → e^{-} = ' + fmt(e, 2) + ' mol\n' + met[0] + (met[2] === 2 ? '^{2+} + 2e^{-}' : '^{+} + e^{-}') + ' -> ' + met[0] + ' より ' + fmt(e / met[2], 2) + ' mol → ' + fmt(m, 2) + ' g',
          k: '時間は秒に直す。e^{-} の mol を出してから、イオンの価数で割る。' };
      }
    },
    {
      id: 'g-neut', name: '中和滴定', u: 'acidbase', p: ['P13'], sec: 90,
      gen: function () {
        var acid = pick([['塩酸', 1], ['硫酸', 2], ['酢酸水溶液', 1], ['シュウ酸水溶液', 2]]);
        var ca = pick([0.050, 0.10, 0.20]);
        var Va = pick([10, 20, 25]);
        var cb = pick([0.10, 0.20, 0.050]);
        var Vb = acid[1] * ca * Va / cb;
        var ch = choices(Vb, [ca * Va / cb, Vb * 2, cb * Va / ca, Vb / acid[1] / 2], 3, ' mL');
        return { q: fmt(ca, 2) + ' mol/L の' + acid[0] + ' ' + Va + ' mL を中和するのに必要な ' + fmt(cb, 2) + ' mol/L の水酸化ナトリウム水溶液は何 mL か。', c: ch.c, a: ch.a,
          e: 'カノウタイカノウタイ: 酸の（価数 × 濃度 × 体積）＝ 塩基の（価数 × 濃度 × 体積）\n' + acid[1] + ' × ' + fmt(ca, 2) + ' mol/L × ' + Va + ' mL ＝ 1 × ' + fmt(cb, 2) + ' mol/L × V mL\nV = {{' + acid[1] + ' × ' + fmt(ca, 2) + ' × ' + Va + '|1 × ' + fmt(cb, 2) + '}} = ' + fmt(Vb, 3) + ' mL',
          k: 'mol が出ていない中和は、カノウタイカノウタイ（価数 × 濃度 × 体積）。' + (acid[1] === 2 ? 'この酸は2価。' : '') + (acid[0].indexOf('酢酸') >= 0 ? '弱酸でも必要量は同じ。' : '') };
      }
    },
    {
      id: 'g-ph', name: 'pH の計算（強酸・強塩基）', u: 'acidbase', p: ['P03'], sec: 60,
      gen: function () {
        if (Math.random() < 0.5) {
          var n = pick([1, 2, 3]);
          var dil = pick([10, 100, 1000]);
          var pH = n + Math.log10(dil);
          var list = shuffle([pH, pH - 1, pH + 1, n].filter(function (v, i, arr) { return arr.indexOf(v) === i; }).concat(pH + 2).slice(0, 4));
          return { q: '1.0×10^{-' + n + '} mol/L の塩酸を水で ' + dil + ' 倍に薄めた水溶液の pH はいくらか。', c: list.map(String), a: list.indexOf(pH),
            e: '[H^{+}] = 1.0×10^{-' + n + '} ÷ ' + dil + ' = 1.0×10^{-' + pH + '} → pH = ' + pH, k: '10 倍に薄めるごとに pH は 1 ずつ大きくなる（中性の7を超えることはない）。' };
        }
        var m = pick([1, 2, 3]);
        var pOH = m;
        var pH2 = 14 - pOH;
        var l2 = shuffle([pH2, pOH, pH2 - 1, pH2 + 1]);
        return { q: '1.0×10^{-' + m + '} mol/L の水酸化ナトリウム水溶液の pH はいくらか。（K_w = 1.0×10^{-14}）', c: l2.map(String), a: l2.indexOf(pH2),
          e: '[OH^{-}] = 1.0×10^{-' + m + '} → pOH = ' + m + ' → pH = 14 − ' + m + ' = ' + pH2, k: '塩基は pOH を出してから 14 から引く。' };
      }
    },
    {
      id: 'g-weak', name: '弱酸の水素イオン濃度', u: 'equilibrium', p: ['P15'], sec: 90,
      gen: function () {
        var c = pick([0.10, 0.040, 0.010, 0.25]);
        var Ka = pick([1.0e-5, 2.5e-5, 1.6e-5, 4.0e-5]);
        var H = Math.sqrt(c * Ka);
        var ch = choices(H, [Math.sqrt(Ka), c * Ka, Math.sqrt(Ka / c), H * 2], 2, ' mol/L');
        return { q: fmt(c, 2) + ' mol/L の弱酸 HA の水溶液の水素イオン濃度は何 mol/L か。（電離定数 K_a = ' + fmt(Ka, 2) + ' mol/L、電離度は1より十分小さい）', c: ch.c, a: ch.a,
          e: '[H^{+}] = √(cK_a) = √(' + fmt(c, 2) + ' × ' + fmt(Ka, 2) + ') = √(' + fmt(c * Ka, 2) + ') ≒ ' + fmt(H, 2) + ' mol/L',
          k: '√(cK_a)。√{{K_a|c}} は電離度 α なので混同しない。' };
      }
    },
    {
      id: 'g-buf', name: '緩衝液の水素イオン濃度', u: 'equilibrium', p: ['P15'], sec: 90,
      gen: function () {
        var Ka = pick([2.7e-5, 1.8e-5, 2.0e-5]);
        var na = pick([0.10, 0.20, 0.050]);
        var ns = pick([0.10, 0.20, 0.050, 0.40]);
        var H = Ka * na / ns;
        var ch = choices(H, [Ka * ns / na, Ka, Math.sqrt(Ka * na), H * 2], 2, ' mol/L');
        return { q: '酢酸 ' + fmt(na, 2) + ' mol と酢酸ナトリウム ' + fmt(ns, 2) + ' mol を水に溶かして 1.0 L にした緩衝液の [H^{+}] は何 mol/L か。（K_a = ' + fmt(Ka, 2) + ' mol/L）', c: ch.c, a: ch.a,
          e: '[H^{+}] = K_a × {{酸|塩}} = ' + fmt(Ka, 2) + ' × {{' + fmt(na, 2) + '|' + fmt(ns, 2) + '}} = ' + fmt(H, 2) + ' mol/L',
          k: '緩衝液は K_a × 酸/塩。分子と分母を逆にするミスに注意。' };
      }
    },
    {
      id: 'g-xtal', name: '結晶格子と密度', u: 'structure', p: ['P07'], sec: 120,
      gen: function () {
        /* 実在する金属と結晶構造・格子定数の組合せ */
        var row = pick([['Na', 23, 0, 4.3], ['K', 39, 0, 5.3], ['Fe', 56, 0, 2.9], ['Al', 27, 1, 4.0], ['Cu', 64, 1, 3.6], ['Ag', 108, 1, 4.1]]);
        var s = [['体心立方格子', 2], ['面心立方格子', 4]][row[2]];
        var met = [row[0], row[1]];
        var a = row[3];
        var a3 = Math.pow(a, 3);
        var d = s[1] * met[1] / (NA * a3 * 1e-24);
        var other = s[1] === 2 ? 4 : 2;
        var ch = choices(d, [d / s[1], d * other / s[1], d * 8 / s[1], d / 1000], 2, ' g/cm^{3}');
        var m1 = met[1] / NA, mL = m1 * s[1], V = a3 * 1e-24;
        var hs = [{ sk: { at: { top: String(met[1]), br: '6.0×10^{23}', bl: fmt(m1, 3) }, lat: { top: fmt(mL, 3), br: fmt(V, 3) }, find: 'lat.bl', n: String(s[1]), dir: 'a2l', mark: { 'at.bl': '①', 'lat.top': '②', 'lat.br': '③', 'lat.bl': '④' } }, t: '相関図で解く（原子 → 格子）',
          eq: '① 原子1個の g = {{' + met[1] + '|6.0×10^{23}}} ≒ ' + fmt(m1, 3) + ' g\n② × 格子内の個数 ' + s[1] + '（' + s[0] + '）→ 格子の質量 ≒ ' + fmt(mL, 3) + ' g\n③ 格子の体積 = (' + a.toFixed(1) + '×10^{-8})^{3} = ' + fmt(V, 3) + ' cm^{3}\n④ 密度 = {{' + fmt(mL, 3) + '|' + fmt(V, 3) + '}} ≒ ' + fmt(d, 2) + ' g/cm^{3}' }];
        return { q: met[0] + '（モル質量 ' + met[1] + ' g/mol）の結晶が単位格子の一辺 ' + a.toFixed(1) + '×10^{-8} cm の' + s[0] + 'であるとして、密度を求めよ。（N_A = 6.0×10^{23}/mol、' + a.toFixed(1) + '^{3} = ' + a3.toFixed(1) + '）', c: ch.c, a: ch.a, hs: hs,
          e: '単位格子中の原子は ' + s[1] + ' 個。\n密度 = {{' + s[1] + ' × ' + met[1] + '|6.0×10^{23} × ' + a3.toFixed(1) + '×10^{-24}}} ≒ ' + fmt(d, 2) + ' g/cm^{3}',
          k: '数える（' + s[0] + 'は ' + s[1] + ' 個）→ {{単位格子の質量|単位格子の体積}}。(10^{-8})^{3} = 10^{-24}。' };
      }
    },
    {
      id: 'g-eqK', name: '平衡定数（反応前・変化量・平衡時）', u: 'equilibrium', p: ['P14'], sec: 120,
      gen: function () {
        var a = pick([1.0, 2.0]);
        var x = pick([0.50, 0.60, 0.75, 0.80]) * a;
        var hi = 2 * x, rem = a - x;
        var K = hi * hi / (rem * rem);
        var ch = choices(K, [hi / (rem * rem), x * x / (rem * rem), hi * hi / rem, K / 4], 2, '');
        return { q: '容器に H_2 と I_2 を ' + fmt(a, 2) + ' mol ずつ入れて一定温度に保つと、H_2 + I_2 <=> 2HI の平衡に達し、HI が ' + fmt(hi, 2) + ' mol 生じた。平衡定数を求めよ。', c: ch.c, a: ch.a,
          hs: [{ rx: 'H_2 + I_2 <=> 2HI', k: 'eq', s: [a, a, 0], x: x, ask: [0, 1, 2], note: 'HI が +' + fmt(hi, 2) + ' mol → 係数比 1 : 1 : 2 で H_2・I_2 は ' + fmt(x, 2) + ' mol ずつ減る' },
            { c: '容器の体積を V〔L〕とすると\n[H_2] = [I_2] = {{' + fmt(rem, 2) + '|V}} mol/L、[HI] = {{' + fmt(hi, 2) + '|V}} mol/L', t: 'しえので濃度（mol ÷ L）' },
            { c: 'K = {{[HI]^{2}|[H_2][I_2]}} = {{' + fmt(hi, 2) + '^{2}|' + fmt(rem, 2) + ' × ' + fmt(rem, 2) + '}} = ' + fmt(K, 2) + '\n（V は約分で消える）', t: '平衡定数 K（左辺分の右辺、係数は指数）' }],
          e: '平衡時: H_2 = I_2 = ' + fmt(a, 2) + ' − ' + fmt(x, 2) + ' = ' + fmt(rem, 2) + ' mol、HI = ' + fmt(hi, 2) + ' mol\nK = {{' + fmt(hi, 2) + '^{2}|' + fmt(rem, 2) + ' × ' + fmt(rem, 2) + '}} = ' + fmt(K, 2) + '（体積は約分で消える）',
          k: 'HI が 2x 生じたら H_2・I_2 は x ずつ減る。係数 2 を2乗に反映させる。' };
      }
    },
    {
      id: 'g-ksp', name: '溶解度積と沈殿の判定', u: 'ksp', p: ['P16'], sec: 90,
      gen: function () {
        var c1 = pick([1.0e-3, 2.0e-4, 1.0e-4, 4.0e-5, 2.0e-5]);
        var c2 = pick([1.0e-3, 2.0e-4, 1.0e-4, 4.0e-5, 2.0e-5]);
        var Ksp = 1.8e-10;
        var Q = (c1 / 2) * (c2 / 2);
        var Q0 = c1 * c2;
        var yes = Q > Ksp;
        var opts = [
          fmt(Q, 2) + '、K_{sp} より' + (yes ? '大きいので沈殿する' : '小さいので沈殿しない'),
          fmt(Q, 2) + '、K_{sp} より' + (yes ? '小さいので沈殿しない' : '大きいので沈殿する'),
          fmt(Q0, 2) + '、K_{sp} より' + (Q0 > Ksp ? '大きいので沈殿する' : '小さいので沈殿しない'),
          fmt(c1 / 2 + c2 / 2, 2) + '、K_{sp} より大きいので沈殿する'
        ];
        var ok = opts[0];
        var uniq = opts.filter(function (v, i, a) { return a.indexOf(v) === i; });
        var list = shuffle(uniq);
        return { q: fmt(c1, 2) + ' mol/L の AgNO_3 水溶液と ' + fmt(c2, 2) + ' mol/L の NaCl 水溶液を等体積混合した。混合直後のイオン積〔(mol/L)^{2}〕と沈殿の有無の組合せはどれか。（AgCl の K_{sp} = 1.8×10^{-10} (mol/L)^{2}）', c: list, a: list.indexOf(ok),
          e: '等体積混合で各濃度は半分 → [Ag^{+}] = ' + fmt(c1 / 2, 2) + '、[Cl^{-}] = ' + fmt(c2 / 2, 2) + '\nイオン積 = ' + fmt(Q, 2) + (yes ? ' > ' : ' ≦ ') + 'K_{sp} → ' + (yes ? '沈殿する' : '沈殿しない'),
          k: '混ぜたら薄まる（等体積なら半分）。混合前の濃度で計算しない。' };
      }
    },
    {
      id: 'g-redox', name: '酸化還元滴定', u: 'redox', p: ['P12'], sec: 120,
      gen: function () {
        var red = pick([['過酸化水素水', 2, 'H_2O_2'], ['シュウ酸水溶液', 2, '(COOH)_2'], ['硫酸鉄(II) 水溶液', 1, 'Fe^{2+}']]);
        var ck = pick([0.020, 0.010, 0.040]);
        var Vk = pick([10.0, 12.0, 16.0, 20.0]);
        var Vx = pick([10.0, 20.0, 25.0]);
        var cx = ck * Vk * 5 / (red[1] * Vx);
        var ch = choices(cx, [ck * Vk / Vx, ck * Vk * red[1] / (5 * Vx), ck * Vk * 5 / Vx, cx * 2], 2, ' mol/L');
        return { q: '濃度未知の' + red[0] + ' ' + Vx.toFixed(1) + ' mL を硫酸酸性にし、' + fmt(ck, 2) + ' mol/L の KMnO_4 水溶液で滴定したところ、' + Vk.toFixed(1) + ' mL で終点に達した。' + red[0] + 'のモル濃度は何 mol/L か。', c: ch.c, a: ch.a,
          e: 'MnO_4^{-} は 5e^{-}、' + red[2] + ' は ' + red[1] + 'e^{-}。\n' + fmt(ck, 2) + ' × ' + Vk.toFixed(1) + ' × 5 = x × ' + Vx.toFixed(1) + ' × ' + red[1] + ' → x = ' + fmt(cx, 2) + ' mol/L',
          k: '受け取る e^{-} = 出す e^{-}。KMnO_4 は 5、相手の e^{-} 数を確認。' };
      }
    },
    {
      id: 'g-dp', name: '高分子の重合度', u: 'polymer', p: ['P26'], sec: 60,
      gen: function () {
        var p = pick([['ポリエチレン', '-CH_2-CH_2-', 28], ['ポリスチレン', '-CH_2-CH(C_6H_5)-', 104], ['ポリ塩化ビニル', '-CH_2-CHCl-', 62.5], ['ポリプロピレン', '-CH_2-CH(CH_3)-', 42], ['ポリ酢酸ビニル', '-CH_2-CH(OCOCH_3)-', 86]]);
        var n = pick([500, 1000, 1200, 2000, 3000]);
        var M = n * p[2];
        var ch = choices(n, [n * 2, n / 2, M / (p[2] * 2), n * 10], 2, '');
        return { q: '繰り返し単位 ' + p[1] + '（式量 ' + p[2] + '）からなる' + p[0] + 'の平均分子量が ' + fmt(M, 3) + ' のとき、平均重合度はおよそいくらか。', c: ch.c, a: ch.a,
          e: fmt(M, 3) + ' ÷ ' + p[2] + ' ≒ ' + n, k: '重合度 = {{分子量|繰り返し単位の式量}}。' };
      }
    },
    {
      id: 'g-hajiki', name: 'はじき公式の基本', u: 'mol', p: ['P01', 'P10'], sec: 45,
      gen: function () {
        var c = pick([
          function () { var n = pick([0.10, 0.20, 0.25, 0.50, 1.5]), M = pick([18, 44, 32, 40, 100, 58.5]), w = n * M;
            return { q: 'モル質量 ' + M + ' g/mol の物質 ' + fmt(w, 3) + ' g の物質量は何 mol か。', v: n, wr: [w * M, M / w, n * 10], u: ' mol', hj: 'guten', hide: 'bl', hv: { top: fmt(w, 3), br: String(M) }, e: 'mol = {{g|モル質量}} = ' + fmt(w, 3) + ' ÷ ' + M + ' = ' + fmt(n, 2) + ' mol' }; },
          function () { var n = pick([0.050, 0.20, 0.25, 1.5, 2.0]), M = pick([18, 44, 28, 64, 98]), w = n * M;
            return { q: 'モル質量 ' + M + ' g/mol の物質 ' + fmt(n, 2) + ' mol の質量は何 g か。', v: w, wr: [n / M, M / n, w / 10], u: ' g', hj: 'guten', hide: 'top', hv: { bl: fmt(n, 2), br: String(M) }, e: 'g = mol × モル質量 = ' + fmt(n, 2) + ' × ' + M + ' = ' + fmt(w, 2) + ' g' }; },
          function () { var n = pick([0.050, 0.10, 0.25, 0.50, 2.0]), V = n * 22.4;
            return { q: '0℃、1.013×10^{5} Pa で ' + fmt(V, 3) + ' L の気体の物質量は何 mol か。', v: n, wr: [V * 22.4, 22.4 / V, n * 2], u: ' mol', hj: 'elmo', hide: 'bl', hv: { top: fmt(V, 3) }, e: 'mol = {{L|22.4}} = ' + fmt(V, 3) + ' ÷ 22.4 = ' + fmt(n, 2) + ' mol' }; },
          function () { var n = pick([0.10, 0.25, 0.50, 2.0]), N = n * 6.0e23;
            return { q: fmt(N, 2) + ' 個の分子の物質量は何 mol か。（アボガドロ定数 6.0×10^{23}/mol）', v: n, wr: [N * 6.0e23, 6.0e23 / N, n * 10], u: ' mol', hj: 'komoru', hide: 'bl', hv: { top: fmt(N, 2) }, e: 'mol = {{個|6.0×10^{23}}} = ' + fmt(n, 2) + ' mol' }; },
          function () { var I = pick([0.50, 1.0, 2.0, 0.25]), t = pick([600, 1930, 3860, 965]), Q = I * t;
            return { q: fmt(I, 2) + ' A の電流を ' + t + ' 秒間流したときの電気量は何 C か。', v: Q, wr: [t / I, I / t, I * t / 60], u: ' C', hj: 'kyas', hide: 'top', hv: { bl: fmt(I, 2), br: String(t) }, e: 'C = A × s = ' + fmt(I, 2) + ' × ' + t + ' = ' + fmt(Q, 3) + ' C' }; },
          function () { var I = pick([0.50, 1.0, 2.0]), t = pick([965, 1930, 4825]), Q = I * t;
            return { q: fmt(Q, 3) + ' C の電気量を ' + fmt(I, 2) + ' A の電流で流すには何秒かかるか。', v: t, wr: [Q * I, I / Q, t / 60], u: ' 秒', hj: 'kyas', hide: 'br', hv: { top: fmt(Q, 3), bl: fmt(I, 2) }, e: 's = {{C|A}} = ' + fmt(Q, 3) + ' ÷ ' + fmt(I, 2) + ' = ' + t + ' 秒' }; },
          function () { var ion = pick([['Cu^{2+}', 2], ['Ag^{+}', 1], ['Al^{3+}', 3], ['Zn^{2+}', 2]]), Fm = pick([0.010, 0.020, 0.060, 0.12]), n = Fm / ion[1];
            return { q: '電子 ' + fmt(Fm, 2) + ' mol で ' + ion[0] + ' を還元したとき、析出する金属は何 mol か。', v: n, wr: [Fm * ion[1], Fm, n / 2], u: ' mol', hj: 'fight', hide: 'bl', hv: { top: fmt(Fm, 2), br: String(ion[1]) }, e: 'mol = {{F|価数}} = ' + fmt(Fm, 2) + ' ÷ ' + ion[1] + ' = ' + fmt(n, 2) + ' mol' }; },
          function () { var Q = pick([965, 1930, 4825, 9650]), Fm = Q / 9.65e4;
            return { q: fmt(Q, 3) + ' C の電気量は、電子何 mol 分か。（F = 9.65×10^{4} C/mol）', v: Fm, wr: [Q * 9.65e4, 9.65e4 / Q, Fm * 2], u: ' mol', hj: 'kyas', hide: null, e: '{{C|96500}} = F → ' + fmt(Q, 3) + ' ÷ 96500 = ' + fmt(Fm, 2) + ' mol（キャスとファイトモルカーをつなぐ換算）' }; },
          function () { var c2 = pick([0.10, 0.20, 0.050, 0.50]), mL = pick([20, 25, 50, 200, 250]), n = c2 * mL / 1000;
            return { q: fmt(c2, 2) + ' mol/L の水溶液 ' + mL + ' mL に含まれる溶質は何 mol か。', v: n, wr: [c2 * mL, c2 / (mL / 1000), n * 10], u: ' mol', hj: 'shieno_mol', hide: 'top', hv: { bl: String(mL / 1000), br: fmt(c2, 2) }, e: '溶質 mol = L × mol/L = ' + (mL / 1000) + ' × ' + fmt(c2, 2) + ' = ' + fmt(n, 2) + ' mol（mL は L に直す）' }; },
          function () { var d = pick([0.10, 0.20, 0.30, 0.40]), t = pick([20, 40, 50, 100]), v = d / t;
            return { q: '反応物の濃度が ' + t + ' 秒間に ' + fmt(d, 2) + ' mol/L 減少した。平均の反応速度は何 mol/(L・s) か。', v: v, wr: [d * t, t / d, v * 10], u: '', hj: 'hajino', hide: 'br', hv: { top: fmt(d, 2), bl: String(t) }, e: '速度 = {{変化量|時間}} = ' + fmt(d, 2) + ' ÷ ' + t + ' = ' + fmt(v, 2) + ' mol/(L・s)' }; }
        ])();
        var ch = choices(c.v, c.wr, c.u === ' 秒' ? 3 : 2, c.u);
        return { q: c.q, c: ch.c, a: ch.a, e: c.e, k: 'はじき図で、求めたいところを隠す。上下に分かれていれば割り算、横に並んでいれば掛け算。', hs: c.hide ? [{ h: c.hj, v: c.hv, find: c.hide, eq: c.e }] : [{ c: c.e, t: 'C → F（÷ 96500）' }] };
      }
    }
  ];
  CHEM.generators = gens;
  CHEM.mkChoices = choices; CHEM.pick = pick; CHEM.shuffle = shuffle;
})();
