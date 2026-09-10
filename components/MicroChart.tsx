'use client';

import React from 'react';

interface MicroChartProps {
  data?: number[];
  labels?: string[];
  height?: number;
  color?: string;
  activeValue?: string;
  activeLabel?: string;
}

export const MicroChart: React.FC<MicroChartProps> = ({
  data = [120, 110, 160, 240, 190, 210, 260],
  labels = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  height = 100,
  color = '#10b981', // iOS emerald
  activeValue,
  activeLabel,
}) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 12;
  const width = 300;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2.5);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, idx) => {
    if (idx === 0) return `M ${p.x},${p.y}`;
    const prev = points[idx - 1];
    const cx1 = prev.x + (p.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (p.x - prev.x) / 2;
    const cy2 = p.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${p.x},${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  // Highlight peak or last point
  const peakPoint = points[points.length - 2] || points[points.length - 1];

  return (
    <div className="relative w-full overflow-hidden select-none">
      {/* Floating point badge */}
      {activeValue && (
        <div 
          className="absolute -top-1 px-2.5 py-1 rounded-full bg-white/95 border border-emerald-100 shadow-sm text-xs font-semibold text-emerald-800 flex items-center gap-1 backdrop-blur-md"
          style={{ left: `${(peakPoint.x / width) * 80}%` }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>{activeValue}</span>
          {activeLabel && <span className="text-[10px] text-slate-400 font-normal">({activeLabel})</span>}
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="85%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Subtle grid bars */}
        {points.map((p, i) => (
          <line
            key={i}
            x1={p.x}
            y1={padding}
            x2={p.x}
            y2={height - padding}
            stroke="#f1f5f9"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Curve stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Highlight circle */}
        <circle
          cx={peakPoint.x}
          cy={peakPoint.y}
          r="4.5"
          fill="#ffffff"
          stroke={color}
          strokeWidth="2.5"
          className="filter drop-shadow-sm"
        />
      </svg>

      {/* Axis labels */}
      <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 px-2 mt-1">
        {labels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
    </div>
  );
};
