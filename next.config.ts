import type { NextConfig } from "next";

const r2PublicPattern = (() => {
  const value = process.env.R2_PUBLIC_BASE_URL;
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    return {
      protocol:
        url.protocol === "https:" ? ("https" as const) : ("http" as const),
      hostname: url.hostname,
      pathname: "/**",
    };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(r2PublicPattern ? [r2PublicPattern] : []),
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
  allowedDevOrigins: ["172.30.1.87"],
};

export default nextConfig;
