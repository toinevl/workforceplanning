'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import { DndProvider } from '@/components/dnd/DndProvider';
import { TeamColumn } from './TeamColumn';
import { NoteDialog } from './NoteDialog';
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
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 px-1">
        Removed ({board.removedMembers.length})
      </h3>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-12 rounded-xl border-2 border-dashed p-2 flex flex-wrap gap-1.5 transition-colors duration-100',
          isOver ? 'border-red-500 bg-red-50' : 'border-gray-400'
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
          <span className="text-xs text-gray-600 m-auto">Drop to remove</span>
        )}
      </div>
    </div>
  );
}

export function TeamBoard({ board, readOnly = false }: TeamBoardProps) {
  const { selectedMemberId, setSelectedMemberId } = useWorkforceStore();
  const moveMutation = useMoveMembers(board.scenario.id);
  const [pendingMove, setPendingMove] = useState<{
    memberId: string;
    memberName: string;
    toTeamId: string | null;
    destinationLabel: string;
  } | null>(null);

  const allMembers = [
    ...board.teams.flatMap((t) => t.members),
    ...board.removedMembers,
  ];

  const teamLabels = useMemo(
    () =>
      new Map(
        board.teams.map((ts) => [
          ts.team.id,
          ts.team.name,
        ])
      ),
    [board.teams]
  );

  function handleMove(memberId: string, toTeamId: string | null) {
    const member = allMembers.find((m) => m.id === memberId);
    if (!member) return;
    const currentTeam = board.teams.find((t) => t.members.some((m) => m.id === memberId));
    const currentTeamId = currentTeam?.team.id ?? null;
    if (currentTeamId === toTeamId) return;
    setPendingMove({
      memberId,
      memberName: member.name,
      toTeamId,
      destinationLabel: toTeamId ? teamLabels.get(toTeamId) ?? 'Unknown team' : 'Removed',
    });
  }

  const selectedMember = selectedMemberId
    ? allMembers.find((m) => m.id === selectedMemberId) ?? null
    : null;

  const selectedTeam = selectedMemberId
    ? board.teams.find((t) => t.members.some((m) => m.id === selectedMemberId))
    : undefined;

  function commitPendingMove(note?: string) {
    if (!pendingMove) return;
    moveMutation.mutate(
      [
        {
          memberId: pendingMove.memberId,
          toTeamId: pendingMove.toTeamId,
          note: note?.trim() || undefined,
        },
      ],
      {
        onSuccess: () => {
          toast.success(`Moved ${pendingMove.memberName} to ${pendingMove.destinationLabel}`);
          setPendingMove(null);
        },
        onError: () => {
          toast.error('Move failed — try again');
        },
      }
    );
  }

  return (
    <>
      <DndProvider members={allMembers} onMove={handleMove}>
        <div className="overflow-x-auto">
        <div className="grid grid-flow-col auto-cols-[minmax(160px,1fr)] gap-3">
          {board.teams.map((ts) => (
            <TeamColumn
              key={ts.team.id}
              teamSnapshot={ts}
              onMemberClick={setSelectedMemberId}
              readOnly={readOnly}
            />
          ))}
        </div>
        </div>
        <RemovedZone
          board={board}
          readOnly={readOnly}
          onMemberClick={setSelectedMemberId}
        />
      </DndProvider>

      <NoteDialog
        open={pendingMove !== null}
        memberName={pendingMove?.memberName ?? ''}
        destinationLabel={pendingMove?.destinationLabel ?? ''}
        saving={moveMutation.isPending}
        onSkip={() => commitPendingMove(undefined)}
        onSave={(note) => commitPendingMove(note)}
      />

      <MemberDetailSheet
        member={selectedMember}
        scenarioId={board.scenario.id}
        teamName={selectedTeam?.team.name}
        teamDriver={selectedTeam?.driver}
        onClose={() => setSelectedMemberId(null)}
      />
    </>
  );
}
