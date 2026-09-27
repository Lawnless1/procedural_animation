import { vec2d, Chain } from './chain.js';

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
    ctx.beginPath();
    
    // Create a linear gradient from head to tail
    const gradient = ctx.createLinearGradient(
        chain.positions[0].x, chain.positions[0].y,
        chain.positions[chain.n-1].x, chain.positions[chain.n-1].y
    );
    gradient.addColorStop(0, "#f14a20");    // Orange at head
    gradient.addColorStop(0.5, "#ff8c42");  // Lighter orange in middle
    gradient.addColorStop(1, "#ff6b35");    // Darker orange at tail
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "transparent";
    ctx.lineWidth = 3;
    let lefts = chain.positions.slice(1).map((_, i)=>chain.positions[i].subtract(chain.positions[i+1]).left90().unit().multiply(chain.shape[i]).add(chain.positions[i]));
    lefts.push(chain.positions[chain.n-2].subtract(chain.positions[chain.n-1]).left90().unit().multiply(chain.shape[chain.n-1]).add(chain.positions[chain.n-1]));
    let rights = chain.positions.slice(1).map((_, i)=>chain.positions[i].subtract(chain.positions[i+1]).right90().unit().multiply(chain.shape[i]).add(chain.positions[i]));
    rights.push(chain.positions[chain.n-2].subtract(chain.positions[chain.n-1]).right90().unit().multiply(chain.shape[chain.n-1]).add(chain.positions[chain.n-1]));
    // rights.push(chain.positions[chain.n-1].right90().unit().multiply(chain.shape[chain.n-1]).add(chain.positions[chain.n-1]));
    // Draw semicircle at the front (position 0)
    let tipDirection = chain.positions[0].subtract(chain.positions[1]).unit();
    let tipAngle = Math.atan2(tipDirection.y, tipDirection.x);
    let radius = chain.shape[0];
    
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
    ctx.fill();
    ctx.stroke();
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


export function draw_dorsal_fin(chain, start_point, end_point, quadratic_control_dist, quadratic_multiplier){
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
    console.log("internal angle: ", chain.internal_angle);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "transparent";
    ctx.stroke();
    // draw_point(quadratic_control_point);
}

function ellipse_fin(position, angle, direction, width, height){
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);
    
    ctx.beginPath();
    let angles = direction === "left" ? [Math.PI/2, Math.PI*5/3] : [-Math.PI*5/3, -Math.PI/2];
    ctx.ellipse(0, 0, width, height, 0, angles[0], angles[1]);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "transparent";
    ctx.stroke();
    
    ctx.restore();
}

export function draw_ellipsefin(chain, direction, control_segment){
    let rotate_vec = (vector, dir) => dir == "left" ? vector.left90() : vector.right90();
    
    // Get spine direction for rotation
    let spine_direction = chain.positions[control_segment-1].subtract(chain.positions[control_segment]);
    let spine_angle = Math.atan2(spine_direction.y, spine_direction.x);
    
    // Position: perpendicular from the body
    let side_offset = rotate_vec(spine_direction.unit(), direction).multiply(chain.shape[control_segment]*0.5);
    let fin_pos = chain.positions[control_segment].add(side_offset);
    
    // Rotation: spine angle plus offset for fin orientation
    let fin_angle = spine_angle + (direction === "left" ? Math.PI / 4 : -Math.PI / 4);
    
    ellipse_fin(fin_pos, fin_angle, direction, 80*chain.size, 32*chain.size);
}

export function draw_backfin(chain, direction, start_segment, end_segment, control_segment, control_point_multiplier){
    let rotate = (vector, dir) => dir == "left" ? vector.left90() : vector.right90();
    let get_sidevec = (seg_number, dir) => rotate(
        chain.positions[seg_number-1].subtract(chain.positions[seg_number]), dir).unit().multiply(chain.shape[seg_number]);

    let start_point = get_sidevec(start_segment, direction).add(chain.positions[start_segment]);
    let end_point = get_sidevec(end_segment, direction).add(chain.positions[end_segment]);
    
    // Use fixed control point distance for more rigid fins
    let control_offset = get_sidevec(control_segment, direction).unit().multiply(control_point_multiplier);
    let control_point = chain.positions[control_segment].add(control_offset);
    
    ctx.beginPath();
    
    ctx.moveTo(start_point.x, start_point.y);
    ctx.quadraticCurveTo(
        control_point.x,
        control_point.y,
        end_point.x,
        end_point.y
    )
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "transparent";
    ctx.stroke();
}

export function draw_tail_fin(chain, tail_start){
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
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "transparent";
    ctx.stroke();
}
