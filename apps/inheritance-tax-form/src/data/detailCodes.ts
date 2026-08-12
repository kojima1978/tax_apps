/**
 * 「記載要領等 相続税の申告書第11表の付表1〜4」で定義されたコード表。
 *
 * 様式PDFにはコードを書く枠しか無く、どのコードが何を指すかは記載要領にしか載っていない。
 * 様式にはコード（数字）を記入するため value はコード文字列とし、label に意味を添える。
 *
 * `table15` は「第15表の該当欄」。付表の「取得財産の価額」を細目ごとに合計して
 * 第15表のどの欄へ転記するかが記載要領で決まっている。第15表は未実装だが、
 * 転記先はこのコード表が唯一の定義元になるので今のうちに持たせておく。
 */

/** 細目コード1件（「細目」「口座種別等」欄に入れる名称と、第15表の転記先を持つ） */
export interface DetailKindCode {
  code: string;
  /** コードを選ぶと「細目」「口座種別等」欄に自動で入る名称（空＝手入力させる） */
  name: string;
  /** 選択肢に出す表示名（省略時は `name`） */
  label?: string;
  /** 第15表の該当欄 */
  table15: string;
}

/** コード表 → `<select>` の選択肢（先頭は未選択） */
export function codeOptions(items: readonly { code: string; name: string; label?: string }[]) {
  return [
    { value: '', label: '' },
    ...items.map((c) => ({ value: c.code, label: `${c.code} ${c.label ?? c.name}` })),
  ];
}

/** コード表 → コードから名称を引く表（「細目」欄への自動入力に使う） */
export function codeNames(items: readonly DetailKindCode[]): Record<string, string> {
  return Object.fromEntries(items.map((c) => [c.code, c.name]));
}

/** 付表1《取得した財産の細目等の記載要領》 */
export const TABLE11F1_KINDS: DetailKindCode[] = [
  { code: '11', name: '田', table15: '①' },
  { code: '12', name: '畑', table15: '②' },
  { code: '13', name: '宅地', table15: '③' },
  { code: '14', name: '山林', table15: '④' },
  { code: '15', name: 'その他の土地', table15: '⑤' },
  { code: '21', name: '家屋等', table15: '⑩' },
];

/** 付表2《取得した財産の細目等の記載要領》 */
export const TABLE11F2_KINDS: DetailKindCode[] = [
  { code: '46', name: '特定同族会社の株式、出資（配当還元方式）', table15: '⑰' },
  { code: '47', name: '特定同族会社の株式、出資（その他の方式）', table15: '⑱' },
  { code: '48', name: '上記以外の株式、出資', table15: '⑲' },
  { code: '44', name: '公債、社債', table15: '⑳' },
  { code: '45', name: '証券投資信託、貸付信託の受益証券', table15: '㉑' },
];

/** 付表3《取得した財産の口座種別等の記載要領》（第15表はすべて㉓欄） */
export const TABLE11F3_KINDS: DetailKindCode[] = [
  { code: '11', name: '現金', table15: '㉓' },
  { code: '12', name: '普通預金', table15: '㉓' },
  { code: '13', name: '当座預金', table15: '㉓' },
  { code: '14', name: '定期預金', table15: '㉓' },
  { code: '15', name: '通常貯金', table15: '㉓' },
  { code: '16', name: '定額貯金', table15: '㉓' },
  { code: '17', name: '定期積金', table15: '㉓' },
  { code: '18', name: '金銭信託', table15: '㉓' },
  // 11〜18 以外は「99」と書いた上で、口座種別等を自分で書く
  { code: '99', name: '', label: '上記以外（種別は手入力）', table15: '㉓' },
];

