import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ships a self-contained server bundle so the runtime image needs no
  // node_modules install — see Dockerfile.
  output: "standalone",
};

export default nextConfig;
