// TEMP-STUB for AppRouter.jsx / ProtectedRoute.jsx (M1 owns the real ones).
//
// Contract M2 relies on: each portal route file exports a descriptor
//   { basePath, layout, requires: { partnerType }, homePath, routes: [{ index|path, element }] }
// and the router wraps it in the role guard. M2 route files contain NO guard logic.
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/foundation';

function Gate({ title, message }) {
  return (
    <div className="stub-gate">
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}

function RequirePartner({ type, children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Gate title="Not signed in" message="Pick a dev user in the toolbar above to continue." />;
  }
  if (user.partnerType !== type) {
    return <Gate title="Not permitted (403)" message={`This area is for ${type} partners.`} />;
  }
  return children;
}

function HomeRedirect({ portals }) {
  const { user } = useAuth();
  const portal = portals.find((p) => p.requires.partnerType === user?.partnerType);
  return portal ? <Navigate to={portal.homePath} replace /> : <Gate title="Welcome" message="Pick a dev user in the toolbar above." />;
}

export function AppRouter({ portals }) {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect portals={portals} />} />
      {portals.map(({ basePath, layout: Layout, requires, routes }) => (
        <Route
          key={basePath}
          path={basePath}
          element={
            <RequirePartner type={requires.partnerType}>
              <Layout />
            </RequirePartner>
          }
        >
          {routes.map((r) =>
            r.index ? (
              <Route key="index" index element={r.element} />
            ) : (
              <Route key={r.path} path={r.path} element={r.element} />
            ),
          )}
        </Route>
      ))}
      <Route path="*" element={<Gate title="Page not found" message="That page does not exist." />} />
    </Routes>
  );
}
