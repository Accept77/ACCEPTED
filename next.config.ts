import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/restaurant-images/**",
      },
      {
        protocol: "https",
        hostname: "*.pstatic.net",
      },
      {
        protocol: "https",
        hostname: "*.naver.com",
      },
      {
        protocol: "https",
        hostname: "*.naver.net",
      },
    ],
  },
};

export default nextConfig;
