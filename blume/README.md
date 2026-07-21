# UDCSP docs site (Blume)

This folder builds the UDCSP documentation site published at
**https://fredgis.github.io/UDCSP/** with [Blume](https://useblume.dev).

It does not duplicate the docs. `build-content.mjs` reads the Markdown that already
lives in the repo under [`docs/biz`](../docs/biz) and [`docs/tech`](../docs/tech),
converts it to MDX, copies the repo `images/` into `public/images`, and Blume renders
the static site. The Marp presentation deck stays available at `/UDCSP/deck/`.

## Local development

```bash
cd blume
npm ci
npm run dev        # regenerate content, then serve at http://localhost:4321/UDCSP/
```

Other scripts:

- `npm run content` — regenerate MDX + copy images only.
- `npm run build` — regenerate content, then produce the static site in `dist/`.
- `npm run preview` — serve the built `dist/` at `http://localhost:4321/UDCSP/`.

## What is generated (git-ignored)

`build-content.mjs` recreates these on every build, so they are not committed:

- `docs/business/`, `docs/technical/` — MDX generated from `docs/biz` and `docs/tech`.
- `public/images/` — copied from the repo `images/` folder.
- `dist/`, `.astro/`, `.blume/`, `node_modules/`.

Hand-authored source that is committed: `blume.config.ts`, `build-content.mjs`,
`docs/index.mdx`, `package.json`, `package-lock.json`.

## Base path

The site is a GitHub project page served from `/UDCSP/`, so `blume.config.ts` sets
`deployment.base: "/UDCSP"`. Blume prefixes internal doc links automatically; image
paths are prefixed by `build-content.mjs` (constant `BASE`). If the repository is
renamed, update that constant and `deployment.base`.