/** 付表4《取得した財産の細目等の記載要領》 */
export const TABLE11F4_KINDS: DetailKindCode[] = [
  { code: '31', name: '機械、器具、農機具、その他の減価償却資産', table15: '⑫' },
  { code: '32', name: '商品、製品、半製品、原材料、農産物等', table15: '⑬' },
  { code: '33', name: '売掛金', table15: '⑭' },
  { code: '34', name: 'その他の事業（農業）用財産', table15: '⑮' },
  { code: '61', name: '家庭用財産', table15: '㉔' },
  { code: '71', name: '生命保険金等', table15: '㉕' },
  { code: '74', name: '退職手当金等', table15: '㉖' },
  { code: '72', name: '立木', table15: '㉗' },
  { code: '75', name: '代償財産', table15: '㉘' },
  { code: '76', name: '金地金', table15: '㉘' },
  { code: '77', name: '生命保険（共済）契約に関する権利', table15: '㉘' },
  { code: '78', name: '損害保険（共済）契約に関する権利', table15: '㉘' },
  { code: '79', name: '暗号資産', table15: '㉘' },
  { code: '80', name: '同族法人に対する貸付金、預け金等', table15: '㉘' },
  { code: '81', name: '同族法人以外に対する貸付金、預け金等', table15: '㉘' },
  { code: '82', name: '配当期待権', table15: '㉘' },
  { code: '73', name: 'その他', table15: '㉘' },
];

/**
 * 「特例」欄の番号。番号と特例の対応は4様式で共通だが、
 * **様式ごとに使える番号が違う**（付表1は1〜6、付表2は3・6〜8、付表4は2・4・6。付表3に欄は無い）。
 */
const SPECIALS: Record<string, string> = {
  '1': '小規模宅地等（措法69の4）',
  '2': '特定計画山林（措法69の5）',
  '3': '特定土地等・特定株式等（措法69の6）',
  '4': '災害減免法6条',
  '5': '農地等の贈与者が死亡した場合（措法70の5）',
  '6': '個人の事業用資産の贈与者が死亡した場合（措法70の6の9）',
  '7': '非上場株式等の贈与者が死亡した場合（措法70の7の3）',
  '8': '非上場株式等の特例贈与者が死亡した場合（措法70の7の7）',
};

function specialOptions(codes: readonly string[]) {
  return codeOptions(codes.map((code) => ({ code, name: SPECIALS[code]! })));
}

export const TABLE11F1_SPECIAL_OPTIONS = specialOptions(['1', '2', '3', '4', '5', '6']);
export const TABLE11F2_SPECIAL_OPTIONS = specialOptions(['3', '6', '7', '8']);
export const TABLE11F4_SPECIAL_OPTIONS = specialOptions(['2', '4', '6']);

/** 付表2《金融商品取引業者等コード》（5番が無く、6が証券・7が上記以外） */
export const BROKER_CODE_OPTIONS = codeOptions([
  { code: '1', name: '銀行' },
  { code: '2', name: '金庫' },
  { code: '3', name: '組合' },
  { code: '4', name: '農協' },
  { code: '6', name: '証券' },
  { code: '7', name: '上記以外' },
]);

/** 付表3《金融機関等コード》（付表2と違い5が漁協、6が上記以外） */
export const BANK_CODE_OPTIONS = codeOptions([
  { code: '1', name: '銀行' },
  { code: '2', name: '金庫' },
  { code: '3', name: '組合' },
  { code: '4', name: '農協' },
  { code: '5', name: '漁協' },
  { code: '6', name: '上記以外' },
]);

/** 《支店等コード》（付表2・付表3で共通） */
export const BRANCH_CODE_OPTIONS = codeOptions([
  { code: '1', name: '本店' },
  { code: '2', name: '支店' },
  { code: '3', name: '本所' },
  { code: '4', name: '支所' },
  { code: '5', name: '出張所' },
  { code: '6', name: '上記以外' },
]);

/** 「国外」欄は所在場所が国外のときだけ「1」を書く */
export const FOREIGN_OPTIONS = codeOptions([{ code: '1', name: '国外' }]);
