'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BoardState } from '../types/domain';
import { fetchJSON } from '../utils/fetchJSON';

export function useMoveMembers(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moves: Array<{ memberId: string; toTeamId: string | null; note?: string }>) =>
      fetchJSON<BoardState>('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, moves }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(['board', scenarioId], data);
      qc.invalidateQueries({ queryKey: ['audit', scenarioId] });
    },
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
      qc.invalidateQueries({ queryKey: ['audit', scenarioId] });
    },
  });
}
