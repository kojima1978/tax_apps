import { toReiwa } from '@/utils/date';

export interface DocumentGroup {
  category: string;
  documents: string[];
  note?: string;
}

export interface OptionItem {
  id: string;
  label: string;
  documents: string[];
}

export interface ContactInfo {
  office: string;
  address: string;
  tel: string;
  fax?: string;
}

export interface TaxReturnData {
  title: string;
  description: string;
  contactInfo: ContactInfo;
  baseRequired: DocumentGroup[];
  options: OptionItem[];
  deductions: OptionItem[];
}

// {{year}} プレースホルダーは実行時にユーザーが設定した年度に置換されます
export const taxReturnData: TaxReturnData = {
  title: "確定申告 必要書類案内",
  description: "申告される所得の種類や、適用する控除を選択してください。",
  contactInfo: {
    office: "税理士法人 マスエージェント",
    address: "〒770-0002 徳島県徳島市春日２丁目３−３３",
    tel: "088-632-6228",
    fax: "088-631-9870"
  },
  baseRequired: [
    {
      category: "基本情報・本人確認（必須）",
      documents: [
        "マイナンバーカード（または通知カード＋身分証明書）",
        "利用者識別番号（e-Tax用ID・パスワード）※お持ちの方",
        "前年の確定申告書の控え（お持ちの方）"
      ],
      note: "※初めて当事務所にご依頼される場合は、過去の申告書控えをご用意ください。"
    }
  ],
  options: [
    {
      id: "business_general",
      label: "事業（一般事業・フリーランスなど）",
      documents: [
        "借入金の残高証明書（令和{{year}}年12月末現在）",
        "【金融機関】預貯金の残高証明書（令和{{year}}年12月末現在）",
        "事業用の通帳コピー（令和{{year}}年分）",
        "領収書綴り・請求書綴り",
        "現金出納帳",
        "売掛帳・買掛帳",
        "固定資産台帳",
        "棚卸表（在庫表・令和{{year}}年12月末現在）",
        "売上集計表・給与台帳",
        "取引先台帳",
        "受領した支払調書",
        "未収入金リスト・未払費用リスト（令和{{year}}年12月末現在）"
      ]
    },
    {
      id: "business_medical",
      label: "医業・歯科医業",
      documents: [
        "借入金の残高証明書（令和{{year}}年12月末現在）",
        "【金融機関】預貯金の残高証明書（令和{{year}}年12月末現在）",
        "レセプト総括表（データダウンロード）",
        "社保の支払調書（令和{{year}}年分）",
        "国保の支払通知書",
        "金属使用量リスト（歯科の場合）",
        "自費収入の自家消費リスト（歯科の場合）",
        "通帳コピー・小切手のミミ",
        "現金出納帳・経費領収書綴り",
        "棚卸表（在庫表・仕掛明細）",
        "未収入金リスト・未払費用リスト"
      ]
    },
    {
      id: "real_estate",
      label: "不動産収入（家賃・駐車場など）",
      documents: [
        "家賃収入管理表（令和{{year}}年分）",
        "敷金・礼金・更新料の管理表",
        "固定資産税納税通知書",
        "損害保険料（火災保険など）の証明書",
        "借入金返済予定表（令和{{year}}年分）",
        "借入金の残高証明書（令和{{year}}年12月末現在）",
        "不動産所得用の通帳コピー（令和{{year}}年分）",
        "修繕費等の領収書・請求書",
        "未収入金リスト・未払費用リスト"
      ]
    },
    {
      id: "salary_pension",
      label: "給与・年金・退職金",
      documents: [
        "給与所得の源泉徴収票（令和{{year}}年分）",
        "公的年金等の源泉徴収票（令和{{year}}年分）",
        "個人年金の支払調書（令和{{year}}年分）",
        "退職所得の源泉徴収票"
      ]
    },
    {
      id: "transfer_stock",
      label: "土地・建物や株式等の売却（譲渡）",
      documents: [
        "【不動産譲渡】売買契約書（売却時・購入時ともに）",
        "【不動産譲渡】仲介手数料等の領収書（経費のわかるもの）",
        "【不動産譲渡】登記事項証明書（原本）",
        "【不動産譲渡】譲渡資産の取得価額がわかる資料",
        "【株式譲渡】特定口座年間取引報告書",
        "【株式譲渡】証券会社からの売買報告書（一般口座の場合）",
        "配当等の支払通知書（配当控除を受ける場合）"
      ]
    }
  ],
  deductions: [
    {
      id: "medical",
      label: "医療費控除",
      documents: [
        "医療費の領収書・明細書（人ごと・病院ごとに整理してください）",
        "医療費のお知らせ（健康保険組合等から届くハガキ）",
        "保険金などで補填された金額がわかる書類",
        "セルフメディケーション税制適用の証明書類（該当する場合）"
      ]
    },
    {
      id: "furusato",
      label: "ふるさと納税・寄附金控除",
      documents: [
        "寄附金の受領証明書（ふるさと納税）",
        "寄附金控除に関する証明書（特定事業者発行）",
        "その他寄附金の領収書・受領書"
      ]
    },
    {
      id: "insurance",
      label: "生命保険・地震保険・社会保険の控除",
      documents: [
        "生命保険料控除証明書",
        "介護医療保険料控除証明書",
        "個人年金保険料控除証明書",
        "地震（損害）保険料控除証明書",
        "国民年金保険料控除証明書",
        "国民年金基金掛金控除証明書",
        "小規模企業共済掛金払込証明書",
        "国民健康保険の支払額がわかるもの（令和{{year}}年支払分）\n２年に支払いがまたがることがあります"
      ]
    },
    {
      id: "housing_loan",
      label: "住宅ローン控除",
      documents: [
        "住宅取得資金に係る借入金の年末残高証明書（金融機関発行）",
        "家屋（土地）の登記事項証明書（初年度のみ）",
        "売買契約書・請負契約書の写し（初年度のみ）",
        "交付を受ける補助金等の額を証する書類（初年度のみ該当する場合）"
      ]
    },
    {
      id: "others_deduction",
      label: "その他の控除（雑損、扶養など）",
      documents: [
        "【雑損】盗難届の控え・り災証明書",
        "【雑損】災害関連支出の領収書",
        "【扶養】親族関係書類・送金関係書類（国外居住親族の場合）",
        "【障害者】障害者手帳のコピー等"
      ]
    }
  ]
};

// 年度プレースホルダーを置換するユーティリティ関数
export function replaceYearPlaceholder(text: string, year: number): string {
  const reiwaYear = toReiwa(year);
  const yearStr = reiwaYear === 1 ? '元' : String(reiwaYear);
  return text.replace(/\{\{year\}\}/g, yearStr);
}
