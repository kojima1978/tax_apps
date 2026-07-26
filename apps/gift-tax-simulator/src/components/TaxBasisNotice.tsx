import { useLocation } from 'react-router-dom';
import ShieldCheck from 'lucide-react/icons/shield-check';

const BASIS_BY_PATH = {
    gift: {
        title: '計算前提',
        text: '暦年課税・年間基礎控除110万円・国税庁の贈与税速算表に基づく概算です。',
    },
    acquisition: {
        title: '税制基準',
        text: '2026年7月確認。固定資産税評価額と標準税率・登録済み軽減条件による概算です。自治体の取扱いをご確認ください。',
    },
    registration: {
        title: '税制基準',
        text: '2026年7月確認。固定資産税評価額と現行の登録免許税率・登録済み軽減条件による概算です。',
    },
} as const;

const TaxBasisNotice = () => {
    const { pathname } = useLocation();
    const basis = pathname.includes('/acquisition-tax')
        ? BASIS_BY_PATH.acquisition
        : pathname.includes('/registration-tax')
            ? BASIS_BY_PATH.registration
            : BASIS_BY_PATH.gift;

    return (
        <aside className="tax-basis-notice" aria-label={basis.title}>
            <ShieldCheck aria-hidden="true" />
            <div>
                <strong>{basis.title}</strong>
                <span>{basis.text}</span>
            </div>
        </aside>
    );
};

export default TaxBasisNotice;
