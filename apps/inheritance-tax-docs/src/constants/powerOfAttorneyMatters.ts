/**
 * 委任状の委任事項の初期値。文面は事務所の委任状のひな形どおり（勝手に言い回しを変えると窓口で差し戻される）。
 *
 * 実際に使うのはサーバの委任事項マスタ（マスタ管理の「委任事項」タブで編集する）で、ここは
 * 空の DB へ1回だけ入れる種と、マスタを読めなかったときの代わり。サーバも読むので画面側の
 * モジュール（`@/...`）を import しないこと。
 *
 * 委任状の「１．」の下に、選んだ事項をこの並びのまま刷る。並びを変えるとこれまでの委任状と順序が食い違うので、
 * 足すときは近い事項の隣に挟む。
 */

export type Purpose = 'inheritance' | 'personal';

export type Matter = { id: string; text: string };

export const PURPOSES: Purpose[] = ['inheritance', 'personal'];

export const PURPOSE_LABELS: Record<Purpose, string> = {
  inheritance: '相続手続き用',
  personal: '本人の手続き用',
};

/** 提出先の種類（委任状の画面のボタン）。ボタンそのものは固定で、どの事項に印を付けるかだけをマスタで変える */
export const MATTER_PRESETS = [
  { id: 'koseki', label: '戸籍・住民票の取得' },
  { id: 'bank', label: '金融機関' },
  { id: 'property', label: '固定資産評価証明' },
  { id: 'legal-affairs', label: '法務局' },
] as const;

export type MatterPresetId = (typeof MATTER_PRESETS)[number]['id'];

/** 委任事項マスタ。提出先のボタンが印を付けるのは相続手続き用の事項だけ */
export type MatterMaster = {
  matters: Record<Purpose, Matter[]>;
  presets: Record<MatterPresetId, string[]>;
};

export const DEFAULT_MATTER_MASTER: MatterMaster = {
  matters: {
    // 相続手続き用（被相続人の名前を見出しに刷る）
    inheritance: [
      {
        id: 'bank-statements',
        text: '被相続人名義の全取引に係る残高証明書、利息計算書、取引明細書等の発行請求および当該書類の受領に関する一切の権限',
      },
      {
        id: 'bank-procedures',
        text: '被相続人名義の全取引に関する相続手続きに関し、関係書類へ記入および、解約、手続きに関するすべての権限',
      },
      {
        id: 'deceased-koseki',
        text: '被相続人の出生から死亡にいたるまでの戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本並びにその附票の交付申請並びに受領に関する一切の権限',
      },
      {
        id: 'heir-koseki',
        text: '相続人及び受遺者の戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本並びに相続人を確認するために必要となる戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本の交付申請並びに受領に関する一切の権限',
      },
      {
        id: 'resident-records',
        text: '被相続人及び相続人及び受遺者の住民票の写し、除票の写し及び戸籍の（除）附票の交付申請並びに受領に関する一切の権限',
      },
      {
        // 登記事項証明書は誰でも請求できる（委任状が要らない）ので、法務局は一覧図の写しだけ
        id: 'statutory-heir-info',
        text: '被相続人に係る法定相続情報一覧図の保管及び交付の申出並びに法定相続情報一覧図の写しの受領に関する一切の権限',
      },
      {
        id: 'property-certificates',
        text: '被相続人所有（共有名義のものを含む）の不動産の評価証明書・名寄帳・課税証明書・無資産証明書の交付申請並びに受領に関する一切の権限',
      },
      {
        id: 'care-facility',
        text: '被相続人の相続税申告および関連手続きに伴い、被相続人が入居・入所していた施設が保管する「施設入所時における契約書の写し」および「介護保険被保険者証の写し」の交付請求ならびに受領に関する一切の件',
      },
    ],
    // 委任者本人の手続き用（被相続人は刷らない）
    personal: [
      {
        id: 'own-property-certificates',
        text: '委任者所有（共有名義のものを含む）の不動産の評価証明書・名寄帳・課税証明書・無資産証明書の交付申請並びに受領に関する一切の権限',
      },
    ],
  },
  presets: {
    koseki: ['deceased-koseki', 'heir-koseki', 'resident-records'],
    bank: ['bank-statements', 'bank-procedures'],
    property: ['property-certificates'],
    'legal-affairs': ['statutory-heir-info'],
  },
};
