/**
 * Extract a display-safe error message from an unknown error.
 *
 * Backend API routes throw `new Error(JSON.stringify({ error: "...", ... }))` to
 * thread structured data (e.g. `assignedTeamCount`) through TanStack Query's
 * error channel. Rendering `error.message` directly would leak raw JSON into the
 * DOM — both a UX failure and an information-disclosure risk.
 *
 * This helper tries to parse `error.message` as JSON and extract the `error`
 * field; if that fails it returns the plain message string, and if the input
 * isn't an Error at all it falls back to a generic message.
 */
export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    return parsed.error ?? fallback;
  } catch {
    // Not JSON — message is already display-safe (or empty).
    return error.message || fallback;
  }
}
