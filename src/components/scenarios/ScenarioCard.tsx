'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { ScenarioSummary } from '@/lib/types/domain';

const TYPE_LABELS = {
  squad_removal: 'Squad Removal',
  retirement_wave: 'Retirement Wave',
  business_drivers: 'Business Drivers',
};

const TYPE_COLORS = {
  squad_removal: 'bg-purple-100 text-purple-700',
  retirement_wave: 'bg-yellow-100 text-yellow-700',
  business_drivers: 'bg-blue-100 text-blue-700',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  locked: 'bg-red-100 text-red-700',
};

interface ScenarioCardProps {
  scenario: ScenarioSummary;
  onDelete?: () => void;
}

export function ScenarioCard({ scenario, onDelete }: ScenarioCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{scenario.name}</h3>
          {scenario.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{scenario.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[scenario.status])}>
            {scenario.status}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={cn('text-xs px-2 py-0.5 rounded font-medium', TYPE_COLORS[scenario.type])}>
          {TYPE_LABELS[scenario.type]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-gray-50 rounded p-2">
          <p className="text-lg font-semibold text-gray-900">{scenario.headcount}</p>
          <p className="text-xs text-gray-500">Members</p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-lg font-semibold text-gray-900">{scenario.totalFte.toFixed(1)}</p>
          <p className="text-xs text-gray-500">FTE</p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-lg font-semibold text-gray-900">{scenario.removedCount}</p>
          <p className="text-xs text-gray-500">Removed</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/scenarios/${scenario.id}`}
          className="flex-1 text-center py-1.5 px-3 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
        >
          Open
        </Link>
        <Link
          href={`/scenarios/${scenario.id}/compare`}
          className="py-1.5 px-3 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Compare
        </Link>
        {onDelete && (
          <button
            onClick={onDelete}
            className="py-1.5 px-3 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2 text-right">
        {scenario.snapshotCount} snapshot{scenario.snapshotCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
