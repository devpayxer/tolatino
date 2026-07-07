'use client';

import { useMemo } from 'react';
import { qrMatrix } from '@/lib/qr';

// A real, scannable QR rendered as a single SVG <path> (one DOM node, crisp edges).
// White background + quiet zone are required for reliable scanning, so we draw them
// explicitly (fill-white / fill-ink are design-system fill utilities — no raw hex).
export function Qr({ value, size = 168, quiet = 4, className }: { value: string; size?: number; quiet?: number; className?: string }) {
  const { T, d } = useMemo(() => {
    const { n, dark } = qrMatrix(value.toUpperCase(), 'M');
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    return { T: n + quiet * 2, d };
  }, [value, quiet]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${T} ${T}`} shapeRendering="crispEdges" role="img" aria-label={value} className={className}>
      <rect width={T} height={T} className="fill-white" />
      <path d={d} className="fill-ink" />
    </svg>
  );
}
