/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clawtrade/ui', '@clawtrade/config'],
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
    WS_URL: process.env.WS_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
