export type Resource = {
  title: string;
  description: string;
} & (
  | { filename: string; downloadName: string; url?: never }
  | { url: string; filename?: never; downloadName?: never }
);

export const RESOURCES: Resource[] = [
  {
    title: '相続・手続きスケジュール',
    description: '葬儀を終えた後の相続手続きの流れとスケジュール（14日以内〜1年以内）',
    filename: 'schedule.pdf',
    downloadName: '相続手続きスケジュール.pdf',
  },
  {
    title: '手続き＆チェックリスト',
    description: '相続発生後に必要な各種届出・手続きの一覧と提出先・相談先',
    filename: 'checklist.pdf',
    downloadName: '相続手続きチェックリスト.pdf',
  },
  {
    title: '相続税申告後サポート',
    description: '二次相続対策・資産運用・不動産見直しなど申告後のサポート案内',
    filename: 'after-support.pdf',
    downloadName: '相続後のアフターサポート.pdf',
  },
  {
    title: '保険を使った相続税対策',
    description: '生命保険の非課税枠や生前贈与を組み合わせた節税方法の解説',
    filename: 'life-insurance.pdf',
    downloadName: '生命保険を使った相続税対策.pdf',
  },
  {
    title: '不動産リスク診断チェック表',
    description: '保有不動産のリスクを10項目でチェックできる診断シート',
    filename: 'real-estate-risk-check.pdf',
    downloadName: '不動産リスク診断チェックシート.pdf',
  },
  {
    title: '生計一親族チェックリスト',
    description: '生計を一にする親族の判定に使用するチェックリスト',
    filename: 'household-family-checklist.xlsx',
    downloadName: '生計一親族チェックリスト.xlsx',
  },
  {
    title: '名義預金、生前贈与について',
    description: '名義預金の基礎知識・具体例と申告しない場合のペナルティの解説',
    filename: 'nominee-deposit.pdf',
    downloadName: '名義預金、生前贈与について.pdf',
  },
  {
    title: '預金移動調査について',
    description: '預金移動調査の目的・必要性判定フローチャートとお預かり資料の案内',
    filename: 'deposit-transfer-survey.pdf',
    downloadName: '預金移動調査について.pdf',
  },
  {
    title: '贈与契約書ひな形',
    description: '贈与契約書のひな形テンプレート',
    filename: 'gift-contract-template.doc',
    downloadName: '贈与契約書ひな形.doc',
  },
  {
    title: '未分割申告の確認書',
    description: '遺産が未分割の場合の申告に関する確認書',
    filename: 'undivided-declaration-confirmation.docx',
    downloadName: '未分割申告の確認書.docx',
  },
  {
    title: '申告完了までのスケジュール',
    description: '相続税申告完了までの全体スケジュールと各工程の流れ',
    filename: 'declaration-schedule.xlsx',
    downloadName: '申告完了までのスケジュール.xlsx',
  },
  {
    title: '戸籍謄本の広域交付制度',
    description: '最寄りの市区町村窓口で戸籍証明書をまとめて請求できる広域交付制度の案内（法務省）',
    filename: 'koseki-wide-area.pdf',
    downloadName: '戸籍謄本の広域交付.pdf',
  },
  {
    title: '法定相続情報証明制度',
    description: '法定相続情報一覧図の作成手順・必要書類・申出方法の解説（法務省）',
    filename: 'legal-heir-info.pdf',
    downloadName: '法定相続情報一覧図.pdf',
  },
  {
    title: '利用者識別番号とは',
    description: 'e-Taxで使用する利用者識別番号の概要と取得方法の解説（国税庁）',
    url: 'https://www.keisan.nta.go.jp/r7yokuaru_sp/cat1/cat12/cat122/cat1221/scid1437.html',
  },
];
