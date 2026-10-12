import { useCallback, useEffect, useState } from 'react';

// Loads data through a stable loader function (a service call, or a useCallback around one).
//   const { data, error, loading, reload, mutate } = useAsyncData(listMyExperiences);
// - data is kept while reloading, so screens do not flash empty after a save.
// - mutate(fn) swaps in server data you already have (e.g. a PATCH response) without a refetch.
export function useAsyncData(loader) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (error) => {
        if (!cancelled) setState((s) => ({ ...s, error, loading: false }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loader, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const mutate = useCallback((updater) => setState((s) => ({ ...s, data: updater(s.data) })), []);

  return { ...state, reload, mutate };
}
