'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/apiClient';

interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiResourceResult<T> extends ResourceState<T> {
  /** Re-run the fetcher. Also used as the retry handler for <ErrorState />. */
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Fetch-on-mount helper giving every page the same loading/error/retry shape.
 *
 * The fetcher receives an AbortSignal and must pass it through to the service
 * call, so unmounting or a re-run cancels the in-flight request instead of
 * writing state for a stale response.
 *
 * `deps` controls when the fetch re-runs, exactly like useEffect's dep array.
 */
export function useApiResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = [],
  options: { enabled?: boolean; initialData?: T | null } = {}
): UseApiResourceResult<T> {
  const { enabled = true, initialData = null } = options;

  const [state, setState] = useState<ResourceState<T>>({
    data: initialData,
    loading: enabled,
    error: null,
  });

  const [reloadToken, setReloadToken] = useState(0);

  // Keep the latest fetcher without making it a dependency — callers routinely
  // pass an inline arrow function, which would otherwise re-fetch every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const controller = new AbortController();
    let active = true;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;

        setState({
          data: null,
          loading: false,
          error:
            error instanceof ApiError
              ? error.message
              : 'Unable to load this content. Please try again.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadToken, ...deps]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const setData = useCallback<React.Dispatch<React.SetStateAction<T | null>>>((update) => {
    setState((prev) => ({
      ...prev,
      data: typeof update === 'function' ? (update as (p: T | null) => T | null)(prev.data) : update,
    }));
  }, []);

  return { ...state, reload, setData };
}
