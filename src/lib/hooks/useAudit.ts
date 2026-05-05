'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuditEvent } from '../types/domain';

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
}

export function useAuditEvents(scenarioId: string, memberId?: string) {
  const qs = memberId ? `?memberId=${encodeURIComponent(memberId)}` : '';
  return useQuery<AuditEvent[]>({
    queryKey: ['audit', scenarioId, memberId ?? 'all'],
    queryFn: () => fetchJSON(`/api/scenarios/${scenarioId}/audit${qs}`),
    enabled: !!scenarioId,
  });
}

export function useAddScenarioNote(scenarioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) =>
      fetchJSON<AuditEvent>(`/api/scenarios/${scenarioId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit', scenarioId] }),
  });
}
