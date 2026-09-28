# procedural_animation

Procedural chain-constraint animation experiments:
- Python (`chain.py` + `test.py`): `Point` / `Chain` distance-constraint prototype rendered with `pygame`, head follows the mouse.
- Web (`website/`): TypeScript `vec2d` / `Chain` port driving canvas fish with boids schooling, water surface, and lilypads.

## Repo layout

- `chain.py`, Python chain implementation
- `test.py`, pygame mouse-follow demo
- `website/index.html`, canvas entry, loads `main.js` as ES module
- `website/main.js`, scene: fish school, water grid, lilypads
- `website/chain.ts` / `website/chain.js`, vector + chain source and compiled output
- `website/fish.js`, `website/fishSplash.js`, `website/koiVarieties.js`, `website/pond.js`, `website/waterSurface.js`, `website/triangleSurface.js`, drawing modules

## Adding a koi variety

Palettes live in one place: `website/koiVarieties.js`. To add/remove a type:

1. Add (or delete) a frozen entry in `KOI_VARIETIES`, `{ label, body, inks, patchCount }`.
2. Reference its key in the `school` list in `website/main.js`.

`fish.js` (body gradient) and `fishSplash.js` (patch inks/count) both resolve
through `resolveVariety(chain)`, unknown keys warn once in the console and
fall back to `sanke`, so a typo can never silently render the wrong fish.

## Branching workflow

This repo uses branch development. `main` is the stable branch.

```bash
git checkout main
git pull origin main
git checkout -b feature/<short-name>
# edit, verify on localhost, then push + open a PR into main
git push -u origin feature/<short-name>
```

Do not commit directly to `main` for features. Keep each feature in its own branch until reviewed.

## Run on localhost

Web demo (ES modules require http, not `file://`):

```bash
python3 -m http.server 8000 --directory website
# open http://localhost:8000
```

Python prototype:

```bash
pip install pygame
python3 test.py
```

TypeScript rebuild (after editing `website/chain.ts`):

```bash
npm install
npx tsc -p website/tsconfig.json
```
