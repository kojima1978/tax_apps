import { useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { type GiftType } from '@/lib/tax-calculation';
import { normalizeNumberString } from '@/lib/utils';

type Props = {
    amount: string;
    setAmount: (val: string) => void;
    giftType: GiftType;
    setGiftType: (val: GiftType) => void;
    onCalculate: () => void;
    errorMsg: string;
};

const InputSection = ({
    amount,
    setAmount,
    giftType,
    setGiftType,
    onCalculate,
    errorMsg
}: Props) => {
    const handleAmountChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const normalized = normalizeNumberString(e.target.value);
        setAmount(normalized ? Number(normalized).toLocaleString() : '');
    }, [setAmount]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onCalculate();
        }
    }, [onCalculate]);

    return (
        <div className="input-section">
            <noscript>
                <div style={{ color: 'red', fontWeight: 'bold', padding: '10px' }}>
                    ※このアプリを使用するにはJavaScriptを有効にしてください。
                </div>
            </noscript>

            <div className="input-group-row">
                <div className="input-item" style={{ flex: 1 }}>
                    <label htmlFor="giftAmount">贈与金額 (円)</label>
                    <input
                        type="text"
                        id="giftAmount"
                        placeholder="例: 10,000,000"
                        autoComplete="off"
                        inputMode="numeric"
                        value={amount}
                        onChange={handleAmountChange}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <div className="input-item" style={{ flex: 1 }}>
                    <label htmlFor="giftType">贈与区分</label>
                    <select
                        id="giftType"
                        value={giftType}
                        onChange={(e) => setGiftType(e.target.value as GiftType)}
                    >
                        <option value="special">特例贈与 (直系尊属→18歳以上)</option>
                        <option value="general">一般贈与 (その他)</option>
                    </select>
                </div>

                <button className="btn-calc" onClick={onCalculate}>計算する</button>
            </div>
            <div className="error-msg">{errorMsg}</div>
        </div>
    );
};

export default InputSection;
