'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BoardState } from '../types/domain';

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
}

export function useMoveMembers(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moves: Array<{ memberId: string; toTeamId: string | null }>) =>
      fetchJSON<BoardState>('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, moves }),
      }),
    onSuccess: (data) => qc.setQueryData(['board', scenarioId], data),
  });
}

export function useResetScenario(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch(`/api/scenarios/${scenarioId}/reset`, { method: 'POST' }).then((r) => {
        if (!r.ok) throw new Error('Reset failed');
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', scenarioId] });
      qc.invalidateQueries({ queryKey: ['parameters', scenarioId] });
    },
  });
}
