// TEMP-STUB: switch the signed-in dev user / sign out, to exercise 401, 403 and region rules.
import { useAuth } from '@/foundation';
import { DEV_USERS } from './auth/session.js';

export function DevToolbar() {
  const { user, loginAs, logout } = useAuth();
  const mocks = import.meta.env.VITE_MOCKS || 'off (real backend)';

  return (
    <div className="dev-toolbar" role="region" aria-label="Developer tools">
      <strong>DEV · TEMP-STUB</strong>
      <label>
        Signed in as{' '}
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
    </div>
  );
}
