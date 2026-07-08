import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Get the current Auth.js session.
 *
 * Thin wrapper around the `auth()` function from Auth.js, suitable for
 * use in Server Components and Route Handlers. Returns `null` when there
 * is no active session (user not signed in).
 */
export async function getSession(): Promise<Session | null> {
  return auth();
}
