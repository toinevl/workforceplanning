'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';

interface NoteDialogProps {
  open: boolean;
  memberName: string;
  destinationLabel: string;
  saving?: boolean;
  onSkip: () => void;
  onSave: (note?: string) => void;
}

export function NoteDialog({
  open,
  memberName,
  destinationLabel,
  saving = false,
  onSkip,
  onSave,
}: NoteDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      textareaRef.current?.focus();
    });
  }, [open, memberName, destinationLabel]);

  if (!open) return null;

  function handleSave() {
    const note = textareaRef.current?.value ?? '';
    onSave(note.trim() || undefined);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !saving) {
      event.preventDefault();
      onSkip();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/30" onClick={() => !saving && onSkip()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-dialog-title"
        className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 id="note-dialog-title" className="text-sm font-semibold text-gray-900">
            Add a note
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Moving <span className="font-medium text-gray-800">{memberName}</span> to{' '}
            <span className="font-medium text-gray-800">{destinationLabel}</span>.
          </p>
        </div>

        <div className="px-4 py-4">
          <label htmlFor="move-note" className="block text-xs font-medium uppercase tracking-wide text-gray-600">
            Note
          </label>
          <textarea
            id="move-note"
            ref={textareaRef}
            defaultValue=""
            rows={5}
            className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Optional note for this move"
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
