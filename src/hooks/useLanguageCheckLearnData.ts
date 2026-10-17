"use client";

import { useCallback, useEffect, useState } from "react";
import { parseError } from "@/utils/error";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Browser time zone, sent so day/week buckets match what the viewer sees. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * GET JSON from a Language Check learning endpoint. `url = null` skips the
 * request (e.g. a staff-only panel before the role is known). Re-fetches when
 * the url changes; the previous data stays visible while it loads. Stale
 * responses are ignored.
 */
export default function useLanguageCheckLearnData<T>(url: string | null) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: url !== null,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (url === null) return;
    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    void (async () => {
      try {
        const res = await fetch(url, { signal: ac.signal });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setState({ data: body as T, loading: false, error: null });
      } catch (error) {
        if (ac.signal.aborted) return;
        setState((s) => ({ ...s, loading: false, error: parseError(error) }));
      }
    })();
    return () => ac.abort();
  }, [url, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
