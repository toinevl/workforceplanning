'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJSON } from '../utils/fetchJSON';
import type { ScenarioAnalysis } from '../skills/analysis';

export function useScenarioAnalysis(scenarioId: string | undefined) {
  return useQuery({
    queryKey: ['analysis', scenarioId],
    queryFn: () => fetchJSON<{ data: ScenarioAnalysis }>(`/api/scenarios/${scenarioId}/analysis`).then((r) => r.data),
    enabled: !!scenarioId,
  });
}
