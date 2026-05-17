'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScenarioSnapshot, SnapshotSummary } from '../types/snapshot';
import { fetchJSON } from '../utils/fetchJSON';

export function useSnapshots(scenarioId: string) {
  return useQuery<SnapshotSummary[]>({
    queryKey: ['snapshots', scenarioId],
    queryFn: () => fetchJSON(`/api/scenarios/${scenarioId}/snapshots`),
    enabled: !!scenarioId,
  });
}

export function useSnapshot(scenarioId: string, snapshotId: string) {
  return useQuery<ScenarioSnapshot>({
    queryKey: ['snapshot', scenarioId, snapshotId],
    queryFn: () => fetchJSON(`/api/scenarios/${scenarioId}/snapshots/${snapshotId}`),
    enabled: !!scenarioId && snapshotId !== 'live',
  });
}

export function useSaveSnapshot(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) =>
      fetchJSON<SnapshotSummary>(`/api/scenarios/${scenarioId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['snapshots', scenarioId] });
      qc.invalidateQueries({ queryKey: ['audit', scenarioId] });
    },
  });
}

export function useRestoreSnapshot(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: string) =>
      fetch(`/api/scenarios/${scenarioId}/snapshots/${snapshotId}/restore`, {
        method: 'POST',
      }).then((r) => {
        if (!r.ok) throw new Error('Restore failed');
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', scenarioId] });
      qc.invalidateQueries({ queryKey: ['parameters', scenarioId] });
      qc.invalidateQueries({ queryKey: ['audit', scenarioId] });
    },
  });
}

export function useDeleteSnapshot(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: string) =>
      fetch(`/api/scenarios/${scenarioId}/snapshots/${snapshotId}`, {
        method: 'DELETE',
      }).then((r) => {
        if (!r.ok) throw new Error('Delete failed');
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['snapshots', scenarioId] });
      qc.invalidateQueries({ queryKey: ['audit', scenarioId] });
    },
  });
}
