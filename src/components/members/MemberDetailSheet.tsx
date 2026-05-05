'use client';

import { MemberBadges } from './MemberBadges';
import { AuditRow } from '@/components/scenarios/PapertrailPanel';
import { useAuditEvents } from '@/lib/hooks/useAudit';
import type { StaffMember, ScenarioMemberState, BusinessDriver } from '@/lib/types/domain';

interface MemberDetailSheetProps {
  member: (StaffMember & { scenarioState?: ScenarioMemberState }) | null;
  scenarioId: string;
  teamName?: string;
  teamDriver?: BusinessDriver;
  onClose: () => void;
}

export function MemberDetailSheet({ member, scenarioId, teamName, teamDriver, onClose }: MemberDetailSheetProps) {
  const { data: auditEvents = [] } = useAuditEvents(scenarioId, member?.id);
  if (!member) return null;

  const now = new Date();
  const tenureYears = member.startDate
    ? Math.floor(
        (now.getTime() - new Date(member.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
      )
    : null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-900">Member Details</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{member.name}</h3>
            <p className="text-gray-600 text-sm">{member.role}</p>
            {teamName && (
              <p className="text-xs text-gray-600 mt-0.5">
                {member.scenarioState?.status === 'transferred' ? 'Moved to' : 'Team'}:{' '}
                <span className="font-medium text-gray-600">{teamName}</span>
              </p>
            )}
          </div>

          <MemberBadges
            isSquad={member.isSquad}
            retirementEligibleYear={member.retirementEligibleYear}
            driver={member.scenarioState?.businessDriver ?? teamDriver}
          />

          <div className="grid grid-cols-2 gap-3">
            <Stat label="FTE" value={`${member.fte}`} />
            {tenureYears !== null && (
              <Stat label="Tenure" value={`${tenureYears}y`} />
            )}
            {member.birthYear && (
              <Stat label="Birth Year" value={`${member.birthYear}`} />
            )}
            {member.retirementEligibleYear && (
              <Stat label="Ret. Eligible" value={`${member.retirementEligibleYear}`} />
            )}
          </div>

          {member.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1">
                {member.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {member.notes && (
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700">{member.notes}</p>
            </div>
          )}

          {member.scenarioState && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                Scenario Overrides
              </p>
              <Stat label="Status" value={member.scenarioState.status} />
              {member.scenarioState.overrideRole && (
                <Stat label="Override Role" value={member.scenarioState.overrideRole} />
              )}
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Papertrail
            </p>
            {auditEvents.length === 0 ? (
              <p className="text-sm text-gray-600">No activity for this member yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 rounded border border-gray-300">
                {auditEvents.slice(0, 6).map((event) => (
                  <AuditRow key={event.id} event={event} memberName={member.name} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
