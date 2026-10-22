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

  // forbidden() for deep links to a page the role may not open (SCRUM-21).
  experimental: { authInterrupts: true },
};

export default nextConfig;
