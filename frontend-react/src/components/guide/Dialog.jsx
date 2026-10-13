import { useEffect, useRef } from 'react';

// Overlay + box used by the guide pages' confirm / details popups. Escape and a click on the backdrop close it.
export function Overlay({ labelledBy, onClose, className = 'gc-dialog', children }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    boxRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="gc-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} ref={boxRef}>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, text, confirmLabel, cancelLabel = 'Cancel', busy = false, onConfirm, onClose }) {
  return (
    <Overlay labelledBy="gc-confirm-title" onClose={busy ? undefined : onClose}>
      <div className="gc-dialog-title" id="gc-confirm-title">{title}</div>
      <div className="gc-dialog-text">{text}</div>
      <div className="gc-dialog-actions">
        <button type="button" className="gc-btn-cancel" onClick={onClose} disabled={busy}>{cancelLabel}</button>
        <button type="button" className="gc-btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </Overlay>
  );
}
