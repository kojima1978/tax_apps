import { useId, useMemo } from "react";
import CheckboxField from "./CheckboxField";
import CurrencyField, { type FieldAction } from "./CurrencyField";
import DateField from "./DateField";
import FormField from "./FormField";
import ToggleGroup, { type ToggleOption } from "./ToggleGroup";
import type { BuildingUsage, CostMode, RealEstateResult } from "@/lib/capital-gains";
import { TRANSFER_EXPENSE_ITEMS, type RealEstateFormState } from "@/hooks/useRealEstateForm";
import { calcBrokerFee } from "@/lib/broker-fee";
import { BUILDING_STRUCTURES, findStructure } from "@/lib/tax-rates";
import { formatInputValue, formatYen, parseFormattedNumber } from "@/lib/utils";

const COST_MODE_OPTIONS: ToggleOption<CostMode>[] = [
    { value: "actual", label: "実額取得費" },
    { value: "estimated", label: "概算取得費（5%）" },
];

const USAGE_OPTIONS: ToggleOption<BuildingUsage>[] = [
    { value: "non-business", label: "非事業用（自宅等）" },
    { value: "business", label: "事業用（賃貸等）" },
];

type RealEstateFormProps = {
    form: RealEstateFormState;
    setField: <K extends keyof RealEstateFormState>(key: K, value: RealEstateFormState[K]) => void;
    reset: () => void;
    result: RealEstateResult;
};

