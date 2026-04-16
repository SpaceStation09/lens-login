import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@lens-protocol/client"],
  transpilePackages: ["@demo/lens-login"],
};

export default nextConfig;
