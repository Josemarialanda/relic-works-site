import type { Metadata } from "next";
import { Bag } from "@/components/Bag";

export const metadata: Metadata = { title: "Bag" };

export default function BagPage() {
  return <Bag />;
}
