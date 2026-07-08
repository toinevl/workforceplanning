import { signIn } from "@/auth";
import { APP_NAME } from "@/lib/appInfo";

/**
 * Login page.
 *
 * Renders a "Sign in with Microsoft" button that triggers the Entra ID
 * OAuth flow via the `signIn` server action from Auth.js.
 *
 * This page is public — the middleware matcher excludes /login so the
 * `authorized` callback does not redirect already-authenticated users
 * away from here.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sign in with your Microsoft account to continue.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            <svg viewBox="0 0 23 23" className="h-4 w-4" aria-hidden="true">
              <path fill="#f25022" d="M1 1h10v10H1z" />
              <path fill="#7fba00" d="M12 1h10v10H12z" />
              <path fill="#00a4ef" d="M1 12h10v10H1z" />
              <path fill="#ffb900" d="M12 12h10v10H12z" />
            </svg>
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}
