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
        this.vx = (Math.random() - 0.5) * 90; // speed: pixels per second
        this.vy = (Math.random() - 0.5) * 90;
        this.ax = 0;  // acceleration (force)
        this.ay = 0;
        
        // parameters
        this.maxSpeed = 90;
        this.minSpeed = 60;  // birds must keep moving
        this.maxForce = 0.1;
        this.separationDistance = 30;  // How close is "too close"

        // TODO: make sure vx vy within max and min
        // this.vx = Math.max(this.vs, this.minSpeed);
        // this.vy = Math.max(this.vy, this.minSpeed);

        this.neighborRadius = 100; // bird can see 
    }
    
    separate(deltaTime, neighborBoids) {
        let steerX = 0;
        let steerY = 0;
        let count = 0;
        
        // check each neighbor within separation distance
        for (let other of neighborBoids) {
            const d = distance(this.x, this.y, other.x, other.y);
            
            // only consider boids that are too close
            if (d < this.separationDistance && d > 0) {
                // v1: repulse_force_vector
                let v1X = this.x - other.x;
                let v1Y = this.y - other.y;
                
                // v2: normalize(v1) - get repulse force direction
                const v2 = normalize(v1X, v1Y);
                
                // v3: v2 / distance - distance between two boids: it reach infinite as two boids at same position
                // closer boids create stronger repulsion
                let v3X = v2.x / d;
                let v3Y = v2.y / d;
                
                // Add to sum
                steerX += v3X;
                steerY += v3Y;
                count++;
            }
        }
        
        // v4: SUM(v3) / count - total repulsive force. count=num of neighboring boids
        if (count > 0) {
            steerX /= count;
            steerY /= count;
            
            // F_SEP: normalize(v4) * maxSpeed - final separation force
            const norm = normalize(steerX, steerY);
            steerX = norm.x * this.maxSpeed;
            steerY = norm.y * this.maxSpeed;
            
            // calculate steering force: desired - current
            steerX = steerX - this.vx;
            steerY = steerY - this.vy;
            
            // limit the force
            const limited = limit(steerX, steerY, this.maxForce);
            return limited;
        }
        
        return { x: 0, y: 0 };
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

    cohere(deltaTime, neighborBoids) {
        let avgX = 0;
        let avgY = 0;
    
        for(let other of neighborBoids){
            avgX += other.x;
            avgY += other.y;
        }
    
        if (neighborBoids.length > 0) {
            avgX /= neighborBoids.length;
            avgY /= neighborBoids.length;
    
            // normalize and scale to max speed (desired velocity)
            const norm = normalize(avgX - this.x, avgY - this.y);
            let avgVX = norm.x * this.maxSpeed;
            let avgVY = norm.y * this.maxSpeed;
            
            // calculate steering force: desired - current (F_cohere)
            let steerX = avgVX - this.vx;
            let steerY = avgVY - this.vy;
            
            // limit the force
            const limited = limit(steerX, steerY, this.maxForce);
            return limited;
        }
        
        return { x: 0, y: 0 };
    }

    getNeighborBoids(perceptionRadius) {
        return world.allBoids.filter(other => {  // this line was changed
            if (other === this) return false;
            
            const d = distance(this.x, this.y, other.x, other.y);
            return d < perceptionRadius;
        });
    }
        
    update(deltaTime) {
        let neighborBoids = this.getNeighborBoids(this.neighborRadius);
        let ali = this.align(deltaTime, neighborBoids); // align
        let coh = this.cohere(deltaTime, neighborBoids); // cohere
        let sep = this.separate(deltaTime, neighborBoids); // separate

        // combine forces
        this.ax = ali.x + coh.x + sep.x * 3.0; // todo: adjust weighting later when other forces are here
        this.ay = ali.y + coh.y + sep.y * 3.0;
    
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