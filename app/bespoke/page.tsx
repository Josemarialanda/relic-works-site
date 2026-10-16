import type { Metadata } from "next";
import { Bespoke } from "@/components/Bespoke";

export const metadata: Metadata = { title: "Bespoke" };

export default function BespokePage() {
  return <Bespoke />;
}
