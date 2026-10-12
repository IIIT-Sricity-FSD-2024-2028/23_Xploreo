// TEMP-STUB: switch the signed-in dev user / sign out, to exercise 401, 403 and region rules.
// A small floating panel (bottom-right) so it never changes the page layout.
import { useState } from 'react';
import { useAuth } from '@/foundation';
import { DEV_USERS } from './auth/session.js';

export function DevToolbar() {
  const { user, loginAs, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const mocks = import.meta.env.VITE_MOCKS || 'off (real backend)';

  if (collapsed) {
    return (
      <div className="dev-toolbar" role="region" aria-label="Developer tools">
        <button type="button" onClick={() => setCollapsed(false)}>DEV ▸</button>
      </div>
    );
  }

  return (
    <div className="dev-toolbar" role="region" aria-label="Developer tools">
      <strong>DEV · TEMP-STUB</strong>
      <label>
        Signed in as
        <select
          value={user?.id ?? 'none'}
          onChange={(event) => (event.target.value === 'none' ? logout() : loginAs(event.target.value))}
        >
          <option value="none">— signed out (401) —</option>
          {DEV_USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.partnerType} · {u.region}
            </option>
          ))}
        </select>
      </label>
      <span className="dev-flag">VITE_MOCKS: {mocks}</span>
      <button type="button" onClick={() => setCollapsed(true)}>hide ▾</button>
    </div>
  );
}
