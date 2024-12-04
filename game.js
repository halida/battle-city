class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.playerTank = new Tank(224, 448, 'up', '#5C9');
        this.bullets = [];
        this.enemies = [
            new Tank(0, 0, 'down', '#F55'),
            new Tank(224, 0, 'down', '#F55'),
            new Tank(448, 0, 'down', '#F55')
        ];
        this.keys = {};
        
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
        
        this.gameLoop();
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
            
            // Check collision with tanks
            // Player bullet hits enemy
            if (bullet.source === 'player') {
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.enemies[i];
                    if (this.checkCollision(bullet, enemy)) {
                        enemy.health--;
                        if (enemy.health <= 0) {
                            this.enemies.splice(i, 1);
                            // Check for win condition
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
            else if (this.checkCollision(bullet, this.playerTank)) {
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
                enemy.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
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
        
        // Draw player tank
        this.playerTank.draw(this.ctx);
        
        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    checkCollision(bullet, tank) {
        return bullet.x >= tank.x && 
               bullet.x <= tank.x + tank.size &&
               bullet.y >= tank.y && 
               bullet.y <= tank.y + tank.size;
    }
}

class Tank {
    constructor(x, y, direction, color) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.color = color;
        this.speed = 2;
        this.size = 32;
        this.cooldown = 0;
        this.cooldownTime = 30;
        this.health = color === '#5C9' ? 1 : 3; // Player has 1 health, enemies have 3
    }

    move(direction) {
        this.direction = direction;
        switch(direction) {
            case 'up':
                this.y = Math.max(0, this.y - this.speed);
                break;
            case 'down':
                this.y = Math.min(512 - this.size, this.y + this.speed);
                break;
            case 'left':
                this.x = Math.max(0, this.x - this.speed);
                break;
            case 'right':
                this.x = Math.min(512 - this.size, this.x + this.speed);
                break;
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        
        // Draw health indicator for enemy tanks
        if (this.color !== '#5C9') {
            const indicatorSize = 8;
            const centerX = this.x + this.size / 2 - indicatorSize / 2;
            const centerY = this.y + this.size / 2 - indicatorSize / 2;
            
            // Set color based on remaining health
            let healthColor;
            switch(this.health) {
                case 3: healthColor = '#F00'; break; // Red
                case 2: healthColor = '#FF0'; break; // Yellow
                case 1: healthColor = '#00F'; break; // Blue
                default: healthColor = '#000'; break;
            }
            
            ctx.fillStyle = healthColor;
            ctx.fillRect(centerX, centerY, indicatorSize, indicatorSize);
        }
        
        // Draw tank cannon
        ctx.fillStyle = '#000';
        const cannonWidth = 4;
        const cannonLength = 20;
        
        switch(this.direction) {
            case 'up':
                ctx.fillRect(this.x + (this.size - cannonWidth) / 2, this.y - cannonLength / 2, 
                           cannonWidth, cannonLength);
                break;
            case 'down':
                ctx.fillRect(this.x + (this.size - cannonWidth) / 2, this.y + this.size - cannonLength / 2, 
                           cannonWidth, cannonLength);
                break;
            case 'left':
                ctx.fillRect(this.x - cannonLength / 2, this.y + (this.size - cannonWidth) / 2, 
                           cannonLength, cannonWidth);
                break;
            case 'right':
                ctx.fillRect(this.x + this.size - cannonLength / 2, this.y + (this.size - cannonWidth) / 2, 
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
        ctx.fillStyle = '#FFF';
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
}

// Start the game
window.onload = () => new Game();
