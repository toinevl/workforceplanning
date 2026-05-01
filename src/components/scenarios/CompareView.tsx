'use client';

import { useState } from 'react';
import { useBoardState } from '@/lib/hooks/useScenario';
import { useSnapshots } from '@/lib/hooks/useSnapshots';
import { TeamBoard } from '@/components/teams/TeamBoard';
import { ScenarioStats } from './ScenarioStats';
import type { BoardState } from '@/lib/types/domain';
import type { SnapshotSummary } from '@/lib/types/snapshot';

interface CompareViewProps {
  scenarioId: string;
}

export function CompareView({ scenarioId }: CompareViewProps) {
  const { data: liveBoard } = useBoardState(scenarioId);
  const { data: snapshots = [] } = useSnapshots(scenarioId);

  const [leftSnapId, setLeftSnapId] = useState<string>('live');
  const [rightSnapId, setRightSnapId] = useState<string>(snapshots[0]?.id ?? 'live');

  const leftBoard = leftSnapId === 'live' ? liveBoard : getBoardFromSnapshot(snapshots, leftSnapId);
  const rightBoard = rightSnapId === 'live' ? liveBoard : getBoardFromSnapshot(snapshots, rightSnapId);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-6">
        <Side
          label="Left"
          snapshots={snapshots}
          selected={leftSnapId}
          onSelect={setLeftSnapId}
          board={leftBoard}
        />
        <Side
          label="Right"
          snapshots={snapshots}
          selected={rightSnapId}
          onSelect={setRightSnapId}
          board={rightBoard}
        />
      </div>
    </div>
  );
}

function Side({
  label,
  snapshots,
  selected,
  onSelect,
  board,
}: {
  label: string;
  snapshots: SnapshotSummary[];
  selected: string;
  onSelect: (id: string) => void;
  board: BoardState | undefined;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
        >
          <option value="live">Live Board</option>
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} — {new Date(s.createdAt).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {board ? (
        <>
          <ScenarioStats board={board} />
          <TeamBoard board={board} readOnly />
        </>
      ) : (
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl">
          <span className="text-sm text-gray-400">
            {snapshots.length === 0 ? 'No snapshots saved yet' : 'Select a snapshot'}
          </span>
        </div>
      )}
    </div>
  );
}

function getBoardFromSnapshot(snapshots: SnapshotSummary[], snapId: string): BoardState | undefined {
  // Snapshots summaries don't carry full board state; CompareView works with live board + summaries.
  // For a richer compare, the page can fetch full snapshot data server-side.
  // Here we return undefined so the compare page can handle it separately if needed.
  void snapshots;
  void snapId;
  return undefined;
}
