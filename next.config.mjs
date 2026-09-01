/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tauri (disabled): static export → `out/` for desktop bundling
  // output: 'export',
  output: 'standalone',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
