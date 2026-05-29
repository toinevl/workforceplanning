export async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const json = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(json?.error ?? `${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.data as T;
}
