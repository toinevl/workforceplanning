'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScenarioParams } from '../types/params';

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
}

export function useParameters(scenarioId: string) {
  return useQuery<ScenarioParams>({
    queryKey: ['parameters', scenarioId],
    queryFn: () => fetchJSON(`/api/scenarios/${scenarioId}/parameters`),
    enabled: !!scenarioId,
  });
}

export function useUpdateParameters(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: ScenarioParams) =>
      fetchJSON<ScenarioParams>(`/api/scenarios/${scenarioId}/parameters`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }),
    onSuccess: (data) => {
      qc.setQueryData(['parameters', scenarioId], data);
    },
  });
}

export function useApplyLogic(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJSON(`/api/scenarios/${scenarioId}/apply`, { method: 'POST' }),
    onSuccess: (data) => {
      qc.setQueryData(['board', scenarioId], data);
    },
  });
}
