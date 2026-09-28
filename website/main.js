import {vec2d, Chain} from './chain.js';
import {setCanvasContext, draw_chain, draw_spine, draw_outline, draw_shading, draw_eyes, draw_dorsal_fin, draw_ellipsefin, draw_backfin, draw_tail_fin, draw_skeleton} from './fish.js';
import {setCanvasContext as setWaterContext, updateWaterSurface, drawWaterGrid, addRipple} from './waterSurface.js';
import {setCanvasContext as setSplashContext, draw_fish_splashes} from './fishSplash.js';
import {setCanvasContext as setPondContext, drawPondBackground, drawRippleRings, drawPetals, drawVignette, spawnRipple, setScrollDepth} from './pond.js';

const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// Fit the pond to the window: landing-page full-bleed background.
// Mouse mapping already compensates via bounding-rect scaling.
function fitCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  setCanvasContext(ctx);
  setWaterContext(ctx);
  setSplashContext(ctx);
  setPondContext(ctx);
  computeWorldScale();
}

// Fish proportions are tuned for a 960x1080 design viewport. Smaller
// screens scale the whole fish world (body size, senses, swim speeds)
// so composition and behavior stay identical everywhere.
let worldScale = 1;
let NEIGHBOR_DIST = 200;
let BND_MARGIN = 480;
function computeWorldScale(){
  worldScale = Math.min(1, window.innerWidth / 960, window.innerHeight / 1080);
  NEIGHBOR_DIST = 200 * worldScale;
  BND_MARGIN = 480 * worldScale;
}

// Initialize all canvas modules, then fit the pond to the window:
// landing-page full-bleed background. Mouse mapping already compensates
// via bounding-rect scaling.
fitCanvas();
window.addEventListener("resize", fitCanvas);

// Scroll depth 0→1 drives the pond's day→sunset→night grade and the
// navbar progress thread. The hero drifts up slower than the page
// (gentle parallax) while fish and physics run on their own clock.
const progressBar = document.getElementById('progress');
const hero = document.getElementById('hero');
const navBar = document.querySelector('nav');
let lastScrollY = window.scrollY;
function reportScroll(){
  let max = document.documentElement.scrollHeight - window.innerHeight;
  let d = max > 0 ? window.scrollY / max : 0;
  setScrollDepth(d);
  if (progressBar) progressBar.style.transform = `scaleX(${d})`;
  if (hero) {
    let fade = Math.min(1, window.scrollY / (window.innerHeight * 0.85));
    hero.style.transform = `translateY(${window.scrollY * 0.28}px)`;
    hero.style.opacity = `${1 - fade}`;
  }
  // Small screens: navbar slips away going down, returns going up.
  if (navBar && window.innerWidth <= 640) {
    let goingDown = window.scrollY > lastScrollY;
    navBar.classList.toggle('hidden', goingDown && window.scrollY > 120);
  } else if (navBar) {
    navBar.classList.remove('hidden');
  }
  lastScrollY = window.scrollY;
}
window.addEventListener("scroll", reportScroll, { passive: true });
reportScroll();

// Cards arrive every time they enter view, in either scroll direction.
// Dual thresholds form a hysteresis band (show past 15%, hide below
// 2%) so a card parked on the edge never flickers.
const revealObserver = new IntersectionObserver((entries) => {
  for (let e of entries) {
    if (e.intersectionRatio >= 0.15) e.target.classList.add('visible');
    else if (e.intersectionRatio <= 0.02) e.target.classList.remove('visible');
  }
}, { threshold: [0.02, 0.15] });
document.querySelectorAll('section.card').forEach(el => revealObserver.observe(el));

function getMouseCanvasPos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY
  };
}
let mouse = { x: 0, y: 0 };

// Passive mouse-follow is OFF: the school wanders until invited by
// press/tap. Flip FOLLOW_MOUSE to restore the old trailing cursor.
const FOLLOW_MOUSE = false;
if (FOLLOW_MOUSE) {
  canvas.addEventListener("mousemove", e => {
    mouse = getMouseCanvasPos(canvas, e);
  });
}

