import { useState } from 'react';

type Props = {
    label: string;
    children: React.ReactNode;
};

/**
 * 税額の根拠（税率表・軽減措置の要件）を画面で参照するための折りたたみセクション。
 * 内容が長いので既定は閉じた状態。印刷はA4横1枚に収めるため対象外（no-print）。
 */
const TaxReferenceSection = ({ label, children }: Props) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <section className="tax-reference no-print">
            <button
                type="button"
                className="details-toggle"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? `▲ ${label}を隠す` : `▼ ${label}を見る`}
            </button>
            {isOpen && <div className="tax-reference-body">{children}</div>}
        </section>
    );
};

export default TaxReferenceSection;
