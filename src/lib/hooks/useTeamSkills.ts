'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJSON } from '../utils/fetchJSON';

export function useTeamSkills(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-skills', teamId],
    queryFn: () => fetchJSON(`/api/teams/${encodeURIComponent(teamId as string)}/skills`),
    enabled: !!teamId,
  });
}
