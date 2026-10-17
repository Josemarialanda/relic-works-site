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
- `lib/catalog.ts`: the product catalog.
- `lib/bag.ts`: the shopping bag. It keeps its contents in `localStorage`.
- `public/`: images, icons and fonts, in one folder for each kind and page. See `public/README.md`.
- `scripts/mock-images.mjs`: draws the mock product images in `public/images`. Run it with `npm run images`.

## Deployment

The GitHub workflow in `.github/workflows/deploy.yml` deploys to Vercel:

- A push to `main` makes a production deployment.
- A pull request makes a preview deployment and adds a comment with the URL.
