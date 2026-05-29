'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Team, TeamWithStats } from '../types/domain';
import { fetchJSON } from '../utils/fetchJSON';

export function useTeamList() {
  return useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => fetchJSON('/api/teams'),
  });
}

export function useDepartmentTeams(departmentId: string) {
  return useQuery<TeamWithStats[]>({
    queryKey: ['teams', 'department', departmentId],
    queryFn: () => fetchJSON(`/api/teams?departmentId=${encodeURIComponent(departmentId)}`),
    enabled: !!departmentId,
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      updates: Partial<{ name: string; color: string; description?: string; departmentId?: string }>;
    }) =>
      fetchJSON<Team>(`/api/teams/${args.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.updates),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}
