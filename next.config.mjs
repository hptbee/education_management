/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Tauri: generate a fully static site
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
