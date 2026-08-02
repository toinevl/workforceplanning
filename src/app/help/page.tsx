import { AppShell } from '@/components/layout/AppShell';
import Link from 'next/link';

export const metadata = {
  title: 'Help — Workforce Planning',
};

const STEPS = [
  {
    n: 1,
    title: 'View the Organization',
    page: 'Org Dashboard',
    href: '/',
    icon: '🏛',
    desc: 'The landing page shows a high-level overview: total headcount, FTE, and department cards. Click any department to drill in.',
    tips: ['Each card shows team count, headcount, and FTE', 'Metrics update live as the underlying data changes'],
  },
  {
    n: 2,
    title: 'Explore a Department',
    page: 'Department Detail',
    href: '/departments',
    icon: 'dept',
    desc: 'The department page is the pivot point. See assigned teams, skill coverage radars, and active scenarios. Assign or unassign teams inline.',
    tips: ['Skill radar shows current vs ambition per skill', 'Click Plan Reorganization to start planning'],
  },
  {
    n: 3,
    title: 'Plan a Reorganization',
    page: 'Scenario Board',
    href: '/scenarios',
    icon: 'scenario',
    desc: 'Create a department-scoped scenario and open the board. Drag members between teams, set business drivers, model retirements or SQUAD removals.',
    tips: ['Scenarios are sandboxes — nothing changes until you apply', 'Board shows only the department\'s teams when department-scoped'],
  },
  {
    n: 4,
    title: 'See the Impact',
    page: 'Board + Panels',
    href: null,
    icon: 'impact',
    desc: 'As you make changes, open the Decisions panel for live FTE impact, or AI Analysis for data-driven move suggestions and skill gap detection.',
    tips: ['Decisions panel tracks every move and its impact', 'AI Analysis suggests moves that improve skill coverage'],
  },
  {
    n: 5,
    title: 'Capture and Compare',
    page: 'Snapshots',
    href: null,
    icon: 'snapshot',
    desc: 'Save snapshots at key moments. Compare two snapshots side-by-side to build a business case for a specific reorganization.',
    tips: ['Snapshots are cheap — save frequently', 'Use Compare to show before/after to stakeholders'],
  },
];

const FAQ = [
  {
    q: 'Do scenarios change real data?',
    a: 'No. Scenarios are sandboxes that overlay your baseline staffing data. Nothing is permanent until you explicitly apply a scenario.',
  },
  {
    q: 'What is FTE?',
    a: 'Full-Time Equivalent. A part-time employee working 80% of full-time hours counts as 0.8 FTE. This gives an accurate picture of actual capacity.',
  },
  {
    q: 'What are SQUAD members?',
    a: 'SQUAD is a special temporary position category. The SQUAD Removal scenario simulates what happens when these positions end.',
  },
  {
    q: 'Where do I manage departments and teams?',
    a: 'Department create/edit/delete is on the Departments page (/departments). Team-to-department assignment is inline on each department detail page. Data seeding is under Admin (/settings).',
  },
  {
    q: 'What is the skill radar?',
    a: 'A chart comparing a team\'s current skill coverage (from member tags) against its ambition (summed from role profiles). Gaps show where the team needs more coverage.',
  },
];

export default function HelpPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Help</h1>
          <p className="mt-1 text-sm text-gray-600">
            The golden path: from organization overview to planning decision in five steps.
          </p>
        </div>

        {/* Golden Path Steps */}
        <div className="flex flex-col gap-4">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                {step.n}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">{step.title}</h2>
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Go to {step.page} →
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-500">{step.page}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-700">{step.desc}</p>
                <ul className="mt-2 flex flex-col gap-0.5">
                  {step.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-gray-600">
                      <span className="text-gray-400">•</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
          >
            Org Dashboard
          </Link>
          <Link
            href="/departments"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
          >
            Departments
          </Link>
          <Link
            href="/scenarios"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
          >
            Scenarios
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
          >
            Admin
          </Link>
        </div>

        {/* FAQ */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900">FAQ</h2>
          <div className="mt-4 flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">{item.q}</p>
                <p className="mt-1 text-sm text-gray-700">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
