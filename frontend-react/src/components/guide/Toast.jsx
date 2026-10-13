import { useCallback, useEffect, useRef, useState } from 'react';

// A short message in the corner (the old pages' toast): const { toast, show } = useToast(); show('Saved', 'success')
export function useToast(duration = 3200) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, type = 'info') => {
    window.clearTimeout(timer.current);
    setToast({ message, type, id: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), duration);
  }, [duration]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = toast ? (
    <div className={`gc-toast gc-toast-${toast.type}`} role="status" aria-live="polite">{toast.message}</div>
  ) : null;
  return { toast: node, show };
}
