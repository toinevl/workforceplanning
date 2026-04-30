import type { StaffMember } from '../types/domain';
import type { RetirementWaveParams } from '../types/params';

const CURRENT_YEAR = new Date().getFullYear(); // 2026

export type RetirementRiskTier = 'immediate' | 'near' | 'medium' | 'low' | 'none';

export interface RetirementRisk {
  memberId: string;
  eligibleYear: number | null;
  yearsUntilEligible: number | null;
  riskTier: RetirementRiskTier;
}

export function computeRetirementRisk(
  member: StaffMember,
  params: RetirementWaveParams
): RetirementRisk {
  const candidates: number[] = [];

  if (member.birthYear) {
    candidates.push(member.birthYear + params.retirementAge);
  }

  if (member.startDate) {
    const startYear = new Date(member.startDate).getFullYear();
    candidates.push(startYear + params.serviceYearsThreshold);
  }

  if (candidates.length === 0) {
    return { memberId: member.id, eligibleYear: null, yearsUntilEligible: null, riskTier: 'none' };
  }

  const eligibleYear = Math.min(...candidates);
  const yearsUntilEligible = eligibleYear - CURRENT_YEAR;

  let riskTier: RetirementRiskTier;
  if (yearsUntilEligible <= 1) riskTier = 'immediate';
  else if (yearsUntilEligible <= 3) riskTier = 'near';
  else if (yearsUntilEligible <= 5) riskTier = 'medium';
  else riskTier = 'low';

  return { memberId: member.id, eligibleYear, yearsUntilEligible, riskTier };
}

export function isWithinHorizon(risk: RetirementRisk, horizonYears: number): boolean {
  if (risk.yearsUntilEligible === null) return false;
  return risk.yearsUntilEligible <= horizonYears;
}
