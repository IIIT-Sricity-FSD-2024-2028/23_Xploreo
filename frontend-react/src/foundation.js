// TEMP-STUB ─────────────────────────────────────────────────────────────────
// The ONE seam between M2's code and M1's foundation.
//
// Every M2 file imports auth, the HTTP client, the mock kit and the shared
// components from "@/foundation" and nowhere else. When M1's real foundation
// (react-foundation) is merged, repoint the re-exports below at M1's real files
// and delete src/dev-stubs/. No page or service needs to change.
//
// See frontend-react/MERGE_NOTES.md for the exact swap list.
// ────────────────────────────────────────────────────────────────────────────

export { useAuth, AuthProvider } from '@/dev-stubs/auth/AuthContext.jsx';
export { request } from '@/dev-stubs/http/request.js';
export { ApiError } from '@/dev-stubs/http/ApiError.js';
export {
  registerMock,
  requireUser,
  requireRole,
  assertRegion,
  assertOwner,
  whitelist,
} from '@/dev-stubs/mock/index.js';
export { Navbar } from '@/dev-stubs/components/common/index.jsx';
