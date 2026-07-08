'use client';

import { useSession, signOut } from 'next-auth/react';
import { APP_NAME } from '@/lib/appInfo';

/**
 * User menu — shows the signed-in user's name/email and a Sign out button.
 *
 * Rendered inside TopNav (a client component). Uses the `useSession()` hook
 * from next-auth/react, which reads the session from the SessionProvider
 * context (set up in app/providers.tsx).
 *
 * Renders nothing when there is no session or the session is still loading.
 */
export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading' || !session?.user) return null;

  const name = session.user.name;
  const email = session.user.email;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end leading-tight">
        {name && (
          <span className="text-sm font-medium text-gray-900">{name}</span>
        )}
        {email && (
          <span className="text-xs text-gray-500">{email}</span>
        )}
      </div>
      {name && (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700"
          title={`${APP_NAME} user`}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <button
        onClick={() => signOut({ redirectTo: '/login' })}
        className="text-sm px-3 py-2 border border-gray-400 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
      >
        Sign out
      </button>
    </div>
  );
}
