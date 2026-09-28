// Pond atmosphere: anime-sunset water, watercolor washes, komorebi light,
// expanding ripple wavefronts, and drifting petals. Same plain-module
// style as the other drawing modules: main.js owns the frame loop and
// passes absolute time t (seconds) plus frame dt.
//
// Math notes:
// - washes/dapples ride Lissajous drift fields:
//     x(t) = x0 + Ax·sin(ωx·t + φx),  y(t) = y0 + Ay·sin(ωy·t + φy)
// - ripple rings are Huygens wavefronts: r(t) = c·age, α = 1 − age/life.
// - layout is seeded (mulberry32) in fractional canvas units, so it
//   survives window resizes deterministically.
let ctx;
let canvas;

// Scroll depth 0 (top, day) → 1 (bottom, night), set by main.js from
// window scroll. Drives the day → sunset → night grade.
let scrollDepth = 0;
export function setScrollDepth(d) {
    scrollDepth = Math.min(1, Math.max(0, d));
}

// Keyframed water grades, four stops each as linear RGB triples.
// Day: the clear blue pond. Sunset: indigo depths, ember shallows.
// Night: near-black indigo with a faint luminous horizon.
const GRADES = [
    [[18, 58, 94], [31, 93, 134], [61, 138, 181], [143, 192, 218]],
    [[43, 58, 103], [122, 90, 140], [224, 142, 121], [246, 201, 162]],
    [[6, 11, 26], [13, 27, 51], [27, 58, 92], [46, 90, 122]],
];
const GRADE_POS = [0.0, 0.38, 0.68, 1.0];

function lerpNum(a, b, t) {
    return a + (b - a) * t;
}

// Smoothstep-eased interpolation across the two grade segments so the
// light changes glide instead of switching.
function gradeAt(depth) {
    let seg = depth < 0.5 ? 0 : 1;
    let raw = depth < 0.5 ? depth / 0.5 : (depth - 0.5) / 0.5;
    let t = raw * raw * (3 - 2 * raw);
    let A = GRADES[seg], B = GRADES[seg + 1];
    return A.map((stop, i) => stop.map((c, k) => Math.round(lerpNum(c, B[i][k], t))));
}

function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Fractional-coordinate scatter, fixed at module init for stability.
const washes = [];
const dapples = [];
const petals = [];
const ripples = [];

function scatter(rng, n, rMin, rMax) {
    let pts = [];
    for (let i = 0; i < n; i++) {
        pts.push({
            fx: rng(), fy: rng(),
            r: rMin + rng() * (rMax - rMin),
            wx: 0.2 + rng() * 0.5, wy: 0.2 + rng() * 0.5,
            px: rng() * Math.PI * 2, py: rng() * Math.PI * 2,
            ax: 0.01 + rng() * 0.03, ay: 0.01 + rng() * 0.03,
            a: 0.04 + rng() * 0.07,
            hue: rng(),
        });
    }
    return pts;
}

function initLayout() {
    let rng = mulberry32(20260927);
    washes.push(...scatter(rng, 14, 0.12, 0.30));
    dapples.push(...scatter(rng, 10, 0.02, 0.06));
    for (let i = 0; i < 26; i++) {
        petals.push({
            fx: rng(), fy: rng(),
            fall: 0.008 + rng() * 0.016,   // canvas-heights per second
            sway: 0.01 + rng() * 0.02,     // sway amplitude (fraction)
            wfreq: 0.5 + rng() * 1.2,      // sway angular frequency
            phase: rng() * Math.PI * 2,
            size: 3 + rng() * 5,
            pink: rng() < 0.55,
            rot: rng() * Math.PI * 2,
            spin: (rng() - 0.5) * 1.2,
        });
    }
    // A couple of permanent ripple sources so the pond feels alive
    // before any fish disturbs it.
    ripples.push({ fx: 0.3, fy: 0.4, age: 0.4, life: 3.2, maxR: 130 });
    ripples.push({ fx: 0.72, fy: 0.62, age: 1.8, life: 3.2, maxR: 150 });
}
initLayout();

export function setCanvasContext(canvasContext) {
    ctx = canvasContext;
    canvas = ctx.canvas;
}

function drifted(p, t, W, H, parallax = 0) {
    return {
        x: (p.fx + p.ax * Math.sin(p.wx * t + p.px)) * W,
        // Parallax: background layers sink at different rates as the page
        // descends, so scrolling feels like lowering a camera into water.
        y: (p.fy + p.ay * Math.sin(p.wy * t + p.py) - scrollDepth * parallax) * H,
    };
}

