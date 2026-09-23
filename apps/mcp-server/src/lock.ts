/**
 * 案件ごとに書き込みを直列化する。
 *
 * 書き込みは 取得 → 重ねる → 返す の3手で、PUT は data をまるごと置き換える。
 * 2つの書き込みが重なると、後から返したほうが相手の結果を載せていない古い data で
 * 上書きするため、**両方とも「書き込みました」と言いながら片方が消える**。
 * 実際に set_fields と import_balance_sheet を同時に呼んで第5表が丸ごと消えるのを
 * 確認している。MCP クライアントは道具を並行して呼べるので、ここで順番待ちにする。
 *
 * 防げるのはこのプロセスの中だけ。画面の自動保存との競合は防げないので、
 * そちらは書き込み結果に付ける注意書き（AUTOSAVE_WARNING）で運用に寄せている。
 */
const queues = new Map<number, Promise<void>>();

export function withCaseLock<T>(caseId: number, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(caseId) ?? Promise.resolve();
  // 前の処理が失敗しても次は動かす（失敗を待ち行列の詰まりにしない）。
  const result = previous.then(task, task);

  const release = () => {
    if (queues.get(caseId) === chain) queues.delete(caseId);
  };
  const chain: Promise<void> = result.then(release, release);
  queues.set(caseId, chain);

  return result;
}
