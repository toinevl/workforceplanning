'use client';

import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useDragDrop } from '@/lib/hooks/useDragDrop';
import { BoardDragOverlay } from './DragOverlay';
import type { StaffMember, ScenarioMemberState } from '@/lib/types/domain';

interface DndProviderProps {
  children: React.ReactNode;
  members: Array<StaffMember & { scenarioState?: ScenarioMemberState }>;
  onMove: (memberId: string, toTeamId: string | null) => void;
}

export function DndProvider({ children, members, onMove }: DndProviderProps) {
  const { activeMemberId, setActiveMemberId, sensors } = useDragDrop();

  function handleDragStart({ active }: DragStartEvent) {
    setActiveMemberId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveMemberId(null);
    if (!over) return;
    const toTeamId = over.id === '__removed__' ? null : (over.id as string);
    onMove(active.id as string, toTeamId);
  }

  function handleDragCancel() {
    setActiveMemberId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <BoardDragOverlay activeMemberId={activeMemberId} members={members} />
    </DndContext>
  );
}
