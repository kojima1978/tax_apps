// 案件に入っていない入力を、自動で案件にするかの判定。
//
// 以前はここで「案件へ移しますか」と起動時に一度だけ訊いていた（migration.ts）。訊く形は
// 断ったあと二度と出ないので、この端末のブラウザにしか無い入力が黙って増え続ける余地が残る
// （毎日のバックアップにも入らない）。既定でDBへ入れる方針にしたため、訊くのはやめて
// 「案件が無いまま入力がある」状態を見つけたら作る、という判定だけにした。

export interface AdoptCondition {
  /** 開いている案件。選んでいれば今までどおりそこへ書き戻すだけ。 */
  currentId: number | null;
  hasInput: boolean;
  /** いまの入力（`JSON.stringify(formData)`）。 */
  snapshot: string;
  /**
   * 案件から外したときの入力。ゴミ箱へ入れた案件を同じ内容で作り直さないために使う
   * （入力を続ければ内容が変わるので、そこからは改めて案件になる）。
   */
  unlinkedSnapshot: string | null;
  /** 直前に作成できなかった時刻。届かないサーバへ打鍵のたびに投げ続けないため。 */
  failedAt: number | null;
  now: number;
}

/** 作成に失敗したあと、次に試すまでの間隔。 */
export const ADOPT_RETRY_MS = 60_000;

/**
 * 自動で案件にすべきか。
 *
 * サーバへ届かなかったときも作りに行く（失敗したら間隔をおいて再び試す）。届かないことを
 * 理由に黙って端末保存へ落とすと、直ったあとも案件に入らないまま一日が終わる。
 */
export function shouldAdoptIntoCase({
  currentId,
  hasInput,
  snapshot,
  unlinkedSnapshot,
  failedAt,
  now,
}: AdoptCondition): boolean {
  if (currentId !== null || !hasInput) return false;
  if (unlinkedSnapshot !== null && unlinkedSnapshot === snapshot) return false;
  return failedAt === null || now - failedAt >= ADOPT_RETRY_MS;
}
