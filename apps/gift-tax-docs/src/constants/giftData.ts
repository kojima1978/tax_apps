import type { OptionId } from './index';

// 印刷用の書類アイテム
export interface PrintDocument {
  text: string;
  subItems: string[];
}

export interface DocumentGroup {
  category: string;
  documents: PrintDocument[];
  note?: string;
}

export interface Option {
  id: OptionId;
  label: string;
  documents: string[];
  note?: string;
}

export const giftData = {
  title: '贈与税申告 必要書類案内',
  description: '贈与を受けた財産の種類と特例の適用有無を選択してください。',
  baseRequired: [
    {
      category: '本人確認書類（共通・必須）',
      documents: [
        '受贈者（もらった人）の本人確認書類（マイナンバーカード、住民票等）',
        '受贈者（もらった人）の利用者識別番号（国税庁の16桁の番号）',
        '贈与者（あげた人）の本人確認書類（マイナンバーカード、住民票等）',
      ],
    },
  ],
  options: [
    {
      id: 'gift_land',
      label: '土地・建物をもらいましたか？',
      documents: [
        '固定資産税納税通知書（固定資産税課税明細書）',
        '賃貸借契約書（貸している場合）',
        '登記簿謄本',
      ],
    },
    {
      id: 'gift_cash',
      label: '現金・預貯金をもらいましたか？',
      documents: [
        '贈与契約書',
        '預貯金の通帳・振込明細書（入金が確認できるもの）',
      ],
    },
    {
      id: 'gift_stock_listed',
      label: '上場株式をもらいましたか？',
      documents: [
        '贈与契約書',
        '証券会社発行の残高証明書等（評価額のわかるもの）',
      ],
    },
    {
      id: 'gift_stock_unlisted',
      label: '取引相場のない株式（非上場株式）をもらいましたか？',
      documents: [
        '贈与契約書',
        '当該法人の決算書等（株価算定用）☆別途ご案内させていただきます。',
      ],
    },
  ] as Option[],
  specials: [
    {
      id: 'sp_tax_rate',
      label: '「贈与税の税率の特例」を適用しますか？',
      documents: [
        '受贈者（もらった人）の戸籍の謄本又は抄本等で次の内容を証する書類',
        '　イ　受贈者（もらった人）の氏名、生年月日',
        '　ロ　受贈者（もらった人）の直系尊属（父母・祖父母等）に該当すること',
      ],
      note: '基礎控除及び配偶者控除の規定による控除後の課税価格が300万円以下である場合には、添付は不要です。',
    },
    {
      id: 'sp_seisan',
      label: '「相続時精算課税制度」を選択しますか？',
      documents: [
        '受贈者（もらった人）の戸籍謄本または抄本（氏名、生年月日、子・孫であることの証明）',
        '受贈者（もらった人）の戸籍の附票（住所の証明）',
        '贈与者（あげた人）の住民票の除票（贈与者が亡くなっている場合）',
      ],
      note: '過去に届出書を提出済みの場合は添付不要です。',
    },
    {
      id: 'sp_spouse',
      label: '「配偶者控除の特例」を適用しますか？（婚姻期間20年以上）',
      documents: [
        '受贈者（もらった人）の戸籍謄本または抄本（婚姻期間20年以上等の証明）',
        '受贈者（もらった人）の戸籍の附票の写し',
        '必要書類の詳細は、「贈与税の配偶者控除の特例」チェックシートをご確認ください。',
      ],
    },
    {
      id: 'sp_housing',
      label: '「住宅取得等資金の非課税」を適用しますか？',
      documents: [
        '受贈者（もらった人）の戸籍謄本（氏名、親族関係の証明）',
        '源泉徴収票または確定申告書控え（所得要件の確認）',
        '工事請負契約書または売買契約書の写し',
        '必要書類の詳細は、「住宅取得等資金の非課税」のチェックシートをご確認ください。',
      ],
    },
  ] as Option[],
};