// Press-to-gather: a press ripples the water and briefly biases the
// whole school toward the press point. The pull decays quadratically
// over a few seconds so fish visit, then wander off.
let gatherPoint = { x: 0, y: 0 };
let gatherUntil = 0;
const GATHER_MS = 5000;
// Moonlit silver visitor rings vs the fishes' icy pale (see pond.js).
const VISITOR_TINT = [248, 250, 253];
let pressHeld = false;
// Touch drags scroll the page, so pond touch is tap-only: a quick,
// near-stationary tap ripples and gathers, while anything longer or
// further-traveling is a scroll and stays silent. Mouse keeps the full
// press/hold/drag repertoire. Native scrolling is never prevented.
let downAt = 0;
let downPos = null;
window.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch") {
    downAt = performance.now();
    downPos = getMouseCanvasPos(canvas, e);
    return;
  }
  pressHeld = true;
  pressAt(e, true);
});
window.addEventListener("pointermove", (e) => {
  if (pressHeld && e.pointerType !== "touch") pressAt(e, false);
});
window.addEventListener("pointerup", (e) => {
  pressHeld = false;
  if (e.pointerType !== "touch" || !downPos) return;
  let p = getMouseCanvasPos(canvas, e);
  let quick = performance.now() - downAt < 300;
  let still = Math.hypot(p.x - downPos.x, p.y - downPos.y) < 12;
  downPos = null;
  if (quick && still) pressAt(e, true);
});
for (let evt of ["pointercancel", "pointerleave"]) {
  window.addEventListener(evt, () => { pressHeld = false; downPos = null; });
}
// splash=true stamps one ripple + gather pulse; splash=false just steers
// the gather point (drag movement), leaving ring creation to the
// STREAK_MS metronome so motion can never flood the pond.
function pressAt(e, splash) {
  let p = getMouseCanvasPos(canvas, e);
  if (FOLLOW_MOUSE) mouse = { x: p.x, y: p.y };
  gatherPoint = { x: p.x, y: p.y };
  gatherUntil = performance.now() + GATHER_MS;
  if (!splash) return;
  addRipple(p.x, p.y, 5);
  spawnRipple(p.x, p.y, VISITOR_TINT, 1.35);
}

// function draw_line(pointA, pointB, width=2, color="#4caee8"){
//     ctx.beginPath();
//     ctx.moveTo(pointA.x, pointA.y);
//     ctx.lineTo(pointB.x, pointB.y);
//     ctx.strokeStyle = color;
//     ctx.lineWidth = width;
//     ctx.stroke();
// }

function makeChain(size, variety = 'sanke'){
  // Scale the design size into the current viewport (see worldScale).
  size = size * worldScale;
  // Fusiform (koi-torpedo) half-width profile: fine rounded snout,
  // deepest around the front third, long smooth taper to a narrow
  // caudal peduncle. Monotonic rise then fall, no bumps. Tail stock
  // past index 32 is rigging for the tail fin, not body flesh.
  let shape = [38, 52, 64, 74, 82, 88, 93, 97, 100, 102, 103, 103, 102, 100, 98, 95, 92, 89, 85, 81, 77, 72, 67, 62, 57, 52, 47, 42, 37, 32, 27, 22, 14, 10, 10, 10, 10, 10, 10, 10, 10, 10, 30].map((x)=>x/3).map((x)=>x*size);
  let len = shape.length;
  let spine = Array.from({ length: len }, (_, i) => 32).map((x)=>x/3).map((x)=>x*size);
  
  // Start them randomly within the center of the canvas
  let startX = randint(canvas.width * 0.3, canvas.width * 0.7);
  let startY = randint(canvas.height * 0.3, canvas.height * 0.7);
  let positions = Array.from({ length: len }, (_, i) => [startX, startY + (i * 10)]);

  let chain = new Chain(shape, spine, positions, size);
  chain.variety = variety;
  return chain;
}

const MAX_INTERNAL_ANGLE = Math.PI * 0.035;

