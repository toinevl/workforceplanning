'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import { DndProvider } from '@/components/dnd/DndProvider';
import { TeamColumn } from './TeamColumn';
import { MemberCard } from '@/components/members/MemberCard';
import { MemberDetailSheet } from '@/components/members/MemberDetailSheet';
import { useWorkforceStore } from '@/lib/store/workforceStore';
import { useMoveMembers } from '@/lib/hooks/useTeamBoard';
import type { BoardState } from '@/lib/types/domain';

interface TeamBoardProps {
  board: BoardState;
  readOnly?: boolean;
}

function RemovedZone({
  board,
  readOnly,
  onMemberClick,
}: {
  board: BoardState;
  readOnly?: boolean;
  onMemberClick?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: '__removed__', disabled: readOnly });

  if (board.removedMembers.length === 0 && !isOver) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
        Removed ({board.removedMembers.length})
      </h3>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-12 rounded-xl border-2 border-dashed p-2 flex flex-wrap gap-1.5 transition-colors duration-100',
          isOver ? 'border-red-300 bg-red-50' : 'border-gray-200'
        )}
      >
        {board.removedMembers.map((m) => (
          <div key={m.id} className="w-44">
            <MemberCard
              member={m}
              readOnly={readOnly}
              onClick={onMemberClick ? () => onMemberClick(m.id) : undefined}
            />
          </div>
        ))}
        {board.removedMembers.length === 0 && (
          <span className="text-xs text-gray-400 m-auto">Drop to remove</span>
        )}
      </div>
    </div>
  );
}

export function TeamBoard({ board, readOnly = false }: TeamBoardProps) {
  const { selectedMemberId, setSelectedMemberId } = useWorkforceStore();
  const moveMutation = useMoveMembers(board.scenario.id);

  const allMembers = [
    ...board.teams.flatMap((t) => t.members),
    ...board.removedMembers,
  ];

  function handleMove(memberId: string, toTeamId: string | null) {
    const member = allMembers.find((m) => m.id === memberId);
    if (!member) return;
    const currentTeam = board.teams.find((t) => t.members.some((m) => m.id === memberId));
    const currentTeamId = currentTeam?.team.id ?? null;
    if (currentTeamId === toTeamId) return;
    moveMutation.mutate([{ memberId, toTeamId }]);
  }

  const selectedMember = selectedMemberId
    ? allMembers.find((m) => m.id === selectedMemberId) ?? null
    : null;

  const selectedTeam = selectedMemberId
    ? board.teams.find((t) => t.members.some((m) => m.id === selectedMemberId))
    : undefined;

  return (
    <>
      <DndProvider members={allMembers} onMove={handleMove}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {board.teams.map((ts) => (
            <TeamColumn
              key={ts.team.id}
              teamSnapshot={ts}
              onMemberClick={setSelectedMemberId}
              readOnly={readOnly}
            />
          ))}
        </div>
        <RemovedZone
          board={board}
          readOnly={readOnly}
          onMemberClick={setSelectedMemberId}
        />
      </DndProvider>

      <MemberDetailSheet
        member={selectedMember}
        teamName={selectedTeam?.team.name}
        teamDriver={selectedTeam?.driver}
        onClose={() => setSelectedMemberId(null)}
      />
    </>
  );
}
