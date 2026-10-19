# Site data

This folder has the data that you edit to change the shop: bespoke options and delivery. The products are in Stripe (see below).
The data is in JSON files. The `.ts` file with the same name loads the JSON and checks it. The code that
uses the data (price rules, totals) is in `lib/`.

| File | What you edit |
|---|---|
| `bespoke.json` | The bespoke options, the default choices, the limits of the custom sizes, and the **price rules**. |
| `shipping.json` | The delivery zones: price, free-delivery limit, text, and the countries of each zone. |

## How a change reaches the site

- The shop pages, the bag and the checkout server all read these files, so a price changes everywhere at once.
  The server prices each order from these files and ignores any price that the browser sends.
- A change goes live when you deploy. Run `npm test` first: some tests check prices, so update them with the price.
- Every file is checked when the site builds. A wrong value stops the build with a message that names the file
  and the field, for example `data/shipping.json: zones[1].price: must be a number of 0 or more`. A JSON syntax error
  (a missing comma or quote) also stops the build. Nobody sees a wrong value on the live site.
- JSON has no comments, so the rules are here.

## Products (in Stripe)

The shop reads its products from your Stripe account. A change in Stripe shows on the site in about a minute.

A Stripe product is a shop product when it is **active**, it has a default **one-time price in GBP**, and its
**metadata** has these keys:

| Metadata key | Value |
|---|---|
| `category` | A category, for example `Stems`. The filters list the categories, materials and finishes that the products use. |
| `material` | For example `Steel`. |
| `finish` | For example `Painted`. |
| `order` | Optional number. It sets the order of the "Featured" sort (lowest first). |

- The product **name** must be different for each active product. A saved bag finds a product by its name.
- The first **image** of the product is the shop image. Add it in the dashboard (Product → Images). Until it has an image, the shop shows a grey tile.
- The home page and the hero use the categories `Stems`, `Spacers` and `Caps`.
- A wrong product (for example no `category`) stops the build with a message that names the product.
- To remove a product from the shop, set it to inactive (archive it) in the dashboard.
- The site needs `STRIPE_SECRET_KEY` to build and to run. There is no fallback.

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
