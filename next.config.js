/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: [],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
