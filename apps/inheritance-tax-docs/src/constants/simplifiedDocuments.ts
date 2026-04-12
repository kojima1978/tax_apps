/**
 * 相続税シミュレーション用 簡易版の書類データ
 * 資料準備ガイドの4カテゴリから必要最小限の書類を1カテゴリにまとめたもの
 */

import type { CategoryData } from './documents';

export const SIMPLIFIED_CATEGORIES: CategoryData[] = [
  {
    id: 'simplified',
    name: 'シミュレーション用 必要書類',
    iconName: 'FileCheck',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    documents: [
      // 不動産
      {
        id: 'real_estate_nayose',
        name: '（土地・建物関係）固定資産税の納税通知書',
        description: '所有している土地・建物の一覧が記載された書類。',
        howToGet: '毎年4月～5月頃に送られてくる固定資産税の通知書に添付されているものです。',
        canDelegate: true,
      },
      // 現金預金
      {
        id: 'cash_zandaka',
        name: '（現金預金関係）預金通帳の現在残高コピー',
        description: '預貯金の残高。',
        howToGet: '現在の預金残高（普通・定期など全ての預金）の概算（百万円単位で結構です。）が分かれば結構です。メモ等でお知らせ下さい。',
        canDelegate: true,
      },
      // 有価証券
      {
        id: 'sec_torihiki_hokoku',
        name: '（上場株式、投資信託、その他金融商品）証券会社の預り証明書又は取引レポート',
        description: '証券会社が顧客の一定期間（通常3ヶ月ごと）の預かり残高を報告する法定書類です。',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      // 生命保険
      {
        id: 'ins_shousho',
        name: '（生命保険関係）保険証書のコピーか契約内容のお知らせ',
        description: '契約者、被保険者、受取人が記載された書類。',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      // その他の資産
      {
        id: 'other_kashitsuke',
        name: '（その他の資産）貸付金、前払金等',
        description: '貸付金や前払金等のその他の資産。',
        howToGet: '金銭消費貸借契約書及び残高のわかるものコピーをご用意下さい。',
      },
      // 債務関係
      {
        id: 'debt_kariirekin',
        name: '（債務関係）借入金',
        description: '銀行などの金融機関からの借入がある場合。',
        howToGet: 'ご契約の金融機関にお問い合わせの上、借入残高証明書をご用意下さい。※おおよその借入額が分かれば結構です。',
      },
      // 贈与税関係
      {
        id: 'gift_tax',
        name: '（贈与税関係）贈与税申告書・贈与契約書',
        description: '過去に贈与税の申告（相続時精算課税制度含む）を行っている場合に必要です。',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      // その他
      {
        id: 'other_kakutei',
        name: '（その他）過去1年分の確定申告書',
        description: '被相続人の所得状況を確認するために必要です。',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      {
        id: 'other_yuigon',
        name: '（その他）遺言書のコピー',
        description: '遺言書がある場合に必要です。',
        howToGet: 'ある場合には遺言書の写しをご用意下さい。',
      },
    ],
  },
];
