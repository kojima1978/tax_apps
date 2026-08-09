import { useId } from 'react';
import { type TransactionType, getWareki } from '@/lib/real-estate-tax';
import FormattedNumberInput from '@/components/shared/FormattedNumberInput';
import ShareInput from '@/components/shared/ShareInput';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

type BuildingInputProps = {
    disabled: boolean;
    valuation: string;
    area: string;
    yearInput: string;
    yearError: string;
    yearHint: string;
    selMonth: string;
    selDay: string;
    isResidential: boolean;
    isLongLifeQuality: boolean;
    acquisitionDeduction: string;
    deductionMessage: string;
    yearOptions: number[];
    transactionType: TransactionType;
    onValuationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAreaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setYearInput: (v: string) => void;
    setSelMonth: (v: string) => void;
    setSelDay: (v: string) => void;
    setIsResidential: (v: boolean) => void;
    setIsLongLifeQuality: (v: boolean) => void;
    onDeductionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    shareNumerator: string;
    shareDenominator: string;
    onShareNumeratorChange: (v: string) => void;
    onShareDenominatorChange: (v: string) => void;
    /** この税だけが使う条件（まとめページの住宅用家屋証明書など）を居住用の下に足す */
    children?: React.ReactNode;
};

const BuildingInput = ({
    disabled,
    valuation,
    area,
    yearInput,
    yearError,
    yearHint,
    selMonth,
    selDay,
    isResidential,
    isLongLifeQuality,
    acquisitionDeduction,
    deductionMessage,
    yearOptions,
    transactionType,
    onValuationChange,
    onAreaChange,
    setYearInput,
    setSelMonth,
    setSelDay,
    setIsResidential,
    setIsLongLifeQuality,
    onDeductionChange,
    shareNumerator,
    shareDenominator,
    onShareNumeratorChange,
    onShareDenominatorChange,
    children,
}: BuildingInputProps) => {
    const yearInputId = useId();
    const yearListId = useId();
    const yearNoteId = useId();

    return (
    <div className={`re-column ${disabled ? 'disabled' : ''}`}>
        <h3 className="re-column-title">建物の情報</h3>
        {disabled && (
            <p className="disabled-section-message">計算対象で「建物」を選択すると入力できます</p>
        )}
        <FormattedNumberInput
            label="固定資産税評価額"
            placeholder="例: 10,000,000"
            value={valuation}
            onChange={onValuationChange}
            disabled={disabled}
        />
        <FormattedNumberInput
            label="建物床面積 (m²)"
            placeholder="例: 90.00"
            value={area}
            onChange={onAreaChange}
            disabled={disabled}
            hint="※土地の税額軽減にも影響"
            decimal
        />
        <div className="input-item">
            <label htmlFor={yearInputId}>建築年月日</label>
            <div className="flex-row">
                <input
                    id={yearInputId}
                    type="text"
                    className="flex-1 year-input"
                    list={yearListId}
                    placeholder="年"
                    autoComplete="off"
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    disabled={disabled}
                    aria-invalid={Boolean(yearError)}
                    aria-describedby={yearNoteId}
                />
                <datalist id={yearListId}>
                    {yearOptions.map((y) => (
                        <option key={y} value={y}>{getWareki(y)}</option>
                    ))}
                </datalist>
                <select
                    value={selMonth}
                    onChange={(e) => setSelMonth(e.target.value)}
                    disabled={disabled}
                    className="flex-1"
                >
                    <option value="">月</option>
                    {MONTHS.map((m) => (
                        <option key={m} value={m}>{m}月</option>
                    ))}
                </select>
                <select
                    value={selDay}
                    onChange={(e) => setSelDay(e.target.value)}
                    disabled={disabled}
                    className="flex-1"
                >
                    <option value="">日</option>
                    {DAYS.map((d) => (
                        <option key={d} value={d}>{d}日</option>
                    ))}
                </select>
            </div>
            <small id={yearNoteId} className={yearError ? 'text-error' : 'text-primary'}>
                {yearError || yearHint}
            </small>
        </div>
        <div className="input-item">
            <label className="checkbox-label">
                <input
                    type="checkbox"
                    checked={isResidential}
                    onChange={(e) => setIsResidential(e.target.checked)}
                    disabled={disabled}
                />
                居住用である
            </label>
        </div>
        {children}
        {isResidential && transactionType === 'new_build' && (
            <div className="input-item">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={isLongLifeQuality}
                        onChange={(e) => setIsLongLifeQuality(e.target.checked)}
                        disabled={disabled}
                    />
                    認定長期優良住宅
                </label>
            </div>
        )}
        {isResidential && (
            <FormattedNumberInput
                label="建物不動産取得税の控除額"
                placeholder="例: 12,000,000"
                value={acquisitionDeduction}
                onChange={onDeductionChange}
                disabled={disabled}
                hint={deductionMessage}
                hintClassName="text-primary"
            />
        )}
        <ShareInput
            numerator={shareNumerator}
            denominator={shareDenominator}
            onNumeratorChange={onShareNumeratorChange}
            onDenominatorChange={onShareDenominatorChange}
            disabled={disabled}
        />
    </div>
    );
};

export default BuildingInput;