// Graded water base: the scroll depth picks the light, day, sunset,
// night, while washes and dapple keep their cool pastel drift.
export function drawPondBackground(t) {
    const W = canvas.width, H = canvas.height;
    const stops = gradeAt(scrollDepth);
    const g = ctx.createLinearGradient(0, 0, W * 0.9, H);
    for (let i = 0; i < stops.length; i++) {
        let c = stops[i];
        g.addColorStop(GRADE_POS[i], `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Washes thin out toward night so the dark water reads clean.
    const washDim = 1 - 0.55 * scrollDepth;

    // Watercolor washes: large pastel blooms, barely-there alpha.
    const tints = [
        [184, 224, 208], // mint
        [205, 196, 230], // lavender
        [168, 208, 230], // sky
        [200, 232, 228], // pale aqua
    ];
    for (let i = 0; i < washes.length; i++) {
        let p = washes[i];
        let pos = drifted(p, t, W, H, 0.10);
        let c = tints[i % tints.length];
        let R = p.r * Math.max(W, H);
        const rg = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, R);
        rg.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(p.a * washDim).toFixed(3)})`);
        rg.addColorStop(1, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)`);
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, R, 0, Math.PI * 2);
        ctx.fill();
    }

    // Komorebi: warm dappled light drifting on the surface.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let p of dapples) {
        let pos = drifted(p, t * 1.4, W, H, 0.22);
        let R = p.r * Math.max(W, H);
        const rg = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, R);
        rg.addColorStop(0, `rgba(255, 236, 200, ${((p.a + 0.05) * washDim).toFixed(3)})`);
        rg.addColorStop(1, "rgba(255, 236, 200, 0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, R, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Queue a Huygens ripple at canvas pixels (call alongside addRipple).
export function spawnRipple(x, y) {
    ripples.push({ x, y, age: 0, life: 3.0, maxR: 90 + Math.random() * 80 });
    if (ripples.length > 24) ripples.shift();
}

// Ambient ripple source so still water still breathes.
let ambientTimer = 0;
export function drawRippleRings(dt) {
    const W = canvas.width, H = canvas.height;
    ambientTimer += dt;
    if (ambientTimer > 1.4) {
        ambientTimer = 0;
        let rng = Math.random;
        ripples.push({ fx: rng(), fy: rng(), age: 0, life: 3.4, maxR: 110 + rng() * 70 });
        if (ripples.length > 24) ripples.shift();
    }
    ctx.save();
    ctx.lineWidth = 1.5;
    for (let i = ripples.length - 1; i >= 0; i--) {
        let r = ripples[i];
        r.age += dt;
        if (r.age >= r.life) { ripples.splice(i, 1); continue; }
        let k = r.age / r.life;              // 0 → 1, linear wavefront age
        let rad = r.maxR * k;                // r = c·age
        let alpha = 0.5 * (1 - k);           // linear decay
        let cx = r.x ?? r.fx * W, cy = r.y ?? r.fy * H;
        // Twin rings, 180° out of phase, the watercolor-pond signature.
        for (let ring = 0; ring < 2; ring++) {
            let rr = Math.max(0.1, rad - ring * 14);
            ctx.strokeStyle = `rgba(235, 246, 252, ${(alpha * (1 - ring * 0.4)).toFixed(3)})`;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rr, rr * 0.62, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

// Sakura drift: petals fall slowly, sway sinusoidally, wrap around.
export function drawPetals(t, dt) {
    const W = canvas.width, H = canvas.height;
    ctx.save();
    for (let p of petals) {
        p.fy += p.fall * dt;
        if (p.fy > 1.05) { p.fy = -0.05; p.fx = Math.random(); }
        p.rot += p.spin * dt;
        let x = (p.fx + p.sway * Math.sin(p.wfreq * t + p.phase)) * W;
        // Foreground parallax: petals sink fastest, wrapping cleanly.
        let yy = (p.fy - scrollDepth * 0.45) % 1.1;
        if (yy < 0) yy += 1.1;
        let y = (yy - 0.05) * H;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.pink
            ? "rgba(250, 205, 215, 0.85)"
            : "rgba(253, 250, 244, 0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

// Cinematic vignette for landing-page focus: dark teal edges,
// feathered with a smoothstep-like two-stop falloff. Deepens at night.
export function drawVignette() {
    const W = canvas.width, H = canvas.height;
    const R = Math.hypot(W, H) / 2;
    const g = ctx.createRadialGradient(W / 2, H / 2, R * 0.42, W / 2, H / 2, R * 0.78);
    g.addColorStop(0, "rgba(10, 34, 52, 0)");
    g.addColorStop(1, `rgba(6, 16, 28, ${(0.38 + 0.20 * scrollDepth).toFixed(2)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
}
