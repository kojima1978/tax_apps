import { useState } from 'react';

export function useColumnHover() {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  return {
    headerHover: (col: number) => hoveredCol === col ? 'bg-green-700' : '',
    cellHighlight: (col: number) => hoveredCol === col ? 'bg-green-100' : '',
    hoverProps: (col: number) => ({
      onMouseEnter: () => setHoveredCol(col),
      onMouseLeave: () => setHoveredCol(null),
    }),
  };
}
