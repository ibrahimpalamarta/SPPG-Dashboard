import type { NextConfig } from "next";

// Coupled to ADMIN_BASE_URL (".../admin") in infra/modules/app/main.tf and to
// the session cookie path. On Cloud Run this app has its own origin, so routing
// no longer needs it; dropping it means changing those together.
const basePath = "/admin";

const nextConfig: NextConfig = {
  // Ships a self-contained server bundle so the runtime image needs no
  // node_modules install — see Dockerfile.
  output: "standalone",

  basePath,

  // Read by the session cookie path (lib/session.ts) and the reset links. Derived
  // here so basePath stays the one source.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },

  experimental: {
    // forbidden() for deep links to a page the role may not open (SCRUM-21).
    authInterrupts: true,
    // SCRUM-5: uploads go browser → Server Action → backend. Both limits sit
    // just above the backend's UPLOAD_MAX_BYTES (10 MB) to leave room for the
    // multipart overhead; the backend stays the one that enforces the cap.
    serverActions: { bodySizeLimit: "11mb" },
    proxyClientMaxBodySize: "11mb",
  },
};

export default nextConfig;
