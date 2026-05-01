'use client';

import { cn } from '@/lib/utils/cn';
import type { BusinessDriver } from '@/lib/types/domain';

const DRIVER_COLORS: Record<BusinessDriver, string> = {
  grow: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  contain: 'text-blue-700 bg-blue-50 border-blue-200',
  slim: 'text-orange-700 bg-orange-50 border-orange-200',
  neutral: 'text-gray-600 bg-gray-50 border-gray-200',
};

interface TeamHeaderProps {
  name: string;
  color: string;
  headcount: number;
  totalFte: number;
  driver?: BusinessDriver;
  priorityScore?: number;
}

export function TeamHeader({ name, color, headcount, totalFte, driver, priorityScore }: TeamHeaderProps) {
  return (
    <div className="px-3 py-2.5 border-b border-gray-200 bg-white rounded-t-xl">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <h3 className="font-semibold text-gray-800 text-sm leading-tight truncate">{name}</h3>
        {priorityScore && (
          <span className="ml-auto shrink-0 text-xs text-gray-400">P{priorityScore}</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{headcount} members</span>
        <span>{totalFte.toFixed(1)} FTE</span>
        {driver && (
          <span
            className={cn(
              'px-1.5 py-0.5 rounded border text-xs font-medium ml-auto',
              DRIVER_COLORS[driver]
            )}
          >
            {driver}
          </span>
        )}
      </div>
    </div>
  );
}
