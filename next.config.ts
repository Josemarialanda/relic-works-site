import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shop images are hosted by Stripe (you upload them in the Stripe dashboard).
  // The cartoon drawings use quality 90, so their black lines stay sharp. The photos use the default 75.
  images: { remotePatterns: [{ protocol: "https", hostname: "files.stripe.com" }], qualities: [75, 90] },
};

export default nextConfig;
