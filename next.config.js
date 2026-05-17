// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process');

let gitCommit = 'unknown';
try {
  gitCommit = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
} catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: [],
  allowedDevOrigins: ['192.168.2.107'],
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
  },
};

module.exports = nextConfig;
