function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// get the length (magnitude) of a vector
function magnitude(vx, vy) {
    return Math.sqrt(vx * vx + vy * vy);
}

// make a vector length 1 (unit vector) while keeping direction
function normalize(vx, vy) {
    const mag = magnitude(vx, vy);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: vx / mag, y: vy / mag };
}

// cap a vector's length to a maximum value
function limit(vx, vy, max) {
    const mag = magnitude(vx, vy);
    if (mag > max) {
        const norm = normalize(vx, vy);
        return { x: norm.x * max, y: norm.y * max };
    }
    return { x: vx, y: vy };
}

class Boid {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 60; // speed: pixels per second
        this.vy = (Math.random() - 0.5) * 60;
        this.ax = 0;  // acceleration RESERVE FOR FUTURE
        this.ay = 0;
        
        // parameters
        this.maxSpeed = 60;
        this.minSpeed = 15;  // birds must keep moving
        this.maxForce = 0.05;
        this.separationDistance = 25;  // How close is "too close"

        // TODO: make sure vx vy within max and min
        // this.vx = Math.max(this.vs, this.minSpeed);
        // this.vy = Math.max(this.vy, this.minSpeed);

        this.neighbourRadius = 100; // bird can see 
    }
    
    separate(deltaTime) {

    }

    align(deltaTime, neighborBoids) {
        let avgVX = 0;
        let avgVY = 0;
        
        
        // sum up all the velocities
        for (let other of neighborBoids) {
            avgVX += other.vx;
            avgVY += other.vy;
        }
        
        // calculate average velocity of neighbors, if there are neighbours
        if (neighborBoids.length > 0) {
            avgVX /= neighborBoids.length;
            avgVY /= neighborBoids.length;
            
            // normalize and scale to max speed (desired velocity)
            const norm = normalize(avgVX, avgVY);
            avgVX = norm.x * this.maxSpeed;
            avgVY = norm.y * this.maxSpeed;
            
            // calculate steering force: desired - current (F_align)
            let steerX = avgVX - this.vx;
            let steerY = avgVY - this.vy;
            
            // limit the force
            const limited = limit(steerX, steerY, this.maxForce);
            return limited;
        }
        
        return { x: 0, y: 0 };

    }

    cohere(deltaTime) {
    }

    getNeighborBoids(perceptionRadius) {
        return world.allBoids.filter(other => {  // this line was changed
            if (other === this) return false;
            
            const d = distance(this.x, this.y, other.x, other.y);
            return d < perceptionRadius;
        });
    }
        
    update(deltaTime) {
        let neighborBoids = this.getNeighborBoids(this.neighbourRadius);
        let ali = this.align(deltaTime, neighborBoids); // align

        // combine forces
        this.ax = ali.x * 2.0; // todo: adjust weighting later when other forces are here
        this.ay = ali.y * 2.0;
    
        // Update velocity with acceleration
        this.vx += this.ax;
        this.vy += this.ay;

        // limit max speed
        const limited = limit(this.vx, this.vy, this.maxSpeed); // after minimum force is applied
        this.vx = limited.x;
        this.vy = limited.y;
        
        // enforce minimum speed
        const currentSpeed = magnitude(this.vx, this.vy);
        if (currentSpeed < this.minSpeed && currentSpeed > 0) {
            const norm = normalize(this.vx, this.vy);
            this.vx = norm.x * this.minSpeed;
            this.vy = norm.y * this.minSpeed; // same direction, change velocity back down
        }

        this.x += this.vx * deltaTime; // consistent speed w different monitor refresh
        this.y += this.vy * deltaTime;
        
        // wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }
    
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#4af';
        ctx.fill();
    }
}

class World {
    constructor(){
        this.allBoids = [];
        for (let i = 0; i < 100; i++) {
            this.allBoids.push(new Boid(
                Math.random() * canvas.width,
                Math.random() * canvas.height
            ));
        }
    }
}
// === CANVAS SETUP ===
const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;



// === CREATE BOIDS ===
const world = new World();


let previousTime;


// === ANIMATION LOOP ===
function render(currentTime) {
    if (previousTime === undefined) {
        previousTime = currentTime;
        requestAnimationFrame(render);
        return;
    }

    const deltaTime = (currentTime - previousTime)/1000; // Time in milliseconds
    previousTime = currentTime;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let boid of world.allBoids) {
        boid.update(deltaTime);
        boid.draw();
    }
    
    requestAnimationFrame(render);
}

requestAnimationFrame(render);