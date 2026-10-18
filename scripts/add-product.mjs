// Asks questions and adds one product to data/products.json. Run it with `npm run add-product`.
// It copies the image into public/images/shop, and it writes the file only after you confirm.
// It checks the same rules as data/products.ts, and the build checks the file again.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { createInterface } from "node:readline";

const ROOT = new URL("../", import.meta.url);
const FILE = new URL("data/products.json", ROOT);
const SHOP_IMAGES = new URL("public/images/shop/", ROOT);
const IMAGE_TYPES = [".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif"];

// Read the answers one line at a time. This also works when the input is a pipe.
const lines = [];
const waiting = [];
let closed = false;
const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
rl.on("close", () => {
  closed = true;
  while (waiting.length) waiting.shift()(null);
});

async function ask(question) {
  process.stdout.write(question);
  const line = lines.length ? lines.shift() : closed ? null : await new Promise((resolve) => waiting.push(resolve));
  if (line === null) {
    console.log("\nThe input ended. Nothing was changed.");
    process.exit(1);
  }
  return line.trim();
}

// Ask until the check gives no error. A check returns the value, or throws an Error with the message to show.
async function prompt(question, check) {
  for (;;) {
    try {
      return check(await ask(question));
    } catch (err) {
      console.log(`  ${err.message}`);
    }
  }
}

// Show a numbered list. The answer is a number or the exact text of an option.
function pick(label, options) {
  const list = options.map((o, i) => `  ${i + 1}. ${o}`).join("\n");
  return prompt(`${label}:\n${list}\nChoose 1-${options.length}: `, (answer) => {
    const found = options[Number(answer) - 1] ?? options.find((o) => o.toLowerCase() === answer.toLowerCase());
    if (!found) throw new Error(`Enter a number from 1 to ${options.length}.`);
    return found;
  });
}

const text = readFileSync(FILE, "utf8");
const data = JSON.parse(text);

const name = await prompt("Product name (for example \"Flat Cap\"): ", (v) => {
  if (!v) throw new Error("Enter a name.");
  if (data.products.some((p) => p.name.toLowerCase() === v.toLowerCase())) throw new Error(`"${v}" is already a product. A name must be unique.`);
  return v;
});
const category = await pick("Category", data.categories);
const material = await pick("Material", data.materials);
const finish = await pick("Finish", data.finishes);
const price = await prompt("Price in pounds (for example 32 or 32.50): ", (v) => {
  const n = Number(v.replace(/^£/, ""));
  if (!Number.isFinite(n) || n <= 0 || !/^\d+(\.\d{1,2})?$/.test(v.replace(/^£/, ""))) throw new Error("Enter a number above 0 with 2 decimals or fewer.");
  return n;
});

console.log(`
Image: enter the path of an image file on this computer (it is copied into public/images/shop),
or a path in public/images that is already there (for example /images/shop/flat-cap.webp).
Use a square image, about 1200 x 1200.`);
let copyFrom = null;
const image = await prompt("Image: ", (v) => {
  if (v.startsWith("/images/")) {
    if (!IMAGE_TYPES.includes(extname(v).toLowerCase())) throw new Error(`The image must end in ${IMAGE_TYPES.join(", ")}.`);
    if (!existsSync(new URL(`public${v}`, ROOT))) throw new Error(`public${v} does not exist.`);
    return v;
  }
  const source = v.replace(/^~(?=\/)/, process.env.HOME ?? "~");
  if (!existsSync(source)) throw new Error(`${source} does not exist.`);
  const ext = extname(source).toLowerCase();
  if (!IMAGE_TYPES.includes(ext)) throw new Error(`The image must end in ${IMAGE_TYPES.join(", ")}.`);
  // The file name is the product name in lower case, with a hyphen between the words.
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || basename(source, ext);
  if (existsSync(new URL(`${slug}${ext}`, SHOP_IMAGES))) throw new Error(`public/images/shop/${slug}${ext} already exists. Rename the product or the file.`);
  copyFrom = { source, target: new URL(`${slug}${ext}`, SHOP_IMAGES) };
  return `/images/shop/${slug}${ext}`;
});

const line = `    ${JSON.stringify({ name, category, material, finish, price, image }).replace(/^\{/, "{ ").replace(/\}$/, " }").replace(/","/g, '", "').replace(/":/g, '": ').replace(/,"/g, ', "')}`;
console.log(`\nThis line goes in data/products.json:\n${line}${copyFrom ? `\nThis file is copied: ${copyFrom.source} -> public${image}` : ""}`);
if (!/^y(es)?$/i.test(await ask("Add the product? (y/n): "))) {
  console.log("Nothing was changed.");
  process.exit(0);
}

// Add the line at the end of the products array, and check that the file is still valid JSON.
const end = /\n  \]\n\}\s*$/;
if (!end.test(text)) {
  console.error("The end of data/products.json does not have the usual shape. Add the line by hand.");
  process.exit(1);
}
const next = text.replace(end, `,\n${line}\n  ]\n}\n`);
const check = JSON.parse(next).products.at(-1);
if (check.name !== name || check.price !== price) throw new Error("The new file is not correct. Nothing was changed.");
if (copyFrom) copyFileSync(copyFrom.source, copyFrom.target);
writeFileSync(FILE, next);

console.log(`
Done. "${name}" is in data/products.json.

Next:
  1. Run \`npm run typecheck\` and \`npm run dev\`, and look at /shop.
  2. Update the tests that count the products: PRODUCTS and toHaveLength in tests/desktop.spec.ts.
  3. Run \`npm test\`.`);
rl.close();
