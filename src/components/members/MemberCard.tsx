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
  const memberDriver = member.scenarioState?.businessDriver ?? teamDriver;

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
        isTransferred && 'border-blue-200 bg-blue-50',
        onClick && !readOnly && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate leading-tight">{member.name}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{member.role}</p>
        </div>
        <span className="shrink-0 text-xs text-gray-400 font-mono mt-0.5">{member.fte}FTE</span>
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
