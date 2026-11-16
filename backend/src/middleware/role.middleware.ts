// Backwards-compatible re-export. The canonical RBAC implementation
// lives in ./rbac.middleware.ts so there is a single source of truth.
export { authorizeRoles } from "./rbac.middleware.js";
