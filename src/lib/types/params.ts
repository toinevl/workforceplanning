import type { BusinessDriver } from './domain';

export interface SquadRemovalParams {
  membersToRemove: string[]; // explicit member ID list — user selects which SQUAD members to remove
}

export interface RetirementWaveParams {
  retirementAge: number;          // default 65
  serviceYearsThreshold: number;  // default 30 — alternative eligibility criterion
  horizonYears: 1 | 3 | 5;       // which planning window to focus on
  autoFlagEligible: boolean;      // auto-mark eligible members as 'at risk' when scenario is created
}

export interface BusinessDriverParams {
  teamDrivers: Record<string, BusinessDriver>;     // teamId → driver assignment
  targetFteDelta: Record<BusinessDriver, number>;  // grow: +2, slim: -3, contain: 0, neutral: 0
  teamPriorityScore: Record<string, number>;       // teamId → 1–5 priority score
}

export type ScenarioParams = SquadRemovalParams | RetirementWaveParams | BusinessDriverParams;

export function defaultParams(type: 'squad_removal'): SquadRemovalParams;
export function defaultParams(type: 'retirement_wave'): RetirementWaveParams;
export function defaultParams(type: 'business_drivers'): BusinessDriverParams;
export function defaultParams(type: string): ScenarioParams;
export function defaultParams(type: string): ScenarioParams {
  switch (type) {
    case 'squad_removal':
      return { membersToRemove: [] } satisfies SquadRemovalParams;
    case 'retirement_wave':
      return {
        retirementAge: 65,
        serviceYearsThreshold: 30,
        horizonYears: 3,
        autoFlagEligible: true,
      } satisfies RetirementWaveParams;
    case 'business_drivers':
      return {
        teamDrivers: {},
        targetFteDelta: { grow: 2, contain: 0, slim: -2, neutral: 0 },
        teamPriorityScore: {},
      } satisfies BusinessDriverParams;
    default:
      return { membersToRemove: [] };
  }
}
