import type { NextConfig } from "next";
import nextra from "nextra";

// 1. Correct Nextra 4 initialization
const withNextra = nextra({
  // Configuration options like markdown plugins can go here if needed
});

// 2. Define your clean Next.js options (Nextra properties removed from here)
const nextConfig: NextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: false,
    outputFileTracingRoot: process.cwd(),

    images: {
        domains: [],
        remotePatterns: [],
    },
};

// 3. Apply the wrapper around your clean nextConfig
export default withNextra(nextConfig)