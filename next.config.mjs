/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
