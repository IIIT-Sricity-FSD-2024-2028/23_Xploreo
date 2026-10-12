// Loading / empty / error building blocks shared by every M2 screen.
export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="exp-loading" role="status" aria-live="polite">
      <span className="exp-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="exp-empty">
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

// 403 is "not permitted" and is never retried; 401 means the session ended; the rest can be retried.
export function ErrorNotice({ error, onRetry }) {
  if (!error) return null;
  const forbidden = error.status === 403;
  const ended = error.status === 401;
  const title = forbidden ? 'Not permitted' : ended ? 'Session ended' : 'Something went wrong';
  return (
    <div role="alert" className={`exp-notice ${forbidden ? 'exp-notice-warning' : 'exp-notice-danger'}`}>
      <div>
        <strong>{title}</strong>
        <p>{error.message}</p>
      </div>
      {!forbidden && !ended && onRetry ? (
        <button type="button" className="exp-btn exp-btn-ghost" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function FormMessage({ tone = 'danger', children }) {
  if (!children) return null;
  return (
    <p role={tone === 'danger' ? 'alert' : 'status'} className={`exp-form-message exp-form-message-${tone}`}>
      {children}
    </p>
  );
}

export function Field({ id, label, error, hint, className = '', children }) {
  return (
    <div className={`exp-field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error ? <span className="exp-field-hint">{hint}</span> : null}
      {error ? (
        <span className="exp-field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function ImagePlaceholder() {
  // TODO(M3): replace with the shared <ImageUploader /> once it lands (M3 owns it).
  return (
    <div className="exp-image-placeholder">
      <button type="button" className="exp-btn exp-btn-ghost" disabled>
        Upload image
      </button>
      <span className="exp-field-hint">Image upload arrives with the shared uploader.</span>
    </div>
  );
}
