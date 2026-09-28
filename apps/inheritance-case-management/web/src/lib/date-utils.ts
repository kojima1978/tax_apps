/**
 * ブラウザのローカル日付を `YYYY-MM-DD` で返す。
 *
 * `new Date().toISOString()` が返すのは UTC の日付なので、JST の 00:00〜09:00 に
 * 実行すると前日になる。発行日の既定値が1日前になる、立替日が前日で保存される、
 * といった形で表に出る。タイムゾーンのぶんだけずらしてから ISO 文字列にすることで
 * 画面に出ている日付と一致させる。
 *
 * ブラウザで「今日」を作るときは必ずこれを使うこと。サーバ側（route handler /
 * service）は `lib/services/case-date-utils.ts` の `todayDate()` を使う
 * （`@db.Date` の列は UTC 0時で保存する約束になっている）。
 */
export function todayIsoDate(): string {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 10)
}
