'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import { TeamHeader } from './TeamHeader';
import { MemberCard } from '@/components/members/MemberCard';
import type { TeamSnapshot } from '@/lib/types/domain';

interface TeamColumnProps {
  teamSnapshot: TeamSnapshot;
  onMemberClick?: (memberId: string) => void;
  readOnly?: boolean;
}

export function TeamColumn({ teamSnapshot, onMemberClick, readOnly }: TeamColumnProps) {
  const { team, members, totalFte, headcount, driver, priorityScore } = teamSnapshot;

  const { setNodeRef, isOver } = useDroppable({ id: team.id, disabled: readOnly });

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-gray-50 overflow-hidden min-h-[20rem]">
      <TeamHeader
        name={team.name}
        color={team.color}
        headcount={headcount}
        totalFte={totalFte}
        driver={driver}
        priorityScore={priorityScore}
      />

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 space-y-1.5 overflow-y-auto transition-colors duration-100',
          isOver && 'bg-blue-50/60'
        )}
      >
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            teamDriver={driver}
            readOnly={readOnly}
            onClick={onMemberClick ? () => onMemberClick(member.id) : undefined}
          />
        ))}
        {members.length === 0 && (
          <div
            className={cn(
              'h-16 border-2 border-dashed rounded-lg flex items-center justify-center',
              isOver ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
            )}
          >
            <span className="text-xs text-gray-400">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
}
