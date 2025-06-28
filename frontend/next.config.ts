import type { NextConfig } from "next";
import { ENV } from "./src/config/env";

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
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: ENV.BACKEND_PORT,
        pathname: '/api/v1/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: ENV.BACKEND_PORT,
        pathname: '/api/v1/**',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: ENV.BACKEND_PORT,
        pathname: '/api/v1/**',
      },
      {
        protocol: 'https',
        hostname: 'backend',
        port: ENV.BACKEND_PORT,
        pathname: '/api/v1/**',
      },
    ],
  },
  
  // Configuration options can be added here as needed
};

export default nextConfig;
