# Site data

This folder has the data that you edit to change the shop: products, prices, bespoke options and delivery.
It has no logic. The code that uses the data (checks, price rules, totals) is in `lib/`.

| File | What you edit |
|---|---|
| `products.ts` | The catalogue products: name, category, material, finish, price (in pounds) and image path. |
| `bespoke.ts` | The bespoke options (types, sizes, materials, finishes, colours), the limit of each custom size, and the **price rules**. |
| `shipping.ts` | The delivery zones: price, free-delivery limit, text, and the countries of each zone. |

## How a change reaches the site

- The shop pages, the bag and the checkout server all read these files, so a price changes everywhere at once. The server
  prices each order from these files and ignores any price that the browser sends.
- A change goes live when you deploy. Run `npm test` first: some tests check prices, so update them with the price.
- A name must be unique. A saved bag finds a product by its name, so a changed name removes the old product from the
  bags that customers have saved.
- An image path must point to a file in `public/images`. See `public/README.md`.
