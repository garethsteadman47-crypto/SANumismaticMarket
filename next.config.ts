import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Listing photos are arbitrary seller-supplied URLs (no dedicated file
    // storage yet — see the UploadThing/S3 roadmap note in the README), so
    // we can't know the hostname ahead of time. Once uploads move behind
    // UploadThing/S3, narrow this to that provider's hostname.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
