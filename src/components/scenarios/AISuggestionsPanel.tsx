'use client';

import { CloseButton } from '@/components/ui/CloseButton';
import { useScenarioAnalysis } from '@/lib/hooks/useAnalysis';
import { useMoveMembers } from '@/lib/hooks/useTeamBoard';
import { toast } from 'sonner';
import type { BoardState } from '@/lib/types/domain';

interface AISuggestionsPanelProps {
  board: BoardState;
  onClose: () => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  moderate: 'bg-amber-100 text-amber-800 border-amber-300',
  low: 'bg-gray-100 text-gray-700 border-gray-300',
};

export function AISuggestionsPanel({ board, onClose }: AISuggestionsPanelProps) {
  const { data: analysis, isLoading } = useScenarioAnalysis(board.scenario.id);
  const moveMutation = useMoveMembers(board.scenario.id);

  function applySuggestion(memberId: string, toTeamId: string, memberName: string) {
    moveMutation.mutate(
      [{ memberId, toTeamId, note: 'AI-suggested move' }],
      {
        onSuccess: () => toast.success(`Applied suggestion: moved ${memberName}`),
        onError: () => toast.error('Failed to apply suggestion'),
      }
    );
  }

  return (
    <aside className="w-full sm:w-96 shrink-0 border-l border-gray-300 bg-white flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300">
        <div>
          <h2 className="font-semibold text-sm text-gray-900">AI Analysis</h2>
          <p className="text-xs text-gray-500 mt-0.5">Skill-gap predictions & move suggestions</p>
        </div>
        <CloseButton
          onClick={onClose}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-600">Analyzing board…</span>
          </div>
        )}

        {!isLoading && analysis && (
          <>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm text-gray-800">{analysis.summary}</p>
            </div>

            {analysis.criticalGaps.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Skill Gaps ({analysis.criticalGaps.length})
                </h3>
                <div className="space-y-1.5">
                  {analysis.criticalGaps.map((gap) => (
                    <div key={gap.skill} className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded border text-xs font-medium ${SEVERITY_STYLES[gap.severity]}`}
                      >
                        {gap.severity}
                      </span>
                      <span className="text-sm text-gray-800 flex-1">{gap.skill}</span>
                      <span className="text-sm font-mono text-gray-900">
                        -{gap.gap.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.suggestions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Suggested Moves ({analysis.suggestions.length})
                </h3>
                <div className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <div key={`${s.memberId}-${i}`} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{s.memberName}</p>
                        <span className="text-xs text-gray-500 shrink-0">{s.fte} FTE</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">{s.fromTeamName}</span>
                        {' → '}
                        <span className="font-medium">{s.toTeamName}</span>
                      </p>
                      <p className="text-xs text-gray-500 mb-2">{s.reason}</p>
                      {s.skillsGained.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {s.skillsGained.map((skill) => (
                            <span key={skill} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => applySuggestion(s.memberId, s.toTeamId, s.memberName)}
                        disabled={moveMutation.isPending}
                        className="w-full py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
                      >
                        Apply Move
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.surplusTeams.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Surplus Teams
                </h3>
                <div className="space-y-1">
                  {analysis.surplusTeams.map((t) => (
                    <div key={t.teamId} className="text-xs text-gray-700">
                      <span className="font-medium">{t.teamName}</span>: {t.surplusSkills.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.deficitTeams.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Deficit Teams
                </h3>
                <div className="space-y-1">
                  {analysis.deficitTeams.map((t) => (
                    <div key={t.teamId} className="text-xs text-gray-700">
                      <span className="font-medium">{t.teamName}</span>: {t.deficitSkills.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
