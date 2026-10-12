// Loading / empty / error blocks, built from the old stylesheet's own classes
// (.empty-state, .alert-banner, .form-message) so they look like the rest of the old UI.

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="empty-state compact" role="status" aria-live="polite">
      <h3>{label}</h3>
    </div>
  );
}

export function EmptyState({ title, children, action, compact = false }) {
  return (
    <div className={`empty-state${compact ? ' compact' : ''}`}>
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
    <article role="alert" className={`alert-main alert-banner ${forbidden ? 'alert-medium' : 'alert-high'}`} style={{ marginBottom: 20 }}>
      <span className="alert-icon">!</span>
      <p>
        <strong>{title}.</strong> {error.message}
      </p>
      {!forbidden && !ended && onRetry ? (
        <button type="button" onClick={onRetry} style={{ marginLeft: 'auto' }}>
          Try again
        </button>
      ) : null}
    </article>
  );
}

// <p class="form-message form-message-error|success"> from the old forms.
export function FormMessage({ tone = 'error', children }) {
  return (
    <p className={`form-message ${children ? `form-message-${tone}` : ''}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

// <label class="field-group"><span>Label</span> input <small class="field-error"></small></label>
export function FieldError({ children }) {
  return <small className="field-error">{children}</small>;
}
