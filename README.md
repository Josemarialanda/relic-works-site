# Relic Works site

The web shop for Relic Works stems, spacers and caps. It uses Next.js 16, React 19 and TypeScript.

## Run the site

With Nix:

```sh
nix run .#dev     # dev server
nix run .#serve   # production build and server
```

Without Nix, use Node.js 22:

```sh
npm ci
npm run dev
```

Other scripts:

- `npm run build`: make a production build.
- `npm run start`: start the production server.
- `npm run typecheck`: examine the types with `tsc`.
- `npm test`: make a production build, then run the Playwright browser tests in `tests/`. The tests simulate a phone, a tablet and a desktop.

## Tests

The tests use Chromium. On NixOS, run them in the dev shell (`nix develop`), because it supplies the browsers from nixpkgs. Without Nix, install the browser first with `npx playwright install chromium`.

The `@playwright/test` version in `package.json` must be the same as `playwright-driver.version` in the nixpkgs of `flake.lock`. When you update the flake, update `@playwright/test` to that exact version.

VS Code tasks for these commands are in `.vscode/tasks.json`.

## Project layout

- `app/`: the pages (home, shop, bespoke, bag, workshop, support).
- `components/`: the React components, each with a CSS module.
- `data/`: the data that you edit to change the shop: products and prices, bespoke options and price rules, and delivery zones. See `data/README.md`.
- `lib/catalog.ts`: functions that read the product data.
- `lib/bag.ts`: the shopping bag. It keeps its contents in `localStorage`.
- `lib/checkout.ts`, `lib/bespoke.ts`, `lib/shipping.ts`: the order check, the bespoke check and price, and the delivery price. The browser and the server both use them. See Checkout below.
- `app/api/checkout/route.ts`: starts a Stripe payment. `app/checkout/success/` is the page after payment.
- `public/`: images, icons and fonts, in one folder for each kind and page. See `public/README.md`.
- `scripts/mock-images.mjs`: draws the mock product images in `public/images`. Run it with `npm run images`.

## Checkout

The site has a guest checkout with no accounts. The bag stays in the browser (`localStorage`). When the customer presses Checkout, the browser sends the server only product names, quantities, bespoke options and the delivery zone. The server takes every price from the files in `data/`, so a price in the browser is never trusted. Then it creates a [Stripe Checkout](https://docs.stripe.com/payments/checkout) session. Stripe shows the payment page, collects the address, email and phone number, takes the payment and sends the receipt. The site stores no orders: read them in the Stripe dashboard. A bespoke order has its options in the metadata of its line item.

To set it up:

1. Make a Stripe account. Copy a **test** secret key (`sk_test_...`) from the dashboard.
2. For local work, copy `.env.example` to `.env.local` and set `STRIPE_SECRET_KEY`. Restart the dev server.
3. For the host, set `STRIPE_SECRET_KEY` in the Vercel project (the preview environment gets a test key, the production environment gets the live key). The deploy workflow reads it with `vercel pull`.
4. Pay with the test card `4242 4242 4242 4242` (any future date, any code).

Before you go live, check these placeholders and open points:

- **Bespoke prices.** The rules in `data/bespoke.ts` are placeholders (base price, material factor, extras for the bond, the finish and each custom size).
- **Delivery.** The prices and the countries of each zone are in `data/shipping.ts`. The support page and the bag read the same file.
- **Tax and duties.** The checkout does not calculate VAT or import duties. The prices are the prices that the customer pays.
- **Orders and stock.** There is no webhook, so the site does not send you an email, and it does not track stock. Add a Stripe webhook (`checkout.session.completed`) when you want either.
- **Abuse.** The route has no rate limit. Add one (for example with Vercel Firewall) before you get real traffic.

## Deployment

The GitHub workflow in `.github/workflows/deploy.yml` deploys to Vercel:

- A push to `main` makes a production deployment.
- A pull request makes a preview deployment and adds a comment with the URL.
