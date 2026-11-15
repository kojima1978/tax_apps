import type { ComponentProps } from "react"

/**
 * 折り返す文字の「1行目」に高さを合わせるチェックボックス。
 *
 * 説明文つきのラベルは2行に折り返すので、`items-center` だと2行の真ん中に落ちる。
 * `items-start` + `mt-1` のような決め打ちの余白は、文字の大きさ・行間が画面ごとに
 * 変わると（案件詳細は `.case-detail-readable` で 14px / 行間 1.6）そのぶんずれる。
 * 1行分の高さ（`1lh`）の箱に入れて縦中央へ置けば、どの大きさでも1行目と揃う。
 */
export function InlineCheckbox({ className = "", ...props }: Omit<ComponentProps<"input">, "type">) {
    return (
        <span className="flex h-[1lh] shrink-0 items-center">
            <input type="checkbox" className={`h-4 w-4 ${className}`} {...props} />
        </span>
    )
}
