import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@oserp-community/ui"],
  serverExternalPackages: ["@libsql/client", "libsql"],
}

export default nextConfig
