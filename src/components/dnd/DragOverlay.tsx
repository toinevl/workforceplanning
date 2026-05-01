'use client';

import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import { MemberCard } from '@/components/members/MemberCard';
import type { StaffMember, ScenarioMemberState } from '@/lib/types/domain';

interface BoardDragOverlayProps {
  activeMemberId: string | null;
  members: Array<StaffMember & { scenarioState?: ScenarioMemberState }>;
}

export function BoardDragOverlay({ activeMemberId, members }: BoardDragOverlayProps) {
  const active = activeMemberId ? members.find((m) => m.id === activeMemberId) : null;

  return (
    <DndKitDragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
      {active ? (
        <MemberCard member={active} isDragOverlay />
      ) : null}
    </DndKitDragOverlay>
  );
}
