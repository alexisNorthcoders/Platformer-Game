class Enemy extends Sprite{
    constructor({ collisionBlocks = [], imageSrc, frameRate, animations, loop }) {
        super({imageSrc, frameRate, animations, loop})

        this.position = {
            x: 500,
            y: 200
        }

        this.velocity = {
            x:0,
            y:0
        }

        this.sides = {
            bottom: this.position.y + this.height
        }
        this.gravity = 0.4

        this.collisionBlocks = collisionBlocks
        
         }
    
    update() {
         // blue box 
        //c.fillStyle = 'rgba(0,0,255,0.3)'
        //c.fillRect(this.position.x,this.position.y,this.width,this.height)  
        this.position.x += this.velocity.x

        this.updateHitbox()
       
        this.checkForHorizontalCollisions()
        this.applyGravity()

        this.updateHitbox()

           c.fillRect(
            this.hitbox.position.x, 
            this.hitbox.position.y, 
            this.hitbox.width, 
            this.hitbox.height)    
                
        this.checkForVerticalCollisions()        
    }

      updateHitbox() {
        this.hitbox = {
            position:{
                x: this.position.x+23 ,
                y: this.position.y+30
            },
            width: 37,
            height: 28
        }}

    checkForHorizontalCollisions() {
        for (let i=0; i< this.collisionBlocks.length;i++){
            const collisionBlock = this.collisionBlocks[i]
            // if collision exists
            if (this.hitbox.position.x <= collisionBlock.position.x+collisionBlock.width &&
                this.hitbox.position.x + this.hitbox.width >= collisionBlock.position.x &&
                this.hitbox.position.y + this.hitbox.height >= collisionBlock.position.y &&
                this.hitbox.position.y <= collisionBlock.position.y + collisionBlock.height) 
                {
                    // collision on x axis going left
                    if (this.velocity.x < 0) {
                        const offset = this.hitbox.position.x - this.position.x
                        this.position.x = collisionBlock.position.x + collisionBlock.width - offset + 0.01
                        break
                    }
                    if (this.velocity.x > 0) {
                        const offset = this.hitbox.position.x - this.position.x + this.hitbox.width
                        this.position.x = collisionBlock.position.x - offset - 0.01
                        break
                    }
    
                }
        }
    }
    checkForVerticalCollisions() {
        // check for vertical collisions
        for (let i=0; i< this.collisionBlocks.length;i++){
            const collisionBlock = this.collisionBlocks[i]
            // if collision exists
            if (this.hitbox.position.x <= collisionBlock.position.x+collisionBlock.width &&
                this.hitbox.position.x + this.hitbox.width >= collisionBlock.position.x &&
                this.hitbox.position.y + this.hitbox.height >= collisionBlock.position.y &&
                this.hitbox.position.y <= collisionBlock.position.y + collisionBlock.height) 
                {
                  
                    if (this.velocity.y < 0) {
                        this.velocity.y = 0
                        const offset = this.hitbox.position.y - this.position.y
                        this.position.y = collisionBlock.position.y + collisionBlock.height - offset + 0.01
                        break
                    }
                    if (this.velocity.y > 0) {
                        this.velocity.y = 0
                        const offset = this.hitbox.position.y - this.position.y + this.hitbox.height
                        this.position.y = collisionBlock.position.y - offset - 0.01
                        break
                    }

                }
        }
    }
    applyGravity() {
       
        this.velocity.y += this.gravity
        this.position.y += this.velocity.y
    }
}

