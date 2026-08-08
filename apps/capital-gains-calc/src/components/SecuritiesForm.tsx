import CurrencyField from "./CurrencyField";
import FormField from "./FormField";
import ToggleGroup, { type ToggleOption } from "./ToggleGroup";
import type { CostMode } from "@/lib/capital-gains";
import type { SecuritiesFormState } from "@/hooks/useSecuritiesForm";

const COST_MODE_OPTIONS: ToggleOption<CostMode>[] = [
    { value: "actual", label: "実額取得費" },
    { value: "estimated", label: "概算取得費（5%）" },
];

type ListedKey = "listed" | "general";

// 実務では非上場株式の譲渡を扱うことが多いので、既定側（左）を一般株式等にしてある
const LISTED_OPTIONS: ToggleOption<ListedKey>[] = [
    { value: "general", label: "一般株式等（非上場）" },
    { value: "listed", label: "上場株式等" },
];

type SecuritiesFormProps = {
    form: SecuritiesFormState;
    setField: <K extends keyof SecuritiesFormState>(key: K, value: SecuritiesFormState[K]) => void;
    reset: () => void;
};

const SecuritiesForm = ({ form, setField, reset }: SecuritiesFormProps) => (
    <div className="form-section">
        <fieldset>
            <legend>譲渡の内容</legend>
            <FormField label="株式等の区分">
                <ToggleGroup
                    options={LISTED_OPTIONS}
                    value={form.listed ? "listed" : "general"}
                    onChange={(v) => setField("listed", v === "listed")}
                    ariaLabel="株式等の区分"
                />
                <small>税率はどちらも20.315%ですが、損益通算できる範囲が異なります</small>
            </FormField>

            <div className="form-row">
                <CurrencyField
                    label="譲渡価額"
                    value={form.transferPrice}
                    onChange={(v) => setField("transferPrice", v)}
                    hint="売却代金の合計"
                />
                <CurrencyField
                    label="譲渡費用"
                    value={form.transferExpense}
                    onChange={(v) => setField("transferExpense", v)}
                    hint="証券会社の売却手数料など"
                />
            </div>
        </fieldset>

        <fieldset>
            <legend>取得費</legend>
            <FormField label="取得費の算定方法">
                <ToggleGroup
                    options={COST_MODE_OPTIONS}
                    value={form.costMode}
                    onChange={(v) => setField("costMode", v)}
                    ariaLabel="取得費の算定方法"
                />
                <small>取得価額が不明な場合は概算取得費（譲渡価額の5%）を使用します</small>
            </FormField>

            {form.costMode === "actual" && (
                <CurrencyField
                    label="取得価額"
                    value={form.actualCost}
                    onChange={(v) => setField("actualCost", v)}
                    hint="購入代金＋購入手数料（同一銘柄は総平均法に準ずる方法で算定）"
                />
            )}
        </fieldset>

        <div className="form-actions no-print">
            <button type="button" className="reset-btn" onClick={reset}>
                入力をクリア
            </button>
        </div>
    </div>
);

export default SecuritiesForm;
