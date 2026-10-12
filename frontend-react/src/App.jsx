// TEMP-STUB: stands in for M1's app root. Delete when react-foundation is merged.
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/foundation';
import { AppRouter } from '@/dev-stubs/routing/AppRouter.jsx';
import { DevToolbar } from '@/dev-stubs/DevToolbar.jsx';
import { experiencePortal } from '@/routes/experience.routes.jsx';
import { guidePortal } from '@/routes/guide.routes.jsx';

const portals = [experiencePortal, guidePortal];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DevToolbar />
        <AppRouter portals={portals} />
      </BrowserRouter>
    </AuthProvider>
  );
}
