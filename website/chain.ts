class vec2d {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    magnitude(): number {
        return Math.sqrt(this.x**2+this.y**2);
    }

    unit(): vec2d {
        const mag = this.magnitude();
        return new vec2d(this.x/mag, this.y/mag);
    }

    add(v: vec2d): vec2d {
        return new vec2d(this.x + v.x, this.y + v.y);
    }

    subtract(v: vec2d): vec2d {
        return new vec2d(this.x - v.x, this.y - v.y);
    }

    multiply(scalar: number): vec2d {
        return new vec2d(this.x * scalar, this.y * scalar);
    }
    dot(v: vec2d): number {
        return this.x * v.x + this.y * v.y;
    }

    cross(v: vec2d): number {
        return this.x * v.y - this.y * v.x;
    }
    
    angle(v: vec2d): number {
        let dot = this.dot(v);
        let cross = this.cross(v);

        return Math.atan2(cross, dot)
    }

    rotate(angle): vec2d{
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        return new vec2d(this.x*c - this.y*s, this.x*s + this.y*c);
    }

    left90(): vec2d {
        return this.rotate(-Math.PI/2);
    }

    right90(): vec2d {
        return this.rotate(Math.PI/2);
    }


}


class Chain {
    n: number;
    shape: number[];
    spine: number[];
    positions: vec2d[];
    size: number;
    
    constructor(shape: number[], spine: number[], positions: number[][], size: number = 1) {
        this.n = shape.length;
        this.shape = shape;
        this.spine = spine;
        this.positions = positions.map(pos => new vec2d(pos[0], pos[1]));
        this.size = size;
    
        if (this.positions.length !== this.n) {
            throw new Error("positions length does not match n");
        }

    }

    get head(): vec2d {
        return this.positions[0];
    }

    set head(value: vec2d) {
        this.positions[0] = value;
    }

    get internal_angle(): number{
        let angle = 0;
        let spine_vectors = this.spine_vectors;
        for (let i = 0; i < spine_vectors.length - 1; i++){
            angle += spine_vectors[i+1].angle(spine_vectors[i]);
        }
        return angle;
    }

    get spine_vectors(): vec2d[] {
        let vectors: vec2d[] = [];
        for (let i = 0; i < this.n - 1; i++){
            vectors.push(this.positions[i].subtract(this.positions[i-1]));
        }
        return vectors;
    }

    get direction(): vec2d {
        // unit
        return this.positions[0].subtract(this.positions[1]).unit();
    }
    enforceConstraints(pos1: vec2d, pos2: vec2d, constraint: number): vec2d {
        let distanceVec = (pos2.subtract(pos1)).unit().multiply(constraint);
        return pos1.add(distanceVec);
    }

    update(): void {
        for (let i = 1; i < this.n; i++){
            if (this.positions[i].subtract(this.positions[i-1]).magnitude() <= this.spine[i-1]) {
                continue;
            }
            this.positions[i] = this.enforceConstraints(this.positions[i-1], this.positions[i], this.spine[i-1]);
        }
    }
}

export { vec2d, Chain };

console.log("Hello World!");