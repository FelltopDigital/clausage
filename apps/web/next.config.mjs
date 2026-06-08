/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clusage/shared'],
  // Keep native/WASM DB drivers out of the bundle; load them at runtime.
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
};

export default nextConfig;
