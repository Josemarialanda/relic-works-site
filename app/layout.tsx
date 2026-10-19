import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/Footer";
import { getCatalog } from "@/lib/catalog-server";
import { CatalogProvider } from "@/lib/catalog-context";
import { TopNav } from "@/components/TopNav";
import "./globals.css";
import styles from "./layout.module.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-inter-next" });

// The address of the site. The share image needs a full address, so the metadata needs a base. Set
// NEXT_PUBLIC_SITE_URL (for example https://relicworks.co.uk). Without it, the build uses the production
// address that Vercel gives, and then localhost.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const DESCRIPTION = "Stems, spacers and caps, turned, milled and finished in the UK.";

// The picture that shows when someone shares a link. Most apps need a PNG or a JPG here, not an SVG.
// When you have the real image, change the file name here.
const SHARE_IMAGE = { url: "/images/brand/og-image.svg", width: 1200, height: 630, alt: "Relic Works" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Relic Works", template: "%s — Relic Works" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Relic Works", title: "Relic Works", description: DESCRIPTION, images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Relic Works", description: DESCRIPTION, images: [SHARE_IMAGE.url] },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <CatalogProvider catalog={catalog}>
          <div className={styles.page}>
            <TopNav />
            {children}
            <Footer />
          </div>
        </CatalogProvider>
      </body>
    </html>
  );
}