function randint(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  // The maximum is inclusive and the minimum is inclusive
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

function draw_point(vector){
    ctx.beginPath();
    ctx.fillRect(vector.x-2, vector.y-2, 4, 4);
    ctx.stroke();
}


function draw_fish(chain){
    // Rare, faint disturbances, a koi gliding, not a stone dropping.
    // Grid swell and visible tail rings on separate clocks so the rings
    // stay special.
    if (randint(0, 45) == 5) {
      addRipple(chain.head.x, chain.head.y);
    }
    if (randint(0, 120) == 5) {
      spawnRipple(chain.head.x, chain.head.y);
    }
    // Rig mode: the whole school renders as bare procedural skeletons,
    // each tagged with its own variety name.
    if (rigMode) {
      draw_skeleton(chain);
      return;
    }
    draw_ellipsefin(chain, "left", 10);
    draw_ellipsefin(chain, "right", 10);
    draw_backfin(chain, "left", 26, 30, 30, 50);
    draw_backfin(chain, "right", 26, 30, 30, 50);
    draw_tail_fin(chain, 32);
    draw_outline(chain, BODY_LENGTH);
    draw_fish_splashes(chain, BODY_LENGTH, splashSeedFor(chain));
    draw_shading(chain, BODY_LENGTH);
    draw_dorsal_fin(chain, 6, 20, 5, 15);
  }

// Spine segments covered by the body silhouette (chain has 43 nodes;
// the tail stock beyond this is drawn by draw_tail_fin).
const BODY_LENGTH = 33;

// Stable per-fish patch layout: variety is already encoded by key, size
// decorrelates fish that share one.
function splashSeedFor(chain){
  return Math.floor(chain.size * 1000) + 7;
}


function move_fish(x, y, chain){
  let angle = Math.sin(Date.now()/1000);
  console.log(angle);
  let direction = new vec2d(x-chain.head.x, y-chain.head.y);
  direction = new vec2d(x-chain.head.x, y-chain.head.y).add(direction.right90().unit().multiply(angle*200));
  draw_point(chain.head.add(direction));
  let angle_between = chain.direction.angle(direction);
  
  if (Math.abs(angle_between) > MAX_INTERNAL_ANGLE){
      direction = chain.direction.rotate(angle_between > 0 ? MAX_INTERNAL_ANGLE : -MAX_INTERNAL_ANGLE);
  }
  // let move_direction = direction.unit().multiply(2);



  let move_direction = direction.unit().multiply(randint(2, 8));
  chain.head = chain.head.add(move_direction);
  chain.update();
}


const BOID_SETTINGS = {
  // Sense ranges scale with the viewport (see worldScale); weights stay put.
  maxSpeed: 0.2,
  maxForce: 0.1,
  wiggleForce: 0.05,       // How quickly they can turn
  weights: {
    sep: 1.5,
    ali: 1.0,
    coh: 1.0,
    mouse: 0.5        // Influence of the mouse cursor
  }
};


const TURN_STRENGTH = 1.2; // How hard they steer back

function getBoundarySteer(fish, width, height) {
    let steer = new vec2d(0, 0);
    const center = new vec2d(width / 2, height / 2);

    // If outside the margin, steer back to center
    if (fish.head.x < BND_MARGIN || fish.head.x > width - BND_MARGIN ||
        fish.head.y < BND_MARGIN || fish.head.y > height - BND_MARGIN) {
        
        // This vector points from the fish to the center of the screen
        steer = center.subtract(fish.head).unit().multiply(TURN_STRENGTH);
    }

    return steer;
}

function applyBoids(fish, allFish, mousePos) {
    let separation = new vec2d(0, 0);
    let alignment = new vec2d(0, 0);
    let cohesion = new vec2d(0, 0);
    let count = 0;

    allFish.forEach(other => {
        let d = fish.head.subtract(other.head).magnitude();
        if (d > 0 && d < NEIGHBOR_DIST) {
            separation = separation.add(fish.head.subtract(other.head).unit().multiply(1 / d));
            alignment = alignment.add(other.direction);
            cohesion = cohesion.add(other.head);
            count++;
        }
    });

    let steer = new vec2d(0, 0);
    if (count > 0) {
        steer = steer.add(separation.multiply(1 / count).unit().multiply(BOID_SETTINGS.weights.sep));
        steer = steer.add(alignment.multiply(1 / count).unit().multiply(BOID_SETTINGS.weights.ali));
        steer = steer.add(cohesion.multiply(1 / count).subtract(fish.head).unit().multiply(BOID_SETTINGS.weights.coh));
    }

    // Add Boundary & Mouse
    steer = steer.add(getBoundarySteer(fish, canvas.width, canvas.height));
    if (FOLLOW_MOUSE) {
      steer = steer.add(mousePos.subtract(fish.head).unit().multiply(BOID_SETTINGS.weights.mouse));
    }

    // Press gathering: quadratic decay keeps the visit gentle.
    let gatherLeft = (gatherUntil - performance.now()) / GATHER_MS;
    if (gatherLeft > 0) {
        let toGather = new vec2d(gatherPoint.x - fish.head.x, gatherPoint.y - fish.head.y).unit();
        steer = steer.add(toGather.multiply(1.2 * gatherLeft * gatherLeft));
    }

    // Re-applying the Sin Wave (The "Wiggle")
    // We add the wiggle to the current direction before applying steering
    let timeScale = 0.005; 
    let wiggle = Math.sin(Date.now() * timeScale + (fish.size * 50)) * 0.1;
    
    // Combine forces
    let desiredDir = fish.direction.add(steer.multiply(BOID_SETTINGS.maxForce)).rotate(wiggle).unit();

    // Max Turn Constraint
    let angle_between = fish.direction.angle(desiredDir);
    if (Math.abs(angle_between) > MAX_INTERNAL_ANGLE) {
        desiredDir = fish.direction.rotate(angle_between > 0 ? MAX_INTERNAL_ANGLE : -MAX_INTERNAL_ANGLE);
    }

    // Randomized Speed (Original logic, scaled to the viewport)
    let move_speed = randint(Math.max(1, Math.round(2 * worldScale)), Math.max(2, Math.round(8 * worldScale)));
    fish.head = fish.head.add(desiredDir.multiply(move_speed));
    fish.update();
}

function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}


