// The single seam the Guide, Experience and Partner pages import auth, the HTTP client, the
// mock kit and the shared Navbar from. Ported from frontend-react's dev-stub contract, now
// backed by the in-memory session and real request() (hits the actual
// backend, with the Mock Kit answering routes VITE_MOCKS still names).
export { useAuth } from '@/context/AuthContext.jsx';
export { request } from '@/services/request.js';
export { ApiError } from '@/services/ApiError.js';
export {
  registerMock,
  requireUser,
  requireRole,
  assertRegion,
  assertOwner,
  whitelist,
} from '@/lib/mockKit/index.js';
export { Navbar } from '@/components/portal/Navbar.jsx';
export { default as ImageUploader } from '@/components/common/ImageUploader.jsx';
