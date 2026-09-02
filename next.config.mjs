/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tauri (disabled): static export → `out/` for desktop bundling
  // output: 'export',
  // Standalone for Cloudflare (OpenNext). Disabled on Vercel — Next 16.3 skips
  // next-server.js.nft.json when an adapter is present, which breaks Vercel deploy.
  // See https://github.com/vercel/next.js/issues/96646
  output: process.env.VERCEL ? undefined : 'standalone',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
