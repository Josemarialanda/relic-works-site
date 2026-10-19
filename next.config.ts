import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shop images are hosted by Stripe (you upload them in the Stripe dashboard).
  images: { remotePatterns: [{ protocol: "https", hostname: "files.stripe.com" }] },
};

export default nextConfig;
