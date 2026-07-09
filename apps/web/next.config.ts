import path from "node:path";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isDesktopBuild = process.env.ST_MANAGER_DESKTOP_BUILD === "1";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  cacheStartUrl: true,
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

const packagesDir = path.resolve(__dirname, "../../packages");

const workspaceSourceAliasesRelative = {
  "@st-manager/api-sdk": "../../packages/api-sdk/src/index.ts",
  "@st-manager/constants": "../../packages/constants/src/index.ts",
  "@st-manager/contracts": "../../packages/contracts/src/index.ts",
  "@st-manager/types": "../../packages/types/src/index.ts",
  "@st-manager/validation": "../../packages/validation/src/index.ts",
};

const workspaceSourceAliasesAbsolute = {
  "@st-manager/api-sdk": path.join(packagesDir, "api-sdk/src/index.ts"),
  "@st-manager/constants": path.join(packagesDir, "constants/src/index.ts"),
  "@st-manager/contracts": path.join(packagesDir, "contracts/src/index.ts"),
  "@st-manager/types": path.join(packagesDir, "types/src/index.ts"),
  "@st-manager/validation": path.join(packagesDir, "validation/src/index.ts"),
};

const sharedConfig: NextConfig = {
  transpilePackages: [
    "@st-manager/ui",
    "@st-manager/theme",
    "@st-manager/api-sdk",
    "@st-manager/contracts",
    "@st-manager/types",
    "@st-manager/constants",
    "@st-manager/validation",
  ],
  async redirects() {
    return [
      { source: "/calendar", destination: "/bookings", permanent: true },
      { source: "/calendar/new", destination: "/bookings/new", permanent: true },
      { source: "/calendar/:id", destination: "/bookings/:id", permanent: true },
    ];
  },
  turbopack: {
    resolveAlias: workspaceSourceAliasesRelative,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...workspaceSourceAliasesAbsolute,
    };
    return config;
  },
};

const webConfig: NextConfig = {
  ...sharedConfig,
  async rewrites() {
    return [
      { source: "/api/auth", destination: "http://localhost:4000/auth" },
      { source: "/api/auth/:path*", destination: "http://localhost:4000/auth/:path*" },
      { source: "/api/studios", destination: "http://localhost:4000/studios" },
      { source: "/api/studios/:path*", destination: "http://localhost:4000/studios/:path*" },
      { source: "/api/health", destination: "http://localhost:4000/health" },
      { source: "/api/sync", destination: "http://localhost:4000/sync" },
      { source: "/api/sync/:path*", destination: "http://localhost:4000/sync/:path*" },
      { source: "/api/ai", destination: "http://localhost:4000/ai" },
      { source: "/api/ai/:path*", destination: "http://localhost:4000/ai/:path*" },
      { source: "/api/dashboard", destination: "http://localhost:4000/dashboard" },
      { source: "/api/dashboard/:path*", destination: "http://localhost:4000/dashboard/:path*" },
      { source: "/api/clients", destination: "http://localhost:4000/clients" },
      { source: "/api/clients/:path*", destination: "http://localhost:4000/clients/:path*" },
      { source: "/api/bookings", destination: "http://localhost:4000/bookings" },
      { source: "/api/bookings/:path*", destination: "http://localhost:4000/bookings/:path*" },
      { source: "/api/sessions", destination: "http://localhost:4000/sessions" },
      { source: "/api/sessions/:path*", destination: "http://localhost:4000/sessions/:path*" },
      { source: "/api/invoices", destination: "http://localhost:4000/invoices" },
      { source: "/api/invoices/:path*", destination: "http://localhost:4000/invoices/:path*" },
      { source: "/api/reports", destination: "http://localhost:4000/reports" },
      { source: "/api/reports/:path*", destination: "http://localhost:4000/reports/:path*" },
      { source: "/api/team-members", destination: "http://localhost:4000/team-members" },
      { source: "/api/team-members/:path*", destination: "http://localhost:4000/team-members/:path*" },
      { source: "/api/invitations", destination: "http://localhost:4000/invitations" },
      { source: "/api/invitations/:path*", destination: "http://localhost:4000/invitations/:path*" },
      { source: "/api/permissions", destination: "http://localhost:4000/permissions" },
      { source: "/api/permissions/:path*", destination: "http://localhost:4000/permissions/:path*" },
    ];
  },
};

const desktopConfig: NextConfig = {
  ...sharedConfig,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

const nextConfig = isDesktopBuild ? desktopConfig : webConfig;

export default isDesktopBuild ? nextConfig : withPWA(nextConfig);
