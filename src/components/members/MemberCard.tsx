'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import { MemberBadges } from './MemberBadges';
import type { StaffMember, ScenarioMemberState, BusinessDriver } from '@/lib/types/domain';

interface MemberCardProps {
  member: StaffMember & { scenarioState?: ScenarioMemberState };
  teamDriver?: BusinessDriver;
  isDragOverlay?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
}

export function MemberCard({
  member,
  teamDriver,
  isDragOverlay = false,
  readOnly = false,
  onClick,
}: MemberCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: member.id,
    disabled: readOnly || isDragOverlay,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const isTransferred = member.scenarioState?.status === 'transferred';
  const isRemoved = member.scenarioState?.status === 'removed';
  const memberDriver = member.scenarioState?.businessDriver ?? teamDriver;
  const statusLabel = isTransferred ? 'Moved' : isRemoved ? 'Removed' : null;
  const statusTitle = isTransferred ? 'Moved from base team' : isRemoved ? 'Removed from scenario' : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(readOnly || isDragOverlay ? {} : { ...listeners, ...attributes })}
      onClick={onClick}
      className={cn(
        'bg-white border rounded-lg p-2.5 text-sm select-none',
        'transition-shadow duration-150',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-lg rotate-1 cursor-grabbing',
        !isDragging && !isDragOverlay && !readOnly && 'cursor-grab hover:shadow-sm hover:border-gray-300',
        isTransferred && 'border-blue-500 bg-blue-50',
        isRemoved && 'border-red-500 bg-red-50',
        onClick && !readOnly && 'cursor-pointer'
      )}
      aria-label={statusLabel ? `${member.name}, ${statusTitle}` : member.name}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate leading-tight">{member.name}</p>
          <p className="text-xs text-gray-600 truncate mt-0.5">{member.role}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-gray-600 font-mono mt-0.5">{member.fte}FTE</span>
          {statusLabel && (
            <span
              title={statusTitle}
              className={cn(
                'rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none',
                isTransferred && 'bg-blue-100 text-blue-800 border border-blue-300',
                isRemoved && 'bg-red-100 text-red-800 border border-red-300'
              )}
            >
              {statusLabel}
            </span>
          )}
        </div>
      </div>
      <MemberBadges
        isSquad={member.isSquad}
        retirementEligibleYear={member.retirementEligibleYear}
        driver={memberDriver}
        className="mt-1.5"
      />
    </div>
  );
}
