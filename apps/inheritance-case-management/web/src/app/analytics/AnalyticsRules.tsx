export function AnalyticsRules({ referral = false }: { referral?: boolean }) {
    return <details className="text-xs text-slate-600">
        <summary className="flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            {referral ? "紹介料の集計基準" : "売上は社外紹介手数料控除後"} · 内訳の説明
        </summary>
        <ul className="list-disc space-y-1 rounded-lg bg-white py-3 pl-7 pr-3">
            <li>確定：請求済・入金済案件の確定報酬額を使用</li>
            <li>見込：受託・手続中・最終確認・申告済案件の見積額を使用</li>
            <li>{referral ? "紹介料は上記金額を基準に算出した社外紹介手数料です。" : "売上は報酬額から社外紹介手数料を控除した金額です。社内紹介手数料は控除しません。"}</li>
            <li>見積前・見積中・見送りは集計対象外です。</li>
        </ul>
    </details>
}
