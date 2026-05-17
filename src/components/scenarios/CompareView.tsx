'use client';

import { useState } from 'react';
import { useBoardState } from '@/lib/hooks/useScenario';
import { useSnapshot, useSnapshots } from '@/lib/hooks/useSnapshots';
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
  const [mobileActive, setMobileActive] = useState<'Left' | 'Right'>('Left');

  const leftSnapshot = useSnapshot(scenarioId, leftSnapId);
  const rightSnapshot = useSnapshot(scenarioId, rightSnapId);
  const leftBoard = leftSnapId === 'live' ? liveBoard : leftSnapshot.data?.boardState;
  const rightBoard = rightSnapId === 'live' ? liveBoard : rightSnapshot.data?.boardState;

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile toggle — hidden on large screens */}
      <div className="flex justify-center gap-2 lg:hidden">
        {(['Left', 'Right'] as const).map((side) => (
          <button
            key={side}
            onClick={() => setMobileActive(side)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              mobileActive === side
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-400 hover:border-gray-600'
            }`}
          >
            {side}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={mobileActive === 'Left' ? 'block lg:block' : 'hidden lg:block'}>
          <Side
            label="Left"
            snapshots={snapshots}
            selected={leftSnapId}
            onSelect={setLeftSnapId}
            board={leftBoard}
            isLoading={leftSnapId !== 'live' && leftSnapshot.isLoading}
            isError={leftSnapId !== 'live' && leftSnapshot.isError}
          />
        </div>
        <div className={mobileActive === 'Right' ? 'block lg:block' : 'hidden lg:block'}>
          <Side
            label="Right"
            snapshots={snapshots}
            selected={rightSnapId}
            onSelect={setRightSnapId}
            board={rightBoard}
            isLoading={rightSnapId !== 'live' && rightSnapshot.isLoading}
            isError={rightSnapId !== 'live' && rightSnapshot.isError}
          />
        </div>
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
  isLoading,
  isError,
}: {
  label: string;
  snapshots: SnapshotSummary[];
  selected: string;
  onSelect: (id: string) => void;
  board: BoardState | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="flex-1 rounded border border-gray-500 bg-white px-2 py-1 text-sm text-gray-950 focus:border-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-400 rounded-xl">
          <span className="text-sm text-gray-600">
            {getEmptyMessage({ snapshots, selected, isLoading, isError })}
          </span>
        </div>
      )}
    </div>
  );
}

function getEmptyMessage({
  snapshots,
  selected,
  isLoading,
  isError,
}: {
  snapshots: SnapshotSummary[];
  selected: string;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) return 'Loading snapshot...';
  if (isError) return 'Snapshot could not be loaded';
  if (snapshots.length === 0) return 'No snapshots saved yet';
  return selected === 'live' ? 'Loading live board...' : 'Select a snapshot';
}
