let ctx;
let canvas;

const gridSize = 16;
let cellSize;
let rowHeight; // Vertical distance between rows

// Heights and velocities need to account for the staggered layout
const heights = Array(gridSize + 1).fill(0).map(() => Array(gridSize + 1).fill(0));
const velocities = Array(gridSize + 1).fill(0).map(() => Array(gridSize + 1).fill(0));

const damping = 0.97;
const spread = 0.22;
const maxVelocity = 20;

export function setCanvasContext(canvasCtx) {
    ctx = canvasCtx;
    canvas = ctx.canvas;
    cellSize = canvas.width / gridSize;
    // The height of an equilateral triangle is ~0.866 * side
    rowHeight = cellSize * (Math.sqrt(3) / 2);
}

export function addRipple(x, y, intensity = 4) {
    const gridY = Math.floor(y / rowHeight);
    // Adjust X calculation based on row stagger
    const offsetX = (gridY % 2 === 0) ? 0 : cellSize / 2;
    const gridX = Math.floor((x - offsetX) / cellSize);

    if (gridX > 0 && gridX < gridSize && gridY > 0 && gridY < gridSize) {
        heights[gridY][gridX] += intensity;
        
        // In a triangle grid, each point has 6 immediate neighbors
        const neighborForce = intensity * 0.5;
        const isOdd = gridY % 2 !== 0;

        // Same row
        if (gridX + 1 < gridSize) heights[gridY][gridX + 1] += neighborForce;
        if (gridX - 1 > 0)        heights[gridY][gridX - 1] += neighborForce;
        
        // Rows above and below (staggered neighbors)
        const adj = isOdd ? 1 : -1;
        const rows = [gridY - 1, gridY + 1];
        rows.forEach(r => {
            if (r >= 0 && r <= gridSize) {
                heights[r][gridX] += neighborForce;
                if (gridX + adj >= 0 && gridX + adj < gridSize) {
                    heights[r][gridX + adj] += neighborForce;
                }
            }
        });
    }
}

export function updateWaterSurface() {
    for (let y = 1; y < gridSize; y++) {
        const isOdd = y % 2 !== 0;
        const adj = isOdd ? 1 : -1;

        for (let x = 1; x < gridSize; x++) {
            // Average of 6 neighbors for triangular physics
            let neighborSum = 
                heights[y][x - 1] + heights[y][x + 1] +     // Left, Right
                heights[y - 1][x] + heights[y + 1][x];      // Direct Vertical

            // Staggered diagonals
            if (x + adj >= 0 && x + adj <= gridSize) {
                neighborSum += heights[y - 1][x + adj] + heights[y + 1][x + adj];
            } else {
                neighborSum += heights[y][x] * 2; // Boundary fallback
            }

            const avg = neighborSum / 6;
            velocities[y][x] += (avg - heights[y][x]) * spread;
            
            if (velocities[y][x] > maxVelocity) velocities[y][x] = maxVelocity;
            if (velocities[y][x] < -maxVelocity) velocities[y][x] = -maxVelocity;
        }
    }

    for (let y = 1; y < gridSize; y++) {
        for (let x = 1; x < gridSize; x++) {
            velocities[y][x] *= damping;
            heights[y][x] += velocities[y][x];
        }
    }
}

export function drawWaterGrid(color = "#4caee8") {
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";

    // To draw a triangle grid, we draw lines in three directions: 
    // Horizontal, Diagonal-Right (\), and Diagonal-Left (/)
    
    for (let y = 0; y <= gridSize; y++) {
        const offsetX = (y % 2 === 0) ? 0 : cellSize / 2;
        
        // 1. Horizontal lines
        ctx.beginPath();
        for (let x = 0; x <= gridSize; x++) {
            const px = x * cellSize + offsetX;
            const py = y * rowHeight + heights[y][x];
            x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.lineWidth = y % 2 === 0 ? 2 : 0.8;
        ctx.stroke();

        // 2. Diagonal lines (to create the triangles)
        if (y < gridSize) {
            ctx.beginPath();
            for (let x = 0; x <= gridSize; x++) {
                const px = x * cellSize + offsetX;
                const py = y * rowHeight + heights[y][x];
                
                // Down-Left or Down-Right depending on stagger
                const nextOffsetX = ((y + 1) % 2 === 0) ? 0 : cellSize / 2;
                const isOdd = y % 2 !== 0;
                
                // Draw to the two neighbors below to form the triangle
                const targetX = isOdd ? x + 1 : x - 1;
                if (targetX >= 0 && targetX <= gridSize) {
                    ctx.moveTo(px, py);
                    ctx.lineTo(targetX * cellSize + nextOffsetX, (y + 1) * rowHeight + heights[y + 1][targetX]);
                }
                
                ctx.moveTo(px, py);
                ctx.lineTo(x * cellSize + nextOffsetX, (y + 1) * rowHeight + heights[y + 1][x]);
            }
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }
}