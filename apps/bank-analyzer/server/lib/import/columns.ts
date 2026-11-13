// 取込できる CSV / xlsx の列の表（依頼24）。
//
// 列の名前・表記ゆれ・必須かどうか・書き方をここ1か所に持つ。読み込み（loadStatement.ts の
// 列名の対応）、取込画面の「取込できる形式」、ひな形の CSV、AI に渡す指示文、README の表は
// どれもこの表から作る（並びはそのまま「推奨の並び順」）。
//
// 列は名前で読むので、ファイルの並びが違っても読める。比べるのは headerKey を通した形
// （全角・空白の違いは無視）。

export type StandardColumn =
  | 'bank_name'
  | 'branch_name'
  | 'account_number'
  | 'account_type'
  | 'date'
  | 'description'
  | 'amount_out'
  | 'amount_in'
  | 'balance'
  // 依頼24 で足した任意の列。無い・空欄・一部だけ、のどれでもエラーにしない
  | 'category'
  | 'memo'
  | 'flag';

export type ImportColumn = {
  key: StandardColumn;
  // 画面・ひな形・指示文に出す名前
  name: string;
  // ほかに読める列名（name も読める）
  aliases: string[];
  required: boolean;
  // 書き方（画面・README・指示文で同じ文を使う）
  format: string;
};

export const IMPORT_COLUMNS: readonly ImportColumn[] = [
  { key: 'bank_name', name: '銀行名', aliases: [], required: false, format: '例: さくら銀行。1ファイルに複数の口座を入れるときは全行に書く' },
  { key: 'branch_name', name: '支店名', aliases: [], required: false, format: '例: 本店' },
  {
    key: 'account_number',
    name: '口座番号',
    aliases: [],
    required: false,
    format: '文字列として書く（先頭の0を残す。例: 0012345）。1ファイルに複数の口座を入れるときは全行に書く',
  },
  { key: 'account_type', name: '種別', aliases: [], required: false, format: '例: 普通・定期' },
  {
    key: 'date',
    name: '日付',
    aliases: ['年月日'],
    required: true,
    format: '西暦（2021-04-01・2021/4/1・2021年4月1日）か和暦（R3.4.1・令和3年4月1日・H28.6.3）。04/01/2021 のような月/日/年は読めない',
  },
  { key: 'description', name: '摘要', aliases: [], required: true, format: '通帳に印字されたとおり' },
  {
    key: 'amount_out',
    name: '払戻額',
    aliases: ['払戻'],
    required: true,
    format: '整数（カンマ・「円」・「¥」は付いていてもよい）。空欄は0。マイナスは「△」か「−」',
  },
  { key: 'amount_in', name: 'お預り額', aliases: ['お預り'], required: true, format: '払戻額と同じ書き方。空欄は0' },
  {
    key: 'balance',
    name: '差引残高',
    aliases: ['残高'],
    required: false,
    format: '払戻額と同じ書き方。空欄は「残高なし」（0 ではない）。列があれば残高のつながりを確かめる',
  },
  {
    key: 'category',
    name: '分類',
    aliases: ['カテゴリー', 'カテゴリ'],
    required: false,
    format: 'アプリの分類名のどれか。空欄・「未分類」はアプリが自動で分類する。知らない名前は取込前に読み替え先を選ぶ',
  },
  { key: 'memo', name: 'メモ', aliases: ['備考'], required: false, format: '取引のメモとして残る（読みにくかった箇所・分類に迷った理由など）' },
  {
    key: 'flag',
    name: '要確認',
    aliases: [],
    required: false,
    format: '「○」なら質問候補の付箋を付ける。空欄は付けない',
  },
];

export const REQUIRED_COLUMNS: StandardColumn[] = IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key);

export function columnLabel(key: StandardColumn): string {
  return IMPORT_COLUMNS.find((c) => c.key === key)?.name ?? key;
}

// 要確認の列の読み方。どちらにも当たらない値は「付箋なし」として件数だけ知らせる（取込は止めない）。
const FLAG_ON = new Set(['○', '〇', '◯', '●', '◎', '✓', '✔', 'レ', '1', 'true', 'yes', 'はい', '要', '要確認', 'あり', '有']);
const FLAG_OFF = new Set(['0', 'false', 'no', 'いいえ', '不要', '-', 'ー', '―', '×', 'なし', '無']);

// true = 付箋あり / false = 付箋なし / null = 読めない値（付箋なしとして扱う）
export function parseFlag(raw: string | null | undefined): boolean | null {
  const v = (raw ?? '').normalize('NFKC').trim().toLowerCase();
  if (v === '') return false;
  if (FLAG_ON.has(v)) return true;
  if (FLAG_OFF.has(v)) return false;
  return null;
}
