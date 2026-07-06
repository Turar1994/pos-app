/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Disable filesystem cache — prevents cache corruption on Windows
    config.cache = false
    return config
  },
}
module.exports = nextConfig
