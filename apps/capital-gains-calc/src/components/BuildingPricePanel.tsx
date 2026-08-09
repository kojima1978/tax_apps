import { useId } from "react";
import CurrencyField from "./CurrencyField";
import DateField from "./DateField";
import FormField from "./FormField";
import InputWithUnit from "./InputWithUnit";
import NoteList from "./NoteList";
import ToggleGroup, { type ToggleOption } from "./ToggleGroup";
import type { RealEstateFormState } from "@/hooks/useRealEstateForm";
import {
    BUILDING_PRICE_METHODS,
    CONSTRUCTION_STRUCTURES,
    CONSUMPTION_TAX_OPTIONS,
    formatAreaInput,
    guessConsumptionTaxRate,
    type BuildingPriceMethod,
    type BuildingPriceResult,
    type ConstructionStructureKey,
} from "@/lib/building-price";

const METHOD_OPTIONS: ToggleOption<BuildingPriceMethod>[] = BUILDING_PRICE_METHODS.map(({ value, label }) => ({
    value,
    label,
}));

type SetField = <K extends keyof RealEstateFormState>(key: K, value: RealEstateFormState[K]) => void;

type BuildingPricePanelProps = {
    form: RealEstateFormState;
    setField: SetField;
    buildingPrice: BuildingPriceResult;
};

/** 消費税率の選択欄。消費税から逆算・固定資産税評価額で按分の両方で使う */
const TaxRateSelect = ({ form, setField }: { form: RealEstateFormState; setField: SetField }) => {
    const id = useId();
    return (
        <FormField
            label="適用消費税率"
            htmlFor={id}
            labelAction={
                <button
                    type="button"
                    className="field-action"
                    onClick={() => setField("consumptionTaxRate", guessConsumptionTaxRate(form.acquisitionDate))}
                    disabled={!form.acquisitionDate}
                    title={
                        form.acquisitionDate
                            ? "取得日の時点で施行されていた税率を入れます（経過措置は考慮しません）"
                            : "取得日を入力すると選べます"
                    }
                >
                    取得日から
                </button>
            }
        >
            <select
                id={id}
                className="select-input"
                value={form.consumptionTaxRate}
                onChange={(e) => setField("consumptionTaxRate", e.target.value)}
            >
                {CONSUMPTION_TAX_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <small>購入時の契約日を基準に選びます（税率引上げ時の経過措置で旧税率になる契約もあります）</small>
        </FormField>
    );
};

/**
 * 建物の取得価額の求め方を選ぶパネル。
 *
 * 土地建物を一括で購入していて建物の価額が分からない場合に、合計額を土地と建物へ分ける。
 * 直接入力を選んでいる間は入力欄を出さず、従来どおり土地・建物をそのまま入力する。
 */
const BuildingPricePanel = ({ form, setField, buildingPrice }: BuildingPricePanelProps) => {
    const structureId = useId();
    const areaId = useId();
    const method = form.buildingPriceMethod;
    const methodHint = BUILDING_PRICE_METHODS.find((m) => m.value === method)?.hint ?? "";

    return (
        <>
            <FormField label="建物の取得価額の求め方">
                <ToggleGroup
                    options={METHOD_OPTIONS}
                    value={method}
                    onChange={(v) => setField("buildingPriceMethod", v)}
                    ariaLabel="建物の取得価額の求め方"
                />
                <small>{methodHint}</small>
            </FormField>

            {method !== "direct" && (
                <div className="derivation-panel">
                    <div className="form-row">
                        <CurrencyField
                            label="土地建物の合計取得価額"
                            value={form.totalCost}
                            onChange={(v) => setField("totalCost", v)}
                            hint="購入代金＋仲介手数料等（消費税込み）"
                        />
                        {method === "tax" && (
                            <CurrencyField
                                label="建物に係る消費税額"
                                value={form.buildingConsumptionTax}
                                onChange={(v) => setField("buildingConsumptionTax", v)}
                                hint="契約書に記載された消費税額（土地は非課税なので全額が建物の分）"
                            />
                        )}
                        {method === "assessed" && <TaxRateSelect form={form} setField={setField} />}
                        {method === "table" && (
                            <DateField
                                label="建物の新築年月日"
                                value={form.builtDate}
                                onChange={(v) => setField("builtDate", v)}
                                hint="登記事項証明書の表題部（新築年月日）で確認します"
                            />
                        )}
                    </div>

                    {method === "tax" && (
                        <div className="form-row">
                            <TaxRateSelect form={form} setField={setField} />
                        </div>
                    )}

                    {method === "assessed" && (
                        <div className="form-row">
                            <CurrencyField
                                label="土地の固定資産税評価額"
                                value={form.landAssessedValue}
                                onChange={(v) => setField("landAssessedValue", v)}
                                hint="購入した年度の固定資産税課税明細書・評価証明書の価格"
                            />
                            <CurrencyField
                                label="建物の固定資産税評価額"
                                value={form.buildingAssessedValue}
                                onChange={(v) => setField("buildingAssessedValue", v)}
                                hint="同上。マンションは専有部分の家屋の価格"
                            />
                        </div>
                    )}

                    {method === "table" && (
                        <div className="form-row">
                            <FormField label="建築価額表の構造区分" htmlFor={structureId}>
                                <select
                                    id={structureId}
                                    className="select-input"
                                    value={form.constructionStructure}
                                    onChange={(e) =>
                                        setField("constructionStructure", e.target.value as ConstructionStructureKey)
                                    }
                                >
                                    {CONSTRUCTION_STRUCTURES.map((s) => (
                                        <option key={s.key} value={s.key}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                                <small>価額表は4区分です。下の「建物の構造」に対応する区分を選んでください</small>
                            </FormField>
                            <FormField label="延べ床面積" htmlFor={areaId}>
                                <InputWithUnit
                                    unit="㎡"
                                    id={areaId}
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    placeholder="0"
                                    value={form.floorArea}
                                    onChange={(e) => setField("floorArea", formatAreaInput(e.target.value))}
                                />
                                <small>マンションは専有部分の床面積で計算して差し支えありません</small>
                            </FormField>
                        </div>
                    )}

                    {buildingPrice.steps.length > 0 && (
                        <div className="calc-steps">
                            <h4>算出過程</h4>
                            <dl>
                                {buildingPrice.steps.map((step) => (
                                    <div key={step.label} className="calc-step">
                                        <dt>{step.label}</dt>
                                        <dd>{step.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    )}

                    <NoteList title="入力の確認" notes={buildingPrice.warnings} />
                </div>
            )}
        </>
    );
};

export default BuildingPricePanel;