const RealEstateForm = ({ form, setField, reset, result }: RealEstateFormProps) => {
    const structureId = useId();
    const structure = findStructure(form.structureKey);
    const showActualCost = form.costMode === "actual";

    /**
     * 仲介手数料を譲渡価額から入れるボタン。
     * 入るのは上限額なので、押した後に実額へ書き換えられるようにしてある（追従はしない）。
     */
    const brokerFeeAction = useMemo<FieldAction>(() => {
        const price = parseFormattedNumber(form.transferPrice);
        return {
            label: "譲渡価額から計算",
            onClick: () => setField("brokerFee", formatInputValue(calcBrokerFee(price))),
            disabled: price <= 0,
            title:
                price > 0
                    ? "宅建業法の報酬上限（400万円超は 代金×3%＋6万円）に消費税を加えた額を入れます。実際の支払額が下回る場合は書き換えてください"
                    : "譲渡価額を入力すると計算できます",
        };
    }, [form.transferPrice, setField]);

    const ownershipLabel =
        result.ownershipYears === null
            ? "取得日・譲渡日を入力してください"
            : `${result.ownershipYears}年（${result.isLongTerm ? "長期譲渡" : "短期譲渡"}${result.isOver10Years ? "・10年超" : ""}）`;

    return (
        <div className="form-section">
            <fieldset>
                <legend>売却の情報</legend>
                <div className="form-row">
                    <CurrencyField
                        label="譲渡価額"
                        value={form.transferPrice}
                        onChange={(v) => setField("transferPrice", v)}
                        hint="売却代金（固定資産税精算金を含む）"
                    />
                    <DateField
                        label="譲渡日"
                        value={form.transferDate}
                        onChange={(v) => setField("transferDate", v)}
                        hint="原則は引渡日（契約日も選択可）"
                    />
                </div>
            </fieldset>

            <fieldset>
                <legend>取得費</legend>
                <div className="form-row">
                    <DateField
                        label="取得日"
                        value={form.acquisitionDate}
                        onChange={(v) => setField("acquisitionDate", v)}
                        hint="相続・贈与で取得した場合は被相続人等の取得日"
                    />
                </div>
                <p className="derived-note">
                    譲渡年1月1日時点の所有期間: <strong>{ownershipLabel}</strong>
                </p>

                <FormField label="取得費の算定方法">
                    <ToggleGroup
                        options={COST_MODE_OPTIONS}
                        value={form.costMode}
                        onChange={(v) => setField("costMode", v)}
                        ariaLabel="取得費の算定方法"
                    />
                    <small>取得価額が不明な場合は概算取得費（譲渡価額の5%）を使用します</small>
                </FormField>

                {showActualCost && (
                    <>
                        <div className="form-row">
                            <CurrencyField
                                label="土地の取得価額"
                                value={form.landCost}
                                onChange={(v) => setField("landCost", v)}
                                hint="購入代金＋仲介手数料等（土地は償却しません）"
                            />
                            <CurrencyField
                                label="建物の取得価額"
                                value={form.buildingCost}
                                onChange={(v) => setField("buildingCost", v)}
                                hint="購入代金＋仲介手数料等（償却前）"
                            />
                        </div>

                        <FormField label="建物の用途">
                            <ToggleGroup
                                options={USAGE_OPTIONS}
                                value={form.buildingUsage}
                                onChange={(v) => setField("buildingUsage", v)}
                                ariaLabel="建物の用途"
                            />
                        </FormField>

                        {form.buildingUsage === "non-business" ? (
                            <div className="form-row">
                                <FormField label="建物の構造" htmlFor={structureId}>
                                    <select
                                        id={structureId}
                                        className="select-input"
                                        value={form.structureKey}
                                        onChange={(e) => setField("structureKey", e.target.value)}
                                    >
                                        {BUILDING_STRUCTURES.map((s) => (
                                            <option key={s.key} value={s.key}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                    <small>
                                        非事業用の耐用年数 {structure.nonBusinessYears}年 / 償却率 {structure.rate}
                                    </small>
                                </FormField>
                                <div className="input-item">
                                    <span className="pseudo-label">償却費相当額（自動計算）</span>
                                    <p className="derived-value">{formatYen(result.depreciation)}</p>
                                    <small>経過年数 {result.elapsedYears}年（6ヶ月以上は切上げ）</small>
                                </div>
                            </div>
                        ) : (
                            <CurrencyField
                                label="償却費累計額"
                                value={form.depreciationInput}
                                onChange={(v) => setField("depreciationInput", v)}
                                hint="事業用は必要経費に算入した償却費の累計額を入力（取得価額の95%が上限）"
                            />
                        )}
                    </>
                )}

                <CurrencyField
                    label="取得費加算額"
                    value={form.inheritedCostAddition}
                    onChange={(v) => setField("inheritedCostAddition", v)}
                    hint="相続財産を相続開始後3年10ヶ月以内に譲渡した場合の、対応する相続税額"
                />
            </fieldset>

            <fieldset>
                <legend>譲渡費用</legend>
                <div className="form-row">
                    {TRANSFER_EXPENSE_ITEMS.map((item) => (
                        <CurrencyField
                            key={item.key}
                            label={item.label}
                            value={form[item.key]}
                            onChange={(v) => setField(item.key, v)}
                            hint={item.hint}
                            action={item.key === "brokerFee" ? brokerFeeAction : undefined}
                        />
                    ))}
                </div>
                <p className="derived-note">
                    譲渡費用 合計: <strong>{formatYen(result.transferExpense)}</strong>
                </p>
                <small className="fieldset-note">
                    修繕費・固定資産税など、資産の維持管理にかかる費用は譲渡費用になりません。
                </small>
            </fieldset>

            <fieldset>
                <legend>特例の適用</legend>
                <CheckboxField
                    label="居住用財産（マイホーム）の譲渡である"
                    checked={form.isResidence}
                    onChange={(v) => setField("isResidence", v)}
                    hint="住まなくなった日から3年を経過する日の属する年の年末までの譲渡を含む"
                />
                <CheckboxField
                    label="3,000万円の特別控除を適用する"
                    checked={form.useSpecialDeduction}
                    onChange={(v) => setField("useSpecialDeduction", v)}
                    disabled={!form.isResidence}
                    hint="所有期間の要件なし。配偶者・直系血族等への譲渡は対象外"
                />
                <CheckboxField
                    label="軽減税率の特例を適用する（所有期間10年超）"
                    checked={form.useReducedRate}
                    onChange={(v) => setField("useReducedRate", v)}
                    disabled={!form.isResidence}
                    hint="課税譲渡所得6,000万円以下の部分が14.21%。3,000万円控除と併用可"
                />
            </fieldset>

            <div className="form-actions no-print">
                <button type="button" className="reset-btn" onClick={reset}>
                    入力をクリア
                </button>
            </div>
        </div>
    );
};

export default RealEstateForm;
