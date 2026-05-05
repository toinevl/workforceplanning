import { NextResponse } from 'next/server';
import { createAuditEvent, listAuditEvents } from '@/lib/api/audit';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId') ?? undefined;
  const events = await listAuditEvents(id, memberId);
  return NextResponse.json({ data: events });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { note?: string };
  if (!body.note?.trim()) return NextResponse.json({ error: 'note is required' }, { status: 400 });

  const event = await createAuditEvent({
    scenarioId: id,
    eventType: 'scenario_note',
    note: body.note,
  });
  return NextResponse.json({ data: event }, { status: 201 });
}
