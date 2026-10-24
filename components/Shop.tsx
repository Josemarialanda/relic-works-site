"use client";

import { useEffect, useMemo, useState } from "react";
import { addToBag, useBag } from "@/lib/bag";
import { MAX_QTY, maxQty, type Product } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalog-context";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import { ProductCard } from "./ProductCard";
import styles from "./Shop.module.css";
import button from "./ui/button.module.css";

type FilterKey = "cats" | "mats" | "fins";
type Filters = Record<FilterKey, string[]>;

const FIELD: Record<FilterKey, keyof Product> = { cats: "cat", mats: "mat", fins: "fin" };
const SORTS = ["Featured", "Price ↑", "Price ↓"] as const;
type Sort = (typeof SORTS)[number];

const NO_FILTERS: Filters = { cats: [], mats: [], fins: [] };

// A product matches when it passes every filter group, except the group in `skip`.
function matches(p: Product, f: Filters, skip?: FilterKey): boolean {
  return (Object.keys(FIELD) as FilterKey[]).every(
    (k) => k === skip || f[k].length === 0 || f[k].includes(p[FIELD[k]] as string),
  );
}

function specOf(p: Product): string {
  return `${p.mat} · ${p.fin}`;
}

export function Shop() {
  const { categories: CATEGORIES, materials: MATERIALS, finishes: FINISHES, products: PRODUCTS } = useCatalog();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>("Featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const bag = useBag();
  // The products that the customer tried to add after the bag had the most of them. The note shows for these.
  const [tried, setTried] = useState<ReadonlySet<string>>(new Set());

  // The URL hash (for example #Stems) selects one category.
  useEffect(() => {
    const readHash = () => {
      const c = decodeURIComponent(window.location.hash.slice(1));
      if (CATEGORIES.includes(c)) setFilters((f) => ({ ...f, cats: [c] }));
      else if (!c) setFilters((f) => ({ ...f, cats: [] }));
      window.scrollTo(0, 0);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [CATEGORIES]);

  const toggle = (key: FilterKey, v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  const list = useMemo(() => {
    const l = PRODUCTS.filter((p) => matches(p, filters));
    if (sort === "Price ↑") return [...l].sort((a, b) => a.price - b.price);
    if (sort === "Price ↓") return [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [PRODUCTS, filters, sort]);

  const groups = (filters.cats.length ? CATEGORIES.filter((c) => filters.cats.includes(c)) : CATEGORIES)
    .map((c) => ({ name: c, items: list.filter((p) => p.cat === c) }))
    .filter((g) => g.items.length > 0);

  const filterGroups: { title: string; key: FilterKey; values: readonly string[] }[] = [
    { title: "Product", key: "cats", values: CATEGORIES },
    { title: "Material", key: "mats", values: MATERIALS },
    { title: "Finish", key: "fins", values: FINISHES },
  ];

  const filterCount = filters.cats.length + filters.mats.length + filters.fins.length;
  const hasFilters = filterCount > 0;
  const clearAll = () => setFilters(NO_FILTERS);

  return (
    <div className={layout.withSidebar}>
      <aside className={layout.ruleR}>
        {/* Phone only: the filters are closed at first, so the products show first. */}
        <button type="button" className={cx("meta-b", styles.filterToggle)} aria-expanded={filtersOpen} aria-controls="shop-filters" onClick={() => setFiltersOpen((o) => !o)}>
          <span>Filters ({filterCount})</span>
          <span aria-hidden>{filtersOpen ? "−" : "+"}</span>
        </button>
        <div id="shop-filters" className={cx(layout.sticky, filtersOpen ? styles.filtersOpen : styles.filtersClosed)}>
          <div className={layout.stack}>
            {filterGroups.map((g) => (
              <div key={g.key} className={cx(layout.stack, layout.gap12, layout.ruleB, styles.filterGroup)}>
                <span className="meta-b">{g.title}</span>
                {g.values.map((v) => {
                  const on = filters[g.key].includes(v);
                  const count = PRODUCTS.filter((p) => p[FIELD[g.key]] === v && matches(p, filters, g.key)).length;
                  return (
                    <button key={v} type="button" className={styles.option} aria-pressed={on} onClick={() => toggle(g.key, v)}>
                      <span className={styles.box} />
                      <span className={styles.optionLabel}>{v}</span>
                      <span className="meta muted">{count}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {hasFilters && (
              <div className={layout.cell}>
                <button type="button" className={button.text} onClick={clearAll}>
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className={layout.stack}>
        <div className={cx("meta", layout.ruleB, styles.toolbar)}>
          <span className={styles.count}>{list.length} products</span>
          <div className={styles.sorts}>
            <span className="muted">Sort</span>
            {SORTS.map((s) => (
              <button key={s} type="button" className={cx("meta", styles.sort)} aria-pressed={s === sort} onClick={() => setSort(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {groups.map((g) => (
          <section key={g.name} className={layout.ruleB}>
            <div className={layout.sectionHead}>
              <span className="heading">{g.name}</span>
              <span className="meta">{g.items.length} products</span>
            </div>
            <div className={styles.products}>
              {g.items.map((p) => (
                <div key={p.name} className={cx(layout.stack, layout.gap12)}>
                  <ProductCard name={p.name} price={`£${p.price}`} meta={specOf(p)} image={p.image} soldOut={p.stock === 0} />
                  <button
                    type="button"
                    className={cx(button.button, button.small, button.block)}
                    disabled={p.stock === 0}
                    onClick={() => {
                      const key = `${p.name}|${specOf(p)}`;
                      if ((bag.find((i) => i.key === key)?.qty ?? 0) >= maxQty(p)) return setTried((s) => new Set(s).add(p.name));
                      addToBag({ key, type: p.cat, name: p.name, spec: specOf(p), price: p.price, image: p.image }, maxQty(p));
                    }}
                  >
                    {p.stock === 0 ? "Sold out" : "Add to bag"}
                  </button>
                  {tried.has(p.name) && (bag.find((i) => i.key === `${p.name}|${specOf(p)}`)?.qty ?? 0) >= maxQty(p) && (
                    <span className="meta" role="status">
                      {p.stock !== null && p.stock < MAX_QTY ? `Only ${p.stock} in stock. You have all of them in your bag.` : `You can order up to ${MAX_QTY} of one item.`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {groups.length === 0 && (
          <div className={cx(layout.stack, layout.gap12, styles.empty)}>
            <span className="subheading">Nothing matches those filters.</span>
            <button type="button" className={button.text} onClick={clearAll}>
              Clear all filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
