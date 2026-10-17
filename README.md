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

VS Code tasks for these commands are in `.vscode/tasks.json`.

## Project layout

- `app/`: the pages (home, shop, bespoke, bag, workshop, support).
- `components/`: the React components, each with a CSS module.
- `lib/catalog.ts`: the product catalog.
- `lib/bag.ts`: the shopping bag. It keeps its contents in `localStorage`.

## Deployment

The GitHub workflow in `.github/workflows/deploy.yml` deploys to Vercel:

- A push to `main` makes a production deployment.
- A pull request makes a preview deployment and adds a comment with the URL.
