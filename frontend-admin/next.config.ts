import type { NextConfig } from "next";

// Load-bearing, and coupled to infra/modules/compute/main.tf: the ALB serves
// frontend-public on the default action and forwards only /admin* here
// (listener rule priority 20). Without basePath every asset request would
// come back as /_next/... , miss that rule, and 404 against the public app.
// Changing this means changing the listener rule's path_pattern too.
const basePath = "/admin";

const nextConfig: NextConfig = {
  // Ships a self-contained server bundle so the runtime image needs no
  // node_modules install — see Dockerfile.
  output: "standalone",

  basePath,

  // The Auth0 SDK mounts /auth/* under this prefix, and plain <a> links to
  // those routes need it too. Derived here so basePath stays the one source.
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
