import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Ignore TypeScript errors during build
        ignoreBuildErrors: true,
    },
    // Disable source maps in production to reduce bundle size
    productionBrowserSourceMaps: false,
    // Increase build output trace to debug deployment issues
    outputFileTracingRoot: process.cwd(),

    // Optimize images
    images: {
        // Configure domains if you're using external image sources
        domains: [],
        // Configure remote patterns for more granular control
        remotePatterns: [
            // Example: Allow images from specific domains
            // {
            //   protocol: 'https',
            //   hostname: 'example.com',
            // },
        ],
    },
};

export default nextConfig;
