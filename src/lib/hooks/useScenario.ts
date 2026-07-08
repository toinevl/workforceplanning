'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScenarioSummary, BoardState, Scenario, ScenarioType } from '../types/domain';
import type { SeedOptions } from '../types/seed';
import { fetchJSON } from '../utils/fetchJSON';

export function useScenarioList() {
  return useQuery<ScenarioSummary[]>({
    queryKey: ['scenarios'],
    queryFn: () => fetchJSON('/api/scenarios'),
  });
}

export function useBoardState(scenarioId: string) {
  return useQuery<BoardState>({
    queryKey: ['board', scenarioId],
    queryFn: () => fetchJSON(`/api/scenarios/${scenarioId}/board`),
    enabled: !!scenarioId,
  });
}

export function useScenario(scenarioId: string) {
  return useQuery<Scenario>({
    queryKey: ['scenario', scenarioId],
    queryFn: () => fetchJSON(`/api/scenarios/${scenarioId}`),
    enabled: !!scenarioId,
  });
}

export function useCreateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: ScenarioType; name: string; description?: string }) =>
      fetchJSON<Scenario>('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/scenarios/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Delete failed');
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
}

export function useSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: SeedOptions) =>
      fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      }).then(async (r) => {
        const json = await r.json().catch((e) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[useSeed] failed to parse response', e);
          return {};
        });
        if (!r.ok) throw new Error(json.error ?? 'Seed failed');
        return json.data as { teams: number; members: number; scenarios: number };
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
}
