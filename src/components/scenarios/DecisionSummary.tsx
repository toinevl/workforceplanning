'use client';

import { useMemo } from 'react';
import { CloseButton } from '@/components/ui/CloseButton';
import { InfoHint } from '@/components/ui/InfoHint';
import { roleProfileCoverageForTeam } from '@/lib/skills/roles';
import { useAuditEvents } from '@/lib/hooks/useAudit';
import type { BoardState } from '@/lib/types/domain';

interface DecisionSummaryProps {
  board: BoardState;
  onClose: () => void;
}

interface TeamImpact {
  teamId: string;
  teamName: string;
  color: string;
  headcount: number;
  totalFte: number;
  topGaps: Array<{ skill: string; gap: number }>;
}

/**
 * Live session decision summary.
 * Shows accumulated moves, FTE shifts, and skill impact per team.
 * Reads from the audit trail to list every decision made this session.
 */
export function DecisionSummary({ board, onClose }: DecisionSummaryProps) {
  const { data: events = [] } = useAuditEvents(board.scenario.id);

  const moveEvents = useMemo(
    () => events.filter(
      (e) => e.eventType === 'member_moved' || e.eventType === 'member_removed'
    ),
    [events]
  );

  const teamImpacts: TeamImpact[] = useMemo(() => {
    return board.teams.map((ts) => {
      const coverage = roleProfileCoverageForTeam(
        ts.members.map((m) => ({ role: m.role, skills: m.tags })),
        ts.team.name,
        ts.team.id
      );
      const topGaps = Object.entries(coverage.gapSkills)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3)
        .map(([skill, gap]) => ({ skill, gap }));
      return {
        teamId: ts.team.id,
        teamName: ts.team.name,
        color: ts.team.color,
        headcount: ts.members.length,
        totalFte: ts.totalFte,
        topGaps,
      };
    });
  }, [board.teams]);

  const removedFte = board.removedMembers.reduce((s, m) => s + m.fte, 0);
  const movedCount = moveEvents.filter((e) => e.eventType === 'member_moved').length;
  const removedCount = board.removedMembers.length;

  return (
    <aside className="w-full sm:w-96 shrink-0 border-l border-gray-300 bg-white flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300">
        <div className="flex items-center gap-1">
          <h2 className="font-semibold text-sm text-gray-900">Decision Summary</h2>
          <InfoHint text="Live session overview. Tracks all moves and removals made during this planning session, with real-time FTE and skill impact per team." />
        </div>
        <CloseButton
          onClick={onClose}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        />
      </div>

      <div className="p-4 border-b border-gray-300">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Moves" value={movedCount} />
          <Metric label="Removed" value={removedCount} />
          <Metric label="FTE Lost" value={removedFte.toFixed(1)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric label="Total HC" value={board.totalHeadcount} />
          <Metric label="Total FTE" value={board.totalFte.toFixed(1)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1 mb-2">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Team Skill Impact
            </h3>
            <InfoHint text="Gaps here reflect role-profile targets, not the department's configured skill requirements — see the department page for that view." />
          </div>
          <div className="space-y-3">
            {teamImpacts.map((team) => (
              <div key={team.teamId} className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-sm font-medium text-gray-900 truncate flex-1">
                    {team.teamName}
                  </span>
                  <span className="text-xs text-gray-600 shrink-0">
                    {team.headcount}p · {team.totalFte.toFixed(1)} FTE
                  </span>
                </div>
                {team.topGaps.length > 0 ? (
                  <div className="space-y-1">
                    {team.topGaps.map(({ skill, gap }) => (
                      <div key={skill} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-20 shrink-0 truncate">{skill}</span>
                        <div className="flex-1 h-2.5 bg-gray-200 rounded-sm overflow-hidden">
                          <div
                            className={`h-full rounded-sm ${gap < 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.max(Math.abs(gap) * 12, 5)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-mono shrink-0 w-7 text-right ${gap < 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {gap > 0 ? '+' : ''}{gap.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No skill gaps</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {moveEvents.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Decision Log ({moveEvents.length})
            </h3>
            <ul className="space-y-1">
              {moveEvents.slice(0, 12).map((event) => {
                const teamById = new Map(board.teams.map((t) => [t.team.id, t.team.name]));
                const from = event.fromTeamId ? (teamById.get(event.fromTeamId) ?? '?') : 'Removed';
                const to = event.toTeamId ? (teamById.get(event.toTeamId) ?? '?') : 'Removed';
                return (
                  <li key={event.id} className="text-xs text-gray-700">
                    <span className="font-medium">{from}</span>
                    {' → '}
                    <span className="font-medium">{to}</span>
                    {event.note && (
                      <span className="text-gray-500"> — {event.note}</span>
                    )}
                  </li>
                );
              })}
              {moveEvents.length > 12 && (
                <li className="text-xs text-gray-400 italic">
                  +{moveEvents.length - 12} more…
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center">
      <p className="text-base font-semibold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
