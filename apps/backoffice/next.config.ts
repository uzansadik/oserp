import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@oserp-community/ui"],
  serverExternalPackages: ["@libsql/client", "libsql", "dockerode", "argon2"],
}

export default nextConfig
