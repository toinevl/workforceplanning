import type { ScenarioParams } from './params';
import type { BoardState } from './domain';

export interface ScenarioSnapshot {
  id: string;
  scenarioId: string;
  label: string;
  parameters: ScenarioParams; // captured at save time
  boardState: BoardState;     // full board state at save time
  createdAt: string;
}

export interface SnapshotSummary {
  id: string;
  scenarioId: string;
  label: string;
  createdAt: string;
  headcount: number;
  totalFte: number;
  removedCount: number;
}
