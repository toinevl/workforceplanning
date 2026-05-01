'use client';

import { useState } from 'react';
import { useSnapshots, useSaveSnapshot, useRestoreSnapshot, useDeleteSnapshot } from '@/lib/hooks/useSnapshots';
import type { SnapshotSummary } from '@/lib/types/snapshot';

interface SnapshotHistoryProps {
  scenarioId: string;
  onClose: () => void;
}

export function SnapshotHistory({ scenarioId, onClose }: SnapshotHistoryProps) {
  const { data: snapshots = [], isLoading } = useSnapshots(scenarioId);
  const saveSnapshot = useSaveSnapshot(scenarioId);
  const restoreSnapshot = useRestoreSnapshot(scenarioId);
  const deleteSnapshot = useDeleteSnapshot(scenarioId);

  const [label, setLabel] = useState('');

  function handleSave() {
    if (!label.trim()) return;
    saveSnapshot.mutate(label.trim(), {
      onSuccess: () => setLabel(''),
    });
  }

  return (
    <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-sm text-gray-900">Snapshots</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="p-4 border-b">
        <div className="flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Snapshot label…"
            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm min-w-0"
          />
          <button
            onClick={handleSave}
            disabled={!label.trim() || saveSnapshot.isPending}
            className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-40 transition-colors shrink-0"
          >
            Save
          </button>
        </div>
        {saveSnapshot.isError && (
          <p className="text-xs text-red-500 mt-1">{(saveSnapshot.error as Error).message}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-400">Loading…</span>
          </div>
        )}
        {!isLoading && snapshots.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-400">No snapshots yet</span>
          </div>
        )}
        <ul className="divide-y divide-gray-100">
          {snapshots.map((snap) => (
            <SnapshotRow
              key={snap.id}
              snapshot={snap}
              onRestore={() => restoreSnapshot.mutate(snap.id)}
              onDelete={() => deleteSnapshot.mutate(snap.id)}
              isRestoring={restoreSnapshot.isPending && restoreSnapshot.variables === snap.id}
              isDeleting={deleteSnapshot.isPending && deleteSnapshot.variables === snap.id}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function SnapshotRow({
  snapshot,
  onRestore,
  onDelete,
  isRestoring,
  isDeleting,
}: {
  snapshot: SnapshotSummary;
  onRestore: () => void;
  onDelete: () => void;
  isRestoring: boolean;
  isDeleting: boolean;
}) {
  const date = new Date(snapshot.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{snapshot.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
        <span>{snapshot.headcount} members</span>
        <span>{snapshot.totalFte.toFixed(1)} FTE</span>
        {snapshot.removedCount > 0 && <span>{snapshot.removedCount} removed</span>}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={onRestore}
          disabled={isRestoring}
          className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          {isRestoring ? 'Restoring…' : 'Restore'}
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-40 transition-colors"
        >
          {isDeleting ? '…' : 'Delete'}
        </button>
      </div>
    </li>
  );
}
