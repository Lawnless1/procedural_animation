import { vec2d } from './chain.js';
import { buildBodyPath } from './fish.js';
import { resolveVariety } from './koiVarieties.js';

// Canvas context will be set by main.js (same pattern as fish.js)
let ctx;

export function setCanvasContext(canvasContext) {
    ctx = canvasContext;
}

// Deterministic PRNG (same mulberry32 style as main.js) so each fish
// keeps stable splash placement frame-to-frame.
function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Hermite smoothstep: C1-smooth blend 0 -> 1 across [edge0, edge1].
// Used to feather splash alpha so blobs fade instead of hard-cutting.
function smoothstep(edge0, edge1, x) {
    let t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Deterministic koi patch set: uniform-random in (s, v) so patches land
// ANYWHERE on the body (spine, flanks, edges). Each patch carries a
// Fourier-deformed boundary (harmonics of a circle) for organic koi
// outlines. Alternating sumi black / hi red on the shiroji white body
// (Kohaku/Sanke style). Proper math: uniform sampling on the (s,v)
// chart + truncated Fourier series r(θ) = R(1 + Σ a_k cos(m_k θ + φ_k))
// for closed C1 curves.
const PATCH_MODES = [2, 3, 5];
// inks: the variety's ink array; patches round-robin through it so a
// single-ink variety (kohaku) stays pure and multi-ink ones alternate.
function generateSplashes(seed, count, inks) {
    let rng = mulberry32(seed);
    let splashes = [];
    for (let i = 0; i < count; i++) {
        let s0 = 0.05 + rng() * 0.90;
        let v0 = (rng() * 2 - 1) * 0.95;
        let amps = [
            0.20 + rng() * 0.14,
            0.10 + rng() * 0.10,
            0.05 + rng() * 0.06,
        ];
        let phases = [rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2];
        splashes.push({
            s0,
            v0,
            rScale: 0.45 + rng() * 0.85, // × local half-width: spots → spanning patches
            elong: 0.7 + rng() * 0.6,    // stretch along tangent
            twist: (rng() - 0.5) * 0.6,  // jitter on frame rotation
            amps,
            phases,
            inkIndex: i % inks.length,
            strength: 0.88 + rng() * 0.12,
        });
    }
    return splashes;
}

// Map body coordinates (s, v) to world space using the chain's
// tubular parametrization: spine position + lateral * half-width.
// Returns the Frenet frame (unit tangent + unit side normal) so patches
// can be placed AND oriented on the body. Mirrors the
// left90()/unit()/multiply()/add() style of draw_outline.
function bodyPoint(chain, s, v, body_length) {
    let f = s * (body_length - 1);
    let i0 = Math.max(0, Math.min(body_length - 2, Math.floor(f)));
    let frac = f - i0;
    let p0 = chain.positions[i0];
    let p1 = chain.positions[i0 + 1];
    let spine = new vec2d(lerp(p0.x, p1.x, frac), lerp(p0.y, p1.y, frac));
    let tangent = p0.subtract(p1).unit();
    let side = tangent.left90();
    let width = lerp(chain.shape[i0], chain.shape[i0 + 1], frac);
    let center = spine.add(side.multiply(v * width));
    return { center, width, side, tangent, angle: Math.atan2(tangent.y, tangent.x) };
}

// Koi-style patch clipped to the fish body. Each patch is a closed
// Fourier-deformed outline in the local Frenet frame (tangent/normal):
//   P(θ) = C + T·(r(θ)·cosθ·elong) + N·(r(θ)·sinθ),
//   r(θ) = R·(1 + Σ a_k·cos(m_k·θ + φ_k)).
// Flat koi-ink fill (sumi black / shiroji warm white) with a soft rim
// stroke approximating a blurred boundary. Like draw_outline, the patch
// is built then filled + stroked.
const PATCH_STEPS = 24;
// chain: carries .variety (set by main.js). seed pins the patch layout
// per fish; count overrides the variety's patchCount when non-null.
export function draw_fish_splashes(chain, body_length = 33, seed = 1, count = null) {
    const { variety } = resolveVariety(chain);
    const inks = variety.inks;
    const splashCount = count ?? variety.patchCount;
    const splashes = generateSplashes(seed, splashCount, inks);

    ctx.save();
    buildBodyPath(chain, body_length);
    ctx.clip();

    for (let sp of splashes) {
        let { center, width, tangent, side } = bodyPoint(chain, sp.s0, sp.v0, body_length);
        if (width <= 0) continue;

        let R = Math.max(4, sp.rScale * width);
        let alpha = sp.strength * (1 - smoothstep(0.92, 1.05, Math.abs(sp.v0)));
        if (alpha <= 0.01) continue;

        // Trace the irregular closed outline in the local Frenet frame
        // (tangent × side normal), so patches bend with the fish.
        // Twist adds per-patch rotation variety.
        let cosT = Math.cos(sp.twist);
        let sinT = Math.sin(sp.twist);
        ctx.beginPath();
        for (let j = 0; j <= PATCH_STEPS; j++) {
            let th = (j / PATCH_STEPS) * Math.PI * 2;
            let r = R;
            for (let k = 0; k < PATCH_MODES.length; k++) {
                r += R * sp.amps[k] * Math.cos(PATCH_MODES[k] * th + sp.phases[k]);
            }
            let u = r * Math.cos(th) * sp.elong;
            let w = r * Math.sin(th);
            let u2 = u * cosT - w * sinT;
            let w2 = u * sinT + w * cosT;
            let px = center.x + tangent.x * u2 + side.x * w2;
            let py = center.y + tangent.y * u2 + side.y * w2;
            j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Flat koi ink. No rim stroke: the Fourier edge plus body shading
        // already carries the boundary, and strokes here cost a full extra
        // overdraw pass per patch for little visual return.
        let ink = inks[sp.inkIndex];
        ctx.fillStyle = `rgba(${ink[0]}, ${ink[1]}, ${ink[2]}, ${alpha.toFixed(3)})`;
        ctx.fill();
    }

    ctx.restore();
}
