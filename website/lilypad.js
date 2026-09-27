import { vec2d } from './chain.js';

// Canvas context will be set by main.js
let ctx;

export function setCanvasContext(canvasContext) {
    ctx = canvasContext;
}



export function draw_lilypad(x, y, width, height, cut_angle_start, cut_angle_end, rotation = 0, colorA = '#68b48a', colorB = '#3aaa3a', cutDepth = 0.05) {
    // Save the current canvas state
    ctx.save();
    
    // Translate to lilypad position and apply rotation
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Draw the main ellipse body with cut
    ctx.beginPath();
    // Start at the beginning of the cut angle on the ellipse
    const startX = width * Math.cos(cut_angle_start);
    const startY = height * Math.sin(cut_angle_start);
    ctx.moveTo(startX, startY);
    
    // Draw ellipse arc from cut_angle_start to cut_angle_end
    ctx.ellipse(0, 0, width, height, 0, cut_angle_start, cut_angle_end, false);
    
    // Draw the cut - line from end of cut back toward center, then back to start
    const cutMidX = width * Math.cos((cut_angle_start + cut_angle_end) / 2) * cutDepth;
    const cutMidY = height * Math.sin((cut_angle_start + cut_angle_end) / 2) * cutDepth;
    
    ctx.lineTo(cutMidX, cutMidY);
    ctx.lineTo(startX, startY);
    ctx.closePath();
    
    // Create linear gradient from slit side to opposite side
    const slitAngle = (cut_angle_start + cut_angle_end) / 2;
    const oppositeSide = slitAngle + Math.PI;
    
    // Gradient goes from slit side to opposite side
    const gradientRadius = Math.max(width, height);
    const x0 = Math.cos(slitAngle) * gradientRadius;
    const y0 = Math.sin(slitAngle) * gradientRadius;
    const x1 = Math.cos(oppositeSide) * gradientRadius;
    const y1 = Math.sin(oppositeSide) * gradientRadius;
    
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(1, colorB);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add some details to make it look better
    draw_lilypad_details(width, height, cut_angle_start, cut_angle_end, cutDepth);
    
    // Redraw the outline to clean up any vein artifacts
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.ellipse(0, 0, width, height, 0, cut_angle_start, cut_angle_end, false);
    ctx.lineTo(cutMidX, cutMidY);
    ctx.lineTo(startX, startY);
    ctx.closePath();
    
    // Add a slightly darker edge for depth
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Restore canvas state
    ctx.restore();
}

function draw_lilypad_details(width, height, cut_angle_start, cut_angle_end, cutDepth) {
    // Draw organic curved veins radiating from center
    ctx.strokeStyle = 'rgba(26, 46, 11, 0.4)';
    ctx.lineWidth = 0.6;
    
    const num_primary_veins = 0;
    const angle_span = cut_angle_end - cut_angle_start;
    
    // Add subtle edge highlight for 3D effect
    ctx.strokeStyle = 'rgba(220, 255, 180, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.92, height * 0.92, 0, cut_angle_start, cut_angle_start + 1.2, false);
    ctx.stroke();
}
