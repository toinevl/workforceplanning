'use client';

import { useEffect, useRef, useId, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { MemberBadges } from './MemberBadges';
import { AuditRow } from '@/components/scenarios/PapertrailPanel';
import { CloseButton } from '@/components/ui/CloseButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useAuditEvents } from '@/lib/hooks/useAudit';
import type { StaffMember, ScenarioMemberState, BusinessDriver } from '@/lib/types/domain';

interface MemberDetailSheetProps {
  member: (StaffMember & { scenarioState?: ScenarioMemberState }) | null;
  scenarioId: string;
  teamName?: string;
  teamDriver?: BusinessDriver;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  transferred: 'Transferred',
  removed: 'Removed',
};

export function MemberDetailSheet({ member, scenarioId, teamName, teamDriver, onClose }: MemberDetailSheetProps) {
  const { data: auditEvents = [] } = useAuditEvents(scenarioId, member?.id);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!member) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [member]);

  useEffect(() => {
    if (!member) {
      previousActiveElement.current?.focus?.();
      previousActiveElement.current = null;
    }
  }, [member]);

  if (!member || typeof document === 'undefined') return null;

  function handleBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      sheetRef.current?.querySelectorAll<HTMLElement>(
        [
          'button:not([disabled])',
          '[href]',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(', ')
      ) ?? []
    ).filter((element) => !element.hasAttribute('disabled'));

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (!active || active === first || !sheetRef.current?.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last || !sheetRef.current?.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  const now = new Date();
  const tenureYears = member.startDate
    ? Math.floor(
        (now.getTime() - new Date(member.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
      )
    : null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={handleBackdropClick}
      />
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 h-[85vh] sm:bottom-auto sm:top-0 sm:left-auto sm:right-0 sm:h-full sm:w-80 bg-white shadow-xl z-50 flex flex-col overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 id={titleId} className="font-semibold text-gray-900">Member Details</h2>
          <CloseButton
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          />
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
              <SectionLabel>Tags</SectionLabel>
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
              <SectionLabel>Notes</SectionLabel>
              <p className="text-sm text-gray-700">{member.notes}</p>
            </div>
          )}

          {member.scenarioState && (
            <div className="border-t pt-3">
              <SectionLabel>Scenario Overrides</SectionLabel>
              <Stat label="Status" value={STATUS_LABELS[member.scenarioState.status] ?? member.scenarioState.status} />
              {member.scenarioState.overrideRole && (
                <Stat label="Override Role" value={member.scenarioState.overrideRole} />
              )}
            </div>
          )}

          <div className="border-t pt-3">
            <SectionLabel>Papertrail</SectionLabel>
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
    </>,
    document.body
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
