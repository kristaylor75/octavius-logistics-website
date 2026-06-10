import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray lockfile higher in the
  // filesystem can otherwise make Next infer the wrong root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Turbopack's persistent (on-disk) dev cache is default-on in Next 16.2.7
    // but intermittently wedges on this machine — it fails to write its SST
    // store ("Persisting failed: Unable to write SST file 00000001.sst"),
    // which then breaks every manifest and 500s `next dev`. Disabling it falls
    // back to in-memory caching (reliable; only cold-start caching is lost).
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
