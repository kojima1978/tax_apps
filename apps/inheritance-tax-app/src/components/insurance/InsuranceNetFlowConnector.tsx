import { memo, useLayoutEffect, useRef, useState } from 'react';

interface ConnectorLine {
  path: string;
}

interface ConnectorGeometry {
  width: number;
  height: number;
  lines: ConnectorLine[];
}

const EMPTY_GEOMETRY: ConnectorGeometry = {
  width: 0,
  height: 0,
  lines: [],
};

const CONNECTIONS = [
  {
    source: '.insurance-current-table .insurance-net-proceeds-cell',
    target: '.insurance-current-net-target',
  },
  {
    source: '.insurance-proposed-table .insurance-net-proceeds-cell',
    target: '.insurance-proposed-net-target',
  },
] as const;

export const InsuranceNetFlowConnector = memo(() => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<ConnectorGeometry>(EMPTY_GEOMETRY);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const flow = root?.closest<HTMLElement>('.insurance-asset-flow');
    if (!root || !flow) return undefined;

    const measure = () => {
      const flowRect = flow.getBoundingClientRect();
      const lines = CONNECTIONS.flatMap(connection => {
        const sourceCells = flow.querySelectorAll<HTMLElement>(connection.source);
        const source = sourceCells[sourceCells.length - 1];
        const target = flow.querySelector<HTMLElement>(connection.target);
        if (!source || !target) return [];

        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const startX = sourceRect.left + sourceRect.width / 2 - flowRect.left;
        const startY = sourceRect.bottom - flowRect.top;
        const endX = targetRect.left + targetRect.width * 0.6 - flowRect.left;
        const endY = targetRect.top - flowRect.top;
        return [{
          path: `M ${startX} ${startY} L ${endX} ${endY - 1}`,
        }];
      });

      const next = {
        width: flowRect.width,
        height: flowRect.height,
        lines,
      };
      setGeometry(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };

    const frame = requestAnimationFrame(measure);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(flow);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div ref={rootRef} className="insurance-net-flow-connector pointer-events-none absolute inset-0 z-10 hidden lg:block">
      {geometry.width > 0 && (
        <svg
          className="absolute inset-0 block overflow-visible"
          width={geometry.width}
          height={geometry.height}
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          role="img"
          aria-label="現在のままと保険に加入した場合の残る財産合計が、下の残る財産比較に引き継がれます"
        >
          {geometry.lines.map((line, index) => (
            <g key={index}>
              <path d={line.path} fill="none" stroke="#ffffff" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              <path d={line.path} fill="none" stroke="#2563eb" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
});

InsuranceNetFlowConnector.displayName = 'InsuranceNetFlowConnector';
