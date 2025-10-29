import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "media.rawg.io",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "books.google.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "books.google.com",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
