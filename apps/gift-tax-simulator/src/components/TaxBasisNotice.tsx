import { useLocation } from 'react-router-dom';
import ShieldCheck from 'lucide-react/icons/shield-check';

/**
 * パスに応じた計算の前提。先に一致したものを使うので、贈与税用（match なし）は必ず末尾に置く。
 * 不動産のページを増やしてここに足し忘れると、贈与税の文言が黙って出てしまうので注意。
 */
const BASIS_BY_PATH = [
    {
        match: '/acquisition-tax',
        title: '税制基準',
        text: '2026年7月確認。固定資産税評価額と標準税率・登録済み軽減条件による概算です。自治体の取扱いをご確認ください。',
    },
    {
        match: '/registration-tax',
        title: '税制基準',
        text: '2026年7月確認。固定資産税評価額と現行の登録免許税率・登録済み軽減条件による概算です。',
    },
    {
        match: '/real-estate-summary',
        title: '税制基準',
        text: '2026年7月確認。固定資産税評価額と現行の不動産取得税・登録免許税の税率、登録済み軽減条件による概算です。自治体の取扱いをご確認ください。',
    },
    {
        match: '',
        title: '計算前提',
        text: '暦年課税・年間基礎控除110万円・国税庁の贈与税速算表に基づく概算です。',
    },
] as const;

const TaxBasisNotice = () => {
    const { pathname } = useLocation();
    const basis = BASIS_BY_PATH.find(({ match }) => !match || pathname.includes(match))!;

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
