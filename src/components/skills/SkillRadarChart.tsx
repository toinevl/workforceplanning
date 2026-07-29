'use client';

import { useMemo } from 'react';

export type CoveragePoint = {
  skill: string;
  current: number;
  ambition: number;
};

export function SkillRadarChart({
  data,
  size = 220,
}: {
  data: CoveragePoint[];
  size?: number;
}) {
  const center = size / 2;
  const radius = size * 0.4;
  const angleStep = (Math.PI * 2) / data.length;
  const maxVal = useMemo(() => Math.max(...data.map((d) => Math.max(d.current, d.ambition)), 1), [data]);

  const toPoint = (i: number, value: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (value / maxVal) * radius;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  };

  const currentPoints = data.map((d, i) => toPoint(i, d.current).join(',')).join(' ');
  const ambitionPoints = data.map((d, i) => toPoint(i, d.ambition).join(',')).join(' ');

  const gridLevels = 4;

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="1" />
        {[...Array(gridLevels)].map((_, level) => {
          const r = ((level + 1) / gridLevels) * radius;
          const angleStepLocal = (Math.PI * 2) / data.length;
          const points = data.map((_, i) => {
            const angle = -Math.PI / 2 + i * angleStepLocal;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return <polygon key={level} points={points} fill="none" stroke="#f3f4f6" strokeWidth="1" />;
        })}
        {data.map((d, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          return (
            <line
              key={d.skill}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          );
        })}
        <polygon points={ambitionPoints} fill="#bfdbfe" fillOpacity={0.3} stroke="#2563eb" strokeWidth="2" />
        <polygon points={currentPoints} fill="#bbf7d0" fillOpacity={0.4} stroke="#16a34a" strokeWidth="2" />
        {data.map((d, i) => {
          const [cx, cy] = toPoint(i, d.ambition);
          return (
            <circle key={`a-${d.skill}`} cx={cx} cy={cy} r="3" fill="#2563eb" />
          );
        })}
        {data.map((d, i) => {
          const [cx, cy] = toPoint(i, d.current || 0);
          return (
            <circle key={`c-${d.skill}`} cx={cx} cy={cy} r="3" fill="#16a34a" />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green-600" /> Current</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-blue-600" /> Ambition</span>
      </div>
    </div>
  );
}
