/** @type {import('next').NextConfig} */
const path = require('path')
const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '..'),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
    ],
  },
}

module.exports = withSentryConfig(nextConfig, {
  // Sentry organisation / project (set via SENTRY_ORG / SENTRY_PROJECT env vars or here)
  silent: true,

  // Upload source maps only when a Sentry auth token is present (CI/CD)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Tunnel Sentry requests through the Next.js server to avoid ad-blocker interference
  tunnelRoute: '/monitoring-tunnel',
})
