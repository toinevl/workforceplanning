'use client';

import { cn } from '@/lib/utils/cn';
import type { BusinessDriver } from '@/lib/types/domain';

const DRIVER_STYLES: Record<BusinessDriver, string> = {
  grow: 'bg-emerald-100 text-emerald-800',
  contain: 'bg-blue-100 text-blue-800',
  slim: 'bg-orange-100 text-orange-800',
  neutral: 'bg-gray-100 text-gray-600',
};

const DRIVER_LABELS: Record<BusinessDriver, string> = {
  grow: 'Grow',
  contain: 'Contain',
  slim: 'Slim',
  neutral: 'Neutral',
};

interface MemberBadgesProps {
  isSquad?: boolean;
  retirementEligibleYear?: number;
  driver?: BusinessDriver;
  className?: string;
}

export function MemberBadges({ isSquad, retirementEligibleYear, driver, className }: MemberBadgesProps) {
  const currentYear = new Date().getFullYear();
  const retiringSoon =
    retirementEligibleYear !== undefined && retirementEligibleYear <= currentYear + 3;

  if (!isSquad && !retiringSoon && !driver) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {isSquad && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
          SQUAD
        </span>
      )}
      {retiringSoon && retirementEligibleYear !== undefined && (
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold',
            retirementEligibleYear <= currentYear
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          )}
          title={`Eligible ${retirementEligibleYear}`}
        >
          Ret {retirementEligibleYear}
        </span>
      )}
      {driver && driver !== 'neutral' && (
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
            DRIVER_STYLES[driver]
          )}
        >
          {DRIVER_LABELS[driver]}
        </span>
      )}
    </div>
  );
}
