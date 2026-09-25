/**
 * 氏名の表示。印刷では必ず敬称（様）を付ける。
 * 画面では付けない（入力した氏名そのものと見比べられるようにするため）ので、
 * 敬称は要素として置いておき、表示の切り替えは print 用の CSS に任せる。
 * 画面と印刷で同じ部品を使う表（相続税の概算など）でもこれで両方を満たせる。
 */
export function PersonName({ name }: { name: string }) {
  return <>{name}<span className="print-honorific">　様</span></>;
}
