let ctx;
let canvas;

// Fixed column count; rows tile to cover the screen with SQUARE cells
// on any aspect ratio (cell = W/16 both ways). Widescreen shows fewer,
// taller screens more — the mesh never stretches.
const COLS = 16;
let ROWS = 16;
let cellW = 0;
let cellH = 0;
let heights = [];
let velocities = [];

function allocGrid() {
    heights = Array(ROWS + 1).fill(0).map(() => Array(COLS + 1).fill(0));
    velocities = Array(ROWS + 1).fill(0).map(() => Array(COLS + 1).fill(0));
}
allocGrid();

// Calm-water settings: low spread + firm damping so disturbances read as
// a gentle surface swell seen from above, never plucked strings.
const damping = 0.95;
const spread = 0.17;
const maxVelocity = 6; // Prevents the grid from "exploding" or spiking too hard

export function setCanvasContext(canvasCtx, W = null, H = null) {
    ctx = canvasCtx;
    canvas = ctx.canvas;
    // Logical (CSS-pixel) size keeps cells square on any backing store.
    const w = W ?? canvas.width, h = H ?? canvas.height;
    ROWS = Math.min(64, Math.max(1, Math.ceil(COLS * h / w)));
    cellW = w / COLS;
    cellH = cellW;
    allocGrid();
}

/**
 * Creates a "Diamond" ripple: concentrated enough to be chaotic,
 * but spread to 4 neighbors to prevent the cross-section from snapping.
 */
export function addRipple(x, y, intensity = 2.4) {
    const gridX = Math.floor(x / cellW);
    const gridY = Math.floor(y / cellH);

    // Boundary check (keeping the edges anchored as requested)
    if (gridX > 0 && gridX < COLS && gridY > 0 && gridY < ROWS) {
        // Center point gets full force
        heights[gridY][gridX] += intensity;

        // Immediate neighbors get a small share to keep the surface connected
        const neighborForce = intensity * 0.4;
        if (gridX + 1 < COLS) heights[gridY][gridX + 1] += neighborForce;
        if (gridX - 1 > 0)        heights[gridY][gridX - 1] += neighborForce;
        if (gridY + 1 < ROWS) heights[gridY + 1][gridX] += neighborForce;
        if (gridY - 1 > 0)        heights[gridY - 1][gridX] += neighborForce;
    }
}

export function updateWaterSurface() {
    // 1. Calculate velocities based on neighboring heights
    for (let y = 1; y < ROWS; y++) {
        for (let x = 1; x < COLS; x++) {
            const avg = (heights[y-1][x] + heights[y+1][x] + heights[y][x-1] + heights[y][x+1]) / 4;
            velocities[y][x] += (avg - heights[y][x]) * spread;

            // Clamp velocity to keep chaos under control
            if (velocities[y][x] > maxVelocity) velocities[y][x] = maxVelocity;
            if (velocities[y][x] < -maxVelocity) velocities[y][x] = -maxVelocity;
        }
    }

    // 2. Update heights and apply damping
    for (let y = 1; y < ROWS; y++) {
        for (let x = 1; x < COLS; x++) {
            velocities[y][x] *= damping;
            heights[y][x] += velocities[y][x];
        }
    }
}

export function drawWaterGrid(color = "#4caee8") {
    ctx.strokeStyle = color;
    ctx.lineJoin = "round"; // Smoothens the "elbows" of the lines without losing the grid look

    // Draw horizontal lines
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        for (let x = 0; x <= COLS; x++) {
            const px = x * cellW;
            const py = y * cellH + heights[y][x];
            x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.lineWidth = y % 2 === 0 ? 1.2 : 0.5;
        ctx.stroke();
    }

    // Draw vertical lines
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        for (let y = 0; y <= ROWS; y++) {
            const px = x * cellW;
            const py = y * cellH + heights[y][x];
            y === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.lineWidth = x % 2 === 0 ? 1.2 : 0.5;
        ctx.stroke();
    }
}
