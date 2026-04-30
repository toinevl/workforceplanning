import { NextResponse } from 'next/server';
import { applyBulkMoves, setTeamDriver } from '@/lib/api/assignments';
import { getScenarioBoardState } from '@/lib/api/scenarios';
import type { BusinessDriver } from '@/lib/types/domain';

export async function POST(req: Request) {
  const body = await req.json();

  // Handle team driver update
  if (body.type === 'set_driver') {
    const { scenarioId, teamId, driver, priorityScore, targetFteDelta } = body as {
      type: 'set_driver';
      scenarioId: string;
      teamId: string;
      driver: BusinessDriver;
      priorityScore?: number;
      targetFteDelta?: number;
    };
    await setTeamDriver(scenarioId, teamId, driver, priorityScore, targetFteDelta);
  } else {
    // Handle member moves
    await applyBulkMoves(body);
  }

  // Return updated board state
  const scenarioId = body.scenarioId;
  const board = await getScenarioBoardState(scenarioId);
  return NextResponse.json({ data: board });
}
