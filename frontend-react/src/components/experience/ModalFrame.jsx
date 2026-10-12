import { useEffect, useRef } from 'react';

// The old modal shell: <div class="modal"> (full-screen backdrop) > <div class="modal-box">.
// Adds what the old page scripts did by hand: Escape and backdrop click close it, body scroll is locked.
export default function ModalFrame({ id, boxClass = '', labelledBy, onClose, children }) {
  const boxRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boxRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      id={id}
      className="modal"
      style={{ display: 'flex' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={`modal-box ${boxClass}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} ref={boxRef}>
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ label, onClick, glyph }) {
  return (
    <button type="button" className="close" aria-label={label} onClick={onClick}>
      {glyph ?? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
    </button>
  );
}
