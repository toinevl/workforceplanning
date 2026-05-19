'use client';

import { SectionLabel } from '@/components/ui/SectionLabel';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const TAILWIND_COLORS = [
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#6366f1', name: 'Indigo' },
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div>
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="flex flex-wrap gap-2">
        {TAILWIND_COLORS.map(({ hex, name }) => {
          const isSelected = value.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              aria-label={`${name} (${hex})`}
              aria-pressed={isSelected}
              onClick={() => onChange(hex)}
              className="relative h-8 w-8 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
              style={{ backgroundColor: hex }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-white drop-shadow"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="2 8 6 12 14 4" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label
          htmlFor="color-picker-custom"
          className="text-xs font-medium text-gray-600"
        >
          Custom color
        </label>
        <input
          id="color-picker-custom"
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
        />
      </div>
    </div>
  );
}

export type { ColorPickerProps };
