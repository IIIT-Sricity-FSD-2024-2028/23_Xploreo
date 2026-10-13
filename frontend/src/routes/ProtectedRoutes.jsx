import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute
 *
 * Route guard enforcing role-based access control (RBAC).
 * Receives allowedRoles array and user object via props.
 *
 * Requirements:
 * - Handle missing or malformed users without runtime crashes.
 * - Redirect unauthenticated users (or guest/default role) to /Auth/login.
 * - Redirect authenticated users without required role to '/' (valid fallback, avoiding dead routes).
 * - Allow access when user's role is in allowedRoles.
 */
export default function ProtectedRoute({ allowedRoles = [], user, children }) {
  const isUnauthenticated = !user || !user.role || user.role === 'default';

  if (isUnauthenticated) {
    return <Navigate to="/Auth/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}