/** 令和8年度（2026年3月分〜）協会けんぽ 都道府県別健康保険料率 */
export interface PrefectureRate {
  code: string;
  name: string;
  /** 健康保険料率（%）— 労使折半前の全体率 */
  healthRate: number;
}

/** 介護保険料率（%）— 40歳以上65歳未満が対象 */
export const NURSING_CARE_RATE = 1.62;

/** 厚生年金保険料率（%）— 労使折半前 */
export const PENSION_RATE = 18.3;

/** 雇用保険料率（%）— 被保険者負担分（一般の事業）令和7年度 */
export const EMPLOYMENT_INSURANCE_RATE = 0.55;

export const PREFECTURES: PrefectureRate[] = [
  { code: '01', name: '北海道', healthRate: 10.28 },
  { code: '02', name: '青森県', healthRate: 9.85 },
  { code: '03', name: '岩手県', healthRate: 9.51 },
  { code: '04', name: '宮城県', healthRate: 10.10 },
  { code: '05', name: '秋田県', healthRate: 10.01 },
  { code: '06', name: '山形県', healthRate: 9.75 },
  { code: '07', name: '福島県', healthRate: 9.50 },
  { code: '08', name: '茨城県', healthRate: 9.52 },
  { code: '09', name: '栃木県', healthRate: 9.82 },
  { code: '10', name: '群馬県', healthRate: 9.68 },
  { code: '11', name: '埼玉県', healthRate: 9.67 },
  { code: '12', name: '千葉県', healthRate: 9.73 },
  { code: '13', name: '東京都', healthRate: 9.85 },
  { code: '14', name: '神奈川県', healthRate: 9.92 },
  { code: '15', name: '新潟県', healthRate: 9.21 },
  { code: '16', name: '富山県', healthRate: 9.59 },
  { code: '17', name: '石川県', healthRate: 9.70 },
  { code: '18', name: '福井県', healthRate: 9.71 },
  { code: '19', name: '山梨県', healthRate: 9.55 },
  { code: '20', name: '長野県', healthRate: 9.63 },
  { code: '21', name: '岐阜県', healthRate: 9.80 },
  { code: '22', name: '静岡県', healthRate: 9.61 },
  { code: '23', name: '愛知県', healthRate: 9.93 },
  { code: '24', name: '三重県', healthRate: 9.77 },
  { code: '25', name: '滋賀県', healthRate: 9.88 },
  { code: '26', name: '京都府', healthRate: 9.89 },
  { code: '27', name: '大阪府', healthRate: 10.13 },
  { code: '28', name: '兵庫県', healthRate: 10.12 },
  { code: '29', name: '奈良県', healthRate: 9.91 },
  { code: '30', name: '和歌山県', healthRate: 10.06 },
  { code: '31', name: '鳥取県', healthRate: 9.86 },
  { code: '32', name: '島根県', healthRate: 9.94 },
  { code: '33', name: '岡山県', healthRate: 10.05 },
  { code: '34', name: '広島県', healthRate: 9.78 },
  { code: '35', name: '山口県', healthRate: 10.15 },
  { code: '36', name: '徳島県', healthRate: 10.24 },
  { code: '37', name: '香川県', healthRate: 10.02 },
  { code: '38', name: '愛媛県', healthRate: 9.98 },
  { code: '39', name: '高知県', healthRate: 10.05 },
  { code: '40', name: '福岡県', healthRate: 10.11 },
  { code: '41', name: '佐賀県', healthRate: 10.55 },
  { code: '42', name: '長崎県', healthRate: 10.06 },
  { code: '43', name: '熊本県', healthRate: 10.08 },
  { code: '44', name: '大分県', healthRate: 10.08 },
  { code: '45', name: '宮崎県', healthRate: 9.77 },
  { code: '46', name: '鹿児島県', healthRate: 10.13 },
  { code: '47', name: '沖縄県', healthRate: 9.44 },
];
