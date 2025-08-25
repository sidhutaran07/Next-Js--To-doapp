/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // faster builds
  images: {
    domains: [], // add domains if you fetch images from Supabase storage
  },
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;
