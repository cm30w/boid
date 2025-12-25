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

class WindZone {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // random wind direction and strength
        const angle = Math.random() * Math.PI * 2;
        const strength = 0.5 + Math.random() * 1.5; // 0.5 to 2.0
        this.forceX = Math.cos(angle) * strength;
        this.forceY = Math.sin(angle) * strength;
        
        // wind particles
        this.particles = [];
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: this.x + Math.random() * this.width,
                y: this.y + Math.random() * this.height,
                size: 2 + Math.random() * 2
            });
        }
    }
    
    updateParticles(deltaTime) {
        for (let p of this.particles) {
            // move particle in wind direction
            p.x += this.forceX * 20 * deltaTime;
            p.y += this.forceY * 20 * deltaTime;
            
            // wrap around within this zone
            if (p.x < this.x) p.x = this.x + this.width;
            if (p.x > this.x + this.width) p.x = this.x;
            if (p.y < this.y) p.y = this.y + this.height;
            if (p.y > this.y + this.height) p.y = this.y;
        }
    }
    
    draw() {
        // draw zone border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // draw wind particles
        for (let p of this.particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(68, 81, 105, 0.6)';
            ctx.fill();
        
        }
    }
    
    // check if boid is in this zone and return wind force
    applyToBoid(boid) {
        if (boid.x >= this.x && boid.x <= this.x + this.width &&
            boid.y >= this.y && boid.y <= this.y + this.height) {
            return { x: this.forceX, y: this.forceY };
        }
        return { x: 0, y: 0 };
    }
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
        this.maxForce = 0.2;
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

    // wind effect
    applyWind(windZones) {
        let totalWindX = 0;
        let totalWindY = 0;
        
        for (let zone of windZones) {
            const wind = zone.applyToBoid(this);
            totalWindX += wind.x;
            totalWindY += wind.y;
        }
        
        return { x: totalWindX, y: totalWindY };
    }

    getNeighborBoids(perceptionRadius) {
        return world.allBoids.filter(other => {  // this line was changed
            if (other === this) return false;
            
            const d = distance(this.x, this.y, other.x, other.y);
            return d < perceptionRadius;
        });
    }
        
    update(deltaTime, windZones) {
        let neighborBoids = this.getNeighborBoids(this.neighborRadius);
        let ali = this.align(deltaTime, neighborBoids); // align
        let coh = this.cohere(deltaTime, neighborBoids); // cohere
        let sep = this.separate(deltaTime, neighborBoids); // separate
        let wind = this.applyWind(windZones);  // wind


        // combine forces
        this.ax = ali.x + coh.x + sep.x * 2 + wind.x * 0.2; // todo: adjust weighting later when other forces are here
        this.ay = ali.y + coh.y + sep.y * 2 + wind.y * 0.2;
    
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
        // calculate the angle the boid is traveling
        const angle = Math.atan2(this.vy, this.vx);
        
        // save the current canvas state
        ctx.save();
        
        // move to the boid's position and rotate
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        // draw a triangle pointing right (in the direction of travel)
        ctx.beginPath();
        ctx.moveTo(8, 0);      // nose of triangle (front)
        ctx.lineTo(-4, 4);     // bottom back corner
        ctx.lineTo(-4, -4);    // top back corner
        ctx.closePath();
        
        ctx.fillStyle = '#4af';
        ctx.fill();
        ctx.strokeStyle = '#6cf';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // restore the canvas state
        ctx.restore();
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
        
        // CREATE 3x3 GRID OF WIND ZONES
        this.windZones = [];
        const zoneWidth = canvas.width / 3;
        const zoneHeight = canvas.height / 3;
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                this.windZones.push(new WindZone(
                    col * zoneWidth,
                    row * zoneHeight,
                    zoneWidth,
                    zoneHeight
                ));
            }
        }
    }
}


// === CANVAS SETUP ===
const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 800;



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

    const deltaTime = (currentTime - previousTime)/1000;
    previousTime = currentTime;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // UPDATE AND DRAW WIND ZONES - ADD THIS
    for (let zone of world.windZones) {
        zone.updateParticles(deltaTime);
        zone.draw();
    }
    
    // UPDATE AND DRAW BOIDS
    for (let boid of world.allBoids) {
        boid.update(deltaTime, world.windZones);
        boid.draw();
    }
    
    requestAnimationFrame(render);
}

requestAnimationFrame(render);