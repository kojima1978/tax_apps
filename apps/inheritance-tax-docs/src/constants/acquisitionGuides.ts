export const ACQUISITION_GUIDE_IDS = [
  'family-register',
  'heir-family-register',
  'family-register-broad-issuance',
  'family-register-address-history',
  'seal-certificate',
  'resident-record',
  'bank-balance',
  'securities-balance',
  'insurance-payment',
  'legal-heir-information',
] as const;

export type AcquisitionGuideId = (typeof ACQUISITION_GUIDE_IDS)[number];

export type AcquisitionGuideVisual = 'registry' | 'certificate' | 'bank' | 'insurance' | 'family-tree';

export type AcquisitionGuideDefinition = {
  id: AcquisitionGuideId;
  title: string;
  shortDescription: string;
  destination: string;
  requestText: string;
  requestOptions?: ReadonlyArray<{ label: string; value: string }>;
  bring: string[];
  requester: string;
  steps: string[];
  cautions: string[];
  sampleTitle: string;
  visual: AcquisitionGuideVisual;
  myNumberCard: string[];
  requiredCopies: number;
  requiredCopiesLabel?: string;
};

export const ACQUISITION_GUIDES: AcquisitionGuideDefinition[] = [
  {
    id: 'family-register',
    title: '亡くなった方の戸籍謄本等の取得',
    shortDescription: '亡くなった方が生まれてから亡くなるまでの、家族関係の記録を集めます。',
    destination: 'お近くの市区町村役場の戸籍窓口（本籍地が遠くてもまとめて請求できます）',
    requestText: '亡くなった方 {deceased} が生まれてから亡くなるまでの戸籍を、途中が抜けないようにすべて発行してください。戸籍謄本・除籍謄本・改製原戸籍謄本が必要です。',
    bring: ['顔写真付きの本人確認書類', '亡くなった方の本籍地と戸籍の先頭に書かれた方が分かるメモ'],
    requester: '亡くなった方の配偶者、父母・祖父母、子・孫など。窓口へ行く方ご本人が手続きします。',
    steps: ['戸籍窓口で「本籍地が別の市区町村にある戸籍も、まとめて取りたい」と伝えます。', '「亡くなった方が生まれてから亡くなるまで、すべて必要です」と伝えます。', 'その窓口で取れない戸籍があれば、どこへ請求するか確認します。'],
    cautions: ['このまとめて請求する方法は、手続きする方ご本人が窓口へ行く必要があります。代理の方や郵送では利用できません。', '古い戸籍などは、その窓口で取れないことがあります。'],
    sampleTitle: '戸籍全部事項証明書・除籍謄本など',
    visual: 'registry',
    myNumberCard: ['対応している市区町村では、現在の戸籍謄本をコンビニで取れます。', '住んでいる市区町村と本籍地が違う場合は、事前の利用登録が必要です。', '亡くなった方が生まれてから亡くなるまでの戸籍は、コンビニだけでは揃いません。市区町村役場の窓口をご利用ください。'],
    requiredCopies: 1,
  },
  {
    id: 'heir-family-register',
    title: '財産を引き継ぐ方（全員）の戸籍謄本',
    shortDescription: '財産を引き継ぐ方の現在の家族関係を確認する書類です。必要な方ごとに用意します。',
    destination: '戸籍が必要な方の本籍地の市区町村役場、最寄りの市区町村役場、または対応しているコンビニ',
    requestText: '相続税の申告に使うため、財産を引き継ぐ方ご本人の現在の戸籍謄本（戸籍全部事項証明書）を1枚発行してください。',
    bring: ['窓口へ行く方の顔写真付き本人確認書類', '本籍地と戸籍の先頭に書かれた方が分かるメモ', 'コンビニで取る場合はマイナンバーカードと4桁の暗証番号'],
    requester: '戸籍が必要な方ご本人、配偶者、父母・祖父母、子・孫など。代理の方が取る場合は、本籍地の市区町村役場へ確認してください。',
    steps: ['戸籍が必要な方を、当事務所の担当者へ確認します。', '役所では「現在の戸籍謄本（戸籍全部事項証明書）を1枚ください」と伝えます。', '財産を引き継ぐ方が複数いて戸籍が別々の場合は、それぞれの方の戸籍を用意します。'],
    cautions: ['亡くなった方が生まれてから亡くなるまでの戸籍とは別の書類です。', '結婚などで戸籍が別になっている方については、それぞれの現在の戸籍が必要です。'],
    sampleTitle: '戸籍全部事項証明書（財産を引き継ぐ方）',
    visual: 'registry',
    myNumberCard: ['本籍地の市区町村が対応していれば、マイナンバーカードと4桁の暗証番号を使ってコンビニで取れます。', '住んでいる市区町村と本籍地が違う場合は、事前に本籍地への利用登録が必要です。', 'コンビニの画面では「戸籍全部事項証明書」を選んでください。'],
    requiredCopies: 1,
  },
  {
    id: 'family-register-broad-issuance',
    title: '戸籍謄本等の広域交付',
    shortDescription: '本籍地が遠くても、亡くなった方の戸籍をお近くの市区町村役場でまとめて請求できる制度です。',
    destination: 'お近くの市区町村役場の戸籍窓口（広域交付を取り扱う窓口）',
    requestText: '相続の手続きに使うため、亡くなった方 {deceased} が生まれてから亡くなるまでの戸籍謄本・除籍謄本・改製原戸籍謄本を、広域交付で途中が抜けないように各1枚発行してください。',
    bring: ['窓口へ行く方の顔写真付き本人確認書類', '亡くなった方の本籍地と戸籍の先頭に書かれた方が分かるメモ', '亡くなった方との家族関係が分かる情報'],
    requester: '亡くなった方の配偶者、父母・祖父母、子・孫など。窓口へ行く方ご本人が手続きします。きょうだいや代理の方は利用できません。',
    steps: ['事前に、お近くの市区町村役場へ広域交付を利用できる窓口と受付時間を確認します。', '窓口で「相続に使うため、亡くなった方が生まれてから亡くなるまでの戸籍を広域交付で取りたい」と伝えます。', '発行まで時間がかかる場合があるため、受け取り方法を窓口で確認します。'],
    cautions: ['郵送や代理の方による請求はできません。手続きできる方ご本人が窓口へ行く必要があります。', '戸籍の附票、戸籍に載っている一部の方だけの証明書、コンピューター化されていない一部の戸籍は広域交付の対象外です。', 'きょうだいの方が手続きする場合など、広域交付を使えないときは、本籍地の市区町村役場へ請求します。'],
    sampleTitle: '広域交付で取得する戸籍謄本・除籍謄本など',
    visual: 'registry',
    myNumberCard: ['マイナンバーカードは、広域交付の窓口で顔写真付き本人確認書類として使えます。', '広域交付はコンビニでは利用できません。市区町村役場の戸籍窓口で手続きしてください。'],
    requiredCopies: 1,
    requiredCopiesLabel: '各1枚',
  },
  {
    id: 'family-register-address-history',
    title: '亡くなった方の戸籍の附票の写しの取得',
    shortDescription: '戸籍に入っていた間の住所の移り変わりが分かる書類です。',
    destination: '亡くなった方または財産を引き継ぐ方の、本籍地の市区町村役場',
    requestText: '亡くなった方 {deceased} の「戸籍の附票の写し」を、役所に残っている住所の移り変わりが分かる形で発行してください。',
    bring: ['窓口へ行く方の本人確認書類', '本籍地と戸籍の先頭に書かれた方が分かるメモ', '亡くなった方との家族関係が分かる戸籍'],
    requester: 'ご本人や財産を引き継ぐ方など。代理の方や郵送での手続きに必要なものは、本籍地の市区町村役場へ確認してください。',
    steps: ['必要な方の本籍地を確認します。', '本籍地の市区町村役場へ、窓口・郵送・インターネットのどの方法が使えるか確認します。', '相続の手続きに使うため、必要な期間の住所が分かるものを取りたいと伝えます。'],
    cautions: ['この書類は、本籍地以外の市区町村役場でまとめて取る制度の対象ではありません。', '役所で保存している期間によっては、古い住所が載らないことがあります。'],
    sampleTitle: '戸籍の附票の写し',
    visual: 'registry',
    myNumberCard: ['対応している市区町村では、コンビニで取れます。', '住んでいる市区町村と本籍地が違う場合は、事前の利用登録が必要です。', 'どこまで古い住所が載るかは、本籍地の市区町村役場へ確認してください。'],
    requiredCopies: 1,
  },
  {
    id: 'seal-certificate',
    title: '財産を引き継ぐ方（全員）の印鑑登録証明書の取得',
    shortDescription: '財産の分け方を書いた書類などに押した印鑑が、ご本人のものだと証明する書類です。',
    destination: '財産を引き継ぐ方の住所地の市区町村役場、または対応しているコンビニ',
    requestText: '相続の手続きに使うため、財産を引き継ぐ方ご本人の印鑑登録証明書を発行してください。',
    bring: ['印鑑登録証または印鑑登録カード', '窓口へ行く方の本人確認書類', 'コンビニで取る場合はマイナンバーカードと4桁の暗証番号'],
    requester: '印鑑登録をしているご本人または代理の方。代理の方が取る方法は、市区町村役場へ確認してください。',
    steps: ['印鑑登録証明書が必要な方を、当事務所の担当者へ確認します。', '住所がある市区町村役場で、取り方を確認します。', '提出先から「発行後○か月以内」と指定されている場合は、その期間内のものを取ります。'],
    cautions: ['市区町村によって、必要なカードや代理の方が取る方法が違います。', '登録した印鑑を持っていくだけでは取れない場合があります。'],
    sampleTitle: '印鑑登録証明書',
    visual: 'certificate',
    myNumberCard: ['住所がある市区町村が対応していれば、マイナンバーカードと4桁の暗証番号を使ってコンビニで取れます。', 'ご本人の証明書だけを取れます。利用できる時間と手数料は、市区町村によって違います。'],
    requiredCopies: 3,
  },
  {
    id: 'resident-record',
    title: '財産を引き継ぐ方（全員）の住民票',
    shortDescription: '財産を引き継ぐ方の現在の住所を確認する書類です。必要な方ごとに用意します。',
    destination: '財産を引き継ぐ方の住所地の市区町村役場、または対応しているコンビニ',
    requestText: '相続税の申告に使うため、財産を引き継ぐ方ご本人だけが載った「住民票の写し（世帯の一部）」を1枚発行してください。',
    requestOptions: [
      { label: '証明書の種類', value: '抄本（世帯の一部）' },
      { label: 'マイナンバー', value: '省略（記載しない）' },
      { label: '本籍地・筆頭者・続柄', value: '記載あり' },
    ],
    bring: ['窓口へ行く方の本人確認書類', '代理の方が取る場合は委任状と代理の方の本人確認書類', 'コンビニで取る場合はマイナンバーカードと4桁の暗証番号'],
    requester: '住民票が必要な方ご本人、同じ世帯の方、または委任状を持つ代理の方',
    steps: ['住民票が必要な方を、当事務所の担当者へ確認します。', '申込書で「世帯の一部」を選び、本籍地・筆頭者・続柄は「記載あり」、マイナンバーは「記載なし」を選びます。', '市区町村役場で「相続税の申告に使います」と伝えます。'],
    cautions: ['世帯全員分ではなく、必要な方ご本人だけが載った住民票を取得してください。', '財産を引き継ぐ方が複数いる場合は、必要な方ごとに住民票を用意します。'],
    sampleTitle: '住民票の写し（財産を引き継ぐ方）',
    visual: 'certificate',
    myNumberCard: ['ご本人や同じ世帯の方の現在の住民票は、対応している市区町村ならコンビニで取れます。', 'コンビニで取った住民票には、住民票コードは載りません。'],
    requiredCopies: 1,
  },
  {
    id: 'bank-balance',
    title: '亡くなった方の銀行等の残高証明書',
    shortDescription: '亡くなった日の預貯金額と、その日までについた定期預金などの利息を確認します。',
    destination: '亡くなった方が利用していた銀行・信用金庫・JA・ゆうちょ銀行など',
    requestText: '亡くなった方 {deceased} 名義のすべての口座について、亡くなった日の残高証明書を、口座ごとの金額が分かる形で発行してください。定期預金などは、可能な限り亡くなった日までについた利息の計算書の発行をお願いします。',
    requestOptions: [
      { label: '証明内容', value: 'すべてのお取引' },
      { label: '発行対象店', value: '取引がある口座すべて' },
      { label: '出力単位', value: '取引の口座番号別の残高' },
    ],
    bring: ['銀行などが指定する申込書', '亡くなったことが分かる戸籍（法定相続情報一覧図でも可）', '手続きする方が財産を引き継ぐ方だと分かる戸籍', '手続きする方の本人確認書類', '銀行印など、銀行から指定されたもの'],
    requester: '財産を引き継ぐ方、遺言の内容を実行する方、委任状を持つ代理の方など。銀行へ確認してください。',
    steps: ['銀行へ、口座の名義人が亡くなったことを連絡します。', '残高を証明する日を「亡くなった日」と伝えます。', '普通預金・定期預金・外貨預金・投資信託など、その銀行にあるすべての口座と商品を確認します。'],
    cautions: ['銀行へ連絡した後は、預金を引き出せなくなる場合があります。', '必要なもの、手数料、受け取れるまでの日数、郵送できるかどうかは銀行ごとに違います。訪問前に確認してください。'],
    sampleTitle: '預貯金残高証明書',
    visual: 'bank',
    myNumberCard: ['マイナンバーカードだけでは、残高証明書を取れません。', '銀行が指定する相続の手続きと本人確認が必要です。インターネットで手続きできるかは、銀行へ確認してください。'],
    requiredCopies: 1,
  },
  {
    id: 'securities-balance',
    title: '証券会社の残高証明書',
    shortDescription: '亡くなった日に持っていた株式・投資信託などの種類と数を確認します。',
    destination: '亡くなった方が利用していた証券会社や、株式の手続きを行う信託銀行など',
    requestText: '亡くなった方 {deceased} 名義のすべての口座と商品について、亡くなった日の残高証明書を、商品名・持っていた数・口座の種類が分かる形で発行してください。1株単位などの少ない株、口座に残っている現金、まだ受け取っていない配当金も確認してください。',
    bring: ['証券会社が指定する申込書', '亡くなったことが分かる戸籍（法定相続情報一覧図でも可）', '手続きする方が財産を引き継ぐ方だと分かる戸籍', '手続きする方の本人確認書類', '口座番号と支店名が分かる書類'],
    requester: '財産を引き継ぐ方、遺言の内容を実行する方、委任状を持つ代理の方など。証券会社へ確認してください。',
    steps: ['証券会社の相続手続き窓口へ連絡します。', '残高を証明する日を「亡くなった日」と伝えます。', '株式・投資信託・債券・口座に残る現金・1株単位などの少ない株・まだ受け取っていない配当金がないか確認します。'],
    cautions: ['相続税の計算では、残高証明書とは別に、亡くなった日前後の価格が分かる書類が必要になる場合があります。', '必要なもの、手数料、受け取れるまでの日数、郵送できるかどうかは証券会社ごとに違います。'],
    sampleTitle: '証券会社の残高証明書',
    visual: 'bank',
    myNumberCard: ['マイナンバーカードだけでは、残高証明書を取れません。', '証券会社が指定する相続の手続きと本人確認が必要です。インターネットで手続きできるかは、証券会社へ確認してください。'],
    requiredCopies: 1,
  },
  {
    id: 'insurance-payment',
    title: '保険金の支払通知書',
    shortDescription: '亡くなったことで支払われた保険金の金額、契約内容、支払日などを確認します。',
    destination: '契約していた生命保険会社・共済の保険金請求窓口',
    requestText: '亡くなった方 {deceased} の保険金を請求する方法を案内してください。支払い後は、保険金額・契約した方・保険の対象となっていた方・受け取った方が分かる支払通知書を発行してください。',
    bring: ['保険証券または契約番号が分かる書類', '死亡診断書など、亡くなったことが分かる書類', '保険金を受け取る方の本人確認書類', '保険金を受け取る口座が分かるもの', '保険会社から指定された申込書類'],
    requester: '保険の契約で、死亡保険金を受け取る方として指定されている方',
    steps: ['保険会社へ、契約番号と保険の対象となっていた方が亡くなったことを連絡します。', '保険会社から案内された書類を提出します。', '保険金が支払われた後に届く「支払通知書」を保管し、当事務所の担当者へお渡しください。'],
    cautions: ['用意するものは、契約内容や保険会社によって違います。', '入院・手術など、まだ請求していない保険金がないかも確認してください。'],
    sampleTitle: '生命保険金等支払通知書',
    visual: 'insurance',
    myNumberCard: ['マイナンバーカードだけでは、支払通知書を取れません。', '保険会社へ死亡保険金を請求し、保険金が支払われた後に発行される書類です。'],
    requiredCopies: 1,
  },
  {
    id: 'legal-heir-information',
    title: '法定相続情報一覧図の取得',
    shortDescription: '亡くなった方と財産を引き継ぐ方の家族関係を、1枚にまとめて証明する書類です。戸籍の束の代わりとして多くの手続きで使えます。',
    destination: '亡くなった方の最後の住所地や本籍地などを担当する法務局（窓口または郵送）',
    requestText: '亡くなった方 {deceased} について、「法定相続情報一覧図」を法務局で保管し、証明の付いた写しを発行する手続きをお願いします。',
    bring: ['亡くなった方が生まれてから亡くなるまでの戸籍一式', '亡くなった方の最後の住所が分かる戸籍の附票', '財産を引き継ぐ方全員の現在の戸籍', '手続きする方の本人確認書類', '作成した家族関係の一覧図と申込書'],
    requester: '財産を引き継ぐ方、委任状を持つ親族、司法書士・税理士などの専門家',
    steps: ['必要な戸籍などを集めます。', '亡くなった方と財産を引き継ぐ方の関係を表す一覧図と申込書を作ります。', '法務局へ提出し、証明の付いた写しを1枚申し込みます。'],
    cautions: ['証明の付いた一覧図の写しは無料です。', '財産の分け方や、相続しない手続きをした結果まで証明する書類ではありません。提出先から別の書類を求められる場合があります。'],
    sampleTitle: '法定相続情報一覧図',
    visual: 'family-tree',
    myNumberCard: ['マイナンバーカードだけで一覧図を取ることはできません。', '本人確認書類として、マイナンバーカードの表面のコピーを使えます。戸籍一式、作成した一覧図、申込書を法務局へ提出します。'],
    requiredCopies: 1,
  },
];

export const formatAcquisitionGuideRequest = (
  guide: AcquisitionGuideDefinition,
  deceasedName: string,
): string => guide.requestText.replace('{deceased}', deceasedName.trim() ? `${deceasedName.trim()} 様` : '________________ 様');

const DOCUMENT_GUIDE_IDS: Readonly<Record<string, AcquisitionGuideId>> = {
  heir_inkan: 'seal-certificate',
  deceased_koseki: 'family-register',
  heir_koseki: 'heir-family-register',
  deceased_fuhyo: 'family-register-address-history',
  heir_fuhyo: 'family-register-address-history',
  heir_jyuminhyo: 'resident-record',
  legal_heir_info: 'legal-heir-information',
  cash_zandaka: 'bank-balance',
  cash_rioku: 'bank-balance',
  cash_yucho: 'bank-balance',
  sec_zandaka: 'securities-balance',
  ins_shiharai: 'insurance-payment',
};

/** 提出物ではない取得案内を、対応する必要書類の行から開くための対応表。 */
export const acquisitionGuideIdForDocument = (documentId: string): AcquisitionGuideId | undefined =>
  DOCUMENT_GUIDE_IDS[documentId];
