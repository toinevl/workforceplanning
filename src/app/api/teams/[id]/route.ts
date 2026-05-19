import { NextResponse } from 'next/server';
import { getTeam, updateTeam } from '@/lib/api/teams';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }
  return NextResponse.json({ data: team });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const team = await getTeam(id);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const body = await req.json();

  // Build validated updates — only accept known fields
  const updates: Partial<{ name: string; color: string; description?: string; departmentId?: string }> = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if ('color' in body) {
    if (typeof body.color !== 'string') {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
    }
    updates.color = body.color;
  }

  if ('description' in body) {
    updates.description = body.description ?? undefined;
  }

  if ('departmentId' in body) {
    // Allow null or empty string to mean "unassign"
    updates.departmentId = body.departmentId || undefined;
  }

  const updated = await updateTeam(id, updates);
  return NextResponse.json({ data: updated });
}
