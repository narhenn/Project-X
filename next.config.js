/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // avoids YouTube IFrame API null.src when mount→unmount→mount (see VideoPlayer)
  serverExternalPackages: ['pdf-parse'],
  // Limit image optimizer exposure (GHSA-9g9p-9gw9-jx7f). Use only trusted domains.
  images: {
    domains: ['firebasestorage.googleapis.com'],
    remotePatterns: [], // Do not add untrusted remotePatterns to avoid DoS
  },
};

module.exports = nextConfig;
