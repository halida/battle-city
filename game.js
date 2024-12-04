class Base {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.health = 1;
    }

    draw(ctx) {
        // Draw base
        ctx.fillStyle = '#0F0';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // Draw star symbol
        ctx.fillStyle = '#FF0';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', this.x + this.width/2, this.y + this.height/2);
    }
}

class Barrier {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.health = 3;
    }

    draw(ctx) {
        ctx.fillStyle = this.health === 3 ? '#888' : 
                       this.health === 2 ? '#666' : '#444';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.health.toString(), 
                    this.x + this.width/2, 
                    this.y + this.height/2);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.base = new Base(240, 464);
        this.playerTank = new Tank(124, 448, 'up', '#5C9', this);
        this.bullets = [];
        this.enemies = [
            new Tank(0, 0, 'down', '#F55', this),
            new Tank(224, 0, 'down', '#F55', this),
            new Tank(448, 0, 'down', '#F55', this)
        ];
        this.barriers = [];
        this.generateBarriers();
        this.keys = {};
        
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
        
        this.gameLoop();
    }

    generateBarriers() {
        // Generate random barriers
        for (let i = 0; i < 20; i++) {
            const x = Math.floor(Math.random() * 15) * 32;
            const y = Math.floor(Math.random() * 12) * 32;
            
            // Don't place barriers on tanks or too close to them
            if (Math.abs(x - this.playerTank.x) < 64 && Math.abs(y - this.playerTank.y) < 64) {
                continue;
            }
            
            this.barriers.push(new Barrier(x, y));
        }
    }

    isPositionOccupied(x, y) {
        // Check if position overlaps with tanks or other barriers
        const tanks = [this.playerTank, ...this.enemies];
        for (const tank of tanks) {
            if (this.checkCollision(
                { x, y, width: 32, height: 32 },
                { x: tank.x, y: tank.y, width: tank.size, height: tank.size }
            )) {
                return true;
            }
        }
        
        for (const barrier of this.barriers) {
            if (this.checkCollision(
                { x, y, width: 32, height: 32 },
                barrier
            )) {
                return true;
            }
        }
        
        return false;
    }

    checkCollision(rect1, rect2) {
        return !(rect1.x >= rect2.x + rect2.width ||
                rect1.x + rect1.width <= rect2.x ||
                rect1.y >= rect2.y + rect2.height ||
                rect1.y + rect1.height <= rect2.y);
    }

    canMove(tank, newX, newY) {
        const newPos = {
            x: newX,
            y: newY,
            width: tank.size,
            height: tank.size
        };

        // Check collision with base
        if (this.checkCollision(newPos, this.base)) {
            return false;
        }

        // Check collision with barriers
        for (const barrier of this.barriers) {
            if (this.checkCollision(newPos, barrier)) {
                return false;
            }
        }

        // Check collision with other tanks
        const otherTanks = [this.playerTank, ...this.enemies].filter(t => t !== tank);
        for (const otherTank of otherTanks) {
            if (this.checkCollision(newPos, {
                x: otherTank.x,
                y: otherTank.y,
                width: otherTank.size,
                height: otherTank.size
            })) {
                return false;
            }
        }

        // Check canvas boundaries
        if (newX < 0 || newX + tank.size > this.canvas.width ||
            newY < 0 || newY + tank.size > this.canvas.height) {
            return false;
        }

        return true;
    }

    update() {
        // Player movement
        if (this.keys['ArrowUp']) this.playerTank.move('up');
        if (this.keys['ArrowDown']) this.playerTank.move('down');
        if (this.keys['ArrowLeft']) this.playerTank.move('left');
        if (this.keys['ArrowRight']) this.playerTank.move('right');
        
        // Shooting
        if (this.keys[' '] && !this.playerTank.cooldown) {
            const bullet = this.playerTank.shoot();
            if (bullet) this.bullets.push(bullet);
        }

        // Update bullets and check collisions
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            
            // Check collision with base
            if (this.checkCollision(
                { x: bullet.x - bullet.size/2, y: bullet.y - bullet.size/2, width: bullet.size, height: bullet.size },
                this.base
            )) {
                if (bullet.source === 'enemy') {
                    alert('Game Over! Base Destroyed!');
                    location.reload();
                }
                return false;
            }
            
            // Check collision with barriers
            for (let i = this.barriers.length - 1; i >= 0; i--) {
                if (this.checkCollision(
                    { x: bullet.x - bullet.size/2, y: bullet.y - bullet.size/2, width: bullet.size, height: bullet.size },
                    this.barriers[i]
                )) {
                    this.barriers[i].health--;
                    if (this.barriers[i].health <= 0) {
                        this.barriers.splice(i, 1);
                    }
                    return false; // Remove bullet
                }
            }
            
            // Check collision with tanks
            // Player bullet hits enemy
            if (bullet.source === 'player') {
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.enemies[i];
                    if (this.checkCollision(
                        { x: bullet.x - bullet.size/2, y: bullet.y - bullet.size/2, width: bullet.size, height: bullet.size },
                        { x: enemy.x, y: enemy.y, width: enemy.size, height: enemy.size }
                    )) {
                        enemy.health--;
                        if (enemy.health <= 0) {
                            this.enemies.splice(i, 1);
                            if (this.enemies.length === 0) {
                                alert('You Win! Congratulations!');
                                location.reload();
                            }
                        }
                        return false; // Remove bullet
                    }
                }
            } 
            // Enemy bullet hits player
            else if (this.checkCollision(
                { x: bullet.x - bullet.size/2, y: bullet.y - bullet.size/2, width: bullet.size, height: bullet.size },
                { x: this.playerTank.x, y: this.playerTank.y, width: this.playerTank.size, height: this.playerTank.size }
            )) {
                this.playerTank.health--;
                if (this.playerTank.health <= 0) {
                    alert('Game Over!');
                    location.reload();
                }
                return false; // Remove bullet
            }
            
            return bullet.isActive();
        });

        // Update enemies
        this.enemies.forEach(enemy => {
            if (Math.random() < 0.01) {
                if (Math.random() < 0.8) {  // 80% chance to trace player
                    // Get direction to player while avoiding barriers
                    const dx = this.playerTank.x - enemy.x;
                    const dy = this.playerTank.y - enemy.y;
                    
                    // Try primary direction first
                    let primaryDir, secondaryDir;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        primaryDir = dx > 0 ? 'right' : 'left';
                        secondaryDir = dy > 0 ? 'down' : 'up';
                    } else {
                        primaryDir = dy > 0 ? 'down' : 'up';
                        secondaryDir = dx > 0 ? 'right' : 'left';
                    }

                    // Test movement in primary direction
                    let testX = enemy.x;
                    let testY = enemy.y;
                    switch(primaryDir) {
                        case 'up': testY -= enemy.speed; break;
                        case 'down': testY += enemy.speed; break;
                        case 'left': testX -= enemy.speed; break;
                        case 'right': testX += enemy.speed; break;
                    }

                    // If primary direction is blocked, try secondary
                    if (!this.canMove(enemy, testX, testY)) {
                        testX = enemy.x;
                        testY = enemy.y;
                        switch(secondaryDir) {
                            case 'up': testY -= enemy.speed; break;
                            case 'down': testY += enemy.speed; break;
                            case 'left': testX -= enemy.speed; break;
                            case 'right': testX += enemy.speed; break;
                        }
                        
                        // If both directions are blocked, try opposite of blocked direction
                        if (!this.canMove(enemy, testX, testY)) {
                            const oppositeDir = {
                                'up': 'down', 'down': 'up',
                                'left': 'right', 'right': 'left'
                            };
                            enemy.direction = oppositeDir[enemy.direction] || primaryDir;
                        } else {
                            enemy.direction = secondaryDir;
                        }
                    } else {
                        enemy.direction = primaryDir;
                    }
                } else {  // 20% chance to move randomly
                    enemy.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
                }
            }
            enemy.move(enemy.direction);
            if (Math.random() < 0.02) {
                const bullet = enemy.shoot();
                if (bullet) this.bullets.push(bullet);
            }
        });

        // Tank cooldown update
        this.playerTank.updateCooldown();
        this.enemies.forEach(enemy => enemy.updateCooldown());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.base.draw(this.ctx);
        this.barriers.forEach(barrier => barrier.draw(this.ctx));
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.playerTank.draw(this.ctx);
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

