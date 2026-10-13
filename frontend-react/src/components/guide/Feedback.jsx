// Loading / empty / error blocks shared by the guide pages (styles in guideCommon.css).

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="gc-state" role="status" aria-live="polite">
      <h3>{label}</h3>
    </div>
  );
}

export function EmptyBlock({ title, children }) {
  return (
    <div className="gc-state">
      {title ? <h3>{title}</h3> : null}
      {children ? <p>{children}</p> : null}
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
    <div role="alert" className={`gc-notice${forbidden ? ' is-warning' : ''}`}>
      <span>
        <strong>{title}.</strong> {error.message}
      </span>
      {!forbidden && !ended && onRetry ? (
        <button type="button" onClick={onRetry}>Try again</button>
      ) : null}
    </div>
  );
}

export function Message({ tone = 'error', children }) {
  if (!children) return null;
  return (
    <p className={`gc-message is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function FieldError({ children }) {
  return children ? <small className="gc-field-error">{children}</small> : null;
}
