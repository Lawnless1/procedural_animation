# procedural_animation

Procedural chain-constraint animation experiments:
- Python (`chain.py` + `test.py`): `Point` / `Chain` distance-constraint prototype rendered with `pygame`, head follows the mouse.
- Web (`website/`): TypeScript `vec2d` / `Chain` port driving canvas fish with boids schooling, water surface, and lilypads.

## Repo layout

- `chain.py` — Python chain implementation
- `test.py` — pygame mouse-follow demo
- `website/index.html` — canvas entry, loads `main.js` as ES module
- `website/main.js` — scene: fish school, water grid, lilypads
- `website/chain.ts` / `website/chain.js` — vector + chain source and compiled output
- `website/fish.js`, `website/lilypad.js`, `website/waterSurface.js`, `website/triangleSurface.js` — drawing modules

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
