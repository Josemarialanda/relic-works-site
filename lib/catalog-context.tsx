"use client";

import { createContext, useContext } from "react";
import type { Catalog } from "./catalog";

const CatalogContext = createContext<Catalog | null>(null);

// The layout reads the catalog from Stripe on the server and gives it to the browser code here.
export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export function useCatalog(): Catalog {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("useCatalog needs a CatalogProvider");
  return catalog;
}
