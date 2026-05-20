'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Department, DepartmentWithStats } from '../types/domain';
import { fetchJSON } from '../utils/fetchJSON';

export function useDepartmentList() {
  return useQuery<DepartmentWithStats[]>({
    queryKey: ['departments'],
    queryFn: () => fetchJSON('/api/departments'),
  });
}

export function useDepartment(deptId: string) {
  return useQuery<Department>({
    queryKey: ['department', deptId],
    queryFn: () => fetchJSON(`/api/departments/${deptId}`),
    enabled: !!deptId,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color: string; description?: string; deptHead?: string }) =>
      fetchJSON<Department>('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; updates: Partial<{ name: string; color: string; description?: string; deptHead?: string }> }) =>
      fetchJSON<Department>(`/api/departments/${args.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.updates),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/departments/${id}`, { method: 'DELETE' }).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(JSON.stringify({ error: json.error, assignedTeamCount: json.assignedTeamCount }));
        }
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useMigrateDepartments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: string) =>
      fetch('/api/admin/migrate-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultDepartmentId: departmentId }),
      }).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.error ?? 'Migration failed');
        return json.data;
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}
