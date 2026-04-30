/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: [],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
