/* はじき公式（上 = 左下 × 右下）
   求めたい場所を隠す → 上下に分かれていれば割る、横に並んでいれば掛ける */
window.CHEM = window.CHEM || {};
CHEM.hajiki = [
  { id: 'komoru', name: 'こもるアボガドロ', group: 'mol', top: '個', bl: 'mol', br: '6.0×10^{23}',
    note: '粒子の数（個）= 物質量（mol）× アボガドロ定数',
    ex: '0.50 mol の水分子の数 → 0.50 × 6.0×10^{23} = 3.0×10^{23} 個' },
  { id: 'guten', name: 'グーテンモルゲン', group: 'mol', top: 'g', bl: 'mol', br: 'モル質量', lines: { br: ['モル', '質量'] },
    note: '質量（g）= 物質量（mol）× モル質量（原子量・分子量に g/mol をつけたもの）',
    ex: 'H_2O 9.0 g は何 mol？ → mol を隠すと {{g|モル質量}} → 9.0 ÷ 18 = 0.50 mol' },
  { id: 'elmo', name: 'エルモ22.4', group: 'mol', top: 'L', bl: 'mol', br: '22.4',
    note: '気体の体積（L）= 物質量（mol）× 22.4（0℃、1.013×10^{5} Pa のときだけ）',
    ex: '0℃、1.013×10^{5} Pa で 5.6 L の O_2 → 5.6 ÷ 22.4 = 0.25 mol' },
  { id: 'shieno_g', name: 'しえの（質量パーセント）', group: 'conc', top: '溶質 g', bl: '溶液 g', br: '濃度 %',
    note: '溶質（g）= 溶液（g）× 濃度。％は 100 で割った値（例: 20% → 0.20）で掛ける',
    ex: '20% の食塩水 150 g 中の食塩 → 150 × 0.20 = 30 g' },
  { id: 'shieno_mol', name: 'しえの（モル濃度）', group: 'conc', top: '溶質 mol', bl: '溶液 L', br: 'mol/L',
    note: '溶質（mol）= 溶液の体積（L）× モル濃度（mol/L）。mL は L に直す',
    ex: '0.10 mol/L の塩酸 20 mL 中の HCl → 0.020 × 0.10 = 2.0×10^{-3} mol' },
  { id: 'shibano', name: 'しばの（質量モル濃度）', group: 'conc', top: '溶質 mol', bl: '溶媒 kg', br: 'mol/kg',
    note: '溶質（mol）= 溶媒の質量（kg）× 質量モル濃度（mol/kg）。分母は溶液ではなく溶媒。g は kg に直す',
    ex: '水 500 g にグルコース 0.050 mol → mol/kg を隠すと {{0.050|0.500}} = 0.10 mol/kg' },
  { id: 'mitsudo', name: '密度のはじき', group: 'conc', top: '質量 g', bl: '体積 mL', br: '密度 g/mL', lines: { br: ['密度', 'g/mL'] },
    note: '溶液の質量（g）= 体積（mL）× 密度（g/mL）。g/cm^{3} = g/mL、1 L = 1000 mL。濃度変換で「もし 1 L」を g に直すときに使う',
    ex: '密度 1.2 g/cm^{3} の溶液 1 L → 1000 × 1.2 = 1200 g' },
  { id: 'hajino', name: 'はじの（反応速度）', group: 'rate', top: 'mol/L', bl: 's', br: 'mol/(L・s)', lines: { br: ['mol', '/(L・s)'] },
    note: '濃度の変化量（mol/L）= 時間（s）× 反応速度（mol/(L・s)）',
    ex: '40 秒で 0.20 mol/L 減った → 速度 = 0.20 ÷ 40 = 5.0×10^{-3} mol/(L・s)' },
  { id: 'kyas', name: 'キャス', group: 'elec', top: 'C', bl: 'A', br: 's',
    note: '電気量（C）= 電流（A）× 時間（s）。分は秒に直す',
    ex: '0.50 A で 32 分 10 秒 → 0.50 × 1930 = 965 C' },
  { id: 'fight', name: 'ファイトモルカー', group: 'elec', top: 'F', bl: 'mol', br: '価数',
    note: '電子の物質量 F（mol）= 物質の物質量（mol）× 価数（1 個あたりにやり取りする電子の数）',
    ex: 'Cu^{2+} + 2e^{-} -> Cu で e^{-} 0.010 mol → Cu の mol = 0.010 ÷ 2 = 0.0050 mol' }
];
CHEM.hajikiGroups = [
  { id: 'mol', name: '物質量（mol）の変換', desc: 'どの量も、いったん mol にしてから目的の量へ。3つの円は mol を共通にしてつながっています。' },
  { id: 'conc', name: '濃度', desc: '「溶質 = 溶液 × 濃度」。質量パーセント濃度・モル濃度（しえの）と、質量モル濃度（しばの: 溶媒 kg）で、単位が変わるだけで形は同じです。' },
  { id: 'rate', name: '反応速度', desc: '「濃度の変化量 = 時間 × 速度」。速さ・時間・距離の「はじき」と同じ形です。' },
  { id: 'elec', name: '電気量', desc: 'キャスで C を出し、96500 で割って F（電子の mol）にし、ファイトモルカーで物質の mol へ。' }
];
/* 問題ごとに、解説の下に表示するはじき図 */
CHEM.qHajiki = {
  mol01: ['guten'], mol02: ['elmo', 'guten'], mol03: ['guten'], mol04: ['shieno_g', 'guten', 'shieno_mol'], mol05: ['guten', 'shieno_mol'],
  mol06: ['guten', 'elmo', 'komoru'], mol08: ['shieno_mol', 'guten'], sol02: ['guten'], sol06: ['guten'], thm05: ['guten'],
  rdx03: ['shieno_mol'], rdx06: ['shieno_mol'], ele02: ['kyas', 'fight', 'guten'], ele03: ['fight', 'elmo'], ele05: ['fight'],
  ele06: ['guten', 'fight'], ele07: ['guten', 'fight'], qb04: ['guten', 'fight'], ab01: ['shieno_mol'], ab05: ['shieno_mol'], ab08: ['shieno_mol'],
  kin03: ['hajino'], kin07: ['hajino'], na05: ['guten', 'elmo'], al04: ['guten'], ar09: ['guten'], po08: ['shieno_mol'], dt04: ['guten', 'elmo'],
  xc04: ['fight', 'kyas'], xc12: ['shieno_mol'],
  'g-mol': ['guten', 'komoru'], 'g-stp': ['guten', 'elmo'], 'g-comb': ['guten'], 'g-elec': ['kyas', 'fight', 'guten'], 'g-neut': ['shieno_mol'], 'g-redox': ['shieno_mol']
};
