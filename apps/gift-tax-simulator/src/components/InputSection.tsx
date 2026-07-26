import { useCallback, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import Sparkles from 'lucide-react/icons/sparkles';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { type GiftType, GIFT_TYPE_OPTIONS } from '@/lib/tax-calculation';
import ErrorMessage from './shared/ErrorMessage';

type Props = {
    amount: string;
    setAmount: (e: ChangeEvent<HTMLInputElement>) => void;
    giftType: GiftType;
    setGiftType: (val: GiftType) => void;
    onCalculate: () => void;
    onSample: () => void;
    onReset: () => void;
    errorMsg: string;
};

const InputSection = ({
    amount,
    setAmount,
    giftType,
    setGiftType,
    onCalculate,
    onSample,
    onReset,
    errorMsg
}: Props) => {
    const amountInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onCalculate();
        }
    }, [onCalculate]);

    useEffect(() => {
        if (errorMsg) amountInputRef.current?.focus();
    }, [errorMsg]);

    return (
        <div className="input-section">
            <noscript>
                <div className="noscript-warning">
                    ※このアプリを使用するにはJavaScriptを有効にしてください。
                </div>
            </noscript>

            <div className="input-group-row">
                <div className="input-item flex-1">
                    <label htmlFor="giftAmount">贈与金額 (円)</label>
                    <input
                        ref={amountInputRef}
                        type="text"
                        id="giftAmount"
                        placeholder="例: 10,000,000"
                        autoComplete="off"
                        inputMode="numeric"
                        value={amount}
                        onChange={setAmount}
                        onKeyDown={handleKeyDown}
                        aria-invalid={Boolean(errorMsg)}
                        aria-describedby={errorMsg ? 'giftAmountError' : undefined}
                    />
                </div>

                <div className="input-item flex-1">
                    <label htmlFor="giftType">贈与区分</label>
                    <select
                        id="giftType"
                        value={giftType}
                        onChange={(e) => setGiftType(e.target.value as GiftType)}
                    >
                        {GIFT_TYPE_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <button className="btn-calc" onClick={onCalculate}>計算する</button>
            </div>
            <div className="input-helper-actions no-print">
                <button type="button" className="btn-input-helper sample" onClick={onSample}>
                    <Sparkles aria-hidden="true" />
                    1,000万円で試す
                </button>
                <button type="button" className="btn-input-helper" onClick={onReset}>
                    <RotateCcw aria-hidden="true" />
                    入力を消す
                </button>
            </div>
            <div id="giftAmountError">
                <ErrorMessage message={errorMsg} />
            </div>
        </div>
    );
};

export default InputSection;
