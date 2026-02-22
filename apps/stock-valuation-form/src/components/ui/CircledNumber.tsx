const CIRCLED_NUMBERS = [
  '⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨',
  '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲',
  '⑳', '㉑', '㉒', '㉓', '㉔', '㉕', '㉖', '㉗', '㉘',
];

interface CircledNumberProps {
  n: number;
  className?: string;
}

export function CircledNumber({ n, className = '' }: CircledNumberProps) {
  return (
    <span className={`gov-circled-num ${className}`}>
      {CIRCLED_NUMBERS[n] ?? `(${n})`}
    </span>
  );
}
