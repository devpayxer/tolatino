'use client';

// Lightweight SVG charts for the business panel (from the Handoff v2
// dashboard prototype): sparkline, week comparison line chart, channel donut
// and busy-hours bar.

import { useId } from 'react';
import { SERIE } from '@/lib/paleta';

export function Spark({ pts, color }: { pts: number[]; color: string }) {
  const gid = useId();
  const W = 70;
  const H = 26;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const rng = max - min || 1;
  const step = W / (pts.length - 1);
  const pP = pts.map((v, i) => [i * step, H - ((v - min) / rng) * (H - 4) - 2]);
  const line = pP.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BigChart({ thisW, lastW, days, color }: { thisW: number[]; lastW: number[]; days: string[]; color: string }) {
  const W = 560;
  const H = 180;
  const m = Math.max(...thisW, ...lastW) * 1.15;
  const step = W / (thisW.length - 1);
  const toP = (a: number[]) => a.map((v, i) => [i * step, H - (v / m) * H] as const);
  const ln = (p: readonly (readonly [number, number])[]) =>
    p.map((q, i) => `${i === 0 ? 'M' : 'L'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
  const t = toP(thisW);
  const l = toP(lastW);
  const gid = useId();
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ width: '100%', height: 200 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.26} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={0} x2={W} y1={(H * i) / 4} y2={(H * i) / 4} stroke="#EAE6F5" strokeDasharray="2 4" />
      ))}
      <path d={ln(l)} stroke="#B3ADC7" strokeWidth={1.8} fill="none" strokeDasharray="4 4" />
      <path d={`${ln(t)} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gid})`} />
      <path d={ln(t)} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {t.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#fff" stroke={color} strokeWidth={2} />
      ))}
      {days.map((d, i) => (
        <text
          key={d}
          x={i * step}
          y={H + 16}
          fontSize={10}
          fill="#9A93B3"
          fontWeight={700}
          fontFamily="'Onest'"
          textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}
        >
          {d}
        </text>
      ))}
    </svg>
  );
}

export function Donut({ centerLabel, subLabel }: { centerLabel: string; subLabel: string }) {
  // Cuatro porciones, cuatro colores DISTINTOS de la serie del sistema: en un
  // anillo el color es la leyenda. El barrido del paso 2 dejó dos iguales.
  const segs: [string, number][] = [
    [SERIE[0], 42],
    [SERIE[1], 24],
    [SERIE[2], 22],
    [SERIE[3], 12],
  ];
  const C = 2 * Math.PI * 40;
  let acc = 0;
  return (
    <svg width={116} height={116} viewBox="0 0 120 120">
      <circle cx={60} cy={60} r={40} stroke="#F1EEFA" strokeWidth={15} fill="none" />
      {segs.map(([color, pct], i) => {
        const len = (pct / 100) * C;
        const off = -acc;
        acc += len;
        return (
          <circle
            key={i}
            cx={60}
            cy={60}
            r={40}
            stroke={color}
            strokeWidth={15}
            fill="none"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={off}
            transform="rotate(-90 60 60)"
          />
        );
      })}
      <text x={60} y={58} textAnchor="middle" fontSize={18} fontWeight={800} fill="#16112E" fontFamily="'Onest'">
        {centerLabel}
      </text>
      <text x={60} y={74} textAnchor="middle" fontSize={9} fontWeight={700} fill="#9A93B3" fontFamily="'Onest'">
        {subLabel}
      </text>
    </svg>
  );
}

export function HourBar() {
  const cells = [];
  for (let h = 0; h < 24; h++) {
    let bg = '#403A5A';
    let hh = 8;
    if (h >= 7 && h <= 21) {
      bg = 'rgba(123,97,255,.45)';
      hh = 16;
      if ((h >= 8 && h <= 10) || (h >= 12 && h <= 14) || (h >= 18 && h <= 20)) {
        bg = 'rgba(123,97,255,.7)';
        hh = 24;
      }
      if (h === 13 || h === 19) {
        bg = '#FF2D6F';
        hh = 34;
      }
    }
    if (h === 14) bg = '#FFB020';
    cells.push(<span key={h} style={{ flex: 1, height: hh, borderRadius: 2, background: bg }} />);
  }
  return <div className="flex items-end gap-[2px]">{cells}</div>;
}
