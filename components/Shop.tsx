"use client";

import { useEffect, useMemo, useState } from "react";
import { addToBag } from "@/lib/bag";
import { CATEGORIES, FINISHES, MATERIALS, PRODUCTS, type Category, type Product } from "@/lib/catalog";
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

function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

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
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>("Featured");

  // The URL hash (for example #Stems) selects one category.
  useEffect(() => {
    const readHash = () => {
      const c = decodeURIComponent(window.location.hash.slice(1));
      if (isCategory(c)) setFilters((f) => ({ ...f, cats: [c] }));
      else if (!c) setFilters((f) => ({ ...f, cats: [] }));
      window.scrollTo(0, 0);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const toggle = (key: FilterKey, v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  const list = useMemo(() => {
    const l = PRODUCTS.filter((p) => matches(p, filters));
    if (sort === "Price ↑") return [...l].sort((a, b) => a.price - b.price);
    if (sort === "Price ↓") return [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [filters, sort]);

  const groups = (filters.cats.length ? CATEGORIES.filter((c) => filters.cats.includes(c)) : CATEGORIES)
    .map((c) => ({ name: c, items: list.filter((p) => p.cat === c) }))
    .filter((g) => g.items.length > 0);

  const filterGroups: { title: string; key: FilterKey; values: readonly string[] }[] = [
    { title: "Product", key: "cats", values: CATEGORIES },
    { title: "Material", key: "mats", values: MATERIALS },
    { title: "Finish", key: "fins", values: FINISHES },
  ];

  const hasFilters = filters.cats.length + filters.mats.length + filters.fins.length > 0;
  const clearAll = () => setFilters(NO_FILTERS);

  return (
    <div className={layout.withSidebar}>
      <aside className={layout.ruleR}>
        <div className={cx(layout.sticky, layout.stack)}>
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
      </aside>

      <main className={layout.stack}>
        <div className={cx("meta", layout.ruleB, styles.toolbar)}>
          <span>{list.length} products</span>
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
                  <ProductCard name={p.name} price={`£${p.price}`} meta={specOf(p)} />
                  <button
                    type="button"
                    className={cx(button.button, button.small, button.block)}
                    onClick={() => addToBag({ key: `${p.name}|${specOf(p)}`, type: p.cat, name: p.name, spec: specOf(p), price: p.price, image: null })}
                  >
                    Add to bag
                  </button>
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
