'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const TOUR_KEY = 'wfp-tour-completed';

const STEPS = [
  {
    title: 'Welcome to Workforce Planning',
    body: 'This tool helps you model team reorganizations safely. Let\'s walk through the golden path — it takes 30 seconds.',
    target: null,
  },
  {
    title: '1. Organization Dashboard',
    body: 'You\'re here now. This page shows your organization at a glance: departments, total headcount, and FTE. Click any department card to drill in.',
    target: 'org-dashboard',
  },
  {
    title: '2. Departments',
    body: 'The Departments page lists all departments. Click one to see its teams, skill coverage, and active scenarios. This is where planning starts.',
    target: 'nav-departments',
  },
  {
    title: '3. Plan a Reorganization',
    body: 'On a department page, click "Plan Reorganization" to create a scenario. The board opens with only that department\'s teams — drag members, model changes in a safe sandbox.',
    target: null,
  },
  {
    title: '4. See the Impact',
    body: 'As you make changes, the Decisions panel tracks every move with live FTE impact. AI Analysis suggests moves that improve skill coverage.',
    target: null,
  },
  {
    title: '5. Capture and Compare',
    body: 'Save snapshots to compare options side-by-side. Build a business case for your reorganization. Remember: nothing changes until you apply it.',
    target: null,
  },
  {
    title: 'That\'s it!',
    body: 'You\'re ready to plan. Remember the flow: Org → Department → Plan → Impact → Compare. Visit the Help page anytime for a refresher.',
    target: null,
  },
];

export function GuidedTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleClose() {
    setOpen(false);
    setStep(0);
    localStorage.setItem(TOUR_KEY, 'true');
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }

  function handleSkip() {
    handleClose();
  }

  if (!open || typeof document === 'undefined') return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Tour {step + 1} / {STEPS.length}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{current.title}</h2>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
            aria-label="Skip tour"
          >
            Skip
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-gray-700">{current.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i === step ? 'bg-blue-600' : i < step ? 'bg-blue-300' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
