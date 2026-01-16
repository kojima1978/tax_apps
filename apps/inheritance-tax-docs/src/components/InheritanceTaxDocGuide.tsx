'use client';

import { useState, useRef } from 'react';
import XLSX from 'xlsx-js-style';
import {
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Printer,
  RefreshCw,
  AlertCircle,
  Info,
  Check,
  FileDown,
  FileSpreadsheet,
  Building,
  Home,
  Landmark,
  CreditCard,
  Shield,
  Car,
  Gift,
  Receipt,
  Users,
  FileCheck,
} from 'lucide-react';

// カテゴリ定義
interface DocumentItem {
  id: string;
  name: string;
  description: string;
  howToGet: string;
  canDelegate?: boolean; // 取得代行可能か
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  documents: DocumentItem[];
}

const categories: Category[] = [
  {
    id: 'identity',
    name: 'マイナンバー・身分証',
    icon: <Users className="w-5 h-5" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    documents: [
      {
        id: 'mynumber',
        name: '相続人全員のマイナンバー資料のコピー',
        description: 'マイナンバーカード(番号記載面)、住民票(マイナンバー記載)、通知カードのいずれか',
        howToGet: 'お手元にあるものをご用意ください。',
      },
      {
        id: 'identity_doc',
        name: '相続人全員の身元確認書類のコピー',
        description: 'マイナンバーカード(顔写真面)、運転免許証、健康保険証、パスポートなど',
        howToGet: 'お手元にあるものをご用意ください。',
      },
    ],
  },
  {
    id: 'family',
    name: '身分関係書類',
    icon: <FileCheck className="w-5 h-5" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    documents: [
      {
        id: 'legal_heir_info',
        name: '法定相続情報一覧図',
        description: '法務局にて作成されている場合に限りご提出ください。以下の戸籍等に代わるものです。',
        howToGet: '法務局で取得。相続手続きが必要な金融機関が多い場合は作成をお勧めします。',
        canDelegate: true,
      },
      {
        id: 'deceased_koseki',
        name: '被相続人の出生から死亡までの連続した戸籍謄本等',
        description: '亡くなられた方の、生まれてから亡くなるまでのすべての戸籍です。',
        howToGet: '最寄りの市区町村窓口で一括請求が可能です（配偶者・父母・子・孫による申請）。',
        canDelegate: true,
      },
      {
        id: 'deceased_fuhyo',
        name: '被相続人の戸籍の附票',
        description: '住所の移り変わりを確かめることのできる書類です。',
        howToGet: '被相続人の本籍地の役所で取得できます。',
        canDelegate: true,
      },
      {
        id: 'deceased_jyuminhyo',
        name: '被相続人の住民票の除票',
        description: '死亡時の住所を示す書類です。戸籍の附票がある場合は不要。',
        howToGet: '被相続人の住所地の役所等で取得できます。',
        canDelegate: true,
      },
      {
        id: 'heir_koseki',
        name: '相続人全員の戸籍謄本',
        description: '相続人の現在戸籍です。被相続人の戸籍に含まれる場合は不要。',
        howToGet: '最寄りの市区町村窓口、またはコンビニ等で取得できます。',
        canDelegate: true,
      },
      {
        id: 'heir_fuhyo',
        name: '相続人の戸籍の附票',
        description: '住所の移り変わりを確かめる書類。特例適用がない方は住民票でも可。',
        howToGet: '相続人の本籍地の役所で取得できます。',
        canDelegate: true,
      },
      {
        id: 'heir_jyuminhyo',
        name: '相続人全員の住民票',
        description: '相続人の住民票です。戸籍の附票がある場合は不要。',
        howToGet: '相続人の住所地の役所等で取得できます。',
        canDelegate: true,
      },
      {
        id: 'heir_inkan',
        name: '相続人全員の印鑑証明書',
        description: '相続人が1名の場合や、公正証書遺言書を使用する場合は提出不要。',
        howToGet: '相続人の住所地の役所等で取得できます。',
      },
    ],
  },
  {
    id: 'land',
    name: '土地',
    icon: <Building className="w-5 h-5" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    documents: [
      {
        id: 'land_touki',
        name: '登記簿謄本（全部事項証明書）',
        description: '土地の地番、地積、地目、所有者、所有割合などの情報が記載された書類。',
        howToGet: '不動産の所在地を管轄する法務局で取得できます。',
        canDelegate: true,
      },
      {
        id: 'land_kouzu',
        name: '公図 及び 地積測量図',
        description: '土地の位置や形状を示した図面。地積測量図がない場合は不要。',
        howToGet: '登記簿謄本と同様の方法で取得できます。',
        canDelegate: true,
      },
      {
        id: 'land_hyouka',
        name: '固定資産評価証明書',
        description: '固定資産税評価額が記載された書類。',
        howToGet: '都税事務所もしくは市町村役場の固定資産税担当窓口で取得できます。',
        canDelegate: true,
      },
      {
        id: 'land_nayose',
        name: '名寄帳(固定資産台帳)または固定資産税課税明細書',
        description: '被相続人がその市区町村内に所有している不動産の一覧表。',
        howToGet: '都税事務所もしくは市町村役場で取得。複数の市区町村に不動産がある場合は各市区町村で取得。',
        canDelegate: true,
      },
      {
        id: 'land_chintai',
        name: '賃貸借契約書',
        description: '土地の賃貸借契約の内容を示す書類。',
        howToGet: 'お手元にあるものをご用意ください。貸地・借地・定期借地権等がある場合に必要。',
      },
      {
        id: 'land_nouchi',
        name: '農業委員会の農地台帳等',
        description: '農業委員会に許可を得て農業を行っていることを示す書類。',
        howToGet: '他人の農地を借りて小作している場合に必要。管轄の農業委員会窓口で確認。',
        canDelegate: true,
      },
    ],
  },
  {
    id: 'building',
    name: '建物',
    icon: <Home className="w-5 h-5" />,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    documents: [
      {
        id: 'building_touki',
        name: '登記簿謄本（全部事項証明書）',
        description: '建物の情報が記載された書類。',
        howToGet: '土地の場合と同じです。',
        canDelegate: true,
      },
      {
        id: 'building_hyouka',
        name: '固定資産税評価証明書',
        description: '固定資産税評価額が記載された書類。',
        howToGet: '土地の場合と同じです。',
        canDelegate: true,
      },
      {
        id: 'building_nayose',
        name: '名寄帳、課税明細書',
        description: '被相続人が所有している建物の一覧。',
        howToGet: '土地の場合と同じです。',
        canDelegate: true,
      },
      {
        id: 'building_baibai',
        name: '売買契約書、建築図面、間取り図等',
        description: '建物のうち、各部屋の床面積を確認するための書類。',
        howToGet: 'お手元にあるものをご用意ください。2世帯住宅や一部賃貸の場合に必要。',
      },
      {
        id: 'building_chintai',
        name: '賃貸借契約書',
        description: '建物の賃貸借契約の内容を示す書類。',
        howToGet: 'お手元にあるものをご用意ください。貸家・アパート等がある場合、入居者全員分必要。',
      },
    ],
  },
  {
    id: 'securities',
    name: '有価証券（上場株式、投資信託等）',
    icon: <Landmark className="w-5 h-5" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    documents: [
      {
        id: 'sec_zandaka',
        name: '証券会社の残高証明書',
        description: '相続開始日時点の被相続人名義の口座にあるすべての金融商品の残高。',
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
        id: 'sec_haitou',
        name: '配当金の支払通知書、配当金領収書、議決権行使書等',
        description: '上場株の保有銘柄の各社から送られてくる書類。',
        howToGet: '未受領の配当金の金額や、端株・単元未満株式の確認のために必要。',
      },
      {
        id: 'sec_torihiki',
        name: '過去5年間の取引明細',
        description: '「顧客口座元帳」等と呼ばれる書類。',
        howToGet: 'ご契約の証券会社へお問い合わせください。',
        canDelegate: true,
      },
    ],
  },
  {
    id: 'unlisted',
    name: '非上場株式',
    icon: <FileText className="w-5 h-5" />,
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
    id: 'cash',
    name: '現金預金',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    documents: [
      {
        id: 'cash_zandaka',
        name: '預金残高証明書',
        description: '相続開始日時点の被相続人名義のすべての預貯金の残高。',
        howToGet: 'お取引金融機関へお問い合わせください。信用金庫やJA等は出資金の金額も記載。',
        canDelegate: true,
      },
      {
        id: 'cash_yucho',
        name: 'ゆうちょ銀行の調査結果のお知らせ',
        description: '相続開始日時点のゆうちょ銀行における被相続人名義のすべての預貯金等の有無。',
        howToGet: 'ゆうちょ銀行口座をお持ちの場合、残高証明書と同時に「貯金等照会書」を提出。',
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
        id: 'cash_tsucho',
        name: '過去5年分の通帳又は入出金履歴',
        description: '預金移動調査を行う場合に必要。通帳がない場合は入出金履歴。',
        howToGet: 'お手元にあるものをご用意ください。5年分なくても構いません。',
        canDelegate: true,
      },
      {
        id: 'cash_meigi',
        name: '名義預金に関する資料',
        description: '被相続人名義でなくても、実質的には相続財産にあたるもの。',
        howToGet: '配偶者や相続人等の預金通帳をご用意ください。',
      },
      {
        id: 'cash_temoto',
        name: '手許現金',
        description: '相続開始日時点での被相続人のお手元にあった現金の金額。',
        howToGet: '手許現金の金額について、メモ書きもしくは口頭でお知らせください。',
      },
    ],
  },
  {
    id: 'insurance',
    name: '生命保険',
    icon: <Shield className="w-5 h-5" />,
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
        description: '契約者が被相続人で被保険者が他の方である生命保険の解約返戻金額等。',
        howToGet: 'ご契約の保険会社や共済組合へお問い合わせください。実際に解約する必要はありません。',
      },
      {
        id: 'ins_meigi',
        name: '名義保険に関する資料',
        description: '保険料の負担は被相続人で、契約者名が他の方であるような保険。',
        howToGet: '解約返戻金相当額が相続財産になります。',
      },
    ],
  },
  {
    id: 'other_assets',
    name: 'その他財産',
    icon: <Car className="w-5 h-5" />,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    documents: [
      {
        id: 'other_car',
        name: '自動車',
        description: '車の財産価値のわかる書類。',
        howToGet: '査定書や売却書類、または車検証のコピーをご用意ください。',
      },
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
    icon: <Gift className="w-5 h-5" />,
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    documents: [
      {
        id: 'gift_3years',
        name: '過去3年分の贈与税申告書',
        description: '税務署に提出された申告書の控え。',
        howToGet: '相続発生日より過去3年以内に相続人に対して贈与した財産は相続財産に含めます。',
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
    id: 'debt',
    name: '債務・葬式費用',
    icon: <Receipt className="w-5 h-5" />,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    documents: [
      {
        id: 'debt_loan',
        name: '借入金、ローン等の残高証明書および返済計画表',
        description: '相続開始日時点の借入金の残高や返済期間、利息額等。',
        howToGet: 'お取引金融機関や、カードローン、自動車ローン等の契約先にお問い合せください。',
      },
      {
        id: 'debt_minou',
        name: '未納の租税公課、未払費用等の領収書等',
        description: '相続開始日よりも後に支払いを行った場合の金額のわかる書類。',
        howToGet: '例：所得税、住民税、固定資産税、国民年金、医療費、老人ホーム利用料等。',
      },
      {
        id: 'debt_soushiki',
        name: '葬式費用の領収書等（お通夜、告別式）',
        description: '葬式費用の金額を示す書類。',
        howToGet: '葬式代、飲食代、火葬代、お布施、心づけ等の領収書。お布施等は領収書がない場合メモで可。',
      },
    ],
  },
  {
    id: 'other',
    name: 'その他',
    icon: <FileText className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    documents: [
      {
        id: 'other_kakutei',
        name: '被相続人の過去3年分の確定申告書',
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
        howToGet: '法定相続人で財産を取得された方の中に障害者手帳をお持ちの方がいる場合。',
      },
      {
        id: 'other_kako',
        name: '過去の相続税申告書',
        description: '被相続人が過去に財産を相続された当時の相続税申告書。',
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
        description: '被相続人の要介護認定・要支援認定の等級を示す資料。',
        howToGet: '被相続人が老人ホームに入所していた場合、小規模宅地等の特例適用に必要。',
      },
      {
        id: 'other_chintai',
        name: '相続人の自宅の賃貸借契約書',
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

type Step = 'menu' | 'select' | 'result';

export default function InheritanceTaxDocGuide() {
  const [step, setStep] = useState<Step>('menu');
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isFullListMode, setIsFullListMode] = useState(false);
  const [clientName, setClientName] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [deadline, setDeadline] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const newState = { ...prev, [categoryId]: !prev[categoryId] };
      // カテゴリ選択時、そのカテゴリ内の全書類も選択/解除
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        const newDocState = { ...selectedDocuments };
        category.documents.forEach((doc) => {
          newDocState[doc.id] = newState[categoryId];
        });
        setSelectedDocuments(newDocState);
      }
      return newState;
    });
  };

  const toggleDocument = (docId: string, categoryId: string) => {
    setSelectedDocuments((prev) => {
      const newState = { ...prev, [docId]: !prev[docId] };
      // カテゴリ内の全書類がチェックされているかを確認
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        const allSelected = category.documents.every((doc) => newState[doc.id]);
        const someSelected = category.documents.some((doc) => newState[doc.id]);
        setSelectedCategories((prevCat) => ({
          ...prevCat,
          [categoryId]: allSelected || someSelected,
        }));
      }
      return newState;
    });
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getSelectedDocuments = () => {
    const result: { category: Category; documents: DocumentItem[] }[] = [];
    categories.forEach((category) => {
      const selectedDocs = category.documents.filter(
        (doc) => isFullListMode || selectedDocuments[doc.id]
      );
      if (selectedDocs.length > 0) {
        result.push({ category, documents: selectedDocs });
      }
    });
    return result;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = () => {
    const results = getSelectedDocuments();
    const exportDate = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // スタイル定義
    const styles = {
      title: {
        font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E3A8A' } }, // blue-800
        alignment: { horizontal: 'center', vertical: 'center' },
      },
      subTitle: {
        font: { sz: 11, color: { rgb: '374151' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      },
      badge: {
        font: { bold: true, sz: 10, color: { rgb: '065F46' } },
        fill: { fgColor: { rgb: 'D1FAE5' } }, // emerald-100
        alignment: { horizontal: 'left', vertical: 'center' },
      },
      clientInfo: {
        font: { sz: 11, color: { rgb: '1F2937' } },
        fill: { fgColor: { rgb: 'DBEAFE' } }, // blue-100
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '93C5FD' } },
          bottom: { style: 'thin', color: { rgb: '93C5FD' } },
          left: { style: 'thin', color: { rgb: '93C5FD' } },
          right: { style: 'thin', color: { rgb: '93C5FD' } },
        },
      },
      noticeHeader: {
        font: { bold: true, sz: 11, color: { rgb: 'B45309' } },
        fill: { fgColor: { rgb: 'FEF3C7' } }, // amber-100
        alignment: { horizontal: 'left', vertical: 'center' },
      },
      noticeText: {
        font: { sz: 10, color: { rgb: '92400E' } },
        fill: { fgColor: { rgb: 'FFFBEB' } }, // amber-50
        alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
      },
      categoryHeader: {
        font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E40AF' } }, // blue-700
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '1E3A8A' } },
          bottom: { style: 'thin', color: { rgb: '1E3A8A' } },
          left: { style: 'thin', color: { rgb: '1E3A8A' } },
          right: { style: 'thin', color: { rgb: '1E3A8A' } },
        },
      },
      tableHeader: {
        font: { bold: true, sz: 11, color: { rgb: '374151' } },
        fill: { fgColor: { rgb: 'F3F4F6' } }, // slate-100
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } },
        },
      },
      documentCell: {
        font: { sz: 11, color: { rgb: '1F2937' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
      },
      documentCellAlt: {
        font: { sz: 11, color: { rgb: '1F2937' } },
        fill: { fgColor: { rgb: 'F9FAFB' } }, // slate-50
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
      },
      checkCell: {
        font: { sz: 14, color: { rgb: '6B7280' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
      },
      delegateBadge: {
        font: { sz: 9, color: { rgb: 'B45309' } },
        fill: { fgColor: { rgb: 'FEF3C7' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'FCD34D' } },
          bottom: { style: 'thin', color: { rgb: 'FCD34D' } },
          left: { style: 'thin', color: { rgb: 'FCD34D' } },
          right: { style: 'thin', color: { rgb: 'FCD34D' } },
        },
      },
      footer: {
        font: { sz: 9, color: { rgb: '9CA3AF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      },
    };

    // ワークブック作成
    const wb = XLSX.utils.book_new();
    const wsData: object[][] = [];

    // タイトル行
    wsData.push([{ v: '相続税申告 資料準備ガイド', s: styles.title }]);

    // サブタイトル
    wsData.push([{ v: `発行日: ${exportDate}`, s: styles.subTitle }]);
    wsData.push([{ v: '税理士法人 マスエージェント', s: styles.subTitle }]);
    wsData.push([{ v: isFullListMode ? '【全リスト表示】' : '【お客様専用リスト】', s: styles.badge }]);

    // 空行
    wsData.push([]);

    // 基本情報（入力されている場合）
    if (clientName || deceasedName || deadline) {
      const infoRow: object[] = [];
      if (clientName) infoRow.push({ v: `お客様名: ${clientName} 様`, s: styles.clientInfo });
      if (deceasedName) infoRow.push({ v: `被相続人: ${deceasedName} 様`, s: styles.clientInfo });
      if (deadline) {
        const deadlineDate = new Date(deadline).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        infoRow.push({ v: `資料収集期限: ${deadlineDate}`, s: styles.clientInfo });
      }
      wsData.push(infoRow);
      wsData.push([]);
    }

    // セル結合用の配列（注意事項・留意事項行を追跡）
    const noticeRows: number[] = [];

    // 注意事項
    wsData.push([
      { v: '【ご確認ください】', s: styles.noticeHeader },
      { v: '', s: styles.noticeHeader },
      { v: '', s: styles.noticeHeader },
      { v: '', s: styles.noticeHeader },
    ]);
    noticeRows.push(wsData.length - 1);

    wsData.push([
      { v: '・資料は原本、コピー、データなどどのような形でお送りいただいても結構です。原本はスキャンやコピーを行った後、すべてお返しいたします。', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
    ]);
    noticeRows.push(wsData.length - 1);

    wsData.push([
      { v: '・「取得代行可」の書類は弊社で取得代行を行うことが可能です。詳しくは担当者にお尋ねください。', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
    ]);
    noticeRows.push(wsData.length - 1);

    wsData.push([
      { v: '・身分関係書類は原則として相続開始日から10日を経過した日以後に取得したものが必要となります。', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
    ]);
    noticeRows.push(wsData.length - 1);

    // 空行
    wsData.push([]);

    // セル結合用の配列（カテゴリヘッダー行を追跡）
    const categoryHeaderRows: number[] = [];

    // 各カテゴリのデータ
    results.forEach(({ category, documents }) => {
      // カテゴリヘッダー行番号を記録
      categoryHeaderRows.push(wsData.length);

      // カテゴリヘッダー
      wsData.push([
        { v: `■ ${category.name}（${documents.length}件）`, s: styles.categoryHeader },
        { v: '', s: styles.categoryHeader },
        { v: '', s: styles.categoryHeader },
        { v: '', s: styles.categoryHeader },
      ]);

      // テーブルヘッダー
      wsData.push([
        { v: '✓', s: styles.tableHeader },
        { v: '必要書類名', s: styles.tableHeader },
        { v: '内容説明', s: styles.tableHeader },
        { v: '代行', s: styles.tableHeader },
      ]);

      // 書類リスト
      documents.forEach((doc, idx) => {
        const cellStyle = idx % 2 === 0 ? styles.documentCell : styles.documentCellAlt;
        wsData.push([
          { v: '☐', s: styles.checkCell },
          { v: doc.name, s: cellStyle },
          { v: doc.description, s: cellStyle },
          { v: doc.canDelegate ? '可' : '', s: doc.canDelegate ? styles.delegateBadge : cellStyle },
        ]);
      });

      // カテゴリ間の空行
      wsData.push([]);
    });

    // 留意事項
    wsData.push([
      { v: '【ご留意事項】', s: styles.noticeHeader },
      { v: '', s: styles.noticeHeader },
      { v: '', s: styles.noticeHeader },
      { v: '', s: styles.noticeHeader },
    ]);
    noticeRows.push(wsData.length - 1);

    wsData.push([
      { v: '・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
    ]);
    noticeRows.push(wsData.length - 1);

    wsData.push([
      { v: '・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
    ]);
    noticeRows.push(wsData.length - 1);

    if (isFullListMode) {
      wsData.push([
        { v: '・本リストは「全項目表示」モードで出力されています。お客様の状況により不要な書類も含まれていますのでご注意ください。', s: styles.noticeText },
        { v: '', s: styles.noticeText },
        { v: '', s: styles.noticeText },
        { v: '', s: styles.noticeText },
      ]);
      noticeRows.push(wsData.length - 1);
    }

    // 空行
    wsData.push([]);

    // フッター
    wsData.push([{ v: '〒770-0002 徳島県徳島市春日２丁目３番３３号 / TEL 088-632-6228 / FAX 088-631-9870', s: styles.footer }]);

    // ワークシート作成
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 列幅設定
    ws['!cols'] = [
      { wch: 6 },  // チェック
      { wch: 45 }, // 必要書類名
      { wch: 55 }, // 内容説明
      { wch: 8 },  // 代行
    ];

    // 行の高さ設定
    ws['!rows'] = [
      { hpt: 35 }, // タイトル行
    ];

    // 印刷設定（すべての列を1ページに印刷）
    ws['!pageSetup'] = {
      fitToWidth: 1,
      fitToHeight: 0,
      orientation: 'portrait',
      paperSize: 9, // A4
    };

    // セル結合
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // タイトル
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // 発行日
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // 事務所名
      { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, // モード表示
    ];

    // カテゴリヘッダー行のセル結合（A列〜D列を結合）
    categoryHeaderRows.forEach((rowNum) => {
      merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    });

    // 注意事項・留意事項行のセル結合（A列〜D列を結合）
    noticeRows.forEach((rowNum) => {
      merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    });

    ws['!merges'] = merges;

    XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

    // ファイル名生成
    let fileName = '相続税申告_必要書類';
    if (clientName) fileName += `_${clientName}`;
    fileName += `_${exportDate.replace(/\//g, '')}.xlsx`;

    // ダウンロード
    XLSX.writeFile(wb, fileName);
  };

  const currentDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // メニュー画面
  if (step === 'menu') {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
          <header className="bg-blue-800 p-10 text-center text-white">
            <h1 className="text-3xl font-bold mb-3">相続税申告 資料準備ガイド</h1>
            <p className="text-blue-100 text-lg">
              お客様の状況に合わせて、申告に必要な書類をご案内します。
            </p>
          </header>
          <div className="p-10">
            <h2 className="text-xl font-semibold text-center mb-10 text-slate-600">
              ご希望の案内方法を選択してください
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* ボタンA */}
              <button
                onClick={() => {
                  setStep('select');
                  setIsFullListMode(false);
                  setSelectedCategories({});
                  setSelectedDocuments({});
                  // 身分関係は常に展開
                  setExpandedCategories({ identity: true, family: true });
                }}
                className="group relative flex flex-col items-center p-8 bg-white border-2 border-blue-100 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-xl transition-all duration-300 text-center w-full"
              >
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                  <CheckCircle2 className="w-10 h-10 text-blue-600 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">必要書類を選択する</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  財産の種類に応じて必要な書類を選択し、
                  <br />
                  <span className="font-bold text-blue-600">お客様専用のリスト</span>
                  を作成します。
                </p>
                <div className="mt-8 flex items-center px-6 py-2 bg-blue-50 text-blue-700 rounded-full font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  スタート <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>
              {/* ボタンB */}
              <button
                onClick={() => {
                  setStep('result');
                  setIsFullListMode(true);
                  setSelectedCategories({});
                  setSelectedDocuments({});
                }}
                className="group relative flex flex-col items-center p-8 bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-center w-full"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                  <FileText className="w-10 h-10 text-emerald-600 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">全リストを表示</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  まだ詳細が決まっていない場合などに、
                  <br />
                  <span className="font-bold text-emerald-600">すべての必要書類一覧</span>
                  を表示・印刷します。
                </p>
                <div className="mt-8 flex items-center px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  一覧を見る <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            </div>
          </div>
          <div className="bg-slate-50 p-6 text-center text-xs text-slate-400 border-t border-slate-100">
            ※本システムは一般的な必要書類を案内するものです。個別の事情により追加書類が必要な場合があります。
            <br />
            ※資料番号が●（❶,❷etc)のものは、取得代行を行うことが可能です。詳しくは担当者にお尋ねください。
          </div>
        </div>
      </div>
    );
  }

  // 選択画面
  if (step === 'select') {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              setStep('menu');
              setSelectedCategories({});
              setSelectedDocuments({});
            }}
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> TOPに戻る
          </button>
          <div className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
            ステップ 1 / 2
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-700 p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">必要書類の選択</h2>
            <p className="opacity-90">
              相続財産の種類に応じて、必要な書類カテゴリと項目を選択してください。
            </p>
          </div>

          {/* 基本情報入力 */}
          <div className="p-6 bg-blue-50 border-b border-blue-100">
            <h3 className="font-bold text-blue-800 mb-4">基本情報（任意）</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">お客様名</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：山田 太郎"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">被相続人名</label>
                <input
                  type="text"
                  value={deceasedName}
                  onChange={(e) => setDeceasedName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：山田 一郎"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">資料収集期限（目安）</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`border-2 rounded-xl overflow-hidden transition-all ${
                  selectedCategories[category.id] ? category.borderColor : 'border-slate-200'
                }`}
              >
                {/* カテゴリヘッダー */}
                <div
                  className={`flex items-center justify-between p-4 cursor-pointer ${
                    selectedCategories[category.id] ? category.bgColor : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => toggleExpanded(category.id)}
                >
                  <div className="flex items-center">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(category.id);
                      }}
                      className={`w-6 h-6 flex items-center justify-center border-2 rounded mr-3 cursor-pointer ${
                        selectedCategories[category.id]
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {selectedCategories[category.id] && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${category.bgColor}`}
                    >
                      <span className={category.color}>{category.icon}</span>
                    </div>
                    <span className={`font-bold text-lg ${category.color}`}>{category.name}</span>
                    <span className="ml-2 text-sm text-slate-500">
                      ({category.documents.length}件)
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      expandedCategories[category.id] ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* 書類リスト */}
                {expandedCategories[category.id] && (
                  <div className="border-t border-slate-200 bg-white">
                    {category.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-start p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer ${
                          selectedDocuments[doc.id] ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleDocument(doc.id, category.id)}
                      >
                        <div
                          className={`mt-1 w-5 h-5 flex items-center justify-center border rounded mr-3 flex-shrink-0 ${
                            selectedDocuments[doc.id]
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {selectedDocuments[doc.id] && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-slate-800">{doc.name}</span>
                            {doc.canDelegate && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                取得代行可
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{doc.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-slate-100 flex flex-col items-center space-y-4 bg-slate-50">
            <button
              onClick={() => setStep('result')}
              disabled={Object.values(selectedDocuments).filter(Boolean).length === 0}
              className={`flex items-center px-10 py-4 rounded-full text-white text-lg font-bold shadow-lg transform transition hover:-translate-y-1 ${
                Object.values(selectedDocuments).filter(Boolean).length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              リストを作成する <ChevronRight className="ml-2 w-5 h-5" />
            </button>
            <p className="text-sm text-slate-500">
              選択中:{' '}
              <span className="font-bold text-blue-600">
                {Object.values(selectedDocuments).filter(Boolean).length}
              </span>{' '}
              件
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 結果画面
  const results = getSelectedDocuments();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={() => {
            if (isFullListMode) {
              setStep('menu');
              setSelectedCategories({});
              setSelectedDocuments({});
              setIsFullListMode(false);
            } else {
              setStep('select');
            }
          }}
          className="flex items-center bg-white px-4 py-2 rounded-lg shadow text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isFullListMode ? 'TOPへ戻る' : '選択画面へ戻る'}
        </button>
        <div className="flex space-x-3">
          <button
            onClick={handleExcelExport}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-emerald-600 font-bold"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel出力
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-blue-600 font-bold"
          >
            <FileDown className="w-4 h-4 mr-2" /> PDF保存 / 印刷
          </button>
          <button
            onClick={() => {
              setStep('menu');
              setSelectedCategories({});
              setSelectedDocuments({});
              setIsFullListMode(false);
            }}
            className="flex items-center bg-slate-700 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> TOP
          </button>
        </div>
      </div>

      <div
        ref={printRef}
        className="bg-white p-8 md:p-12 rounded-xl shadow-xl print:p-6 print:shadow-none"
      >
        {/* ヘッダー */}
        <div className="border-b-2 border-blue-800 pb-6 mb-8 print:pb-4 print:mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 print:text-2xl">
                相続税申告 資料準備ガイド
              </h1>
              <p className="text-slate-600 print:text-sm">
                {isFullListMode && (
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded mr-2 align-middle print:border print:border-emerald-800">
                    全リスト表示
                  </span>
                )}
                以下の書類をご準備の上、ご来所・ご郵送ください。
              </p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>発行日: {currentDate}</p>
              <p>税理士法人 マスエージェント</p>
            </div>
          </div>

          {/* 基本情報表示 */}
          {(clientName || deceasedName || deadline) && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg grid md:grid-cols-3 gap-4 print:bg-white print:border print:border-blue-200">
              {clientName && (
                <div>
                  <span className="text-xs text-slate-500">お客様名</span>
                  <p className="font-bold text-slate-800">{clientName} 様</p>
                </div>
              )}
              {deceasedName && (
                <div>
                  <span className="text-xs text-slate-500">被相続人</span>
                  <p className="font-bold text-slate-800">{deceasedName} 様</p>
                </div>
              )}
              {deadline && (
                <div>
                  <span className="text-xs text-slate-500">資料収集期限（目安）</span>
                  <p className="font-bold text-slate-800">
                    {new Date(deadline).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 注意事項 */}
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg print:mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">ご確認ください</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  資料は原本、コピー、データなどどのような形でお送りいただいても結構です。原本はスキャンやコピーを行った後、すべてお返しいたします。
                </li>
                <li>
                  <span className="bg-amber-200 px-1 rounded">取得代行可</span>{' '}
                  の書類は弊社で取得代行を行うことが可能です。詳しくは担当者にお尋ねください。
                </li>
                <li>
                  身分関係書類は原則として相続開始日から10日を経過した日以後に取得したものが必要となります。
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 書類リスト */}
        <div className="space-y-8 print:space-y-6">
          {results.map(({ category, documents }) => (
            <div key={category.id} className="break-inside-avoid">
              <h3
                className={`font-bold text-lg mb-3 px-3 py-2 rounded-lg flex items-center print:mb-2 print:text-base print:py-1 ${category.bgColor} ${category.color}`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
                <span className="ml-2 text-sm font-normal">({documents.length}件)</span>
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="w-8 px-2 py-2 text-center print:py-1">✓</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-700 print:py-1">
                        必要書類名
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-slate-700 print:py-1 hidden md:table-cell print:table-cell">
                        内容説明
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc, idx) => (
                      <tr
                        key={doc.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        <td className="px-2 py-3 text-center print:py-2">
                          <span className="inline-block w-4 h-4 border-2 border-slate-300 rounded-sm print:border-slate-400" />
                        </td>
                        <td className="px-3 py-3 print:py-2">
                          <div className="flex items-center flex-wrap">
                            <span className="font-medium text-slate-800">{doc.name}</span>
                            {doc.canDelegate && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded print:border print:border-amber-700">
                                取得代行可
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 md:hidden">{doc.description}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600 hidden md:table-cell print:table-cell print:py-2 print:text-xs">
                          {doc.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-slate-300 print:mt-8 print:pt-6">
          <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 print:p-4">
            <AlertCircle className="w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                <strong>ご留意事項</strong>
              </p>
              <p>
                ・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。
              </p>
              <p>
                ・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。
              </p>
              {isFullListMode && (
                <p className="text-emerald-600 font-semibold print:text-slate-600">
                  ・本リストは「全項目表示」モードで出力されています。お客様の状況により不要な書類も含まれていますのでご注意ください。
                </p>
              )}
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-slate-400 print:mt-8">
            〒770-0002 徳島県徳島市春日２丁目３番３３号
            <br />
            TEL 088-632-6228 / FAX 088-631-9870
          </div>
        </div>
      </div>
    </div>
  );
}
