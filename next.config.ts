import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      "image.tmdb.org",
      "media.rawg.io",
      "covers.openlibrary.org",
      "m.media-amazon.com",
    ],
  },
};

export default nextConfig;
