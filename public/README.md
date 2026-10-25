# Static assets

Next.js serves every file in this folder from the site root. `public/images/home/hero.webp` is at `/images/home/hero.webp`.
Put an image that only one component imports next to that component instead, and import it. Next.js then hashes and optimises it.

| Folder | Content |
|---|---|
| `images/brand/` | Logo, social share image, and other brand images. |
| `images/home/` | Photos for the home page (hero slides, categories). |
| `images/bespoke/` | Photos for the bespoke configurator (stems, spacers, caps). |
| `images/workshop/` | Photos for the workshop page (hero, process steps, collage). |
| `icons/` | SVG icons and the favicon set. |
| `fonts/` | Self-hosted font files. The site uses `next/font/google` today. |

The pages set the paths: the data arrays at the top of each page or component for the rest.

## Rules

- Use lowercase names with hyphens: `steel-stem-90mm-front.webp`.
- Use a suffix for the variant: `-front`, `-side`, `-detail`, `-2x`.
- Use `webp` or `avif` for photos, `svg` for icons and `png` only when you need it.
- Do not add a file to the root of `public/`. The only exceptions are files that must be there, such as `favicon.ico` and `robots.txt`.
- `.gitkeep` files keep an empty folder in Git. Delete one when the folder has a real file.
