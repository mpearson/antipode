# Antipode

Point your phone at the ground and see what's on the other side of the planet.

Antipode renders a transparent globe from your exact location and lets you "look
through the Earth" at the far side, with a live day/night terminator and the Sun
and Moon placed as real sky bodies. It's a browser PWA — open it on a phone, grant
location + motion, and aim down.

## Stack

- **Vite + TypeScript** — no UI framework, plain DOM + CSS.
- **three.js** — the globe, day/night shader, and sky bodies.
- **topojson-client** — decodes the bundled country boundaries.
- **vite-plugin-pwa** — manifest + Workbox service worker for install + offline.

All data ships in the app: country boundaries (`src/data/countries-110m.json`,
inlined into the bundle) and Sun/Moon positions (computed, no data). There is **no
runtime network dependency** — it works fully offline after first load.

## Develop

```bash
nvm use            # Node 22 (see .nvmrc)
npm install
npm run dev        # http://localhost:5173/antipode/
```

Device orientation (compass) needs a real top-level **HTTPS** context, so it only
works on a deployed (or tunneled) URL on a real device. On desktop / http the app
falls back to drag-to-look automatically after ~2.5s.

## Build & deploy

```bash
npm run build      # type-checks then builds to dist/
npm run preview    # serve the production build locally
```

Deploys to **GitHub Pages** under `/antipode/` (set in `vite.config.ts` `base`):

- **Automatic** — push to `main`; `.github/workflows/deploy.yml` builds and publishes.
  Enable Pages → Source: "GitHub Actions" once in the repo settings.
- **Manual** — `npm run deploy` (uses `gh-pages` to push `dist/` to the `gh-pages` branch).

## Architecture

```
src/
  main.ts            entry: console panel + gate wiring
  app.ts             App controller: lifecycle + per-frame render loop
  config.ts          constants (radius, sky distance, colors, preset coords)
  scene/             renderer, materials (day/night shader + shared sun uniform),
                     shell + atmosphere, horizon, graticule, sky bodies
  geometry/          gnomonic spherical triangulation + banded fallback, country loader
  astronomy/         subsolar point (sun), Schlyter lunar position (moon)
  sensors/           device orientation, drag fallback, look controller, geolocation
  ui/                HUD readouts + reticle raycast, start gate, on-screen console
  util/              lat/lon ↔ vector math, label sprites
  data/              bundled TopoJSON + ISO country names
```

The core trick: the camera sits at exactly Earth's radius and renders **back faces
only**, so the near hemisphere is culled and you see straight through to the far
inner wall. Country fills and the ocean shell share one day/night shader whose
lighting is `dot(surfaceDir, liveSunDir)` (not a scene light), so back-face
rendering doesn't invert it. See comments in `scene/materials.ts` and
`geometry/sphericalPolygon.ts` for the non-obvious decisions.

## Not yet done

Native packaging for the Play Store (a Trusted Web Activity) is deferred — the PWA
manifest keeps it a cheap future add-on. The main gotcha then is that a GitHub Pages
*project* site serves `/.well-known/assetlinks.json` only from the domain root, so a
custom domain or the `username.github.io` repo is needed to verify the TWA.
