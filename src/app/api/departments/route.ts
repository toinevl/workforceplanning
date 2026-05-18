import { NextResponse } from 'next/server';
import { getDepartmentsWithStats, createDepartment } from '@/lib/api/departments';

/**
 * GET /api/departments
 * Returns all departments with rollup stats (headcount, FTE, team count)
 */
export async function GET() {
  const departments = await getDepartmentsWithStats();
  return NextResponse.json({ data: departments });
}

/**
 * POST /api/departments
 * Creates a new department
 * Body: { name: string, color: string, description?: string, deptHead?: string }
 */
export async function POST(req: Request) {
  const body = await req.json();

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return NextResponse.json({ error: 'Missing or invalid name' }, { status: 400 });
  }

  if (!body.color || typeof body.color !== 'string' || body.color.trim() === '') {
    return NextResponse.json({ error: 'Missing or invalid color' }, { status: 400 });
  }

  // Extract optional fields
  const { description, deptHead } = body;

  // Create department
  const created = await createDepartment(body.name.trim(), body.color.trim(), description, deptHead);

  return NextResponse.json({ data: created }, { status: 201 });
}
