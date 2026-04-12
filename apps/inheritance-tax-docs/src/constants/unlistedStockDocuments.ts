/**
 * 取引相場のない株式の評価に必要な書類データ
 * CategoryData 型を使用し、既存の資料準備ガイドと同じ構成で再利用可能
 */

import type { CategoryData } from './documents';

export const UNLISTED_STOCK_CATEGORIES: CategoryData[] = [
  {
    id: 'corporate_basic',
    name: '法人の基本情報',
    iconName: 'Building2',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    documents: [
      {
        id: 'us_teikan',
        name: '定款',
        description: '会社の目的、商号、発行済株式数、株式の譲渡制限の有無、配当の優先・劣後等を確認します。',
        howToGet: '会社にてご用意ください。直近の変更が反映された最新のもの。',
      },
      {
        id: 'us_touki',
        name: '法人の登記簿謄本（履歴事項全部証明書）',
        description: '会社の設立日、役員、資本金、発行済株式数等を確認します。',
        howToGet: '法務局で取得できます。',
      },
      {
        id: 'us_kabunushi',
        name: '株主名簿',
        description: '株主の氏名・住所、保有株式数、取得日等を確認します。同族判定に必要です。',
        howToGet: '会社にてご用意ください。',
      },
      {
        id: 'us_ido',
        name: '過去の株式異動状況がわかる資料',
        description: '株式の売買、贈与、相続等による異動の履歴。過去の評価額の確認に使用します。',
        howToGet: '会社にてご用意ください。株式の譲渡契約書、贈与契約書等。',
      },
      {
        id: 'us_group',
        name: 'グループ会社の一覧表（関係会社がある場合）',
        description: '親会社・子会社・関連会社の関係図。株式の保有関係や取引関係を把握します。',
        howToGet: '会社にてご用意ください。',
      },
      {
        id: 'us_pamphlet',
        name: '会社のパンフレット等、業務内容が分かるもの',
        description: '会社の事業内容・業種を把握するための資料。類似業種比準方式の業種判定に使用します。',
        howToGet: '会社にてご用意ください。',
      },
    ],
  },
  {
    id: 'tax_return',
    name: '決算書・申告書関係',
    iconName: 'FileText',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    documents: [
      {
        id: 'us_houjinzei',
        name: '法人税申告書（別表一〜別表十六）【直前期末以前3期分】',
        description: '別表一（確定申告書）、別表二（同族会社の判定）、別表四（所得の金額の計算）、別表五（利益積立金額等）等。株式評価の基礎データとなります。',
        howToGet: '会社の顧問税理士または会社にてご用意ください。',
      },
      {
        id: 'us_kessan',
        name: '決算書（貸借対照表・損益計算書・株主資本等変動計算書・注記表）【直前期末以前3期分】',
        description: '純資産価額方式・類似業種比準方式の計算の基礎となります。',
        howToGet: '会社の顧問税理士または会社にてご用意ください。',
      },
      {
        id: 'us_kamoku',
        name: '勘定科目内訳明細書【直前期末以前3期分】',
        description: '各勘定科目の内訳。土地・建物・有価証券・保険積立金・借入金等の詳細を確認します。',
        howToGet: '会社の顧問税理士または会社にてご用意ください。',
      },
      {
        id: 'us_gaikyo',
        name: '法人事業概況説明書【直前期末以前3期分】',
        description: '事業内容、従業員数、主な取引先等を確認します。業種の判定に使用します。',
        howToGet: '会社の顧問税理士または会社にてご用意ください。',
      },
      {
        id: 'us_shouhizei',
        name: '消費税申告書【直前期末以前3期分】',
        description: '課税売上高の確認等に使用します。',
        howToGet: '会社の顧問税理士または会社にてご用意ください。',
      },
      {
        id: 'us_chihou',
        name: '地方税申告書（法人事業税・法人住民税）【直前期末以前3期分】',
        description: '法人事業税の損金算入額の確認等に使用します。',
        howToGet: '会社の顧問税理士または会社にてご用意ください。',
      },
    ],
  },
  {
    id: 'corporate_assets',
    name: '法人所有の固定資産関係',
    iconName: 'Landmark',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    documents: [
      {
        id: 'us_fudosan_hyouka',
        name: '法人所有不動産の固定資産評価証明書',
        description: '法人が所有する土地・建物の固定資産税評価額。純資産価額方式の計算に使用します。',
        howToGet: '不動産所在地の市区町村役場で取得できます。',
      },
      {
        id: 'us_kojin_fudosan_hyouka',
        name: '個人所有不動産の固定資産評価証明書',
        description: '被相続人個人が所有する土地・建物の固定資産税評価額。法人との取引（賃貸等）がある場合に必要です。',
        howToGet: '不動産所在地の市区町村役場で取得できます。',
      },
      {
        id: 'us_fudosan_touki',
        name: '法人所有不動産の登記簿謄本（全部事項証明書）',
        description: '所在・面積・持分割合等を確認します。',
        howToGet: '法務局で取得できます。',
      },
      {
        id: 'us_fudosan_kouzu',
        name: '法人所有不動産の公図・地積測量図',
        description: '土地の位置・形状を確認します。路線価評価に必要。',
        howToGet: '法務局で取得できます。',
      },
      {
        id: 'us_fudosan_chintai',
        name: '法人所有不動産の賃貸借契約書',
        description: '賃貸物件がある場合、貸家・貸地としての評価減の計算に使用します。',
        howToGet: '会社にてご用意ください。',
      },
      {
        id: 'us_fudosan_baibai',
        name: '法人契約の不動産売買契約書（死亡日以前3年間において購入した不動産に限る）',
        description: '課税時期前3年以内に取得した不動産は通常の取引価額で評価するため、取得価額の確認に使用します。',
        howToGet: '会社にてご用意ください。',
      },
    ],
  },
  {
    id: 'corporate_financial_assets',
    name: '法人所有の金融資産関係',
    iconName: 'Landmark',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    documents: [
      {
        id: 'us_yuuka',
        name: '法人が保有する有価証券の明細',
        description: '上場株式は銘柄・株数、非上場株式は発行会社名・株数・取得価額等。',
        howToGet: '会社にてご用意ください。\n証券会社の評価時点の残高証明書',
      },
      {
        id: 'us_hoken',
        name: '法人契約の生命保険の解約返戻金証明書',
        description: '保険積立金の時価評価に使用します。契約者が法人である保険すべてが対象。',
        howToGet: '各保険会社へ「評価時点の解約返戻金額」を照会してください。',
      },
      {
        id: 'us_kyosai',
        name: '各共済制度の死亡日の解約返戻金証明書',
        description: '倒産防止共済掛金、中小企業退職金共済等に加入している場合に必要です。',
        howToGet: '各共済の窓口へ「死亡日時点の解約返戻金額」を照会してください。',
      },
      {
        id: 'us_golf',
        name: '法人契約のゴルフ・レジャー会員権証書',
        description: '法人名義で保有するゴルフ会員権・レジャー会員権の時価評価に使用します。',
        howToGet: '会社にてご用意ください。',
      },
    ],
  },
  {
    id: 'special_items',
    name: 'その他・特殊事項',
    iconName: 'FolderOpen',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    documents: [
      {
        id: 'us_taishoku',
        name: '役員退職金の支給予定に関する資料',
        description: '被相続人（亡くなった方）に対する退職金の支給がある場合、純資産価額の計算に影響します。',
        howToGet: '会社にてご用意ください。取締役会議事録、退職金規程等。',
      },
      {
        id: 'us_keiyaku',
        name: '重要な契約書（特許権、借地権、営業権等）',
        description: '知的財産権や借地権等の無形資産がある場合に評価が必要です。',
        howToGet: '会社にてご用意ください。',
      },
      {
        id: 'us_sosho',
        name: '係争中の訴訟・紛争に関する資料',
        description: '訴訟による将来の負債や損失の見込みがある場合、評価に影響する場合があります。',
        howToGet: '会社にてご用意ください。弁護士の見解書等。',
      },
      {
        id: 'us_kanren_kessan',
        name: '関係会社の決算書・申告書（関係会社がある場合）',
        description: '関係会社の株式を保有している場合、その株式の評価も必要になります。',
        howToGet: '各関係会社にてご用意ください。直前期末以前3期分。',
      },
      {
        id: 'us_kako_hyouka',
        name: '過去の株式評価書（評価実績がある場合）',
        description: '過去に相続・贈与等で株式評価を行った実績がある場合、参考資料として使用します。',
        howToGet: '会社または顧問税理士にてご用意ください。',
      },
      {
        id: 'us_kabuka_report',
        name: '株式評価レポート・発行会社作成の株価資料',
        description: '過去に株価評価をしたことがある場合の評価レポートや、発行会社が作成した株価の資料。',
        howToGet: '会社または顧問税理士にてご用意ください。',
      },
      {
        id: 'us_yakuin_kashitsuke',
        name: '役員に対する貸付金・役員借入金等の債権債務明細・契約書',
        description: '役員との間の貸付金・借入金等の債権債務の内容を確認します。純資産価額の計算に影響します。',
        howToGet: '会社にてご用意ください。',
      },
      {
        id: 'us_gyoushu_uriage',
        name: '直前期の業種別売上高が分かるもの',
        description: '類似業種比準方式における業種の判定に使用します。',
        howToGet: '会社の顧問税理士または会社にてご用意ください。',
      },
    ],
  },
];