function draw_small_ellipse(x, y, seed, color = "#b1e98b") {
    const rng = mulberry32(seed);

    const rx = 5 + rng() * 10;   // 5 → 12
    const ry = 6 + rng() * 4;   // 6 → 10
    const rotation = rng() * Math.PI * 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}


function generatePoints(count, minDist) {
    const points = [];
    const minDistSq = minDist * minDist;

    let attempts = 0;
    const maxAttempts = count * 50;

    while (points.length < count && attempts < maxAttempts) {
        attempts++;

        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;

        let valid = true;

        for (const p of points) {
            const dx = x - p.x;
            const dy = y - p.y;

            if (dx * dx + dy * dy < minDistSq) {
                valid = false;
                break;
            }
        }

        if (valid) {
            points.push({ x, y });
        }
    }

    return points;
}

let points = generatePoints(100, 20);

// var chain = makeChain(1);
// var chain2 = makeChain(0.5);
// Initialize a school of fish, one koi variety per fish.
var school = [
  makeChain(0.4, 'kohaku'),
  makeChain(0.8, 'sanke'),
  makeChain(0.6, 'yamabuki'),
  makeChain(0.5, 'showa'),
  makeChain(0.55, 'hi_utsuri'),
  makeChain(0.65, 'sanke')
];

// Rig toggle: one quiet button flips the whole school between skin
// and skeleton. State lives here, next to the frame loop.
let rigMode = false;
const rigToggle = document.getElementById('rig-toggle');
if (rigToggle) {
  rigToggle.addEventListener('click', () => {
    rigMode = !rigMode;
    rigToggle.setAttribute('aria-pressed', `${rigMode}`);
    rigToggle.querySelector('.caption').textContent = rigMode ? 'back to the pond' : 'under the scales';
  });
}

// Zen toggle: hero, cards, and footer fade out, leaving pond, navbar,
// and pills. Scrolling still grades the light underneath.
const calmToggle = document.getElementById('calm-toggle');
if (calmToggle) {
  calmToggle.addEventListener('click', () => {
    let zen = document.body.classList.toggle('zen');
    calmToggle.setAttribute('aria-pressed', `${zen}`);
    calmToggle.querySelector('.caption').textContent = zen ? 'bring it back' : 'still water';
  });
}

let lastFrame = performance.now();
let lastStreakAt = 0;
const STREAK_MS = 500; // metronome for hold rings: slow enough to stay calm
function animate() {
    let now = performance.now();
    let dt = Math.min(0.05, (now - lastFrame) / 1000); // clamped frame delta
    lastFrame = now;
    let t = now / 1000;

    // Held press rings on a fixed metronome: regular in time, blind to
    // movement, slow enough to stay calm. The gather pull stays topped
    // up either way until release.
    if (pressHeld && now - lastStreakAt > STREAK_MS) {
        lastStreakAt = now;
        gatherUntil = now + GATHER_MS;
        spawnRipple(gatherPoint.x, gatherPoint.y, VISITOR_TINT, 1.2);
    }

    drawPondBackground(t);

    updateWaterSurface();
    drawWaterGrid("rgba(191, 227, 242, 0.32)");

    // Apply Boyd's Algorithm and Draw
    school.forEach(fish => {
      applyBoids(fish, school, new vec2d(mouse.x, mouse.y));
      draw_fish(fish);
    });

    drawRippleRings(dt);

    drawPetals(t, dt);
    drawVignette();
    // for (let i = 0; i < points.length; i++) {
    //     draw_small_ellipse(points[i].x, points[i].y, i);
    // }
    requestAnimationFrame(animate);
}
animate();




console.log('Canvas is set up and a circle is drawn.');