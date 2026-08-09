/**
 * 不動産関連税の「サンプルで試す」で入れる値。
 * 不動産取得税・登録免許税の両ページで同じ物件を想定しているので、
 * サンプルを入れたまま「取り込み」を試しても金額が食い違わない。
 */
export const REAL_ESTATE_SAMPLE = {
    /** 土地（宅地）の固定資産税評価額 */
    landValuation: '10,000,000',
    /** 土地面積（㎡）。狭いと住宅用地の軽減が税額を食い切って土地が0円になり、
        サンプルとして何も起きていないように見えるので広めに取る */
    landArea: '300',
    /** 建物の固定資産税評価額 */
    buildingValuation: '15,000,000',
    /** 建物床面積（㎡）。軽減の面積要件 50〜240㎡ に収まる値 */
    buildingArea: '100',
    /** 建築年月日。1997年4月1日以降なので控除1,200万円が自動判定される */
    buildingYear: '2015',
    buildingMonth: '4',
    buildingDay: '1',
} as const;

/** 建築年月日を `YYYY-MM-DD` 形式で組み立てる（控除額の事前計算用） */
export const sampleBuildingDate = () => {
    const { buildingYear, buildingMonth, buildingDay } = REAL_ESTATE_SAMPLE;
    return `${buildingYear}-${buildingMonth.padStart(2, '0')}-${buildingDay.padStart(2, '0')}`;
};
