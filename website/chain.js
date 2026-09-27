class vec2d {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    unit() {
        const mag = this.magnitude();
        return new vec2d(this.x / mag, this.y / mag);
    }
    add(v) {
        return new vec2d(this.x + v.x, this.y + v.y);
    }
    subtract(v) {
        return new vec2d(this.x - v.x, this.y - v.y);
    }
    multiply(scalar) {
        return new vec2d(this.x * scalar, this.y * scalar);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    cross(v) {
        return this.x * v.y - this.y * v.x;
    }
    angle(v) {
        let dot = this.dot(v);
        let cross = this.cross(v);
        return Math.atan2(cross, dot);
    }
    rotate(angle) {
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        return new vec2d(this.x * c - this.y * s, this.x * s + this.y * c);
    }
    left90() {
        return this.rotate(-Math.PI / 2);
    }
    right90() {
        return this.rotate(Math.PI / 2);
    }
}
class Chain {
    constructor(shape, spine, positions, size = 1) {
        this.n = shape.length;
        this.shape = shape;
        this.spine = spine;
        this.positions = positions.map(pos => new vec2d(pos[0], pos[1]));
        this.size = size;
        if (this.positions.length !== this.n) {
            throw new Error("positions length does not match n");
        }
    }
    get head() {
        return this.positions[0];
    }
    set head(value) {
        this.positions[0] = value;
    }
    get internal_angle() {
        let angle = 0;
        let spine_vectors = this.spine_vectors;
        for (let i = 0; i < spine_vectors.length - 1; i++) {
            angle += spine_vectors[i + 1].angle(spine_vectors[i]);
        }
        return angle;
    }
    get spine_vectors() {
        let vectors = [];
        for (let i = 1; i < this.n - 1; i++) {
            vectors.push(this.positions[i].subtract(this.positions[i - 1]));
        }
        return vectors;
    }
    get direction() {
        // unit
        return this.positions[0].subtract(this.positions[1]).unit();
    }
    enforceConstraints(pos1, pos2, constraint) {
        let distanceVec = (pos2.subtract(pos1)).unit().multiply(constraint);
        return pos1.add(distanceVec);
    }
    update() {
        for (let i = 1; i < this.n; i++) {
            if (this.positions[i].subtract(this.positions[i - 1]).magnitude() <= this.spine[i - 1]) {
                continue;
            }
            this.positions[i] = this.enforceConstraints(this.positions[i - 1], this.positions[i], this.spine[i - 1]);
        }
    }
}
export { vec2d, Chain };
console.log("Hello World!");
