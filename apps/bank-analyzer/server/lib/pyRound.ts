// Python の round(x, ndigits) と同じ丸め。
//
// Python は「浮動小数点数として実際に持っている値」をちょうど半分かどうかで判定し、
// ちょうど半分なら偶数へ寄せる（round(0.125, 2) = 0.12、round(2.675, 2) = 2.67）。
// Math.round は半分を常に切り上げ、toFixed は半分を大きい方へ寄せるので、
// どちらも画面に出す割合（1/8 = 12.5% など）で Django 版と1つずれる。
//
// toFixed(100) は持っている値の10進展開を100桁まで正確に返す。割合や金額のように
// 指数が小さい値なら展開はそれより短いので、ここで比べる桁は正確な値になる。

export function pyRound(x: number, ndigits = 0): number {
  if (!Number.isFinite(x)) return x;
  const negative = x < 0;
  const exact = Math.abs(x).toFixed(100);
  const [intPart, frac] = exact.split('.') as [string, string];
  const kept = frac.slice(0, ndigits);
  const rest = frac.slice(ndigits);

  let digits = BigInt(intPart + kept);
  const half = rest[0] === '5' && /^0*$/.test(rest.slice(1));
  const overHalf = rest[0]! > '5' || (rest[0] === '5' && !half);
  if (overHalf || (half && digits % 2n === 1n)) digits += 1n;

  const value = Number(digits) / 10 ** ndigits;
  return negative ? -value : value;
}
