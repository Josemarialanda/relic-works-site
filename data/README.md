# Site data

This folder has the data that you edit to change the shop: products, prices, bespoke options and delivery.
The data is in JSON files. The `.ts` file with the same name loads the JSON and checks it. The code that
uses the data (price rules, totals) is in `lib/`.

| File | What you edit |
|---|---|
| `products.json` | The catalogue products: name, category, material, finish, price (in pounds) and image path. |
| `bespoke.json` | The bespoke options, the default choices, the limits of the custom sizes, and the **price rules**. |
| `shipping.json` | The delivery zones: price, free-delivery limit, text, and the countries of each zone. |

## How a change reaches the site

- The shop pages, the bag and the checkout server all read these files, so a price changes everywhere at once.
  The server prices each order from these files and ignores any price that the browser sends.
- A change goes live when you deploy. Run `npm test` first: some tests check prices, so update them with the price.
- Every file is checked when the site builds. A wrong value stops the build with a message that names the file
  and the field, for example `data/products.json: products[4].price: must be a number above 0`. A JSON syntax error
  (a missing comma or quote) also stops the build. Nobody sees a wrong value on the live site.
- JSON has no comments, so the rules are here.

## products.json

To add a product, run `npm run add-product`. The script asks for each field, copies the image, and adds the line.
You can also add the line by hand:

```json
{ "name": "Flat Cap", "category": "Caps", "material": "Aluminium", "finish": "Painted", "price": 32, "image": "/images/shop/flat-cap.jpg" }
```

- `name` must be different for each product. A saved bag finds a product by its name, so a changed name removes
  the old product from the bags that customers have saved.
- `category`, `material` and `finish` must be in the lists at the top of the file (`categories`, `materials`,
  `finishes`). Each category needs at least one product.
- `price` is in pounds, with at most 2 decimal places (for example `19.99`).
- `image` is a path in `public/images` that ends in `.svg`, `.png`, `.jpg`, `.webp` or `.avif`. The test
  `npm test` checks that the file exists. See `public/README.md`.

## shipping.json

- `id`: short name in lower case (for example `uk`). `price` and `freeFrom` are in pounds. `freeFrom` is optional.
- `countries`: two-letter country codes in capitals (`GB`). A country can be in one zone only.
- `note` is shown in the bag and on the support page.

## bespoke.json

- `parts`: for stems, spacers and caps: the `name`, the `basePrice`, the `type` options, and the `height` options
  with the `customRange` (the lowest and highest custom height, in mm). `initial` must be one of the `options`.
- `materials`, `bonds`, `finishes`, `lengths`, `angles`, `colors`: the choices on the bespoke page. `Custom` in a
  list shows the box where the customer types a size.
- `defaults`: the choices that the page starts with. Each must be in its list.
- `customRange`: the lowest and highest custom length (mm) and angle (degrees).
- `pricing`: the price is `basePrice × materialFactor × (1 + extras)`, rounded to whole pounds. The extras are
  fractions: `0.1` is 10%. Each material, bond and finish needs a number. **These numbers are placeholders.**
- **Do not rename these values.** The code uses them: the material `Steel` (only steel can be brazed), the bonds
  `Brazed` and `Welded`, the finish `Painted` (it has a colour), and the cap type `Flat cap` (it has no height).
  The build stops with a message if one is missing.
