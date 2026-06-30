const isBrowser = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can throw (quota exceeded, private browsing) — losing
    // a snapshot write is not worth crashing the dashboard over.
  }
}

export const storage = { read, write };
