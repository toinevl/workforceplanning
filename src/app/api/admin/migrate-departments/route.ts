import { NextResponse } from 'next/server';
import { bulkAssignUnassignedTeams, getDepartmentById } from '@/lib/api/departments';

/**
 * POST /api/admin/migrate-departments
 * Idempotently assigns all unassigned teams to a default department
 * Body: { defaultDepartmentId: string (UUID) }
 */
export async function POST(req: Request) {
  const body = await req.json();

  // Validate required field
  if (!body.defaultDepartmentId || typeof body.defaultDepartmentId !== 'string' || body.defaultDepartmentId.trim() === '') {
    return NextResponse.json({ error: 'Missing or invalid defaultDepartmentId' }, { status: 400 });
  }

  const defaultDepartmentId = body.defaultDepartmentId.trim();

  // Verify department exists
  const department = await getDepartmentById(defaultDepartmentId);
  if (!department) {
    return NextResponse.json({ error: 'Default department not found' }, { status: 404 });
  }

  // Perform bulk assignment
  const result = await bulkAssignUnassignedTeams(defaultDepartmentId);

  return NextResponse.json({ data: { assigned: result.assigned, skipped: result.skipped } }, { status: 200 });
}
