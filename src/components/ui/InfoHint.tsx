'use client';

import { useState, useId } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface InfoHintProps {
  text: string;
  className?: string;
}

/**
 * Small ⓘ icon with hover/click tooltip.
 * Pure CSS positioning via group-hover + focus-within.
 * Click toggles for touch devices.
 */
export function InfoHint({ text, className }: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={cn('relative inline-flex group', className)}>
      <button
        type="button"
        aria-describedby={id}
        aria-label="More information"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 rounded"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal text-white shadow-lg pointer-events-none"
        >
          {text}
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </span>
      )}
    </span>
  );
}
