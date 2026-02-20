interface TrendArrowProps {
  /** 比準割合の値 — 1超で上矢印(赤)、1未満で下矢印(青)、ちょうど1は非表示 */
  ratio: number;
}

/** 比準割合の上昇/下降を示す小さな矢印アイコン */
export function TrendArrow({ ratio }: TrendArrowProps) {
  if (ratio === 1 || ratio === 0) return null;

  const isUp = ratio > 1;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${isUp ? "text-red-500" : "text-blue-500"} animate-pulse`}
      aria-hidden="true"
    >
      {isUp ? (
        <>
          <path d="m5 12 7-7 7 7" />
          <path d="M12 19V5" />
        </>
      ) : (
        <>
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </>
      )}
    </svg>
  );
}
