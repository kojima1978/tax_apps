import type { ResultGroup, ResultItem } from '@/components/shared/TaxResultBox';
import type { TaxResults } from './real-estate-tax';
import type { AcquisitionResults } from './acquisition-breakdown';
import { parseShare } from './utils';

/**
 * 税額ボックスの組み立て。
 * 不動産取得税ページとまとめページで同じ見せ方をするための共通部分。
 */

/** 持ち分が 1/1 でない分だけ「（土地持ち分 1/2 適用済み）」と添える */
export const shareNoteText = (
    landNumerator: string,
    landDenominator: string,
    buildingNumerator: string,
    buildingDenominator: string,
): string | undefined => {
    const land = parseShare(landNumerator, landDenominator);
    const building = parseShare(buildingNumerator, buildingDenominator);
    return [
        land.n !== land.d ? `土地持ち分 ${land.n}/${land.d}` : '',
        building.n !== building.d ? `建物持ち分 ${building.n}/${building.d}` : '',
    ].filter(Boolean).join('　') || undefined;
};

type AcquisitionGroupOptions = {
    includeLand: boolean;
    includeBuilding: boolean;
    hasResLand: boolean;
    hasOtherLand: boolean;
};

/** 不動産取得税は土地を「宅地」「その他」に割って見せる */
export const acquisitionResultGroups = (
    results: AcquisitionResults,
    { includeLand, includeBuilding, hasResLand, hasOtherLand }: AcquisitionGroupOptions,
): ResultGroup[] => [
    {
        title: '土地',
        show: includeLand,
        items: [
            { label: '宅地', value: results.resLandAcq, show: hasResLand },
            { label: 'その他（宅地以外）', value: results.otherLandAcq, show: hasOtherLand },
        ],
    },
    {
        title: '建物',
        show: includeBuilding,
        // 土地と違って内訳が無いので、ラベルは置かず金額だけを出す
        items: [
            { label: '', value: results.bldgAcq, show: true },
        ],
    },
];

/** 登録免許税は土地・建物の2行だけ */
export const registrationResultItems = (
    results: TaxResults,
    includeLand: boolean,
    includeBuilding: boolean,
): ResultItem[] => [
    { label: '土地', value: results.landReg, show: includeLand },
    { label: '建物', value: results.bldgReg, show: includeBuilding },
];

/**
 * まとめページ用。2税を横に並べて見比べるので、不動産取得税と同じ
 * 「土地」「建物」のグループ構成にして土地・建物の行の高さを揃える。
 * 内訳が無いので明細のラベルは空（枠の見出しとグループ名で税目・対象が分かる）。
 */
export const registrationResultGroups = (
    results: TaxResults,
    includeLand: boolean,
    includeBuilding: boolean,
): ResultGroup[] => [
    {
        title: '土地',
        show: includeLand,
        items: [{ label: '', value: results.landReg, show: true }],
    },
    {
        title: '建物',
        show: includeBuilding,
        items: [{ label: '', value: results.bldgReg, show: true }],
    },
];
