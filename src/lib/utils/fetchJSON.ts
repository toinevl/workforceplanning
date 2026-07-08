export async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);

  // If the API rejects the request as unauthenticated, redirect to the
  // login page. fetchJSON runs client-side (called from TanStack Query
  // hooks), so a full-page navigation is the simplest way to recover.
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const json = await res.json().catch((e) => {
      if (process.env.NODE_ENV !== 'production') console.warn(`[fetchJSON] ${url} returned ${res.status} with unparseable body`, e);
      return null;
    }) as { error?: string } | null;
    throw new Error(json?.error ?? `${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.data as T;
}
