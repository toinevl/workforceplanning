'use client';

import { useMemo, useState } from 'react';
import { CloseButton } from '@/components/ui/CloseButton';
import { useAddScenarioNote, useAuditEvents } from '@/lib/hooks/useAudit';
import type { AuditEvent, BoardState } from '@/lib/types/domain';

interface PapertrailPanelProps {
  board: BoardState;
  onClose: () => void;
}

const EVENT_LABELS: Record<AuditEvent['eventType'], string> = {
  member_moved: 'Member moved',
  member_removed: 'Member removed',
  team_driver_updated: 'Team driver updated',
  parameters_updated: 'Parameters updated',
  scenario_logic_applied: 'Logic applied',
  scenario_reset: 'Scenario reset',
  snapshot_saved: 'Snapshot saved',
  snapshot_restored: 'Snapshot restored',
  snapshot_deleted: 'Snapshot deleted',
  scenario_updated: 'Scenario updated',
  scenario_note: 'Note added',
};

export function PapertrailPanel({ board, onClose }: PapertrailPanelProps) {
  const { data: events = [], isLoading } = useAuditEvents(board.scenario.id);
  const addNote = useAddScenarioNote(board.scenario.id);
  const [note, setNote] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');

  const members = useMemo(
    () => [...board.teams.flatMap((t) => t.members), ...board.removedMembers]
      .sort((a, b) => a.name.localeCompare(b.name)),
    [board]
  );
  const memberById = new Map(members.map((m) => [m.id, m.name]));
  const teamById = new Map(board.teams.map((t) => [t.team.id, t.team.name]));
  const filteredEvents = memberFilter === 'all'
    ? events
    : events.filter((event) => event.memberId === memberFilter);

  function handleAddNote() {
    if (!note.trim()) return;
    addNote.mutate(note.trim(), { onSuccess: () => setNote('') });
  }

  return (
    <aside className="w-full sm:w-80 shrink-0 border-l border-gray-300 bg-white flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300">
        <h2 className="font-semibold text-sm text-gray-900">Papertrail</h2>
        <CloseButton
          onClick={onClose}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        />
      </div>

      <div className="p-4 border-b border-gray-300 space-y-3">
        <select
          value={memberFilter}
          onChange={(event) => setMemberFilter(event.target.value)}
          className="w-full rounded border border-gray-500 bg-white px-2 py-1.5 text-sm text-gray-950 focus:border-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <option value="all">All activity</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleAddNote()}
            placeholder="Add scenario note"
            className="min-w-0 flex-1 rounded border border-gray-500 bg-white px-2 py-1.5 text-sm text-gray-950 placeholder:text-gray-600 focus:border-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
          <button
            onClick={handleAddNote}
            disabled={!note.trim() || addNote.isPending}
            className="rounded bg-blue-600 px-3 py-2.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        )}
        {!isLoading && filteredEvents.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-600">No activity yet</span>
          </div>
        )}
        <ul className="divide-y divide-gray-200">
          {filteredEvents.map((event) => (
            <AuditRow
              key={event.id}
              event={event}
              memberName={event.memberId ? memberById.get(event.memberId) : undefined}
              teamById={teamById}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function AuditRow({ event, memberName, teamById }: { event: AuditEvent; memberName?: string; teamById?: Map<string, string> }) {
  const date = new Date(event.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{EVENT_LABELS[event.eventType]}</p>
          <p className="mt-0.5 text-xs text-gray-600">{date}</p>
        </div>
      </div>
      {memberName && (
        <p className="mt-1 text-xs text-gray-700">{memberName}</p>
      )}
      {(event.fromTeamId !== undefined || event.toTeamId !== undefined) && (
        <p className="mt-1 text-xs text-gray-600">
          {event.fromTeamId ? (teamById?.get(event.fromTeamId) ?? 'Unknown team') : 'Removed'} to {event.toTeamId ? (teamById?.get(event.toTeamId) ?? 'Unknown team') : 'Removed'}
        </p>
      )}
      {event.note && (
        <p className="mt-2 rounded border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-800">
          {event.note}
        </p>
      )}
    </li>
  );
}
