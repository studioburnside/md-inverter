/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Output export for static hosting (Vercel, Netlify, or burnsidecloud-mach1)
  output: "export",
  // No trailingSlash needed for export
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;