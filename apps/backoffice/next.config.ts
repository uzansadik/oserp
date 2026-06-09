import type { NextConfig } from "next"

// Standalone ciktisinin pnpm workspace kokunden tracing yapmasi icin.
// `next build` apps/backoffice dizininden calistirildigi icin son segmenti kirpiyoruz.
// Hem POSIX hem Windows path separator'larini destekler.
const repoRoot = process.cwd().replace(/[\\/]apps[\\/]backoffice[\\/]?$/, "")

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  transpilePackages: ["@oserp-community/ui"],
  serverExternalPackages: ["@libsql/client", "libsql", "dockerode", "argon2"],
}

export default nextConfig
