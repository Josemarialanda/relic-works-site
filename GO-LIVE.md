# Go live

Use this list when you open the shop to real customers. Do the steps in order. Tick each box when it is done.

The site has two modes. **Test mode** uses `sk_test_...` keys and fake money. **Live mode** uses `sk_live_...` keys and
real money. Your Stripe products, prices and images exist in each mode separately, so you must make them again in live mode.

## 1. Stripe account

- [ ] Finish the Stripe account activation (business details, bank account, identity check). Live payments do not work before this.
- [ ] Set the public business name, support email and statement descriptor (Settings → Business).
- [ ] Turn on the customer receipt emails (Settings → Emails → Successful payments).
- [ ] Check the payment methods that you want (Settings → Payment methods). Checkout shows the methods that you turn on.
- [ ] Decide about tax. The site does **not** calculate VAT or import duties: the price on the site is the price that the customer pays.
      If you must charge VAT, set it up before you go live (for example Stripe Tax), and change the prices if needed.

## 2. Products in live mode

The shop reads its products from Stripe. In live mode the Stripe account has no products until you add them.
Test mode and live mode keep separate products.

- [ ] Add the 6 products in the **live** dashboard (switch off Test mode). You can make each one by hand, or copy the
      products from test mode: in the product catalog, select the products and use **Copy to live mode**. Check that
      this option copies the images and the metadata, because I could not check it.
- [ ] Each product needs a name, an image, one **one-time GBP price**, and this metadata: `category` (`Stems`, `Spacers` or `Caps`),
      `material`, `finish`, and `order` (a number for the "Featured" sort). See `data/README.md`.
- [ ] Check every product in the live dashboard: it is active, it has one image, and the price is correct.
- [ ] Get a **live** secret key (Developers → API keys). Do not save it in a file in the repo, and do not put it in `.env.local`.
      You need it only in the Vercel settings (step 4).

## 3. Prices and rules that are placeholders

- [ ] **Bespoke prices.** The numbers in `data/bespoke.json` (`pricing`) are placeholders. Replace them with your real prices.
- [ ] **Delivery.** Check the prices, free-delivery limits and countries in `data/shipping.json`. The bag and the support page read it.
- [ ] Run `npm test` after a price change. Some tests check prices, so update them with the price.

## 4. Vercel settings

Set these in the Vercel project (Settings → Environment Variables). The deploy workflow reads them with `vercel pull`.
The build reads the products from Stripe, so **the build fails if the key is missing**.

- [ ] `STRIPE_SECRET_KEY` for **Production**: the live key (`sk_live_...`).
- [ ] `STRIPE_SECRET_KEY` for **Preview**: a test key (`sk_test_...`). The test-mode account must have the products too (it has them now).
- [ ] `NEXT_PUBLIC_SITE_URL` for **Production**: the address of the site, with no slash at the end (for example `https://relicworks.co.uk`).
- [ ] In GitHub (Settings → Secrets), check that `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are set.

## 5. Domain and share image

- [ ] Add your domain in Vercel (Settings → Domains) and set the DNS records that Vercel shows.
- [ ] Replace the share image. Most apps (Facebook, X, LinkedIn, WhatsApp, iMessage) do **not** show an SVG.
      Make a PNG or JPG of 1200×630, put it in `public/images/brand/`, and change `SHARE_IMAGE` in `app/layout.tsx`.
      Update the share-image test in `tests/desktop.spec.ts`, which checks the file name.
- [ ] Check the page titles and the share preview after the deploy (for example with the link preview of a messaging app).

## 6. Orders, stock and abuse

- [ ] Plan how you get orders. The site stores no orders and sends you no email. Read the orders in the Stripe dashboard,
      or turn on the Stripe email for new payments (Settings → Emails). A bespoke order has its options in the metadata of the line item.
- [ ] Stock: add the metadata `stock` to each product that has a limit (see `data/README.md`). A product with no `stock` has no limit.
- [ ] Stock webhook: see the next section. Without it, the stock count never goes down.
- [ ] Add a rate limit on `/api/checkout` (for example with Vercel Firewall). The route has none now.

## Stock webhook

The webhook lowers the stock count after each paid order. Do this after the first deploy, because Stripe needs the address.

- [ ] In the **live** dashboard, go to Developers → Webhooks → Add endpoint.
- [ ] Set the address to `https://YOUR-DOMAIN/api/stripe-webhook`.
- [ ] Choose the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- [ ] Copy the signing secret (`whsec_...`) and set `STRIPE_WEBHOOK_SECRET` for **Production** in Vercel. Deploy again.
- [ ] Make the same endpoint in test mode for the Preview address, and set its secret for **Preview**.
- [ ] Test: set `stock` to 2 on a product, make a real order for 1 item, and check that `stock` is 1 in the dashboard.
- [ ] Look at the webhook log in Stripe (Developers → Webhooks) for failed calls. Stripe sends a failed call again.

For local work, run `stripe listen --forward-to localhost:3000/api/stripe-webhook` (the Stripe CLI). It prints a
`whsec_...` secret: put it in `.env.local`.

## 7. Deploy and check

- [ ] Run `nix develop -c npm run typecheck` and `nix develop -c npm test`. All tests must pass.
- [ ] Push to `main`. The workflow makes the production deployment. Look at the run in GitHub → Actions.
- [ ] Open the live site. Check the shop (all products, images and prices), the bag, and the bespoke page.
- [ ] Make one **real** order with a small amount. A card that is not a test card works only in live mode.
      Check the payment page (address, delivery price), the receipt email, and the order in the live dashboard.
- [ ] Refund the test order in the dashboard.
- [ ] Look at the Vercel logs for errors, and at Stripe → Developers → Logs for failed API calls.

## After you go live

- A change to a product in the Stripe dashboard shows on the site in about a minute. You do not need to deploy.
- To add a product, make it in the dashboard with the metadata `category`, `material` and `finish`, an image, and a one-time GBP price.
  See `data/README.md`.
- If the shop is empty or the build fails, read the message: it names the Stripe product or the missing key.
- To stop sales of a product, archive it (set it to inactive) in the dashboard.

## If something goes wrong

| Problem | Likely cause |
|---|---|
| The build fails with "STRIPE_SECRET_KEY is not set" | The key is missing in the Vercel environment of that build. |
| The build fails with `Stripe product "…": the metadata "category" is missing` | A product in that mode has no metadata. Add it in the dashboard. |
| The shop shows a grey tile | The product has no image in Stripe. |
| The Checkout button shows an error | The key is wrong for the mode, or Stripe is not active. Read the Vercel logs. |
| The stock does not go down after an order | `STRIPE_WEBHOOK_SECRET` is missing, or the webhook endpoint is not set up. Read the webhook log in Stripe. |
| A product is missing in the shop | It is inactive, or it was made in the other mode (test or live). |
