import { vec2d, Chain } from './chain.js';
import { resolveVariety } from './koiVarieties.js';

// Single source for the translucent fin aesthetic: opaque pearl at the
// fin root dissolving into a sheer cool-white edge. No stroke contour,
// the opacity falloff alone separates fin from body.
function finSheen(x0, y0, x1, y1) {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, "rgba(253, 251, 244, 0.95)");
    gradient.addColorStop(0.6, "rgba(240, 244, 248, 0.5)");
    gradient.addColorStop(1, "rgba(240, 244, 248, 0.12)");
    return gradient;
}

function finSheenRadial(radius) {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, "rgba(253, 251, 244, 0.9)");
    gradient.addColorStop(0.55, "rgba(240, 244, 248, 0.5)");
    gradient.addColorStop(1, "rgba(240, 244, 248, 0.12)");
    return gradient;
}

// Canvas context will be set by main.js
let ctx;

export function setCanvasContext(canvasContext) {
    ctx = canvasContext;
}

function draw_circle(x, y, radius){
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
}

function draw_arrow(fromx, fromy, tox, toy) {
    ctx.beginPath();
    var headlen = 10; // length of head in pixels
    var dx = tox - fromx;
    var dy = toy - fromy;
    var angle = Math.atan2(dy, dx);
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

export function draw_chain(chain){
    for (let i = 0; i < chain.n; i++){
        draw_circle(chain.positions[i].x, chain.positions[i].y, chain.shape[i]);
    }
}

// Blueprint rig: the procedural skeleton itself, joint envelopes,
// bone directions, and a tracked head node, drawn so viewers see the
// constraint rig driving the skin. Labels default to the fish's own
// koi variety, so the rig names its color scheme.
export function draw_skeleton(chain, label = null) {
    const name = (label ?? resolveVariety(chain).variety.label).toLowerCase();
    ctx.save();
    ctx.strokeStyle = "rgba(159, 208, 232, 0.85)";
    ctx.fillStyle = "rgba(159, 208, 232, 0.10)";
    ctx.lineWidth = 1;
    for (let i = 0; i < chain.n; i++){
        ctx.beginPath();
        ctx.arc(chain.positions[i].x, chain.positions[i].y, chain.shape[i], 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }
    draw_spine(chain);
    // Fin rigging: the exact skin traces (dorsal, pectorals, back pair,
    // tail, same parameters as draw_fish), stroked blueprint-thin.
    trace_dorsal_fin(chain, 6, 20, 5);
    ctx.stroke();
    for (let dir of ["left", "right"]) {
        let frame = ellipsefin_frame(chain, dir, 10);
        with_ellipse_frame(frame.fin_pos, frame.fin_angle, dir, frame.width, frame.height, () => ctx.stroke());
        trace_backfin(chain, dir, 26, 30, 30, 50);
        ctx.stroke();
    }
    trace_tail_fin(chain, 32);
    ctx.stroke();
    // Head node marker + tracking label.
    ctx.fillStyle = "rgba(230, 242, 250, 0.95)";
    ctx.beginPath();
    ctx.arc(chain.head.x, chain.head.y, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = "rgba(230, 242, 250, 0.8)";
    ctx.fillText(name, chain.head.x + 12, chain.head.y - 12);
    ctx.restore();
}

export function draw_spine(chain){
    for (let i = 1; i < chain.n; i++){
        let delta = chain.positions[i-1].subtract(chain.positions[i])
        draw_arrow(chain.positions[i].x, chain.positions[i].y, chain.positions[i-1].x, chain.positions[i-1].y);
        let left = delta.left90().add(chain.positions[i-1]);
        let right = delta.right90().add(chain.positions[i-1]);
        draw_arrow(chain.positions[i-1].x, chain.positions[i-1].y, left.x, left.y);
        draw_arrow(chain.positions[i-1].x, chain.positions[i-1].y, right.x, right.y);
    }
}

export function draw_outline(chain, body_length){
    // Body base: head→tail gradient from the fish's koi variety palette
    // (chain.variety set by main.js, defaults to sanke).
    const { variety } = resolveVariety(chain);
    const gradient = ctx.createLinearGradient(
        chain.positions[0].x, chain.positions[0].y,
        chain.positions[chain.n-1].x, chain.positions[chain.n-1].y
    );
    for (let [offset, color] of variety.body) {
        gradient.addColorStop(offset, color);
    }

    buildBodyPath(chain, body_length);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "transparent";
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
}

// Outline rails of the tubular body: single source for the silhouette
// path, the splash clip, and the shading strips.
export function bodyOutlines(chain){
    let lefts = chain.positions.slice(1).map((_, i)=>chain.positions[i].subtract(chain.positions[i+1]).left90().unit().multiply(chain.shape[i]).add(chain.positions[i]));
    lefts.push(chain.positions[chain.n-2].subtract(chain.positions[chain.n-1]).left90().unit().multiply(chain.shape[chain.n-1]).add(chain.positions[chain.n-1]));
    let rights = chain.positions.slice(1).map((_, i)=>chain.positions[i].subtract(chain.positions[i+1]).right90().unit().multiply(chain.shape[i]).add(chain.positions[i]));
    rights.push(chain.positions[chain.n-2].subtract(chain.positions[chain.n-1]).right90().unit().multiply(chain.shape[chain.n-1]).add(chain.positions[chain.n-1]));
    return { lefts, rights };
}

// Silhouette path (no paint): shared by the body fill, the splash clip,
// and the shading pass.
export function buildBodyPath(chain, body_length){
    let { lefts, rights } = bodyOutlines(chain);
    // Draw semicircle at the front (position 0)
    let tipDirection = chain.positions[0].subtract(chain.positions[1]).unit();
    let tipAngle = Math.atan2(tipDirection.y, tipDirection.x);
    let radius = chain.shape[0];

    ctx.beginPath();
    ctx.moveTo(chain.positions[0].x + radius * Math.cos(tipAngle + Math.PI/2),
               chain.positions[0].y + radius * Math.sin(tipAngle + Math.PI/2));
    ctx.arc(chain.positions[0].x, chain.positions[0].y, radius, tipAngle + Math.PI/4, tipAngle - Math.PI/4, true);

    // Connect to left outline from position[0]
    let leftAtHead = tipDirection.left90().unit().multiply(chain.shape[0]).add(chain.positions[0]);
    ctx.lineTo(leftAtHead.x, leftAtHead.y);

    for (let i = 0; i < body_length; i++){
        ctx.lineTo(lefts[i].x, lefts[i].y);
    }

    for (let i = body_length - 1; i >=0 ; i--){
        ctx.lineTo(rights[i].x, rights[i].y);
    }
    ctx.closePath();
}

// Cylindrical light model: brightness follows the surface normal across
// each flank, highlight along the spine centerline, soft occlusion
// toward the rails. Clipped to the silhouette, painted over patches so
// the whole fish sits under one light.
export function draw_shading(chain, body_length){
    let { lefts, rights } = bodyOutlines(chain);
    ctx.save();
    buildBodyPath(chain, body_length);
    ctx.clip();
    for (let i = 0; i < body_length - 1; i++){
        const g = ctx.createLinearGradient(lefts[i].x, lefts[i].y, rights[i].x, rights[i].y);
        g.addColorStop(0, "rgba(18, 28, 44, 0.22)");
        g.addColorStop(0.5, "rgba(255, 255, 255, 0.12)");
        g.addColorStop(1, "rgba(18, 28, 44, 0.22)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(lefts[i].x, lefts[i].y);
        ctx.lineTo(lefts[i+1].x, lefts[i+1].y);
        ctx.lineTo(rights[i+1].x, rights[i+1].y);
        ctx.lineTo(rights[i].x, rights[i].y);
        ctx.closePath();
        ctx.fill();
    }
    // Head cap: the nose semicircle sits ahead of the first strip, so it
    // gets its own radial shade, same light (bright crown, dark rim).
    // Only the forward hemisphere is painted; a full ring would double
    // up with the strips behind it and draw a visible seam.
    let head = chain.positions[0];
    let hr = chain.shape[0];
    let tipDir = chain.positions[0].subtract(chain.positions[1]).unit();
    let tipAngle = Math.atan2(tipDir.y, tipDir.x);
    const hg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, hr);
    hg.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    hg.addColorStop(0.7, "rgba(255, 255, 255, 0)");
    hg.addColorStop(1, "rgba(18, 28, 44, 0.22)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.arc(head.x, head.y, hr, tipAngle - Math.PI / 2, tipAngle + Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

export function draw_eyes(chain){
    let eye_separation = 0.9;
    let eye_offset = 0.1;
    let eye_size = chain.shape[0]*0.1;
    let direction = chain.positions[0].subtract(chain.positions[1]).unit().multiply(chain.shape[0]);
    let left_eye_pos = chain.head.add(direction.left90().multiply(eye_separation).add(direction.multiply(eye_offset)));
    let right_eye_pos = chain.head.add(direction.right90().multiply(eye_separation).add(direction.multiply(eye_offset)));

    draw_circle(left_eye_pos.x, left_eye_pos.y, eye_size);
    draw_circle(right_eye_pos.x, right_eye_pos.y, eye_size);
}


// Path-only dorsal outline. Paint lives in draw_dorsal_fin; the skeleton
// rig reuses this trace so skin and blueprint can never desync.
function trace_dorsal_fin(chain, start_point, end_point, quadratic_control_dist, quadratic_multiplier){
    ctx.beginPath();
    for (let i = start_point; i <= end_point; i++){
        let fin_point = chain.positions[i];
        ctx.lineTo(fin_point.x, fin_point.y);
    }

    let directionVec = chain.positions[end_point-quadratic_control_dist-1].subtract(chain.positions[end_point-quadratic_control_dist]);
    let internal_angle = chain.internal_angle;
    directionVec = (internal_angle > 0) ? directionVec.left90() : directionVec.right90();
    directionVec = directionVec.unit().multiply(Math.abs(internal_angle*quadratic_multiplier));
    let quadratic_control_point = chain.positions[end_point-quadratic_control_dist].add(directionVec);
    ctx.quadraticCurveTo(
        quadratic_control_point.x,
        quadratic_control_point.y,
        chain.positions[start_point].x,
        chain.positions[start_point].y
    )
    ctx.closePath();
    return quadratic_control_point;
}

export function draw_dorsal_fin(chain, start_point, end_point, quadratic_control_dist, quadratic_multiplier){
    let quadratic_control_point = trace_dorsal_fin(chain, start_point, end_point, quadratic_control_dist, quadratic_multiplier);
    console.log("internal angle: ", chain.internal_angle);
    // Translucent fin: opaque pearl at the spine base fading to sheer at
    // the tip. No stroke contour, the fade alone separates fin from body.
    let dorsalBase = chain.positions[start_point];
    ctx.fillStyle = finSheen(
        dorsalBase.x, dorsalBase.y,
        quadratic_control_point.x, quadratic_control_point.y
    );
    ctx.fill();
    ctx.strokeStyle = "transparent";
    ctx.stroke();
    // draw_point(quadratic_control_point);
}

// Frame helper: owns save/translate/rotate/restore and the ellipse path,
// handing paint to a callback so filled skin and blueprint outline share
// one geometry. Balanced by construction, callers cannot leak transforms.
function with_ellipse_frame(position, angle, direction, width, height, paint){
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);

    ctx.beginPath();
    let angles = direction === "left" ? [Math.PI/2, Math.PI*5/3] : [-Math.PI*5/3, -Math.PI/2];
    ctx.ellipse(0, 0, width, height, 0, angles[0], angles[1]);
    paint();

    ctx.restore();
}

function ellipse_fin(position, angle, direction, width, height){
    with_ellipse_frame(position, angle, direction, width, height, () => {
        // Radial sheen: dense pearl at the fin root dissolving outward.
        // No contour stroke, translucency keeps the fin identifiable.
        let finRadius = Math.max(width, height);
        ctx.fillStyle = finSheenRadial(finRadius);
        ctx.fill();
        ctx.strokeStyle = "transparent";
        ctx.stroke();
    });
}

// Placement of a pectoral fin from the chain: shared by skin and rig.
function ellipsefin_frame(chain, direction, control_segment){
    let rotate_vec = (vector, dir) => dir == "left" ? vector.left90() : vector.right90();

    // Get spine direction for rotation
    let spine_direction = chain.positions[control_segment-1].subtract(chain.positions[control_segment]);
    let spine_angle = Math.atan2(spine_direction.y, spine_direction.x);

    // Position: perpendicular from the body
    let side_offset = rotate_vec(spine_direction.unit(), direction).multiply(chain.shape[control_segment]*0.5);
    let fin_pos = chain.positions[control_segment].add(side_offset);

    // Rotation: spine angle plus offset for fin orientation
    let fin_angle = spine_angle + (direction === "left" ? Math.PI / 4 : -Math.PI / 4);

    return { fin_pos, fin_angle, width: 80*chain.size, height: 32*chain.size };
}

export function draw_ellipsefin(chain, direction, control_segment){
    let { fin_pos, fin_angle, width, height } = ellipsefin_frame(chain, direction, control_segment);
    ellipse_fin(fin_pos, fin_angle, direction, width, height);
}

// Back-fin anchor geometry: shared by skin and rig.
function backfin_geometry(chain, direction, start_segment, end_segment, control_segment, control_point_multiplier){
    let rotate = (vector, dir) => dir == "left" ? vector.left90() : vector.right90();
    let get_sidevec = (seg_number, dir) => rotate(
        chain.positions[seg_number-1].subtract(chain.positions[seg_number]), dir).unit().multiply(chain.shape[seg_number]);

    let start_point = get_sidevec(start_segment, direction).add(chain.positions[start_segment]);
    let end_point = get_sidevec(end_segment, direction).add(chain.positions[end_segment]);

    // Use fixed control point distance for more rigid fins
    let control_offset = get_sidevec(control_segment, direction).unit().multiply(control_point_multiplier);
    let control_point = chain.positions[control_segment].add(control_offset);

    return { start_point, end_point, control_point };
}

// Path-only back-fin curve (no closePath, matches the filled original).
function trace_backfin(chain, direction, start_segment, end_segment, control_segment, control_point_multiplier){
    let { start_point, end_point, control_point } = backfin_geometry(
        chain, direction, start_segment, end_segment, control_segment, control_point_multiplier);
    ctx.beginPath();
    ctx.moveTo(start_point.x, start_point.y);
    ctx.quadraticCurveTo(
        control_point.x,
        control_point.y,
        end_point.x,
        end_point.y
    );
    return { start_point, end_point, control_point };
}

export function draw_backfin(chain, direction, start_segment, end_segment, control_segment, control_point_multiplier){
    let { start_point, end_point, control_point } = trace_backfin(
        chain, direction, start_segment, end_segment, control_segment, control_point_multiplier);
    // Base-to-tip translucency: solid root melting into a sheer edge.
    let backBaseX = (start_point.x + end_point.x) / 2;
    let backBaseY = (start_point.y + end_point.y) / 2;
    ctx.fillStyle = finSheen(
        backBaseX, backBaseY,
        control_point.x, control_point.y
    );
    ctx.fill();
    ctx.strokeStyle = "transparent";
    ctx.stroke();
}

// Path-only tail outline. Paint lives in draw_tail_fin; the skeleton
// rig reuses this trace so skin and blueprint can never desync.
function trace_tail_fin(chain, tail_start){
    const TAIL_START = tail_start;
    const control_dist = 0;
    const control_multiplier = 20;

    // Get positions along the tail
    let p1 = chain.positions[TAIL_START];
    let p4 = chain.positions[chain.n - 1];

    // Get direction vector using the same method as dorsal fin
    let directionVec = chain.positions[chain.n - 1 - control_dist - 1].subtract(chain.positions[chain.n - 1 - control_dist]);
    let internal_angle = chain.internal_angle;
    let tail_direction = (internal_angle > 0) ? "left" : "right";
    directionVec = (internal_angle > 0) ? directionVec.left90() : directionVec.right90();
    directionVec = directionVec.unit().multiply(Math.abs(internal_angle * control_multiplier));

    // Control point for the tail
    let control_point = chain.positions[chain.n - 1 - control_dist].add(directionVec);
    let lefts = chain.positions.slice(1).map((_, i)=>chain.positions[i].subtract(chain.positions[i+1]).left90().unit().multiply(chain.shape[i]).add(chain.positions[i]));
    lefts.push(chain.positions[chain.n-2].subtract(chain.positions[chain.n-1]).left90().unit().multiply(chain.shape[chain.n-1]).add(chain.positions[chain.n-1]));
    let rights = chain.positions.slice(1).map((_, i)=>chain.positions[i].subtract(chain.positions[i+1]).right90().unit().multiply(chain.shape[i]).add(chain.positions[i]));
    rights.push(chain.positions[chain.n-2].subtract(chain.positions[chain.n-1]).right90().unit().multiply(chain.shape[chain.n-1]).add(chain.positions[chain.n-1]));
    // draw_point(control_point);
    ctx.beginPath();
    let spine_side = tail_direction == "left" ? rights : lefts;
    let out_side = tail_direction == "left" ? lefts : rights;
    ctx.moveTo(lefts[TAIL_START].x, lefts[TAIL_START].y);

    // Draw bezier curve along the spine from start to end
    let mid_point = Math.floor((TAIL_START + chain.n - 1) / 2);
    ctx.bezierCurveTo(
        chain.positions[mid_point].x,
        chain.positions[mid_point].y,
        chain.positions[chain.n - 2].x,
        chain.positions[chain.n - 2].y,
        chain.positions[chain.n - 1].x,
        chain.positions[chain.n - 1].y
    );
    ctx.bezierCurveTo(
        control_point.x,
        control_point.y,
        control_point.x,
        control_point.y,
        rights[TAIL_START].x,
        rights[TAIL_START].y
    );
    ctx.closePath();
    return { p1, p4 };
}

export function draw_tail_fin(chain, tail_start){
    let { p1, p4 } = trace_tail_fin(chain, tail_start);
    // Tail sheen: opaque at the peduncle, sheer at the trailing edge.
    ctx.fillStyle = finSheen(
        p1.x, p1.y,
        p4.x, p4.y
    );
    ctx.fill();
    ctx.strokeStyle = "transparent";
    ctx.stroke();
}
