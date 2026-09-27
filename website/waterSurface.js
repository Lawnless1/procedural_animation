let ctx;
let canvas;

const gridSize = 16;
let cellSize;
const heights = Array(gridSize + 1).fill(0).map(() => Array(gridSize + 1).fill(0));
const velocities = Array(gridSize + 1).fill(0).map(() => Array(gridSize + 1).fill(0));

// Chaos settings: High damping and high spread keep the energy moving
const damping = 0.97; 
const spread = 0.22;
const maxVelocity = 20; // Prevents the grid from "exploding" or spiking too hard

export function setCanvasContext(canvasCtx) {
    ctx = canvasCtx;
    canvas = ctx.canvas;
    cellSize = canvas.width / gridSize;
}

/**
 * Creates a "Diamond" ripple: concentrated enough to be chaotic, 
 * but spread to 4 neighbors to prevent the cross-section from snapping.
 */
export function addRipple(x, y, intensity = 4) {
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    
    // Boundary check (keeping the edges anchored as requested)
    if (gridX > 0 && gridX < gridSize && gridY > 0 && gridY < gridSize) {
        // Center point gets full force
        heights[gridY][gridX] += intensity;
        
        // Immediate neighbors get a significant boost to keep the intersection "connected"
        const neighborForce = intensity * 0.7;
        if (gridX + 1 < gridSize) heights[gridY][gridX + 1] += neighborForce;
        if (gridX - 1 > 0)        heights[gridY][gridX - 1] += neighborForce;
        if (gridY + 1 < gridSize) heights[gridY + 1][gridX] += neighborForce;
        if (gridY - 1 > 0)        heights[gridY - 1][gridX] += neighborForce;
    }
}

export function updateWaterSurface() {
    // 1. Calculate velocities based on neighboring heights
    for (let y = 1; y < gridSize; y++) {
        for (let x = 1; x < gridSize; x++) {
            const avg = (heights[y-1][x] + heights[y+1][x] + heights[y][x-1] + heights[y][x+1]) / 4;
            velocities[y][x] += (avg - heights[y][x]) * spread;
            
            // Clamp velocity to keep chaos under control
            if (velocities[y][x] > maxVelocity) velocities[y][x] = maxVelocity;
            if (velocities[y][x] < -maxVelocity) velocities[y][x] = -maxVelocity;
        }
    }
    
    // 2. Update heights and apply damping
    for (let y = 1; y < gridSize; y++) {
        for (let x = 1; x < gridSize; x++) {
            velocities[y][x] *= damping;
            heights[y][x] += velocities[y][x];
        }
    }
}

export function drawWaterGrid(color = "#4caee8") {
    ctx.strokeStyle = color;
    ctx.lineJoin = "round"; // Smoothens the "elbows" of the lines without losing the grid look
    
    // Draw horizontal lines
    for (let y = 0; y <= gridSize; y++) {
        ctx.beginPath();
        for (let x = 0; x <= gridSize; x++) {
            const px = x * cellSize;
            const py = y * cellSize + heights[y][x];
            x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.lineWidth = y % 2 === 0 ? 2 : 0.8;
        ctx.stroke();
    }
    
    // Draw vertical lines
    for (let x = 0; x <= gridSize; x++) {
        ctx.beginPath();
        for (let y = 0; y <= gridSize; y++) {
            const px = x * cellSize;
            const py = y * cellSize + heights[y][x];
            y === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.lineWidth = x % 2 === 0 ? 2 : 0.8;
        ctx.stroke();
    }
}