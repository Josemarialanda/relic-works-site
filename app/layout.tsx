import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/Footer";
import { TopNav } from "@/components/TopNav";
import "./globals.css";
import styles from "./layout.module.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-inter-next" });

export const metadata: Metadata = {
  title: { default: "Relic Works", template: "%s — Relic Works" },
  description: "Stems, spacers and caps, turned, milled and finished in the UK.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className={styles.page}>
          <TopNav />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
