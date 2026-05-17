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
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Press Space to pick up. Use arrow keys to move. Press Space to drop, Escape to cancel.',
        },
        announcements: {
          onDragStart: ({ active }) => {
            const member = members.find(m => m.id === active.id);
            return `Picked up ${member?.name || 'member'}.`;
          },
          onDragOver: ({ over }) =>
            over ? `Moving over drop target.` : undefined,
          onDragEnd: ({ active, over }) => {
            const member = members.find(m => m.id === active.id);
            if (over) {
              return over.id === '__removed__'
                ? `Dropped ${member?.name || 'member'} into removed.`
                : `Dropped ${member?.name || 'member'} into team.`;
            }
            return `Drop cancelled.`;
          },
          onDragCancel: ({ active }) => {
            const member = members.find(m => m.id === active.id);
            return `Drop cancelled. ${member?.name || 'Member'} was returned to original position.`;
          },
        },
      }}
    >
      {children}
      <BoardDragOverlay activeMemberId={activeMemberId} members={members} />
    </DndContext>
  );
}
