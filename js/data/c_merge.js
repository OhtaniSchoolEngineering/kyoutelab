/* 思考（C）の整理（170 問 → 100 問）
   1) 大問の小問と同じ題材の単問を外す
   2) 本質が同じ大問どうしを 1 題にまとめる（元の大問の問題づくりをそのまま使い、小問を選び直す）
   3) 共通テストの演習としてふさわしくないものを外す。2023〜2026 年の本試・追試 8 回分の C は、題材は初見でも
      使う数学は「比・一次式・mol 計算・常用対数」まで。自然対数（数学 III）や、√ を使う物理の法則
      （換算質量・気体分子運動論）、ポーリングの式を前提にした計算は一度も出ていないので、それが中心の大問は外す。
   元の大問・単問のデータはファイルに残してあり、ここで一覧から外している */
window.CHEM = window.CHEM || {};
(function () {
  'use strict';
  var C = window.CHEM, mk = C.mkChoices;
  var f = function (x, s) { return C.fmt(x, s || 2); };

  /* 1) 大問と同じ題材の単問（カッコ内はそれを含む大問） */
  var DROP_Q = ['thm07' /* 格子エンタルピー（cm08） */, 'kin06' /* 酵素（cm11） */, 'na09' /* 酵素（cm11） */, 'dt02' /* Cl の同位体（mx01） */,
    'dt01' /* 吸光度（cs03） */, 'dt03' /* 硬度（mx02） */, 'xc12' /* COD（mx02） */, 'xc07' /* 配向性（mx12） */, 'xc08' /* 電気泳動（cm31） */,
    'dt06' /* 半減期（mx10） */, 'xc02' /* 半減期（mx10） */, 'dt07' /* 再結晶（cs05） */, 'eq06' /* K と温度（cs12） */,
    'ele06' /* 空気電池（mx08） */, 'xc11' /* 塩の同定（dt08） */, 'xc09' /* C=C への付加の量（cs11） */];
  /* 2) まとめる大問（cm02・cm09・cm10・cm32 は、まとめたあと 3) の理由で外した） */
  var DROP_SET = ['cs01', 'cs02', 'cs07', 'cs08', 'cs09', 'cm01', 'cm02', 'cm06', 'cm07', 'cm09', 'cm10', 'cm12', 'cm13', 'cm14', 'cm15', 'cm16',
    'cm20', 'cm22', 'cm23', 'cm24', 'cm26', 'cm27', 'cm28', 'cm30', 'cm32', 'cm33', 'cm34',
    /* 3) 本番の演習としてふさわしくない大問 */
    'cm03' /* 赤外線の吸収: 換算質量と √(k/μ) */, 'cm21' /* グレアムの法則: √M の比（気体分子運動論） */];

  var G = {}; C.csets.forEach(function (s) { G[s.id] = s; });
  C.csets = C.csets.filter(function (s) { return DROP_SET.indexOf(s.id) < 0; });
  C.questions = C.questions.filter(function (q) { return DROP_Q.indexOf(q.id) < 0 && DROP_SET.indexOf(q.set) < 0; });

  /* 小問に［I］［II］の目印をつけて取り出す */
  function tag(mark, q) { var o = {}; Object.keys(q).forEach(function (k) { o[k] = q[k]; }); o.q = mark + q.q; return o; }

  C.addSets([
    { id: 'mx01', u: 'orgbasic', lv: 3, p: ['P28', 'P22'], title: '質量分析（同位体と結合の切れ方）', fresh: true,
      gen: function () {
        var a = G.cm01.gen(), b = G.cs02.gen();
        var iso = b.lead.split('\n')[1];
        return { lead: '［I］' + a.lead + '\n［II］分子 1 個の質量は、それをつくる原子の同位体の組合せで決まる。' + iso, fig: a.fig,
          qs: [tag('［I］', a.qs[1]), tag('［I］', a.qs[2]), tag('［II］', b.qs[1])] };
      } },
    { id: 'mx02', u: 'redox', lv: 3, p: ['P12', 'P28'], title: '水質の指標（硬度・COD・溶存酸素）', fresh: false,
      gen: function () {
        var a = G.cs01.gen(), b = G.cs09.gen(), c = G.cm16.gen();
        return { lead: '［I］' + a.lead + '\n［II］' + b.lead + '\n［III］' + c.lead,
          qs: [tag('［I］', a.qs[1]), tag('［II］', b.qs[1]), tag('［III］', c.qs[1])] };
      } },
    { id: 'mx03', u: 'tmetal', lv: 2, p: ['P29', 'P01'], title: '加熱による質量の変化から物質を決める', fresh: true,
      gen: function () {
        var a = G.cm27.gen(), m = C.pick([1.25, 2.50, 5.00]), w = m * 90 / 250;
        var c3 = mk(w, [m * 160 / 250, m * 18 / 250, m * 36 / 250], 2, ' g');
        return { lead: '［I］' + a.lead + '\n［II］硫酸銅(II) 五水和物 CuSO_4・5H_2O（式量 250）を加熱すると、水和水が段階的に失われ、300 ℃ 付近ですべて失われて CuSO_4（式量 160）になる。', fig: a.fig,
          qs: [tag('［I］', a.qs[0]), tag('［I］', a.qs[1]),
            { q: '［II］CuSO_4・5H_2O ' + f(m, 3) + ' g を 300 ℃ まで加熱したとき、失われる水の質量は何 g か。', c: c3.c, a: c3.a,
              e: 'CuSO_4・5H_2O 1 mol（250 g）から H_2O 5 mol（90 g）が失われる。' + f(m, 3) + ' × {{90|250}} = ' + f(w) + ' g。［I］と同じく「金属の物質量は変わらない」で考える。', k: '水和物は「式量のうち水の分」の割合だけ軽くなる。' }] };
      } },
    { id: 'mx05', u: 'structure', lv: 3, p: ['P28'], title: '光のエネルギー（結合の切断と原子の発光）', fresh: true,
      gen: function () {
        var a = G.cm15.gen(), b = G.cm28.gen();
        return { lead: '［I］' + a.lead + '\n［II］' + b.lead, tbl: a.tbl,
          qs: [tag('［I］', a.qs[0]), tag('［I］', a.qs[2]), tag('［II］', b.qs[0])] };
      } },
    { id: 'mx06', u: 'equilibrium', lv: 3, p: ['P15', 'P29'], title: '酸の強さと pK_a（置換基と炭酸）', fresh: true,
      gen: function () {
        var a = G.cm26.gen(), b = G.cm30.gen();
        return { lead: '［I］' + a.lead + '\n［II］' + b.lead, tbl: a.tbl, fig: b.fig,
          qs: [tag('［I］', a.qs[1]), tag('［II］', b.qs[1]), tag('［II］', b.qs[2])] };
      } },
    { id: 'mx07', u: 'data', lv: 3, p: ['P28', 'P14'], title: '2 つの相への分かれ方（抽出とクロマトグラフィー）', fresh: true,
      gen: function () {
        var a = G.cm07.gen(), b = G.cm06.gen();
        return { lead: '［I］' + a.lead + '\n［II］' + b.lead.replace(/表は、[^。]*。$/, ''),
          qs: [tag('［I］', a.qs[0]), tag('［I］', a.qs[1]), tag('［II］', b.qs[2])] };
      } },
    { id: 'mx08', u: 'electro', lv: 2, p: ['P10', 'P28'], title: '酸素が電子を受け取る反応（空気電池と鉄のさび）', fresh: false,
      gen: function () {
        var a = G.cs08.gen(), b = G.cm33.gen();
        return { lead: '［I］' + a.lead + '\n［II］' + b.lead,
          qs: [tag('［I］', a.qs[1]), tag('［II］', b.qs[1]), tag('［II］', b.qs[2])] };
      } },
    { id: 'mx10', u: 'kinetics', lv: 3, p: ['P29', 'P17'], title: '2 段階で進む反応と半減期', fresh: true,
      gen: function () {
        var a = G.cm34.gen();
        var q2 = C.cxOpts('約 7 min', ['約 4.6 min', '約 9.2 min', '約 18 min']);
        return { lead: a.lead + '\nこのように、濃度に比例する速さで減っていく物質は、濃度が半分になるまでの時間（半減期）がいつも一定である。', fig: a.fig,
          qs: [a.qs[0],
            { q: 'グラフから、A の濃度が 0.50 mol/L になる時刻はおよそ 2.3 min と読み取れる。A の濃度が 0.125 mol/L になるのは、反応開始からおよそ何 min 後か。', c: q2.c, a: q2.a,
              e: '0.125 = 1.00 × ({{1|2}})^{3} なので、半減期 3 回分。2.3 × 3 ≒ 7 min（グラフでも確かめられる）。放射性同位体の年代測定も同じ考え方。', k: '「1/2 を何回かけたか」を数える。1/8 だから 8 倍の時間、ではない。' },
            a.qs[2]] };
      } },
    { id: 'mx11', u: 'orgbasic', lv: 3, p: ['P21', 'P28'], title: '立体異性体（鏡像異性体と錯イオン）', fresh: true,
      gen: function () {
        var a = G.cm20.gen(), b = G.cm22.gen();
        return { lead: '［I］' + a.lead + '\n［II］' + b.lead,
          qs: [tag('［I］', a.qs[0]), tag('［I］', a.qs[1]), tag('［II］', b.qs[1])] };
      } },
    { id: 'mx12', u: 'aromatic', lv: 3, p: ['P28', 'P22'], title: '与えられた規則で生成物を予想する', fresh: true,
      gen: function () {
        var a = G.cm23.gen(), b = G.cm24.gen();
        return { lead: '［I］' + a.lead + '\n［II］' + b.lead,
          qs: [tag('［I］', a.qs[0]), tag('［I］', a.qs[2]), tag('［II］', b.qs[2])] };
      } },
    { id: 'mx13', u: 'electro', lv: 3, p: ['P10', 'P28'], title: '電池から取り出せる電圧とエネルギー', fresh: true,
      gen: function () {
        var a = G.cm14.gen(), b = G.cm13.gen();
        return { lead: '［I］' + a.lead + '\n［II］' + b.lead,
          qs: [tag('［I］', a.qs[1]), tag('［I］', a.qs[2]), tag('［II］', b.qs[1])] };
      } }
  ]);
})();
