// TEMP-STUB for components/common/Modal (M1 owns the real one).
// Props: { open, title, onClose, children, footer }
import { useEffect, useId } from 'react';

export function Modal({ open, title, onClose, children, footer }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="ui-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ui-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="ui-modal-body">{children}</div>
        {footer ? <footer className="ui-modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
