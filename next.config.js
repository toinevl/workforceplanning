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

  // Security headers — applied to every route (Next.js `headers()` config key).
  // This is the static next.config.js `headers` function, which is distinct from
  // the runtime `headers()` async function imported from `next/headers` that
  // became async-only in Next.js 16. The config-key API is unchanged in v16.
  // NOTE on script-src: a static CSP cannot use nonces. `script-src 'self'`
  // deliberately omits 'unsafe-inline' to block injected scripts. Next.js App
  // Router emits some inline runtime scripts (RSC flight data); for full
  // production runtime enforcement a nonce-based CSP set in middleware is the
  // recommended upgrade path, but that is out of scope for this change.
  // NOTE on style-src 'unsafe-inline': REQUIRED for Tailwind CSS v4 (which
  // injects generated styles inline) and Next.js styled-jsx/runtime. This is
  // the accepted minimum for this app.
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
