export type TokushimaBuildingUse =
    | 'residence'
    | 'apartment'
    | 'store_office'
    | 'factory_warehouse'
    | 'annex';

export type TokushimaBuildingStructure =
    | 'wood'
    | 'light_steel'
    | 'steel'
    | 'reinforced_concrete';

export const TOKUSHIMA_BUILDING_USES: ReadonlyArray<{
    value: TokushimaBuildingUse;
    label: string;
}> = [
    { value: 'residence', label: '居宅' },
    { value: 'apartment', label: '共同住宅' },
    { value: 'store_office', label: '店舗・事務所等' },
    { value: 'factory_warehouse', label: '工場・倉庫等' },
    { value: 'annex', label: '附属家' },
];

export const TOKUSHIMA_BUILDING_STRUCTURES: ReadonlyArray<{
    value: TokushimaBuildingStructure;
    label: string;
}> = [
    { value: 'wood', label: '木造' },
    { value: 'light_steel', label: '軽量鉄骨造' },
    { value: 'steel', label: '鉄骨造' },
    { value: 'reinforced_concrete', label: '鉄筋コンクリート造' },
];

const TOKUSHIMA_UNIT_PRICES: Record<
    TokushimaBuildingUse,
    Partial<Record<TokushimaBuildingStructure, number>>
> = {
    residence: { wood: 98_000, light_steel: 112_000, steel: 118_000, reinforced_concrete: 143_000 },
    apartment: { wood: 89_000, light_steel: 112_000, steel: 118_000, reinforced_concrete: 143_000 },
    store_office: { wood: 77_000, light_steel: 75_000, steel: 108_000 },
    factory_warehouse: { wood: 49_000, light_steel: 43_000, steel: 87_000 },
    annex: { wood: 61_000, light_steel: 54_000, steel: 108_000 },
};

export const getTokushimaUnitPrice = (
    buildingUse: TokushimaBuildingUse,
    structure: TokushimaBuildingStructure,
): number | null => TOKUSHIMA_UNIT_PRICES[buildingUse][structure] ?? null;

export const getSupportedTokushimaStructures = (
    buildingUse: TokushimaBuildingUse,
): ReadonlyArray<{ value: TokushimaBuildingStructure; label: string }> =>
    TOKUSHIMA_BUILDING_STRUCTURES.filter(
        ({ value }) => TOKUSHIMA_UNIT_PRICES[buildingUse][value] !== undefined,
    );

export const estimateTokushimaNewBuildingValue = (
    area: number,
    buildingUse: TokushimaBuildingUse,
    structure: TokushimaBuildingStructure,
): number => {
    const unitPrice = getTokushimaUnitPrice(buildingUse, structure);
    if (!unitPrice || !Number.isFinite(area) || area <= 0) return 0;
    return Math.floor(area * unitPrice);
};

export const getTokushimaBuildingUseLabel = (buildingUse: TokushimaBuildingUse): string =>
    TOKUSHIMA_BUILDING_USES.find(({ value }) => value === buildingUse)?.label ?? '';

export const getTokushimaBuildingStructureLabel = (structure: TokushimaBuildingStructure): string =>
    TOKUSHIMA_BUILDING_STRUCTURES.find(({ value }) => value === structure)?.label ?? '';
