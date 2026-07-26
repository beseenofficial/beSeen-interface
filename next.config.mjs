import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/app/:path*",
        destination: "/dashboard/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/info",
        destination: "/dashboard/profile",
        permanent: true,
      },
    ];
  },
  webpack(config) {
    // libsodium-wrappers 0.7.x publishes an ESM entry that references a file
    // omitted from its own package. The supported CJS build correctly resolves
    // the separate `libsodium` dependency and is browser-compatible.
    config.resolve.alias["libsodium-wrappers$"] = path.resolve(
      "node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js",
    );
    return config;
  },
};

export default nextConfig;
