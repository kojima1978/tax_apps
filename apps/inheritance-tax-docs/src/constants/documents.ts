// 書類データ定義
// アイコンは lucide-react から取得

export interface DocumentItem {
  id: string;
  name: string;
  description: string;
  howToGet: string;
  canDelegate?: boolean; // 取得代行可能か
}

// ユーザーが追加したカスタム書類
export interface CustomDocumentItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  howToGet: string;
  isCustom: true; // カスタム書類であることを示すフラグ
  canDelegate?: boolean; // 取得代行可能か（getSelectedDocumentsで設定）
}

/** 書類の編集内容（名前・説明・取得方法の部分変更） */
export interface DocChanges {
  name?: string;
  description?: string;
  howToGet?: string;
}

export interface CategoryData {
  id: string;
  name: string;
  iconName: string; // lucide-react アイコン名
  color: string;
  bgColor: string;
  borderColor: string;
  documents: DocumentItem[];
}

export const CATEGORIES: CategoryData[] = [
  {
    id: 'identity',
    name: 'マイナンバー・印鑑証明書',
    iconName: 'Users',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    documents: [
      {
        id: 'mynumber',
        name: '相続人（財産を引継ぐ人）全員のマイナンバー資料のコピー',
        description: 'マイナンバーカード(番号記載面)、住民票(マイナンバー記載)、通知カードのいずれか',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      {
        id: 'identity_doc',
        name: '相続人（財産を引継ぐ人）全員の身元確認書類のコピー',
        description: 'マイナンバーカード(顔写真面)、運転免許証、健康保険証、パスポートなど',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      {
        id: 'heir_inkan',
        name: '相続人（財産を引継ぐ人）全員の印鑑証明書',
        description: '相続人（財産を引継ぐ人）が1名の場合や、公正証書遺言書を使用する場合は提出不要。',
        howToGet: '相続人（財産を引継ぐ人）の住所地の役所等で取得できます。',
        canDelegate: false,
      },
    ],
  },
  {
    id: 'family',
    name: '身分関係書類',
    iconName: 'FileCheck',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    documents: [
      {
        id: 'deceased_koseki',
        name: '被相続人（亡くなった方）の出生から死亡までの連続した戸籍謄本等',
        description: '亡くなられた方の、生まれてから亡くなるまでのすべての戸籍です。',
        howToGet: '最寄りの市区町村窓口で一括請求が可能です（配偶者・父母・子・孫による申請）。',
        canDelegate: true,
      },
      {
        id: 'deceased_fuhyo',
        name: '被相続人（亡くなった方）の戸籍の附票',
        description: '住所の移り変わりを確かめることのできる書類です。',
        howToGet: '被相続人（亡くなった方）の本籍地の役所で取得できます。',
        canDelegate: true,
      },
      {
        id: 'deceased_jyuminhyo',
        name: '被相続人（亡くなった方）の住民票の除票',
        description: '死亡時の住所を示す書類です。戸籍の附票がある場合は不要。',
        howToGet: '被相続人（亡くなった方）の住所地の役所等で取得できます。',
        canDelegate: true,
      },
      {
        id: 'heir_koseki',
        name: '相続人（財産を引継ぐ人）全員の戸籍謄本',
        description: '相続人（財産を引継ぐ人）の現在戸籍です。被相続人（亡くなった方）の戸籍に含まれる場合は不要。',
        howToGet: '最寄りの市区町村窓口、またはコンビニ等で取得できます。',
        canDelegate: true,
      },
      {
        id: 'heir_fuhyo',
        name: '相続人（財産を引継ぐ人）の戸籍の附票',
        description: '住所の移り変わりを確かめる書類。特例適用がない方は住民票でも可。',
        howToGet: '相続人（財産を引継ぐ人）の本籍地の役所で取得できます。',
        canDelegate: true,
      },
      {
        id: 'heir_jyuminhyo',
        name: '相続人（財産を引継ぐ人）全員の住民票',
        description: '相続人（財産を引継ぐ人）の住民票です。戸籍の附票がある場合は不要。',
        howToGet: '相続人（財産を引継ぐ人）の住所地の役所等で取得できます。',
        canDelegate: true,
      },
      {
        id: 'legal_heir_info',
        name: '法定相続情報一覧図',
        description: '法務局にて作成されている場合に限りご提出ください。以下の戸籍等に代わるものです。',
        howToGet: '法務局で取得。相続手続きが必要な金融機関が多い場合は作成をお勧めします。',
        canDelegate: true,
      },
    ],
  },
  {
    id: 'real_estate',
    name: '不動産（土地・建物）',
    iconName: 'Building',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    documents: [
      {
        id: 'real_estate_nayose',
        name: '固定資産税の納税通知書',
        description: '被相続人（亡くなった方）が所有している土地・建物の一覧が記載された書類。',
        howToGet: '都税事務所もしくは市町村役場で取得。複数の市区町村に不動産がある場合は各市区町村で取得。',
        canDelegate: true,
      },
      {
        id: 'real_estate_hyouka',
        name: '固定資産評価証明書',
        description: '土地・建物の固定資産税評価額が記載された書類。',
        howToGet: '都税事務所もしくは市町村役場の固定資産税担当窓口で取得できます。',
        canDelegate: true,
      },
      {
        id: 'real_estate_touki',
        name: '登記簿謄本（全部事項証明書）',
        description: '土地・建物の所在、面積、所有者、所有割合などの情報が記載された書類。',
        howToGet: '不動産の所在地を管轄する法務局で取得できます。',
        canDelegate: true,
      },
      {
        id: 'real_estate_kouzu',
        name: '公図 及び 地積測量図',
        description: '土地の位置や形状を示した図面。地積測量図がない場合は不要。',
        howToGet: '登記簿謄本と同様の方法で取得できます。',
        canDelegate: true,
      },
      {
        id: 'real_estate_baibai',
        name: '売買契約書、建築図面、間取り図等',
        description: '建物のうち、各部屋の床面積を確認するための書類。',
        howToGet: 'お手元にあるものをご用意ください。2世帯住宅や一部賃貸の場合に必要。',
      },
      {
        id: 'real_estate_chintai',
        name: '賃貸借契約書',
        description: '土地・建物の賃貸借契約の内容を示す書類。',
        howToGet: 'お手元にあるものをご用意ください。貸地・借地・定期借地権・貸家・アパート等がある場合に必要。',
      },
    ],
  },
  {
    id: 'cash',
    name: '現金預金',
    iconName: 'CreditCard',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    documents: [
      {
        id: 'cash_tsucho',
        name: '過去7年分の通帳又は入出金履歴',
        description: '預金移動調査を行う場合に必要。通帳がない場合は入出金履歴。',
        howToGet: 'お手元にあるものをご用意ください。7年分なくても構いません。',
        canDelegate: true,
      },
      {
        id: 'cash_zandaka',
        name: '預金残高証明書',
        description: '相続開始日時点の被相続人（亡くなった方）名義のすべての預貯金の残高。',
        howToGet: 'お取引金融機関へお問い合わせください。信用金庫やJA等は出資金の金額も記載。',
        canDelegate: true,
      },
      {
        id: 'cash_rioku',
        name: '既経過利息計算書',
        description: '相続開始日時点での定期預金の利息額を示す書類。',
        howToGet: 'お取引金融機関へお問い合わせください。残高証明書に記載される場合もあります。',
        canDelegate: true,
      },
      {
        id: 'cash_yucho',
        name: 'ゆうちょ銀行の調査結果のお知らせ',
        description: '相続開始日時点のゆうちょ銀行における被相続人（亡くなった方）名義のすべての預貯金等の有無。',
        howToGet: 'ゆうちょ銀行口座をお持ちの場合、残高証明書と同時に「貯金等照会書」を提出。',
        canDelegate: true,
      },
      {
        id: 'cash_meigi',
        name: '名義預金に関する資料',
        description: '被相続人（亡くなった方）名義でなくても、実質的には相続財産にあたるもの。',
        howToGet: '配偶者や相続人（財産を引継ぐ人）等の預金通帳をご用意ください。',
      },
      {
        id: 'cash_temoto',
        name: '手許現金',
        description: '相続開始日時点での被相続人（亡くなった方）のお手元にあった現金の金額。',
        howToGet: '手許現金の金額について、メモ書きもしくは口頭でお知らせください。',
      },
    ],
  },
  {
    id: 'securities',
    name: '有価証券（上場株式、投資信託等）',
    iconName: 'Landmark',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    documents: [
      {
        id: 'sec_torihiki_hokoku',
        name: '取引残高報告書',
        description: '証券会社が顧客の一定期間（通常3ヶ月ごと）の預かり残高を報告する法定書類です。',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      {
        id: 'sec_haitou',
        name: '配当金の支払通知書、配当金領収書、議決権行使書等',
        description: '上場株の保有銘柄の各社から送られてくる書類。',
        howToGet: '未受領の配当金の金額や、端株・単元未満株式の確認のために必要。',
      },
      {
        id: 'sec_zandaka',
        name: '証券会社の残高証明書',
        description: '相続開始日時点の被相続人（亡くなった方）名義の口座にあるすべての金融商品の残高。',
        howToGet: 'ご契約の証券会社へお問い合わせください。',
        canDelegate: true,
      },
      {
        id: 'sec_meibo',
        name: '名簿上の残高証明書',
        description: '株主名簿に記載された株数を示す書類。端株、単元未満株式の確認用。',
        howToGet: '各上場株式の株主名簿管理人（信託銀行証券代行部等）へお問い合わせください。',
        canDelegate: true,
      },
      {
        id: 'sec_torihiki',
        name: '過去7年間の取引明細',
        description: '「顧客口座元帳」等と呼ばれる書類。',
        howToGet: 'ご契約の証券会社へお問い合わせください。',
        canDelegate: true,
      },
    ],
  },
  {
    id: 'insurance',
    name: '生命保険',
    iconName: 'Shield',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    documents: [
      {
        id: 'ins_shiharai',
        name: '生命保険金支払通知書',
        description: '死亡保険金の支払額の通知書。',
        howToGet: 'ご契約の生命保険会社へお問い合わせいただき、支払請求を行ってください。',
      },
      {
        id: 'ins_shousho',
        name: '保険証書のコピーか契約内容のお知らせ',
        description: '契約者、被保険者、受取人が記載された書類。',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      {
        id: 'ins_kasai',
        name: '火災保険等の保険証書',
        description: '損害保険契約の契約期間、補償内容が記載された書類。',
        howToGet: 'お手元にあるものをご用意ください。長期契約の一括払やJAの建物更生共済がある場合。',
      },
      {
        id: 'ins_kaiyaku',
        name: '解約返戻金や年金評価額のわかる資料',
        description: '契約者が被相続人（亡くなった方）で被保険者が他の方である生命保険の解約返戻金額等。',
        howToGet: 'ご契約の保険会社や共済組合へお問い合わせください。実際に解約する必要はありません。',
      },
      {
        id: 'ins_meigi',
        name: '名義保険に関する資料',
        description: '保険料の負担は被相続人（亡くなった方）で、契約者名が他の方であるような保険。',
        howToGet: '解約返戻金相当額が相続財産になります。',
      },
    ],
  },
  {
    id: 'debt',
    name: '債務・葬式費用',
    iconName: 'Receipt',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    documents: [
      {
        id: 'debt_soushiki',
        name: '葬式費用の領収書等（お通夜、告別式）',
        description: '葬式費用の金額を示す書類。',
        howToGet: '葬式代、飲食代、火葬代、お布施、心づけ等の領収書。お布施等は領収書がない場合メモで可。',
      },
      {
        id: 'debt_minou',
        name: '未納の租税公課、未払費用等の領収書等',
        description: '相続開始日よりも後に支払いを行った場合の金額のわかる書類。',
        howToGet: '例：所得税、住民税、固定資産税、国民年金、医療費、老人ホーム利用料等。',
      },
      {
        id: 'debt_loan',
        name: '借入金、ローン等の残高証明書および返済計画表',
        description: '相続開始日時点の借入金の残高や返済期間、利息額等。',
        howToGet: 'お取引金融機関や、カードローン、自動車ローン等の契約先にお問い合せください。',
      },
    ],
  },
  {
    id: 'unlisted',
    name: '非上場株式',
    iconName: 'FileText',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    documents: [
      {
        id: 'unlisted_kessan',
        name: '過去3期分の決算書や税務申告書',
        description: '非上場株式を評価するために必要な書類。',
        howToGet: '詳細は別紙「非上場株式評価の必要書類リスト」をご覧ください。',
      },
    ],
  },
  {
    id: 'other_assets',
    name: 'その他財産',
    iconName: 'Car',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    documents: [
      {
        id: 'other_taishoku',
        name: '退職金',
        description: '勤務先からの支払通知書。',
        howToGet: '勤務先より複数の支払がある場合は、関連資料一式をお送りください。',
      },
      {
        id: 'other_golf',
        name: 'ゴルフ会員権・リゾート会員権',
        description: '会員権の証書や預託金の証書、契約書等。',
        howToGet: 'すでに退会の手続きをされた場合は、預託金の返金等があったかどうかをお知らせください。',
      },
      {
        id: 'other_kashitsuke',
        name: '貸付金、前払金等',
        description: '貸付金残高がわかる書類。',
        howToGet: '金銭消費貸借契約書を作成して貸付をしている場合に必要です。',
      },
      {
        id: 'other_kikinzoku',
        name: '貴金属(金、プラチナ)・書画、骨董など',
        description: '購入時の資料や査定書、現物の写真。',
        howToGet: '金銭的価値があると思われる著名な作品等がございましたら、査定をしてください。',
      },
      {
        id: 'other_car',
        name: '自動車',
        description: '車の財産価値のわかる書類。',
        howToGet: '査定書や売却書類、または車検証のコピーをご用意ください。',
      },
      {
        id: 'other_mishu',
        name: '未収の給与、地代、家賃、公租公課等',
        description: '相続開始日よりも後に入金があった場合の金額のわかる書類。',
        howToGet: '例：未支給の給与、貸家の未収家賃、所得税還付金、介護保険料還付金等。',
      },
      {
        id: 'other_digital',
        name: '暗号資産、電子マネー、NFT等のデジタル資産',
        description: '各種デジタル財産の金額がわかる書類。',
        howToGet: 'デジタル財産の管理会社等にご確認頂き、相続開始日時点の金額をお知らせください。',
      },
    ],
  },
  {
    id: 'gift',
    name: '過去の贈与関係',
    iconName: 'Gift',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    documents: [
      {
        id: 'gift_3years',
        name: '過去3年分の贈与税申告書',
        description: '税務署に提出された申告書の控え。',
        howToGet: '相続発生日より過去3年以内に相続人（財産を引継ぐ人）に対して贈与した財産は相続財産に含めます。',
      },
      {
        id: 'gift_keiyaku',
        name: '贈与契約書',
        description: '贈与時に作成された契約書。',
        howToGet: '贈与した財産やその金額、贈与日などの確認のために必要です。',
      },
      {
        id: 'gift_seisan',
        name: '相続時精算課税制度選択届出書、贈与税申告書、贈与契約書',
        description: '相続時精算課税制度の適用を受けている場合に必要。',
        howToGet: 'お手元にある届出書等一式の控えをご用意ください。',
      },
      {
        id: 'gift_other',
        name: 'その他の贈与税特例の書類',
        description: '贈与税の配偶者控除、住宅取得資金の贈与、教育資金の一括贈与等。',
        howToGet: '贈与を実施した年分の贈与税申告書をご用意ください。',
      },
    ],
  },
  {
    id: 'other',
    name: 'その他',
    iconName: 'FileText',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    documents: [
      {
        id: 'other_kakutei',
        name: '被相続人（亡くなった方）の過去3年分の確定申告書',
        description: '亡くなられた方の事業内容や事業用資産、年間の所得額、扶養関係などを確認。',
        howToGet: 'お手元にあるものをご用意ください。準確定申告がお済みの場合はその申告書も。',
      },
      {
        id: 'other_yuigon',
        name: '遺言書',
        description: '自筆証書遺言もしくは公正証書遺言書。',
        howToGet: 'お手元にあるものをご用意ください。自筆証書遺言は検認の証明書も必要。',
      },
      {
        id: 'other_jyunbi',
        name: '準確定申告の必要書類',
        description: '弊社に準確定申告もご依頼される場合に必要。',
        howToGet: '年金・給与等の源泉徴収票、生命保険・地震保険の控除証明書、医療費の領収書等。',
      },
      {
        id: 'other_shougai',
        name: '障害者手帳のコピー等',
        description: '障害の等級が確認できる書類。',
        howToGet: '法定相続人（財産を引継ぐ人）で財産を取得された方の中に障害者手帳をお持ちの方がいる場合。',
      },
      {
        id: 'other_kako',
        name: '過去の相続税申告書',
        description: '被相続人（亡くなった方）が過去に財産を相続された当時の相続税申告書。',
        howToGet: '相続開始日以前10年以内に相続税の支払をしている場合、一定の控除があります。',
      },
      {
        id: 'other_roujin',
        name: '老人ホームの入居契約書や退去時の清算書',
        description: '入居時の契約書や、退去時の手続きで支払又は返金がある場合の清算書。',
        howToGet: '小規模宅地等の特例の適用要件の確認のために必要です。',
      },
      {
        id: 'other_kaigo',
        name: '介護保険の被保険者証等',
        description: '被相続人（亡くなった方）の要介護認定・要支援認定の等級を示す資料。',
        howToGet: '被相続人（亡くなった方）が老人ホームに入所していた場合、小規模宅地等の特例適用に必要。',
      },
      {
        id: 'other_chintai',
        name: '相続人（財産を引継ぐ人）の自宅の賃貸借契約書',
        description: '現在お住まいのご自宅の賃貸借契約書。',
        howToGet: '「家なき子」の条件で小規模宅地等の特例を適用する場合に必要。',
      },
      {
        id: 'other_haigusha',
        name: '配偶者の財産資料',
        description: '配偶者固有の財産の内容がわかる書類。',
        howToGet: '二次相続を考慮した遺産分割シミュレーションをご依頼いただく場合に必要。',
      },
    ],
  },
];

// アイコンマッピング用の型
export type IconName =
  | 'Users'
  | 'FileCheck'
  | 'Building'
  | 'Landmark'
  | 'FileText'
  | 'CreditCard'
  | 'Shield'
  | 'Car'
  | 'Gift'
  | 'Receipt';
