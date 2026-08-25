import type { NextConfig } from "next";

// Served under aitc.pvamu.edu/cafnr/ced-direct. basePath is baked in at build
// time, so NEXT_PUBLIC_BASE_PATH must be set when running `npm run build` and
// must match AUTH_URL's path, the web.config rewrite, and the Entra redirect URI.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ['148.113.196.5'],
  poweredByHeader: false,
  basePath: basePath || undefined,
};

export default nextConfig;
