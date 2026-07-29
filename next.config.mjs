/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Dockerfile sets NEXT_OUTPUT=standalone to get a self-contained
  // server; other builds (dev, Cloudflare/OpenNext) keep the default.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  allowedDevOrigins: ['192.168.8.188'],
  async redirects() {
    return [
      {
        source: '/app/:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
      {
        source: '/dashboard/info',
        destination: '/dashboard/profile',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
