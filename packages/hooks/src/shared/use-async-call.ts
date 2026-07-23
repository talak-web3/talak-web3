import { useState, useEffect, useCallback } from "react";

export interface AsyncCallResult<T> {
  /** Resolved data, or `null` while loading / on error. */
  data: T | null;
  /** Whether the call is in-flight. */
  isLoading: boolean;
  /** Error message, or `null`. */
  error: string | null;
  /** Re-run the async function. */
  refetch: () => void;
}

export function useAsyncCall<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
): AsyncCallResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    fn(abort.signal)
      .then((result) => {
        if (!cancelled && !abort.signal.aborted) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled && !abort.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled && !abort.signal.aborted) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [...deps, key]);

  const refetch = useCallback(() => setKey((k) => k + 1), []);

  return { data, isLoading, error, refetch };
}
