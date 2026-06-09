/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clausage/shared'],
  // Keep native/WASM DB drivers out of the bundle; load them at runtime.
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  // Redirect the www subdomain to the apex domain (permanent / 308).
  redirects: async () => [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.clausage.com' }],
      destination: 'https://clausage.com/:path*',
      permanent: true,
    },
  ],
};

export default nextConfig;
