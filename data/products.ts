// The products of the shop. Edit data/products.json: a name, a price, a material, a finish or an image path.
// A price is in pounds. An image is a path in public/images. A name must be unique, and a saved bag finds a
// product by its name. See data/README.md.

import raw from "./products.json";
import { fail, money, object, array, oneOf, string, strings } from "./validate";

export type Category = string;
export type Material = string;
export type Finish = string;

export type Product = { name: string; cat: Category; mat: Material; fin: Finish; price: number; image: string };

const FILE = "products.json";

export function parseProducts(data: unknown): { categories: string[]; materials: string[]; finishes: string[]; products: Product[] } {
  const root = object(data, FILE, "the file");
  const categories = strings(root.categories, FILE, "categories");
  const materials = strings(root.materials, FILE, "materials");
  const finishes = strings(root.finishes, FILE, "finishes");

  const products = array(root.products, FILE, "products").map((item, i): Product => {
    const where = `products[${i}]`;
    const p = object(item, FILE, where);
    const image = string(p.image, FILE, `${where}.image`);
    if (!/^\/images\/.+\.(svg|png|jpe?g|webp|avif)$/i.test(image)) {
      fail(FILE, `${where}.image`, "must be a path in public/images that ends in .svg, .png, .jpg, .webp or .avif, for example /images/shop/flat-cap.webp");
    }
    return {
      name: string(p.name, FILE, `${where}.name`),
      cat: oneOf(p.category, categories, FILE, `${where}.category`),
      mat: oneOf(p.material, materials, FILE, `${where}.material`),
      fin: oneOf(p.finish, finishes, FILE, `${where}.finish`),
      price: money(p.price, FILE, `${where}.price`, { above: true }),
      image,
    };
  });

  products.forEach((p, i) => {
    if (products.findIndex((q) => q.name === p.name) !== i) fail(FILE, `products[${i}].name`, `"${p.name}" is used by more than one product`);
  });
  // The "From £n" labels need a product in each category.
  for (const c of categories) if (!products.some((p) => p.cat === c)) fail(FILE, "products", `the category "${c}" has no product`);
  return { categories, materials, finishes, products };
}

const parsed = parseProducts(raw);

export const CATEGORIES = parsed.categories;
export const MATERIALS = parsed.materials;
export const FINISHES = parsed.finishes;
export const PRODUCTS = parsed.products;
