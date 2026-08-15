/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Tauri: generate a fully static site
  output: 'export',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
