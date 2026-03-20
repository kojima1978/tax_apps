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
        name: '固定資産税の納税通知書',
        description: '所有している土地・建物の一覧が記載された書類。',
        howToGet: '都税事務所もしくは市町村役場で取得。複数の市区町村に不動産がある場合は各市区町村で取得。',
        canDelegate: true,
      },
      // 現金預金
      {
        id: 'cash_zandaka',
        name: '預金残高証明書',
        description: '預貯金の残高。',
        howToGet: 'お取引金融機関へお問い合わせください。信用金庫やJA等は出資金の金額も記載。',
        canDelegate: true,
      },
      // 有価証券
      {
        id: 'sec_torihiki_hokoku',
        name: '取引残高報告書',
        description: '証券会社が顧客の一定期間（通常3ヶ月ごと）の預かり残高を報告する法定書類です。',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      // 生命保険
      {
        id: 'ins_shousho',
        name: '保険証書のコピーか契約内容のお知らせ',
        description: '契約者、被保険者、受取人が記載された書類。',
        howToGet: 'お手元にあるものをご用意ください。',
      },
    ],
  },
];
