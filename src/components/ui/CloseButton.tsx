'use client';

import { forwardRef } from 'react';
import { X } from 'lucide-react';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
}

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ onClick, className }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={className}
      aria-label="Close"
    >
      <X className="w-5 h-5" />
    </button>
  )
);

CloseButton.displayName = 'CloseButton';
