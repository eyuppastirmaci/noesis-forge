import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Disable ESLint during build for Docker (temporary)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build for Docker (temporary)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image optimization for standalone mode
  images: {
    unoptimized: true,
  },
  
  // Configuration options can be added here as needed
};

export default nextConfig;
