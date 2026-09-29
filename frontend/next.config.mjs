/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  // Gọi backend qua cùng origin: cookie phiên HTTP-only đi kèm tự nhiên, không cần CORS.
  async rewrites() {
    const api = process.env.API_URL || 'http://localhost:8000';
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  }
};

export default nextConfig;
