import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ships a self-contained server bundle so the runtime image needs no
  // node_modules install — see Dockerfile.
  output: "standalone",

  // Load-bearing, and coupled to infra/modules/compute/main.tf: the ALB serves
  // frontend-public on the default action and forwards only /admin* here
  // (listener rule priority 20). Without basePath every asset request would
  // come back as /_next/... , miss that rule, and 404 against the public app.
  // Changing this means changing the listener rule's path_pattern too.
  basePath: "/admin",
};

export default nextConfig;