class Tank {
    constructor(x, y, direction, color, game) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.color = color;
        this.cannonColor = color === '#5C9' ? '#185' : '#911';
        this.speed = 2;
        this.size = 32;
        this.cooldown = 0;
        this.cooldownTime = 30;
        this.health = color === '#5C9' ? 2 : 3;
        this.game = game;
    }

    move(direction) {
        this.direction = direction;
        let newX = this.x;
        let newY = this.y;
        
        switch(direction) {
            case 'up':
                newY = this.y - this.speed;
                break;
            case 'down':
                newY = this.y + this.speed;
                break;
            case 'left':
                newX = this.x - this.speed;
                break;
            case 'right':
                newX = this.x + this.speed;
                break;
        }

        // Only update position if movement is allowed
        if (this.game.canMove(this, newX, newY)) {
            this.x = newX;
            this.y = newY;
        }
    }

    shoot() {
        if (this.cooldown > 0) return null;
        
        this.cooldown = this.cooldownTime;
        let bulletX = this.x + this.size / 2;
        let bulletY = this.y + this.size / 2;
        return new Bullet(bulletX, bulletY, this.direction, this.color === '#5C9' ? 'player' : 'enemy');
    }

    updateCooldown() {
        if (this.cooldown > 0) this.cooldown--;
    }

    draw(ctx) {
        // Draw tank body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        
        // Draw health indicator
        const indicatorSize = 12;
        const centerX = this.x + this.size/2 - indicatorSize/2;
        const centerY = this.y + this.size/2 - indicatorSize/2;
        ctx.fillStyle = '#000';
        ctx.fillRect(centerX, centerY, indicatorSize, indicatorSize);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.health.toString(), 
                    this.x + this.size/2, 
                    this.y + this.size/2);
        
        // Draw cannon
        ctx.fillStyle = this.cannonColor;
        const cannonWidth = 4;
        const cannonLength = 20;
        
        switch(this.direction) {
            case 'up':
                ctx.fillRect(this.x + (this.size - cannonWidth)/2, 
                           this.y - cannonLength/2, 
                           cannonWidth, cannonLength);
                break;
            case 'down':
                ctx.fillRect(this.x + (this.size - cannonWidth)/2, 
                           this.y + this.size - cannonLength/2, 
                           cannonWidth, cannonLength);
                break;
            case 'left':
                ctx.fillRect(this.x - cannonLength/2, 
                           this.y + (this.size - cannonWidth)/2, 
                           cannonLength, cannonWidth);
                break;
            case 'right':
                ctx.fillRect(this.x + this.size - cannonLength/2, 
                           this.y + (this.size - cannonWidth)/2, 
                           cannonLength, cannonWidth);
                break;
        }
    }
}

class Bullet {
    constructor(x, y, direction, source) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = 5;
        this.size = 4;
        this.source = source;
    }

    update() {
        switch(this.direction) {
            case 'up': this.y -= this.speed; break;
            case 'down': this.y += this.speed; break;
            case 'left': this.x -= this.speed; break;
            case 'right': this.x += this.speed; break;
        }
    }

    isActive() {
        return this.x >= 0 && this.x <= 512 && this.y >= 0 && this.y <= 512;
    }

    draw(ctx) {
        ctx.fillStyle = this.source === 'player' ? '#FFF' : '#F00';
        ctx.fillRect(this.x - this.size/2, 
                    this.y - this.size/2, 
                    this.size, this.size);
    }
}

// Start the game
window.onload = () => new Game();
