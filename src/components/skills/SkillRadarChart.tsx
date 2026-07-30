'use client';

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

  const toPoint = (i: number, value: number, maxForSkill: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = maxForSkill > 0 ? (value / maxForSkill) * radius : 0;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  };

  const currentPoints = data.map((d, i) => {
    const maxForSkill = Math.max(d.current, d.ambition);
    return toPoint(i, d.current, maxForSkill);
  }).join(' ');
  const ambitionPoints = data.map((d, i) => {
    const maxForSkill = Math.max(d.current, d.ambition);
    return toPoint(i, d.ambition, maxForSkill);
  }).join(' ');

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        {[...Array(4)].map((_, level) => {
          const r = ((level + 1) / 4) * radius;
          const points = data.map((_, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return <polygon key={level} points={points} fill="none" stroke="#f3f4f6" strokeWidth="1" />;
        })}
        {data.map((d, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          return (
            <line key={d.skill} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="#f3f4f6" strokeWidth="1" />
          );
        })}
        <polygon points={ambitionPoints} fill="#bfdbfe" fillOpacity={0.3} stroke="#2563eb" strokeWidth="2" />
        <polygon points={currentPoints} fill="#bbf7d0" fillOpacity={0.4} stroke="#16a34a" strokeWidth="2" />
        {data.map((d, i) => {
          const maxForSkill = Math.max(d.current, d.ambition);
          const point = toPoint(i, d.ambition, maxForSkill).split(',');
          return <circle key={`a-${d.skill}`} cx={point[0]} cy={point[1]} r="3" fill="#2563eb" />;
        })}
        {data.map((d, i) => {
          const maxForSkill = Math.max(d.current, d.ambition);
          const point = toPoint(i, d.current, maxForSkill).split(',');
          return <circle key={`c-${d.skill}`} cx={point[0]} cy={point[1]} r="3" fill="#16a34a" />;
        })}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green-600" /> Current</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-blue-600" /> Ambition</span>
      </div>
    </div>
  );
}
