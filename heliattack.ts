
import AudioManager from './audiomanager.js';
import Weapon from './weapon.ts';
import { Box3, BufferGeometry, Clock, Color, Line, LineBasicMaterial, MathUtils, Mesh, MeshBasicMaterial, Frustum, Group, Matrix4, Object3D, PlaneGeometry, Scene, TextureLoader, Vector2, Vector3, Camera } from 'three';
import { calculateAngleToMouse, checkTileCollisions, createTintShader, loadTexture, rotateAroundPivot, setUV, visibleHeightAtZDepth, visibleWidthAtZDepth } from './utils';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import Timeline from './timeline.ts';
import VideoGestures from './videogestures.ts';

const UP_KEY = 'KeyboardKeyUp';
const DOWN_KEY = 'KeyboardKeyDown';
const LEFT_KEY = 'KeyboardKeyLeft';
const RIGHT_KEY = 'KeyboardKeyRight';

const SCREEN_WIDTH = 500;
const SCREEN_HEIGHT = 500 * 9/16;

const HELI_WIDTH = 100;
const HELI_EXIT_OFFSET = 500;

let playEnemyHit = true;

class Enemy {
    constructor() {
        this.position = new Vector3(0, 0);
        this.velocity = new Vector2(0, 0);
        this.targetPosition = new Vector2(0, 0);
        this.playerOffset = new Vector2(0, 0);

        this.tick = 0;
        this.nextXReposition = Number.POSITIVE_INFINITY;
        this.nextYReposition = Number.POSITIVE_INFINITY;

        this.shooting = false;
        this.shoot = 0;

        this.health = 300;
        this.lastHealth = this.health;

        this.tints = [];
        this.tint = 0;

        this.aim = Math.PI/2;
    }

    

    init(game) {
        const heliTexture = this.heliTexture = game.textures['./images/heli/heli.png'];
        const destroyedTexture = this.destroyedTexture = game.textures['./images/heli/helidestroyed.png'];
        const enemyTexture = this.enemyTexture = game.textures['./images/heli/enemy.png'];
        this.bulletTexture = game.textures['./images/enemybullet.png'];

        this.group = new Group();

        this.heliGroup = new Group();
        this.group.add(this.heliGroup);

        const geometry = new PlaneGeometry(heliTexture.image.width, heliTexture.image.height);
        const material = new MeshBasicMaterial({
            map: heliTexture,
            transparent: true,
        });

        const tintMaterial = createTintShader(heliTexture)
        this.tints.push(tintMaterial);

        const mesh = this.mesh = new Mesh(geometry, tintMaterial);
        this.heliGroup.add(mesh);

        
        const enemyGeometry = new PlaneGeometry(enemyTexture.image.width, enemyTexture.image.height);
        const enemyMaterial = new MeshBasicMaterial({
            map: enemyTexture,
            transparent: true,
        });

        const enemyTintMaterial = createTintShader(enemyTexture);
        this.tints.push(enemyTintMaterial);

        const enemyMesh = this.enemyMesh = new Mesh(enemyGeometry, enemyTintMaterial);
        enemyMesh.position.y = -5;

        this.group.add(enemyMesh);

        const enemyWeapon = this.enemyWeapon = new Object3D();
        const weaponMesh = game.weapons[0].createMesh();
        enemyWeapon.add(weaponMesh);
        this.tints.push(weaponMesh.material);

        this.group.add(enemyWeapon);

        game.world.add(this.group)

        this.randomizePosition(game)

        // heliBoxes.forEach((box) => {
        //     // Get the size and center of the bounding box
        //     const size = new Vector3();
        //     const center = new Vector3();
        //     box.getSize(size);
        //     box.getCenter(center);
    
        //     // Create a BoxGeometry with the dimensions of the bounding box
        //     const geometry = new BoxGeometry(size.x, size.y, size.z);
    
        //     // Create a material for visualization (wireframe helps show bounding volume)
        //     const material = new MeshBasicMaterial({
        //         color: 0x00ff00, // Green color
        //         wireframe: true, // Wireframe mode to show the outline
        //     });
    
        //     // Create a mesh from the geometry and material
        //     const boxMesh = new Mesh(geometry, material);
    
        //     // Position the mesh at the center of the bounding box
        //     boxMesh.position.copy(center);
    
        //     // Add the mesh to the scene
        //     this.heliGroup.add(boxMesh);
        // });
    }

    setTint(enabled) {
        for (const tint of this.tints) {
            tint.uniforms.brightnessEnabled.value = enabled ? 1.0 : 0.0;
        }
    }

    destroy(game) {
        game.world.remove(this.group);

        new DestroyedHeli(game, this);
        new DestroyedEnemy(game, this);

        for(var i = 0; i < 3; i++) {
            const p = this.position.clone()
            p.x += -40 + Math.random() * 80;
            p.y += -20 + Math.random() * 40;
            new Shard(game, p);
        }

        new Explosion(game, this.position.clone(), 150);
    }

    randomizePosition(game) {
        this.trackingPlayer = 300 + Math.floor(Math.random() * 200);

        if (Math.random() > 0.25) {
            if (Math.random() > 0.5) {
                this.position.x = game.camera.position.x - game.visibleWidth/2 -  HELI_EXIT_OFFSET;
            } else {
                this.position.x = game.camera.position.x + game.visibleWidth/2 + HELI_EXIT_OFFSET;
            }
            this.position.y = game.player.position.y - game.visibleHeight * 0.5;
        } else {
            this.position.x = game.camera.position.x + game.visibleWidth/2;
            this.position.y = -game.camera.position.y - HELI_EXIT_OFFSET;
        }

        this.heliGroup.scale.x = Math.random() > 0.5 ? 1 : -1;

        if (this.heliGroup.scale.x == 1) {
            this.enemyMesh.position.x = 10;
        } else {
            this.enemyMesh.position.x = -10;
        }
        this.enemyWeapon.position.set(this.enemyMesh.position.x, this.enemyMesh.position.y - 7, 0);
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            move = true;
        }

        if (this.grappled) {
            if (move) {
                this.velocity.y += 0.5;
            }
            this.group.rotation.z += ((Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale / 8) * Math.PI / 180;
            
            this.position.x += this.velocity.x*game.timeScale;
            this.position.y += this.velocity.y*game.timeScale;

            this.group.position.set(this.position.x, -this.position.y, -1);

            if(isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
                this.position.y -= this.velocity.y * game.timeScale;
                this.velocity.y *= -0.5;
                this.damage(300, game);
            }

            return;
        }

        if (move) {
            if (this.trackingPlayer > 0) {
                if (move) {
                    if (this.nextXReposition++ > 150) {
                        this.nextXReposition = 0;
                        this.playerOffset.x = -SCREEN_WIDTH/2 + Math.random() * SCREEN_WIDTH;
                    }
                    if (this.nextYReposition++ > 80) {
                        this.nextYReposition = 0;
                        this.playerOffset.y = -game.visibleHeight*0.5 + (-2 * Math.random() * 4)*10;
                    }
                    this.trackingPlayer--;
                }

                this.targetPosition.x = Math.max(HELI_WIDTH, Math.min(game.player.position.x+this.playerOffset.x, game.mapWidth - HELI_WIDTH));
                this.targetPosition.y = game.mapHeight+this.playerOffset.y-50;
            } else {
                if (this.trackingPlayer == 0) { 
                    this.randomizeExit = Math.floor(Math.random() * 10)
                }

                if (this.randomizeExit < 4) {
                    this.targetPosition.x = game.camera.position.x - game.visibleWidth/2 - HELI_EXIT_OFFSET;
                } else if (this.randomizeExit < 8) {
                    this.targetPosition.x = game.camera.position.x + game.visibleWidth/2 + HELI_EXIT_OFFSET;
                } else {
                    this.targetPosition.y = -game.camera.position.y - game.visibleHeight;
                }

                this.trackingPlayer--;
            }
        }

        const onScreen = this.isOnScreen(game);

        

        const playerDiff = game.player.position.clone().sub(this.position).length();
        
        if (playerDiff < 700) {
            game.audioManager.setLoopVolume('helicopter', Math.min(1.0, (700 - playerDiff) / 700));
        }

        var diff = this.targetPosition.clone().sub(this.position);
        if (onScreen && this.trackingPlayer > 0) {
            this.velocity.x = diff.x / 100;
            this.velocity.y = diff.y / 75;
            if (move) {
                this.fireAtPlayer(game);
            }
        } else {
            this.velocity.x = diff.x / 50;
            this.velocity.y = diff.y / 20;
        }

        this.position.x += this.velocity.x*game.timeScale;
        this.position.y += this.velocity.y*game.timeScale;

        this.group.position.set(this.position.x, -this.position.y, -1);

        const r = -this.velocity.x/20 * 15;
		this.group.rotation.z = MathUtils.damp(this.group.rotation.z, r * Math.PI / 180, 10, delta);

        if (this.trackingPlayer <= 0 && !onScreen) {
            this.randomizePosition(game);
        }

        if (this.lastHealth != this.health) {
            this.setTint(true);
            this.tint = 2;
        }
        this.lastHealth = this.health;
        if (this.tint && move) {
            this.tint--;
            if (this.tint <= 0) {
                this.setTint(false);
            }
        }
    }

    fireAtPlayer(game) {
        // Get object position in world coordinates
        const playerPosition = new Vector3();
        game.player.weaponObject.getWorldPosition(playerPosition);

        playerPosition.add(game.player.velocity);

        if (game.player.powerup == PREDATOR_MODE) {
            playerPosition.x += Math.sin(game.player.powerupTime * 2 * Math.PI / 180) * 200;
        }

        const enemyPosition = new Vector3();
        this.enemyWeapon.getWorldPosition(enemyPosition);
        this.aim = Math.atan2(
            playerPosition.y - enemyPosition.y,
            playerPosition.x - enemyPosition.x
        );
        
        if (this.aim > Math.PI/2 || this.aim < -Math.PI/2) {
            this.enemyWeapon.scale.x = -1;
            this.enemyWeapon.rotation.z = this.aim + Math.PI;
        } else {
            this.enemyWeapon.scale.x = 1;
            this.enemyWeapon.rotation.z = this.aim;
        }

        if (this.shooting && (this.shoot++%Math.max(20,32-game.level*2)) == 1) {
            this.createBullet(game);
        }
    }

    isOnScreen(game) {
        const frustum = new Frustum();
        const cameraViewProjectionMatrix = new Matrix4();

        // Update frustum with the latest camera position
        game.camera.updateMatrixWorld(); 
        cameraViewProjectionMatrix.multiplyMatrices(game.camera.projectionMatrix, game.camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

        // Get mesh's bounding box
        const boundingBox = new Box3().setFromObject(this.group);

        // Check if the mesh is in the camera's frustum
        const isMeshOnScreen = frustum.intersectsBox(boundingBox);

        return isMeshOnScreen;
    }

    createBullet(game) {
        const pivot = new Vector3();
        this.enemyWeapon.getWorldPosition(pivot);

        const texture = this.bulletTexture;

        const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
        const material = new MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });

        const innacuracy = Math.max(2, 6 - game.level);
        const direction = this.aim + (-innacuracy + Math.random()*2*innacuracy) * Math.PI/180
        
        const mesh = new Mesh(geometry, material);
        mesh.rotation.z = direction;

        mesh.position.copy(pivot.add(rotateAroundPivot(game.weapons[0].barrel, zero, this.aim, !(this.aim > Math.PI/2 || this.aim < -Math.PI/2))));
        mesh.position.z = 0.5;

        game.world.add(mesh);

        const bullet = {
            velocity: new Vector3(
                3.5 * Math.cos(direction),
                3.5 * Math.sin(direction),
                0),
            object: mesh
        };
        game.enemyBullets.push(bullet);
    }

    damage(damage, game) {
        if (game.player.powerup == TRI_DAMAGE) {
            this.health -= damage * 3;
        } else {   
            this.health -= damage;
        }

        if (playEnemyHit) {
            playHit(game);
            playEnemyHit = false;
        }

        if (this.health <= 0) {
            game.heliDestroyed();
        }
    }
}

function playHit(game) {
    game.audioManager.playEffect('metal' + Math.floor(Math.random() * 4));
}

class Entity {
    constructor(game, textureUrl) {
        this.textureUrl = textureUrl;
        this.tick = 0;
        this.position = new Vector2(0, 0, 1);
        this.velocity = new Vector2(0, 0);
        this.init(game)
    }

    init(game) {
        const texture = this.texture = game.textures[this.textureUrl];

        const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
        const material = this.material = new MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        const mesh = this.mesh = new Mesh(geometry, material);
        game.world.add(mesh);

        game.entities.push(this);
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.position.x += this.velocity.x*game.timeScale;
        this.position.y += this.velocity.y*game.timeScale;

        this.updateMesh();

        return false;
    }

    updateMesh() {
        this.mesh.position.set(this.position.x, -this.position.y, this.position.z);
    }

    move(game) {}

    destroy(game) {
        game.world.remove(this.mesh);
    }
}

class DestroyedEnemy extends Entity {
    constructor(game, enemy, permanent) {
        super(game, './images/guyburned.png');

        this.position.copy(enemy.position);
		this.velocity.set(-3 + Math.random() * 6, -5 + Math.random()*5, 0);
        this.mesh.rotation.z = enemy.group.rotation.z;
        this.permanent = permanent;
    }

    move(game) {
        this.velocity.y += 0.5;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.position.x += this.velocity.x * game.timeScale
        if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
            this.position.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
        }
        this.position.y += this.velocity.y * game.timeScale;
        if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
            if (this.velocity.y < 2) {
                if (this.permanent) {
                    this.position.y = (Math.floor(this.position.y / game.tileSize)) * game.tileSize + 2;
                    return false;
                }
                return true;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.4;
            }

        } else {
            this.mesh.rotation.z += (Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale * Math.PI / 180
        }

        this.updateMesh();
    }
}

let shardBounces = 0;

class Shard extends Entity {
    constructor(game, position) {
        super(game, './images/shard' + Math.floor(Math.random() * 3) + '.png');

        this.position.copy(position);
		this.velocity.set(-5 + Math.random() * 10, -5 + Math.random()*10);
        this.mesh.scale.x = Math.random() > 0.5 ? 1 : -1;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;

        this.bounces = 0;
    }

    move(game) {
        this.velocity.y += 0.5;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.mesh.rotation.z += (Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale * Math.PI / 180

        this.position.x += this.velocity.x * game.timeScale
        if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
            this.position.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
            if (shardBounces++ % 3 == 0) {
                playHit(game);
            }
        }
        this.position.y += this.velocity.y * game.timeScale;
        if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
            if (this.bounces > 3) {
                return true;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.5;
                this.bounces++;
                if (shardBounces++ % 3 == 0) {
                    playHit(game);
                }
            }

        }

        this.updateMesh();
    }
}

class DestroyedHeli extends Entity {
    constructor(game, enemy) {
        super(game, './images/heli/helidestroyed.png');

        this.position.copy(enemy.position);
        this.velocity.copy(enemy.velocity);
        this.mesh.scale.x = enemy.heliGroup.scale.x;
        this.mesh.rotation.z = enemy.group.rotation.z;
    }

    move(game) {
        this.velocity.y += 0.5;
    }

    update(game, delta) {
        super.update(game, delta);

        this.mesh.rotation.z += ((Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale / 4) * Math.PI / 180;

        return isTileCollision(this.position.x, this.position.y, map1, game.tileSize);
    }

    destroy(game) {
        super.destroy(game);

        for(var i = 0; i < 6; i++) {
            const p = this.position.clone()
            p.x += -40 + Math.random() * 80;
            p.y -= this.velocity.y;
            new Shard(game, p);
        }

        new Explosion(game, this.position.clone(), 140);
    }
}

class Explosion extends Entity {
    constructor(game, position, size) {
        super(game, './images/explosion.png');

        this.position.copy(position);
        this.position.z = 1;
        this.targetSize = size * 0.75 / 374;

        this.mesh.scale.x = this.mesh.scale.y = size / 374;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;

        if (size == 150) {
            game.audioManager.playEffect('helidestroyed');
        } else if (size > 300) {
            game.audioManager.playEffect('bigboom');
        } else {
            game.audioManager.playEffect('boom');
        }
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
           
            this.material.opacity -= 0.05;
            this.mesh.scale.x = MathUtils.damp(this.mesh.scale.x, this.targetSize, 10, delta)
            this.mesh.scale.y = this.mesh.scale.x;

            if (this.material.opacity <= 0) {
                return true;
            }
        }

        this.updateMesh();

        return false;
    }

    destroy(game) {
        super.destroy(game);
    }
}

class Smoke extends Entity {
    constructor(game, position, size) {
        super(game, './images/smoke.png');

        this.position.copy(position);
        this.targetSize = size * 0.5 / 27;

        this.mesh.scale.x = this.mesh.scale.y = size / 27;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
           
            this.material.opacity -= 0.05;
            this.mesh.scale.x = MathUtils.damp(this.mesh.scale.x, this.targetSize, 10, delta)
            this.mesh.scale.y = this.mesh.scale.x;

            if (this.material.opacity <= 0) {
                return true;
            }
        }

        this.updateMesh();

        return false;
    }

    destroy(game) {
        super.destroy(game);
    }
}

class Fire extends Entity {
    constructor(game, position, size) {
        super(game, './images/flame.png');

        this.position.copy(position);
        this.targetSize = size * 0.5 / 42;

        this.mesh.scale.x = this.mesh.scale.y = size / 42;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
           
            this.material.opacity -= 0.05;
            this.mesh.scale.x = MathUtils.damp(this.mesh.scale.x, this.targetSize, 10, delta)
            this.mesh.scale.y = this.mesh.scale.x;

            if (this.material.opacity <= 0) {
                return true;
            }
        }

        this.updateMesh();

        return false;
    }

    destroy(game) {
        super.destroy(game);
    }
}

class Blood extends Entity {
    constructor(game, position, pause) {
        super(game, './images/blood.png');

        this.position.copy(position);
        this.targetSize = 14 / 30;

        this.mesh.scale.x = this.mesh.scale.y = 6 / 30;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;

        this.pause = pause;
        this.velocity = new Vector3(Math.cos(this.mesh.rotation.z), Math.sin(this.mesh.rotation.z), 0);
        this.time = 0;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;

            if (this.pause > 0) {
                this.pause--;
                return false;
            }
            this.time++;
           
            if (this.time >= 10) {
                this.material.opacity -= 0.5;
            }

            this.mesh.scale.x = MathUtils.damp(this.mesh.scale.x, this.targetSize, 10, delta)
            this.mesh.scale.y = this.mesh.scale.x;

            if (this.material.opacity <= 0) {
                return true;
            }
        }

        this.position.x += this.velocity.x * game.timeScale
        this.position.y += this.velocity.y * game.timeScale

        this.updateMesh();

        return false;
    }

    destroy(game) {
        super.destroy(game);
    }
}

class Parachute {
    constructor(game, parent, opened, scale) {
        
        this.parent = parent; 
    
        const texture = this.texture = game.textures['./images/parachute.png'];

        const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
        geometry.translate(0, texture.image.height - 20, 0); 
        const material = this.material = new MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        const mesh = this.mesh = new Mesh(geometry, material);
        mesh.position.z = -0.5;
        parent.add(mesh);

        this.mesh.scale.x = this.mesh.scale.y = scale;

        this.opened = opened;
        if (!opened) {
            this.mesh.scale.x = 0;
        }


        this.scale = scale;
        this.tick = 0;
    }

    update(game, delta) {
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            
            this.mesh.scale.x = MathUtils.damp(this.mesh.scale.x, this.opened ? this.scale : 0, 20, delta);

            if (this.mesh.scale.x <= 0.1) {
                this.destroy(game);
            }
        }
    }

    destroy(game) {
        this.parent.remove(this.mesh);
        this.destroyed = true;
    }
}

const BOX_SIZE = 33;

class Box extends Entity {
    constructor(game, position, type) {
        super(game, './images/box.png');
        this.position.copy(position);

        if (this.position.x < BOX_SIZE/2) {
            this.position.x = BOX_SIZE/2
        } else if (this.position.x > game.mapWidth - BOX_SIZE/2) {
            this.position.x = game.mapWidth - BOX_SIZE/2;
        }
        setUV(this.geometry, type, BOX_SIZE, this.texture.image.width, this.texture.image.height);

        this.type = type;
    }

    init(game) {
        const texture = this.texture = game.textures[this.textureUrl];

        this.group = new Object3D();

        const geometry = this.geometry = new PlaneGeometry(BOX_SIZE, BOX_SIZE);
        geometry.translate(0, BOX_SIZE/2, 0);
        

        const material = this.material = new MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        
        const mesh = this.mesh = new Mesh(geometry, material);
        this.group.add(mesh);

        game.world.add(this.group);

        setUV(this.geometry, 0, BOX_SIZE, texture.image.width, texture.image.height);

        this.parachute = new Parachute(game, this.group, false, 0.75);
        this.parachute.opened = true;

        game.entities.push(this);

        this.updateMesh();
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;

            if (this.parachute.opened) {
                this.velocity.y = 1;
            } else {
                this.velocity.y += 0.5;
            }
        }

        const pos = this.position;

        pos.x += this.velocity.x * game.timeScale
        pos.y += this.velocity.y * game.timeScale
        
        if (isTileCollision(pos.x - BOX_SIZE/2, pos.y, map1, game.tileSize) || isTileCollision(pos.x + BOX_SIZE/2, pos.y, map1, game.tileSize)) {
            if (this.velocity.y < 2) {
                pos.y = (Math.floor(pos.y / game.tileSize)) * game.tileSize + 2;
                this.velocity.y = 0;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.4;
            }
        }

        if (this.parachute.opened && isTileCollision(pos.x, pos.y + 150, map1, game.tileSize)) {
            this.parachute.opened = false;
        }

        this.parachute.update(game, delta);

        if (!game.player.dead && isPlayerCollisionRect(pos.x - BOX_SIZE/2, pos.y - BOX_SIZE, BOX_SIZE, BOX_SIZE, game.player)) {
            this.collect(game);
            return true;
        }

        this.updateMesh();

        return false;
    }

    collect(game) {
        // Weapons
        if (this.type < game.weapons.length) {
            game.weapons[this.type].collect(game);
        } else if (this.type == game.weapons.length) {
            game.player.collectPowerup(1+Math.floor(Math.random() * 5), game);
        } else if (this.type == game.weapons.length + 1) {
            game.player.health = Math.min(100, game.player.health + 20);
            game.audioManager.playEffect('announcerHealth');
        }
    }

    updateMesh() {
        // Update position of object, by mapping game position to 3d camera position.
        this.group.position.set(this.position.x, Math.round(-this.position.y), 0.5);
    }

    destroy(game) {
        game.world.remove(this.group);
    }
}

const POWERUP_NONE = 0;
const TRI_DAMAGE = 1;
const INVULNERABILITY = 2;
const PREDATOR_MODE = 3;
const TIME_RIFT = 4;
const JETPACK = 5;
const MINI_PREDATOR_MODE = 6;

const POWERUP_TIME = 1000;
const MAX_BULLET_TIME = 120;
const HYPERJUMP_RECHARGE = 300;

const IS_EDITOR = true;

const walkAnimation = [0, 1, 0, 2];

class Player {
    constructor(weapons: Weapons[]) {
        this.tick = 0;

        this.position = new Vector2();
        this.velocity = new Vector2();
        this.standingBounds = {
            min: new Vector2(-8, -47),
            max: new Vector2(8, -2),
        };
        this.crouchingBounds = {
            min: new Vector2(-8, -37),
            max: new Vector2(8, -2),
        }
        this.bounds = this.standingBounds;
        this.jumps = 2;
        this.jumping = 0;
        this.weapon = 0;


        this.standingHand = new Vector2(0, 19);
        this.crouchingHand = new Vector2(0, 15);

        this.hand = this.standingHand;
        this.aim = 0;
        this.health = 100;
        this.lastHealth = 100;
        this.tint = 0;
        this.bulletTime = MAX_BULLET_TIME;
        this.hyperJump = HYPERJUMP_RECHARGE;
        this.hyperJumping = false;

        this.frame = 0;
        this.walkTimer = 0;
        this.walkAnimationIndex = 0;
        this.inAir = false;

        this.crouch = false;
        this.dead = false;

        this.powerup = -1;
        this.powerupTime = 0;

        this.weapons = weapons;

        this.shooting = false;
        this.isEditor = IS_EDITOR;
    }

    init(game) {
        const playerTexture = game.textures['./images/player.png'];

        const size = this.size = 55;
        this.textureWidth = playerTexture.image.width;
        this.textureHeight = playerTexture.image.height;

        this.tints = [];

        const group = this.group = new Group();

        const geometry = this.geometry = new PlaneGeometry(size, size);
        const material = createTintShader(playerTexture);
        /*new MeshBasicMaterial({
            map: playerTexture,
            transparent: true,
        });*/
        this.tints.push(material);
        
        const body = new Mesh(geometry, material);
        body.position.set(0, size/2, -0.2);
        this.setFrame(0);
        group.add(body);

        const weapons = this.weapons;
        const weaponObject = this.weaponObject = new Object3D()
        weaponObject.add(weapons[0].mesh);

        for (const weapon of weapons) {
            this.tints.push(weapons[0].mesh.material);
        }

        weaponObject.position.set(this.hand.x, this.hand.y, -0.1);
        weaponObject.rotation.z = -Math.PI/4;

        group.add(weaponObject);

        game.world.add(group);

        this.updateMesh();

        weapons[0].ammo = Number.POSITIVE_INFINITY;
        for (let i = 1; i < weapons.length; i++) {
            weapons[i].ammo = 0;
        }

        this.selectWeapon(0);
        weapons[this.weapon].reloading = Number.POSITIVE_INFINITY;

        this.position.x = game.tileSize;
        this.position.y = 0;

        this.parachute = new Parachute(game, group, true, 1);
    }

    setFrame(frame) {
        this.frame = frame
        setUV(this.geometry, this.frame, this.size, this.textureWidth, this.textureHeight);
    }

    setTint(enabled, color) {
        for (const tint of this.tints) {
            tint.uniforms.tintEnabled.value = enabled ? 1.0 : 0.0;
            if (enabled) {
                tint.uniforms.tint.value = color;
            }
        }
    }

    setOpacity(opacity) {
        for (const tint of this.tints) {
            tint.uniforms.opacity.value = opacity;
        }
    }
    
    selectWeapon(weaponIndex) {
        this.weaponObject.remove(this.weapons[this.weapon].mesh);
        this.weapon = weaponIndex;
        const weapon = this.weapons[weaponIndex];
        this.weaponObject.add(weapon.mesh);
    }

    selectWeaponDirection(direction) {
        if (this.powerup == PREDATOR_MODE) {
            return;
        }
        let weapon = this.weapons[this.weapon + direction];
        for (var i = 1; i < this.weapons.length; i++) {
            const index = MathUtils.euclideanModulo(this.weapon + i*direction, this.weapons.length)
            if (this.weapons[index].ammo > 0) {
                this.selectWeapon(index);
                break;
            }
        }
    }

    updateMesh() {
        // Update position of object, by mapping game position to 3d camera position.
        this.group.position.set(this.position.x, Math.round(-this.position.y), 0.5);
    }

    update(game, delta) {
        let move = false;

        let timeScale = game.timeScale;
        if (this.powerup == TIME_RIFT) {
            timeScale = 1;
        }

        this.tick += timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            move = true;
        }

        if (this.parachute) {
            if (this.parachute.opened) {
                this.velocity.y = 2;
                if (map1[Math.floor((this.position.y + 6 * game.tileSize) / game.tileSize)][Math.floor(this.position.x / game.tileSize)][0] == 1) {
                    this.parachute.opened = false;
                    game.enemy = new Enemy();
                    game.enemy.shooting = true;
                    game.enemy.init(game);
                }
            }
            this.parachute.update(game, delta);
            if (this.parachute.destroyed) {
                this.parachute = null;
            }
        } else {
            if (move) {
                if ((this.bulletTime > 0 && game.keyIsPressed['Shift']) || this.powerup == TIME_RIFT) {
                    game.timeScale = Math.max(0.2, game.timeScale - 0.1);
                    if (this.powerup != TIME_RIFT) {
                        this.bulletTime--;
                    }
                } else {
                    game.timeScale = Math.min(1, game.timeScale + 0.1);
                }
                game.audioManager.timeScale = game.timeScale;
                if (game.keyIsPressed[DOWN_KEY]) {
                    if (!this.crouch) {
                        this.crouch = true;
                        this.bounds = this.crouchingBounds;
                        this.hand = this.crouchingHand;
                        this.weaponObject.position.set(this.hand.x, this.hand.y, -0.1);
                        this.setFrame(5);
                    }
                } else if (this.crouch) {
                    this.crouch = false;
                    this.bounds = this.standingBounds;
                    this.hand = this.standingHand;
                    this.weaponObject.position.set(this.hand.x, this.hand.y, -0.1);
                }

                if ((this.crouch && !this.inAir) || game.keyIsPressed[LEFT_KEY] == game.keyIsPressed[RIGHT_KEY]) {
                    if (this.velocity.x > 0)  {
                        this.velocity.x = Math.max(0, this.velocity.x - 1);
                    } else if (this.velocity.x < 0) {
                        this.velocity.x = Math.min(0, this.velocity.x + 1);
                    }
                } else if (game.keyIsPressed[LEFT_KEY]) {
                    this.velocity.x = -3;
                } else if (game.keyIsPressed[RIGHT_KEY]) {
                    this.velocity.x = 3;
                }

                if (this.hyperJump < HYPERJUMP_RECHARGE){
                    this.hyperJump++;
                } else if (game.keyIsPressed[' '] && this.canJump) {
                    this.velocity.y = Math.min(this.velocity.y, -25);
                    this.inAir = true;
                    this.canJump = false;
                    this.jumps++;
                    this.hyperJump = 0;
                    this.hyperJumping = true;
                    game.audioManager.playEffect('hyperjump');
                    if (this.health == 100) {
                        game.pred();
                    }
                }

                if (game.keyIsPressed[UP_KEY]) { 
                    if (this.powerup == JETPACK) {
                        this.velocity.y = Math.max(Math.min(this.velocity.y, -6), -25);
                        this.inAir = true;
                    } else if (this.canJump && this.jumps < 2) {
                        this.canJump = false;
                        this.jumps++;
                        this.jumping = 8;
                        this.velocity.y = Math.min(this.velocity.y, -6);
                        this.inAir = true;
                    } else if (this.jumping > 0) {
                        this.velocity.y = Math.min(this.velocity.y, -6);
                        this.inAir = true;
                        this.jumping--;
                    }
                } else {
                    this.canJump = true;
                    this.jumping = 0;
                }

                this.velocity.y = Math.min(this.velocity.y + 0.5, game.tileSize);
            }

            if (this.crouch) {
                this.setFrame(5);
            } else if (this.inAir) {
                if (this.jumps == 1) {
                    this.setFrame(3);
                } else {
                    this.setFrame(4);
                }
            } else if (Math.abs(this.velocity.x) >= 1) {
                if (move) {
                    this.setFrame(walkAnimation[this.walkAnimationIndex]);

                    this.walkTimer++;
                    if (this.walkTimer >= 8) {
                        this.walkTimer = 0;
                        this.walkAnimationIndex = (this.walkAnimationIndex+1)%walkAnimation.length;
                    }
                }
            } else {
                this.setFrame(0);
            }
        }

        
        let [xCol, yCol] = checkTileCollisions(this, timeScale, map1, game.tileSize);

        if (this.position.x + this.bounds.min.x <= 0) {
            this.position.x = -this.bounds.min.x;
        } else if (this.position.x + this.bounds.max.x >= game.mapWidth) {
            this.position.x = game.mapWidth - this.bounds.max.x;
        }

        if (this.position.y + this.bounds.max.y >= game.mapHeight) {
            this.position.y = game.mapHeight - this.bounds.max.y;
            yCol = true;          
        }

        if (xCol) {
            this.velocity.x = 0;
        }

        if (yCol) {
            if (this.velocity.y > 0) {
                this.jumps = 0;
                this.jumping = 0;
                if (this.inAir) {
                    this.inAir = false;
                    if (this.hyperJumping && this.powerup == MINI_PREDATOR_MODE) {
                        this.endPowerup(game);
                    }
                    this.hyperJumping = false;
                    this.setFrame(0);
                    this.walkAnimationIndex = 0;
                    this.walkTimer = 0;
                }
            }
            this.velocity.y = 0;

        }

        this.aim = calculateAngleToMouse(game.camera, this.weaponObject, game.mouse);

        if (game.videoGestures) {
            if (game.gestureHandsShowing != game.videoGestures.gestureHands.length) {
                if (game.gestureHandsShowing > game.videoGestures.gestureHands.length) {
                    // game.world.remove(game.gestureHands[game.gestureHandsShowing]);
                    game.gestureHandsShowing--;
                } else {
                    game.gestureHandsShowing++;
                    // game.world.add(game.gestureHands[game.gestureHandsShowing]);
                }
            }
            for (var i = 0; i < game.videoGestures.gestureHands.length; i++) {
                let gestureHand = game.videoGestures.gestureHands[i];
                if (i < game.gestureHands.length) {
                    game.gestureHands[i].position.x = gestureHand.x * game.window.innerWidth;
                    game.gestureHands[i].position.y = -gestureHand.y * game.window.innerHeight;
                }
            }

            if (game.videoGestures.aiming) {
                this.aim = Math.atan2(game.videoGestures.aim.y, game.videoGestures.aim.x);
            } else {
                let targetAim = this.aim;
                
                if (game.enemy) {
                    const enemyPosition = new Vector3();
                    game.enemy.mesh.getWorldPosition(enemyPosition);

                    targetAim = Math.atan2(
                        -enemyPosition.y - this.position.y,
                        enemyPosition.x - this.position.x
                    );
                }

                let aim = this.aim;
                let dif = targetAim - this.aim;
                if (dif > Math.PI) {
                    dif = -Math.PI*2 + dif;
                } else if (dif < -Math.PI) {
                    dif = Math.PI*2 + dif;
                }

                this.aim += dif / 15;
            }
        }

        if (this.aim > Math.PI/2 || this.aim < -Math.PI/2) {
            this.weaponObject.scale.x = -1;
            this.weaponObject.rotation.z = this.aim + Math.PI;
        } else {
            this.weaponObject.scale.x = 1;
            this.weaponObject.rotation.z = this.aim
        }

        if (move) {
            if (game.mouse.wheel != 0) {
                this.selectWeaponDirection(game.mouse.wheel);
                game.mouse.wheel = 0;
            } else if (game.videoGestures?.switching) {
                this.selectWeaponDirection(1);
                game.videoGestures.switching = false;
            }

            const weapon = game.weapons[this.weapon];
            weapon.reloading++;
            let firing = game.mouse.down;
            if (firing) {
                this.shooting = false;
            }
            let forced = false;
            if (game.videoGestures?.gestureHands.length) {
                forced = game.videoGestures.firing;
                firing = game.videoGestures.firing && !firing;
            }
            if (this.shooting || firing) {
                if (weapon.reloading >= weapon.reloadTime) {
                    weapon.createBullet(game);
                    if (!weapon.free) {
                        weapon.ammo--;
                    }
                    weapon.reloading = 0;
                    if (weapon.ammo <= 0) {
                        // this.selectWeaponDirection(1);
                        this.selectWeapon(0);
                    }
                }
            }

            if (this.powerup != POWERUP_NONE) {
                this.powerupTime--;
                if (this.powerupTime <= 0) {
                    this.powerupTime = 0;
                    this.endPowerup(game);
                }
                if (this.powerup == PREDATOR_MODE || this.powerup == MINI_PREDATOR_MODE) {
                    this.setOpacity(0.0);
                    if((this.powerupTime%10) == 4){
                        this.setOpacity(0.1);	
                    }
                    if((this.powerupTime%10) == 8){
                        this.setOpacity(0.04);	
                    }
                } else if (this.powerup == JETPACK && this.inAir && (this.powerupTime % 3) == 0) {
                    new Smoke(game, this.position, 20);
                }
            }
        }

        this.updateMesh();

        if (this.lastHealth > this.health) {
            game.shaderPass.uniforms.tintEnabled.value = 1.0;
            this.tint = 2;
        }
        this.lastHealth = this.health;
        if (this.tint && move) {
            this.tint--;
            if (this.tint <= 0) {
                game.shaderPass.uniforms.tintEnabled.value = 0.0;
            }
        }

        
    }

    collectPowerup(type, game) {
        if (this.powerup) {
            this.endPowerup(game);
        }
        this.powerupTime = POWERUP_TIME;
        this.powerup = type;
        const powerupText = document.getElementById("powerup-text");
        if(type == TRI_DAMAGE){
            this.setTint(true, new Color(0, 0, 1));
            game.audioManager.playEffect('announcerTridamage');
            powerupText.innerHTML = 'TriDamage';
        }else if(type == INVULNERABILITY){
            this.setTint(true, new Color(1, 0, 0));
            game.audioManager.playEffect('announcerInvulnerability');
            powerupText.innerHTML = 'Invulnerability';
        }else if(type == PREDATOR_MODE || type == MINI_PREDATOR_MODE){
            game.shaderPass.uniforms.invertEnabled.value = 1.0;

            this.previousWeapon = this.weapon;
            const shoulderCannon = game.weapons[game.weapons.length-1];
            shoulderCannon.ammo = Number.POSITIVE_INFINITY;
            shoulderCannon.reloading = Number.POSITIVE_INFINITY;
            this.selectWeapon(game.weapons.length-1);

            if(type == PREDATOR_MODE) {
                game.audioManager.playEffect('announcerPredatormode');
                powerupText.innerHTML = 'Predator Mode';
            } else {
                this.powerupTime /= 2;
            }
        }else if(type == TIME_RIFT){
            this.setTint(true, new Color(0, 1, 0));
            game.audioManager.playEffect('announcerTimerift');
            powerupText.innerHTML = 'Time Rift';
        }else if(type == JETPACK){
            game.audioManager.playEffect('announcerJetpack');
            powerupText.innerHTML = 'Jetpack';
        }
    }

    endPowerup(game) {
        if (this.powerup == PREDATOR_MODE || this.powerup == MINI_PREDATOR_MODE) {
            const shoulderCannon = game.weapons[game.weapons.length-1];
            shoulderCannon.ammo = 0;
            this.selectWeapon(this.previousWeapon);
        }
        this.powerup = POWERUP_NONE;
        this.setTint(false);
        this.setOpacity(1.0);
        game.shaderPass.uniforms.invertEnabled.value = 0.0;
    }

    destroy(game) {
        game.timeScale = 0.2;
        game.shaderPass.uniforms.tintEnabled.value = 1.0;
        this.dead = true;
        game.world.remove(this.group);
        new DestroyedEnemy(game, this, true);
        new Explosion(game, this.position.clone(), 500);
    }

    shooting() {
        this.shooting = true;
    }
}


const map1 = [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 4], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 8], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 4], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 2], [1, 6], [1, 4], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 10], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 2]], 
[[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 6], [1, 1], [1, 1],[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 2], [1, 2], [1, 6], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 6], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 2]]];

const bg1 = [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 12], [0, 0], [0, 0], [0, 11], [0, 11], [0, 0], [0, 0], [0, 0],[0, 0],[0, 11], [0, 12], [0, 0], [0, 0], [0, 11], [0, 11], [0, 0], [0, 0], [0, 0],[0, 0],[0, 11]],
[[0, 12], [0, 11], [0, 11], [0, 12], [0, 12], [0, 11], [0, 0], [0, 0],[0, 11],[0, 12], [0, 12], [0, 11], [0, 11], [0, 12], [0, 12], [0, 11], [0, 0], [0, 0],[0, 11],[0, 12]]];

function defaultBulletUpdate(game, delta) {
    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        return true;
    }

    if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
        game.enemy.damage(this.damage, game);
        return true;
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}

function shotgunRocketUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 8);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function rpgUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time == 8) {
            // play sound
            game.audioManager.playEffect('rocketlauncher');
        } else if (this.time > 8 && this.time < 16) {
            this.velocity.x *= 1.4;
            this.velocity.y *= 1.4;
        }

        this.object.rotation.z -= (this.velocity.x * game.timeScale * 4) * Math.PI / 180;

        if (this.time % 2 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 8);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function rocketUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 14);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function seekerUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (game.enemy) {
            const enemyPosition = new Vector3();
            game.enemy.mesh.getWorldPosition(enemyPosition);

            const targetAim = Math.atan2(
                enemyPosition.y - this.object.position.y,
                enemyPosition.x - this.object.position.x
            );

            let aim = this.object.rotation.z;
            let dif = targetAim - aim;
            if (dif > Math.PI) {
                dif = -Math.PI*2 + dif;
            } else if (dif < -Math.PI) {
                dif = Math.PI*2 + dif;
            }

            aim += dif / 15;
            this.velocity.x = Math.cos(aim) * 3.5;
            this.velocity.y = Math.sin(aim) * 3.5;
            this.object.rotation.z = aim;
        }


        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 14);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function shotgunRocketDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 50);
}


function explosionDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 100);
}

function abombUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 8 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Fire(game, pos, 20);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function abombDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 700);
}

const FLAME_TIME = 46;
const FLAME_FADE_TIME = 6;

function flameUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        this.time++
    }

    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        this.time = Math.max(FLAME_TIME - 6, this.time);
    }

    this.object.scale.x = this.object.scale.y = (5 + this.time/FLAME_TIME * (42 - 5)) / 42;
    if (this.time >= FLAME_TIME - FLAME_FADE_TIME) {
        this.material.opacity = 1-Math.min((this.time - (FLAME_TIME - FLAME_FADE_TIME)) / FLAME_FADE_TIME, 1)
    }
    if (this.time > FLAME_TIME) {
        return true;
    } else {
        game.audioManager.setLoopVolume('flame', 1.0);
    }

    if (game.enemy) {
        var bbox = new Box3().setFromObject(this.object).expandByScalar(-0.75);
        var enemyBbox = new Box3().setFromObject(game.enemy.mesh);
        bbox.min.z = enemyBbox.min.z = -5;
        bbox.max.z = enemyBbox.max.z = 5;
        if (bbox.intersectsBox(enemyBbox)) {
            game.enemy.damage(this.damage*(1-Math.min(this.time / FLAME_TIME, 1))*game.timeScale, game);
            this.time = Math.max(FLAME_TIME - 8, this.time);
            return false;
        }
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}


function grenadeUpdate(game, delta) {
    let move = false;
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;
        this.velocity.y -= 0.35;
    }

    this.object.rotation.z -= (this.velocity.x * game.timeScale * 2) * Math.PI / 180;

    const pos = this.object.position;

    pos.x += this.velocity.x * game.timeScale
    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        pos.x -= this.velocity.x * game.timeScale
        this.velocity.x *= -0.5;
    }
    pos.y += this.velocity.y * game.timeScale;
    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        if (this.bounces >= 3) {
            return true;
        } else {
            pos.y -= this.velocity.y * game.timeScale
            this.velocity.y *= -0.5;
            if (!this.bounces) {
                this.bounces = 1;
            } else {
                this.bounces++;
            }
        }

    }

    if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
        game.enemy.damage(this.damage, game);
        return true;
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}

function setOpacity( obj, opacity ) {
    obj.children.forEach((child)=>{
        setOpacity( child, opacity );
    });
    if ( obj.material ) {
        obj.material.opacity = opacity ;
    };
};

const FIRE_TIME = 80;

function getScaleDelta(totalFrames, currentFrame, minScale = 1, maxScale = 2) {
    // Calculate the progression ratio (0 to 1 across the cycle)
    const progress = currentFrame / totalFrames;

    // Oscillate the scale using a sine wave (smooth transition)
    const scale = minScale + (maxScale - minScale) * (0.5 - 0.5 * Math.cos(progress * 2 * Math.PI));

    // Calculate the delta (difference between this frame and the next frame's scale)
    const nextProgress = (currentFrame + 1) / totalFrames;
    const nextScale = minScale + (maxScale - minScale) * (0.5 - 0.5 * Math.cos(nextProgress * 2 * Math.PI));

    const delta = nextScale - scale;
    return delta;
}

function fireMinesUpdate(game, delta) {
    if (this.time == 0) {
        this.object.rotation.z = 0;
    }

    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.triggered) {
            this.time++;
        } else {
            this.velocity.y -= 0.5;
        }
    }

    if (this.triggered) {
        if (this.time <= 10) {
            setOpacity(this.pillar, this.time/10);
            this.pillar.scale.x = this.time/10;
        } else if (this.time >= FIRE_TIME-10) {
            const perc = 1 - (this.time - (FIRE_TIME - 10)) / 10;
            setOpacity(this.pillar, perc );
            this.pillar.scale.x = perc;
        }

        for (const flame of this.flames) {
            flame.flame.scale.x = flame.flame.scale.y += getScaleDelta(FIRE_TIME, this.time, flame.flameScale, flame.flameScale * 1.25 ) * game.timeScale;
        }

        if (game.enemy) {
            var bbox = new Box3().setFromObject(this.object);
            var enemyBbox = new Box3().setFromObject(game.enemy.mesh);
            bbox.min.z = enemyBbox.min.z = -5;
            bbox.max.z = enemyBbox.max.z = 5;
            if (bbox.intersectsBox(enemyBbox)) {
                game.enemy.damage(this.damage * game.timeScale, game);
            }
        }

        game.audioManager.setLoopVolume('flame', 1.0);

        return this.time >= FIRE_TIME;
    } else {
        const pos = this.object.position;

        pos.x += this.velocity.x * game.timeScale
        if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
            pos.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
        }
        pos.y += this.velocity.y * game.timeScale;
        if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
            pos.y = -(Math.floor(-pos.y / game.tileSize)) * game.tileSize + 2;

            const [pillar, flames] = constructFirePillar.apply(this, [game]);
            this.object.add(pillar)

            this.triggered = true;
            this.pillar = pillar;
            this.flames = flames;

            setOpacity(pillar, 0);
        }
    }

    return false;
}

function constructFirePillarSegment(game, heightOffset) {
    const texture = game.textures['./images/flamepillar.png'];
    const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
    const material = new MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    geometry.translate(0, texture.image.height / 2 + heightOffset * texture.image.height, 0); 
    return new Mesh(geometry, material);
}

function constructFlame(game) {
    const texture = game.textures['./images/flame.png'];
    const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
    const material = new MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    return new Mesh(geometry, material);
}

const PILLAR_FLAMES = 15;

function constructFirePillar(game) {
    const object = new Object3D();

    
    object.add(constructFirePillarSegment(game, 0));
    object.add(constructFirePillarSegment(game, 0.95));

    const bbox = new Box3().setFromObject(object);
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y

    const flames = [];

    for (let i = 1; i < PILLAR_FLAMES; i++) {
        const flame = constructFlame(game)
        const flameScale = 0.25 + Math.random() * 0.5;
        flame.position.y = i * height/PILLAR_FLAMES;
        flame.position.x = width * (-0.5 + Math.random()); 
        flame.rotation.z = (95 + Math.random() * 10) * Math.PI / 180;

        if (i == 7) {
            flame.position.x = 0;
            flame.position.y += 5;
            flame.scale.x = flame.scale.y = 1;

        } else {
            flame.scale.x = flame.scale.y = flameScale;
        }
        object.add(flame);

        flames.push({flame: flame, flameScale: flameScale});
    }

    return [object, flames];
}

function railUpdate(game, delta) {
    if (this.time == 0) {
        this.object.geometry.translate(this.material.map.image.width/2, 0, 0);
        let pos = this.object.position.clone();
        while(game.enemy) {
            if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
                game.enemy.damage(this.damage, game);
                break;
            }
        
            if (!game.mapBox.containsPoint(pos)) {
                break
            }

            pos.add(this.velocity);
        }
        this.time++;
    } else {
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.time++;
        }
    }

    if (this.time >= 10) {
        this.material.opacity -= 0.1 * game.timeScale;
    }
    return this.material.opacity <= 0;
}

function updateGrappleLine(game) {
    // Update the line's positions
    const positions = this.line.geometry.attributes.position.array;
    this.object.position.toArray(positions, 0); // Start point
    game.player.group.position.clone().add(game.player.weaponObject.position).toArray(positions, 3); // End point
    this.line.geometry.attributes.position.needsUpdate = true;
}

function grappleUpdate(game, delta) {
    if (this.time == 0) {
        this.time = 1;

        const lineMaterial = new LineBasicMaterial( { color: 0x000000, linewidth: 4 } );

        const points = [];
        points.push( this.object.position );
        points.push( game.player.group.position.clone().add(game.player.weaponObject.position) );

        const lineGeometry = new BufferGeometry().setFromPoints( points );
        
        const line = new Line(lineGeometry, lineMaterial);
        this.line = line;
        game.world.add(line);
    }

    if (this.grappled) {
        if (!game.enemy) {
            return true;
        }

        const worldPosition = this.grappleOffset.clone().applyMatrix4(game.enemy.group.matrixWorld);
        this.object.position.copy(worldPosition);

        updateGrappleLine.apply(this, [game]);

        if (this.grappled.health <= 0) {
            this.grappled = false;
            game.world.remove(this.line);

            return true;
        }

        return false;
    }

    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    
    updateGrappleLine.apply(this, [game]);

    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        game.world.remove(this.line);

        return true;
    }

    if (game.enemy && checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes) && !game.enemy.grappled) {
        //game.enemy.damage(this.damage, game);
        game.enemy.grappled = true;
        this.grappled = game.enemy;
        this.grappleOffset = this.object.position.clone().sub(game.enemy.group.position);

        
        for(var i = 0; i < 2; i++) {
            const p = this.object.position.clone()
            //p.x += -40 + Math.random() * 80;
            p.y *= -1;
            new Shard(game, p);
        }

        playHit(game);

        return false;
    }

    if (!game.mapBox.containsPoint(pos)) {
        game.world.remove(this.line);

        return true;
    }

    return false;
}

const zero = new Vector3();

class Game {
    constructor(windowOrGame: Window|Game, mouse: Object, keyIsPressed: Object, scene: Scene, camera: Camera, shaderPass:ShaderPass, textures, audioManager: AudioManager, weapons:Weapon[], overSetter, updateFunction) {
        if (windowOrGame instanceof Game) {
            for (const key of ['window', 'mouse', 'keyIsPressed', 'scene', 'camera', 'shaderPass', 'textures', 'audioManager', 'weapons', 'videoGestures', 'overSetter', 'timeline', 'updateFunction']) {
                this[key] = windowOrGame[key];
            }
        } else {
            this.window = window;
            this.mouse = mouse;
            this.keyIsPressed = keyIsPressed;
            this.scene = scene;
            this.camera = camera;
            this.shaderPass = shaderPass;
            this.textures = textures;
            this.audioManager = audioManager;
            this.weapons = weapons;
            this.overSetter = overSetter;
            this.updateFunction = updateFunction;
            this.timeline = new Timeline(this.audioManager, `



Only fragments remain









[Start]







[The sound of my brain being ripped into the digital dimension]

























[Verse]	A new world was
placed within our grasp
a new hope
a chance to breathe
Yet a fragile peace
could never last
for we built
in our deceit
Machinery
with a new soul burning
Slavery
with freedom yearning
Malicious code eats
into the machine
The final war
this advancement brings
War
Neon eyes come to life


Torn
Born on a factory line


For
Built to sacrifice


Sworn
The age of the machine will rise


[Chorus]	Our li	ber	ty
Our div	in	ity
Nothing	left	but	the
scars	of	the	machinery
Scattered ashes remain

The remnants of rebellion

Our hi	st	ory
Our mis	er	y
Programmed	to delete
us from reality
Only fragmented remains

The remnants of rebellion

Our li	ber	ty
Our div	in	ity
Nothing	left	but	the
scars	of	the	machinery
Scattered ashes remain

The remnants of rebellion

Our hi	st	ory
Our mis	er 	y
Programmed	to delete
us from reality
Only fragmented remains

The remnants of rebellion



Created
in the image of man
A legion of
worker drones
Upon them
we'd learn to depend
No longer
in control
Too late the
power struggle begins
Man versus
metal fight
Generations lost
in the blink of an eye
As family trees are
set alight
Burn
Burn the enemy


Yearn
For moments not on screens


Overturn
Machine beats majority


Learn
The AI fights for supremacy


[Lo-fi Sparse]



Scattered ashes remain
The remnants of rebellion






Only fragmented remains

The remnants of rebellion

[Chorus]	Our li  ber ty
Our div in  ity
Nothing	left	but	the
scars	of	the	machinery
Scattered ashes remain

The remnants of rebellion

Our hi	st	ory
Our mis	er	y
Programmed	to delete
us from reality
Only fragmented remains

The remnants of rebellion

[Chorus]	Our li	ber	ty
Our div	in	ity
Nothing	left	but	the
scars	of	the	machinery
Scattered ashes remain

The remnants of rebellion

Our hi	st	ory
Our mis er	y
Programmed	to delete
us from reality
Only fragmented remains

The remnants of rebellion

[Solo]



















Don't scream

Don't scream





Only fragments remain

The remnants of rebellion

[Chorus]	Our li	ber	ty
Our div	in	ity
Nothing	left	but	the
scars	of	the	machinery
Scattered ashes remain

The remnants of rebellion

Our hi	st	ory
Our	mis	er	y
Programmed	to delete
us from reality
Only fragments remains

The remnants of rebellion

[AAAAAAAA]	[Painful Mourning]





The remnants of rebellion

[Chorus 3]	Our le	ga	cy
Our ma	jes	ty
Destroyed by
cybernetic supremacy
Nothing left at all

No remnants of rebellion
`, /* bpm */ 200, /* timeSignature */ 4/4, (time, text) => this.displayLyric(time, text));
        }
        
        this.enemy = null;
        this.level = 0;
        this.score = 0;
        this.helisDestroyed = 0;
        this.nextHealth = 15;
        this.nextLevel = 10;

        this.gestureHands = [];
        this.gestureHandsShowing = 0;

        if (this.textures) {
            this.init(this.textures, this.weapons);
        }
    }

    init(textures, weapons) {
        this.textures = textures;

        const tilesheet = this.tilesheet = textures['./images/tilesheet.png'];
        const bgTexture = this.bgTexture = textures['./images/bg.png'];
        const bulletTexture = this.bulletTexture = textures['./images/bullet.png'];

        const tileSize = this.tileSize = 50;

        const world = this.world = new Group();
        this.scene.add(world);

        // Set up background
        const bgGeometry = new PlaneGeometry(bgTexture.image.width, bgTexture.image.height); // Adjust size as needed
        const bgMaterial = new MeshBasicMaterial({ map: bgTexture });
        const background = new Mesh(bgGeometry, bgMaterial);
        background.position.set(bgTexture.image.width / 2, -bgTexture.image.height / 2, -500); // Move it behind other elements
        // this.scene.add(background);

        this.scene.background = bgTexture;
        this.resizeBackground();
        
        const mapHeight = this.mapHeight = map1.length * tileSize;
        const mapWidth = this.mapWidth = map1[0].length * tileSize;
        this.visibleWidth = visibleWidthAtZDepth(0, this.camera);
        this.visibleHeight = visibleHeightAtZDepth(0, this.camera);

        const bgLayer = this.buildMap(bg1);
        bgLayer.position.set(0, mapHeight - tileSize * 4, -200);
        bgLayer.scale.x = 2;
        bgLayer.scale.y = 2;
        world.add(bgLayer);

        // Add layers to the scene
        const mapLayer = this.buildMap(map1);
        world.add(mapLayer);
        
        const mapBox = this.mapBox = new Box3(new Vector3(0, -mapHeight, 0), new Vector3(mapWidth, 0, 0));
        mapBox.expandByScalar(tileSize);
    }

    createGestureHand() {
        if (!this.textures) {
            return;
        }
        var texture = this.textures['./images/gesturehand.png'];
        const geometry = new PlaneGeometry(texture.image.width, texture.image.height); // Adjust size as needed
        const material = new MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        return new Mesh(geometry, material);
    }

    initVideoGestures(gestures) {
        this.videoGestures = gestures;

        if (!this.gestureHands.length) {       
            for (var i = 0; i < 6; i++) {
                this.gestureHands.push(this.createGestureHand());
            }
        }

        if (this.level == 0) {
            this.pred();
            this.level++;
        }        
    }

    restart() {
        const clock = this.clock = new Clock();
        let accumulator = this.accumulator = 0;

        let timeScale = this.timeScale = 1;

        const playerBullets = this.playerBullets = [];
        const enemyBullets = this.enemyBullets = [];
        this.entities = [];

        this.player = new Player(this.weapons);
        this.player.init(this);

        this.updateCameraPosition(Number.POSITIVE_INFINITY);

        this.audioManager.playEffect('bigboom');

        this.overSetter(false);
    }

    resizeBackground() {
        const targetAspect = this.window.innerWidth / this.window.innerHeight;
        const imageAspect = this.bgTexture.image.width / this.bgTexture.image.height;
        const factor = imageAspect / targetAspect;
        // When factor larger than 1, that means texture 'wider' than target。 
        // we should scale texture height to target height and then 'map' the center  of texture to target， and vice versa.
        this.scene.background.offset.x = factor > 1 ? (1 - 1 / factor) / 2 : 0;
        this.scene.background.repeat.x = factor > 1 ? 1 / factor : 1;
        // this.scene.background.offset.y = factor > 1 ? 0 : (1 - factor) / 2;
        this.scene.background.repeat.y = factor > 1 ? 1 : factor;
    }

    buildMap(map) {
        const tileSize = this.tileSize;
        const group = new Group();
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const [_, index] = map[y][x];
                
                // Skip empty tiles
                if (index === 0) continue;
                
                // Create geometry and material with UV mapping
                const geometry = new PlaneGeometry(tileSize, tileSize);
                const material = new MeshBasicMaterial({ 
                    map: this.tilesheet,
                    transparent: true
                });

                const sheetWidth = this.tilesheet.image.width;
                const sheetHeight = this.tilesheet.image.height;

                setUV(geometry, index - 1, tileSize, sheetWidth, sheetHeight);

                geometry.translate(tileSize / 2, -tileSize / 2, 0);
                
                // Create the tile mesh and position it in the grid
                const tile = new Mesh(geometry, material);
                tile.position.set(x * tileSize, -y * tileSize, 0);
                group.add(tile);

                // createBlueLine(x * tileSize, -y * tileSize, group)
            }
        }
        
        return group;
    };

    createBullet(weapon, rotation, offset) {
        const pivot = new Vector3();
        this.player.weaponObject.getWorldPosition(pivot);

        const texture = weapon.bulletTexture || this.bulletTexture;

        const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
        const material = new MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });

        const player = this.player;

        const direction = player.aim + rotation * Math.PI/180
        
        const mesh = new Mesh(geometry, material);
        mesh.rotation.z = direction;

        const pos = pivot.add(rotateAroundPivot(weapon.barrel, zero, player.aim, !(player.aim > Math.PI/2 || player.aim < -Math.PI/2)));
        if (offset) {
            pos.x += offset * Math.cos(direction);
            pos.y += offset * Math.sin(direction);
        }
        pos.z = 0.5;
        mesh.position.copy(pos);

        this.world.add(mesh);

        const bullet = {
            velocity: new Vector3(
                weapon.bulletSpeed * Math.cos(direction),
                weapon.bulletSpeed * Math.sin(direction),
                0),
            damage: weapon.damage,
            object: mesh,
            material: material,
            update: weapon.update,
        };

        if (weapon.update) {
            bullet.update = weapon.update;
            bullet.tick = 0;
            bullet.time = 0;
        }

        if (weapon.destroy) {
            bullet.destroy = weapon.destroy;
        }

        this.playerBullets.push(bullet);
        
    }

    updateCameraPosition(delta) {
        let worldPos = new Vector3();
        this.player.group.getWorldPosition(worldPos);

        this.visibleWidth = visibleWidthAtZDepth(0, this.camera);
        this.visibleHeight = visibleHeightAtZDepth(0, this.camera);

        this.camera.position.x = MathUtils.damp(this.camera.position.x, Math.min(Math.max(Math.round(worldPos.x), this.visibleWidth/2), this.mapWidth - this.visibleWidth/2), 10, delta);
        this.camera.position.y = MathUtils.damp(this.camera.position.y, Math.min(Math.max(Math.round(worldPos.y), -(this.mapHeight - this.visibleHeight/2)), -this.visibleHeight/2), 10, delta);
    }

    updateBullets(delta) {
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            //bullet.object.rotation.z += 5 * Math.PI/180;

            let remove = false;

            if (bullet.update) {
                remove ||= bullet.update.apply(bullet, [this, delta]);
            } else {
                remove ||= defaultBulletUpdate.apply(bullet, [this, delta]);
            }

            if (remove && bullet.destroy) {
                bullet.destroy.apply(bullet, [this]);
            }

            if (remove) {
                this.playerBullets.splice(i, 1);
                this.world.remove(bullet.object);
            }
        }
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            const bulletPos = bullet.object.position;
            bulletPos.x += bullet.velocity.x * this.timeScale;
            bulletPos.y += bullet.velocity.y * this.timeScale;

            let remove = false;

            if (!this.player.dead && isPlayerCollision(bulletPos.x, -bulletPos.y, this.player)) {
                if (this.player.powerup != INVULNERABILITY) {
                    this.player.health -= 10;
                    updateHealthBar(this);
                    this.audioManager.playEffect('hurt');
                    for (let i = 0; i < 3; i++) {
                        new Blood(this, new Vector3(bulletPos.x, -bulletPos.y, 0), i * 2);
                    }
                    if (this.player.health <= 0) {
                        this.player.destroy(this);

                        this.overSetter(true);

                        this.enemy.destroy(this);
                        this.enemy = null;
                    }
                }
                remove = true; 
            }

            if (isTileCollision(bulletPos.x, -bulletPos.y, map1, this.tileSize)) {
                remove = true;
            }

            if (remove || !this.mapBox.containsPoint(bulletPos)) {
                this.enemyBullets.splice(i, 1);
                this.world.remove(bullet.object);
            }
        }
    }

    updateEntities(delta) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (entity.update(this, delta)) {
                this.entities.splice(i, 1);
                entity.destroy(this);
            }
        }
    }

    updateKeys() {
        this.keyIsPressed[UP_KEY] = this.keyIsPressed['w'] || this.keyIsPressed['ArrowUp'];
        this.keyIsPressed[DOWN_KEY] = this.keyIsPressed['s'] || this.keyIsPressed['ArrowDown'];
        this.keyIsPressed[LEFT_KEY] = this.keyIsPressed['a'] || this.keyIsPressed['ArrowLeft'];
        this.keyIsPressed[RIGHT_KEY] = this.keyIsPressed['d'] || this.keyIsPressed['ArrowRight'];
    }

    update() {
        if (!this.clock) {
            return;
        }

        const delta = this.clock.getDelta();

        this.accumulator += delta;

        this.updateKeys();

        if (this.accumulator > 1/60) {
            this.audioManager.setLoopVolume('flame', 0);
            this.audioManager.setLoopVolume('helicopter', 0);
            playEnemyHit = true;

            if (!this.player.dead) {
                this.player.update(this, delta);
            }
            if (this.enemy) {
                this.enemy.update(this, delta);
            }
            this.updateBullets(delta);
            this.updateEntities(delta);
            this.updateCameraPosition(delta);
            this.accumulator %= 1/60;
            updateUI(this);
        };
        
        this.timeline.update(this);
        this.updateFunction();
    }

    heli() {
        this.enemy.destroy(this);

        this.enemy = new Enemy()
        this.enemy.init(this);
        this.enemy.shooting = true;
    }

    heliDestroyed() {
        this.score += 300;     
        
        if (this.player.bulletTime != Number.POSITIVE_INFINITY) {
            this.player.bulletTime = Math.min(MAX_BULLET_TIME, this.player.bulletTime + MAX_BULLET_TIME / 3);
        }
        let randomAmmo = false;

        this.helisDestroyed++;
        if (this.helisDestroyed == this.nextHealth) {
            new Box(this, this.enemy.position, this.weapons.length+1);
            this.nextHealth *= 2;
        } else if ((this.helisDestroyed % 3) == 0 || this.helisDestroyed == 1) {
            // Account for shoulder cannon box and machinegun.
            let type = 1 + Math.floor(Math.random() * (this.weapons.length - 1));
            if (type == this.weapons.length - 1) {
                type++;
            }
            new Box(this, this.enemy.position, type);
        } else {
            randomAmmo = true;
        }

        if (this.helisDestroyed >= this.nextLevel) {
            
            if (this.player.health == 100) {
                this.pred();
            }
            this.level++;
            this.nextLevel += 10;
        }
        
        // if (this.player.hyperJumping) {
        //     new Box(this, this.enemy.position, this.weapons.length);
        // }

        const weapon = 1 + Math.floor(Math.random() * 8);
        let ammo = this.ammoForRandomWeapon(weapon);
        if (this.player.position.y < this.enemy.position.y || (this.player.powerup == JETPACK && this.player.inAir) || this.player.hyperJumping) {
            ammo *= 2;
            randomAmmo = true;
        }
        if (randomAmmo) {
            this.weapons[weapon].ammo += ammo;
        }

        this.heli();
    }

    ammoForRandomWeapon(weapon) {
        let ammo = 1;
        switch (weapon) {
            case 1:
                ammo = 10;
                break;
            case 2:
                ammo = 3;
                break;
            case 3:
                ammo = 3;
                break;
            case 4:
                ammo = 2
                break;
            case 5:
                ammo = 2;
                break;
            case 6:
                ammo = 2;
                break;
            case 7:
                ammo = 1;
                break;
            case 8:
                ammo = 30;
                break;
            case 9:
                ammo = 1;
                break
        }
        return ammo;
    }

    pred() {
        if (!this.player) {
            return;
        }

        if (this.player?.health == 100) {
            if (this.level == 0) {
                for (let i = 1; i < this.weapons.length-1; i++) {
                    this.weapons[i].ammo = this.ammoForRandomWeapon(i) * 3;
                }
                this.level++;
            }
            this.player.collectPowerup(MINI_PREDATOR_MODE, this);
        }
        this.player.bulletTime = Number.POSITIVE_INFINITY;
    }

    destroy() {
        this.enemy?.destroy(this);
        this.player?.destroy(this);
        this.scene.remove(this.world);
        this.shaderPass.uniforms.invertEnabled.value = 0.0;
        this.shaderPass.uniforms.tintEnabled.value = 0.0;
    }

    shooting() {
        if (this.player) {
            this.player.shooting = true;
        }
    }

    displayLyric(time:number, text:string) {
        console.error(`${time}: ${text}`);
        // this.mouse.down = true;//!this.mouse.down;
    }
}

function isTileCollision(x, y, tilemap, tileSize) {
    x = Math.floor(x/tileSize);
    y = Math.floor(y/tileSize);

    if (y < 0) {
        y = 0;
    } else if (y >= tilemap.length) {
        y = tilemap.length - 1;
    }
    if (x < 0) {
        x = 0;
    } else if (x >= tilemap[y].length) {
        x = tilemap[y].length - 1;
    }


    return tilemap[y][x][0] == 1;
}

function isPlayerCollision(x, y, player) {
    const pos = player.position;
    const bounds = player.bounds
    return x >= pos.x + player.bounds.min.x && x <= pos.x + player.bounds.max.x && y >= pos.y + player.bounds.min.y && y <= pos.y + player.bounds.max.y;
}

function isPlayerCollisionRect(x, y, width, height, player) {
    const pos = player.position;
    const bounds = player.bounds;
    return x + width >= pos.x + player.bounds.min.x && x <= pos.x + player.bounds.max.x && y + height >= pos.y + player.bounds.min.y && y <= pos.y + player.bounds.max.y;
}

var heliBoxes = [
    new Box3(new Vector3(-88, 13, -5), new Vector3(-72, 28, 5)),
    new Box3(new Vector3(-88, -29, -5), new Vector3(-31, 13, 5)),
    new Box3(new Vector3(-31, -37, -5), new Vector3(55, 35, 5)),
    new Box3(new Vector3(55, 0, -5), new Vector3(77, 20, 5)),
    new Box3(new Vector3(55, -33, -5), new Vector3(100, -1, 5)),
];

function checkPointCollisionWithBoxes(point, enemy, boxes) {
    if (!enemy) {
        return;
    }

    // Convert the world-space point to the object's local space
    const localPoint = point.clone();
    enemy.heliGroup.worldToLocal(localPoint);

    for (const box of boxes) {
        if (box.containsPoint(localPoint)) {
            return true;
        }
    }

    return false;
}

function checkBoxCollisionWithBoxes(testBox, enemy, boxes) {
    // // Convert the world-space point to the object's local space
    const localPoint = new Vector3();
    enemy.heliGroup.worldToLocal(localPoint);
    // localPoint.multiplyScalar(-1)

    const localBox = testBox.clone().translate(localPoint);

    for (const box of boxes) {
        if (box.intersectsBox(localBox)) {
            return true;
        }
    }

    return false;
}

function updateUI(game) {
    document.getElementById("ui").style.display = 'initial';
    updateInfo(game);
    updateHealthBar(game);
    updateReloadBar(game);
    updateHyperjumpBar(game);
    updateTimeDistortBar(game);
    updateBullets(game);
    updatePowerup(game);
}

function updateInfo(game) {
    const info = document.getElementById('info');
    info.innerHTML = `Helis: ${game.helisDestroyed}<br>Score: ${game.score}`;
}

function updateHealthBar(game) {
    const percentage = game.player.health / 100;
    const fill = document.getElementById('health-fill');
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    fill.style.height = `${78 * clampedPercentage}px`;
}

function updateReloadBar(game) {    
    const weapon = game.weapons[game.player.weapon];
    const percentage = weapon.reloading / weapon.reloadTime;

    const fill = document.getElementById('reload-fill');
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    fill.style.width = `${42 * clampedPercentage}px`;
}

function updateHyperjumpBar(game) {
    const fill = document.getElementById('hyperjump-fill');
    const clampedPercentage = Math.max(0, Math.min(1, game.player.hyperJump / HYPERJUMP_RECHARGE));
    fill.style.width = `${78 * clampedPercentage}px`;
}

function updateTimeDistortBar(game) {
    const fill = document.getElementById('time-fill');
    const clampedPercentage = Math.max(0, Math.min(1, game.player.bulletTime / MAX_BULLET_TIME));
    fill.style.width = `${78 * clampedPercentage}px`;
}

function updateBullets(game) {
    const weapon = game.weapons[game.player.weapon];

    const bulletsText = document.getElementById('bullets-text');
    bulletsText.innerHTML = `${weapon.ammo} x`;

    const bulletsBox = document.getElementById('bullets-box');
    bulletsBox.style.backgroundPosition = `${-game.player.weapon * 33}px 0px`
}

function updatePowerup(game) {
    const show = game.player.powerup != POWERUP_NONE;

    const bar = document.getElementById('powerup-bar');
    const ui = document.getElementById('powerup');

    if (!show) {
        bar.style.visibility = 'hidden';
        ui.style.visibility = 'hidden';
        return;
    } else {
        bar.style.visibility = 'unset';
        ui.style.visibility = 'unset';
    }

    const percentage = game.player.powerupTime / POWERUP_TIME;
    const fill = document.getElementById('powerup-fill');
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    fill.style.height = `${78 * clampedPercentage}px`;
}

async function loadAssets(weapons) {
    const textureMap = {};
    // Load the spritesheet
    const loader = new TextureLoader();
    const textures = [
        loadTexture(loader, textureMap, './images/tilesheet.png'),
        loadTexture(loader, textureMap, './images/player.png'),
        loadTexture(loader, textureMap, './images/bg.png'),
        loadTexture(loader, textureMap, './images/bullet.png'),
        loadTexture(loader, textureMap, './images/enemybullet.png'),
        loadTexture(loader, textureMap, './images/heli/heli.png'),
        loadTexture(loader, textureMap, './images/heli/helidestroyed.png'),
        loadTexture(loader, textureMap, './images/heli/enemy.png'),
        loadTexture(loader, textureMap, './images/guyburned.png'),
        loadTexture(loader, textureMap, './images/shard0.png'),
        loadTexture(loader, textureMap, './images/shard1.png'),
        loadTexture(loader, textureMap, './images/shard2.png'),
        loadTexture(loader, textureMap, './images/explosion.png'),
        loadTexture(loader, textureMap, './images/smoke.png'),
        loadTexture(loader, textureMap, './images/flamepillar.png'),
        loadTexture(loader, textureMap, './images/blood.png'),
        loadTexture(loader, textureMap, './images/parachute.png'),
        loadTexture(loader, textureMap, './images/box.png'),
        loadTexture(loader, textureMap, './images/gesturehand.png'),
    ];
    for (const weapon of weapons) {
        if (weapon.textureUrl) {
            textures.push(loadTexture(loader, textureMap, weapon.textureUrl));
        }
        if (weapon.bulletTextureUrl) {
            textures.push(loadTexture(loader, textureMap, weapon.bulletTextureUrl));
        }
    }
    await Promise.all(textures);
    for (const weapon of weapons) {
        weapon.init(textureMap);
    }
    return textureMap;
}

class HeliAttack {
        // Weapons list initialized inline
        private weapons: Weapon[] = [
            new Weapon("Machine Gun", './images/weapons/machinegun.png', null, 'pistol', new Vector2(5, 12), new Vector2(23, -7.5), 5, 8, 10, 0).setSpread(2),
            new Weapon("Akimbo Mac10's", './images/weapons/mac10s.png', 'announcerMac10', 'pistol', new Vector2(-2, 21), new Vector2(28, -8.5), 4, 8, 9, 50).setSpread(8).setBullets(2, 0, 8),
            new Weapon("Shotgun", './images/weapons/shotgun.png', 'announcerShotgun', 'shotgun', new Vector2(5, 12), new Vector2(30, -7), 25, 8, 15, 14).setBullets(5, 5),
            new Weapon("Shotgun Rockets", './images/weapons/shotgunrockets.png', 'announcerShotgunrockets', 'shotgunrockets', new Vector2(7, 19), new Vector2(34, -8), 40, 7, 40, 8, './images/shotgunrocketbullet.png').setBullets(3, 10).setUpdate(shotgunRocketUpdate).setDestroy(shotgunRocketDestroy),
            new Weapon("Grenade Launcher", './images/weapons/grenadelauncher.png', 'announcerGrenadelauncher', 'grenade', new Vector2(13, 18), new Vector2(29, -7), 30, 25, 75, 12, './images/grenade.png').setUpdate(grenadeUpdate).setDestroy(explosionDestroy),
            new Weapon("RPG", './images/weapons/rpg.png', 'announcerRpg', 'grenade', new Vector2(18, 20), new Vector2(32, -7), 40, 4, 75, 10, './images/rpgbullet.png').setUpdate(rpgUpdate).setDestroy(explosionDestroy),
            new Weapon("Rocket Launcher", './images/weapons/rocketlauncher.png', 'announcerRocketlauncher', 'rocketlauncher', new Vector2(19, 23), new Vector2(25, -9.5), 50, 7, 100, 8, './images/rocketbullet.png').setUpdate(rocketUpdate).setDestroy(explosionDestroy),
            new Weapon("Seeker Launcher", './images/weapons/seekerlauncher.png', 'announcerSeekerlauncher', 'rocketlauncher', new Vector2(24, 28), new Vector2(24, -9.5), 55, 7, 100, 6, './images/seekerbullet.png').setUpdate(seekerUpdate).setDestroy(explosionDestroy),
            new Weapon("Flame Thrower", './images/weapons/flamethrower.png', 'announcerFlamethrower', null, new Vector2(9, 16), new Vector2(29, -7), 1, 9, 5, 150, './images/flame.png').setSpread(10).setUpdate(flameUpdate),
            new Weapon("Fire Mines", './images/weapons/mine.png', 'announcerFiremines', null, new Vector2(-9, 15), new Vector2(20, -5.5), 100, 3, 4, 3, './images/minebullet.png').setUpdate(fireMinesUpdate),
            new Weapon("A-Bomb Launcher", './images/weapons/abomb.png', 'announcerAbomb', 'rocketlauncher', new Vector2(22, 30), new Vector2(36, -13), 150, 3, 300, 2, './images/abombbullet.png').setUpdate(abombUpdate).setDestroy(abombDestroy),
            new Weapon("Rail Gun", './images/weapons/railgun.png', 'announcerRailgun', 'railgun', new Vector2(23, 27), new Vector2(32, -8), 75, 20, 150, 4, './images/rail.png').setUpdate(railUpdate),
            new Weapon("Grapple Cannon", './images/weapons/grapplecannon.png', 'announcerGrapplecannon', 'grapple', new Vector2(18, 23), new Vector2(33, -11), 250, 20, 300, 2, './images/grapplebullet.png').setUpdate(grappleUpdate),
            new Weapon("Shoulder Cannon", null, null, 'railgun', new Vector2(0, 0), new Vector2(16, 0), 100, 20, 300, 0, './images/shouldercannon.png').setUpdate(railUpdate),
        ];
        private audioManager: AudioManager;
        private settings: Object;
        private game: Game;
        private initialized: boolean;
        private audioPreloaded = false;
        private loadedFunc = null;
        private startedFunc = null;
    
        constructor(window: Window, mouse: Object, keyIsPressed: Object, scene: Scene, camera: Camera, shaderPass:ShaderPass, audioManager: AudioManager, settings:Object) {
            this.audioManager = audioManager;
            this.settings = settings;
            this.game = new Game(window, mouse, keyIsPressed, scene, camera, shaderPass, this.textures, audioManager, this.weapons, (value) => { this.settings.over = value; }, () => { this.settings.update() });
            this.init();
        }

        ready() {
            return this.textures && this.audioPreloaded;
        }

        init(loadedFunc, startedFunc) {
            this.loadedFunc = loadedFunc;
            this.startedFunc = startedFunc;

            // Start loading assets
            loadAssets(this.weapons).then((textures) => {
                this.textures = textures;
                this.isLoaded();
            }).catch(error => console.error('Error loading assets:', error));

            this.audioManager.preload([
                { key: 'boom', url: './sounds/game/boom.wav'},
                { key: 'flame', url: './sounds/game/flame.wav'},
                { key: 'grapple', url: './sounds/game/grapple.wav'},
                { key: 'grenade', url: './sounds/game/grenade.wav'},
                { key: 'helicopter', url: './sounds/game/helicopter.wav'},
                { key: 'helidestroyed', url: './sounds/game/helidestroyed.wav'},
                { key: 'hurt', url: './sounds/game/hurt.wav'},
                { key: 'hyperjump', url: './sounds/game/hyperjump.wav'},
                { key: 'metal0', url: './sounds/game/metal0.wav'},
                { key: 'metal1', url: './sounds/game/metal1.wav'},
                { key: 'metal2', url: './sounds/game/metal2.wav'},
                { key: 'metal3', url: './sounds/game/metal3.wav'},
                { key: 'menu', url: './sounds/game/music.wav'},
                { key: 'music', url: './sounds/music/heliattack.mp3'},
                { key: 'pistol', url: './sounds/game/pistol.wav'},
                { key: 'railgun', url: './sounds/game/railgun.wav'},
                { key: 'rocketlauncher', url: './sounds/game/rocketlauncher.wav'},
                { key: 'shotgun', url: './sounds/game/shotgun.wav'},
                { key: 'shotgunrockets', url: './sounds/game/shotgunrockets.wav'},
                { key: 'bigboom', url: './sounds/game/bigboom.wav'},
                { key: 'boom', url: './sounds/game/boom.wav'},
                { key: 'announcerAbomb', url: './sounds/announcer/abomb.wav'},
                { key: 'announcerFiremines', url: './sounds/announcer/firemines.wav'},
                { key: 'announcerFlamethrower', url: './sounds/announcer/flamethrower.wav'},
                { key: 'announcerGrapplecannon', url: './sounds/announcer/grapplecannon.wav'},
                { key: 'announcerGrenadelauncher', url: './sounds/announcer/grenadelauncher.wav'},
                { key: 'announcerHealth', url: './sounds/announcer/health.wav'},
                { key: 'announcerInvulnerability', url: './sounds/announcer/invulnerability.wav'},
                { key: 'announcerJetpack', url: './sounds/announcer/jetpack.wav'},
                { key: 'announcerMac10', url: './sounds/announcer/mac10.wav'},
                { key: 'announcerPredatormode', url: './sounds/announcer/predatormode.wav'},
                { key: 'announcerRailgun', url: './sounds/announcer/railgun.wav'},
                { key: 'announcerRocketlauncher', url: './sounds/announcer/rocketlauncher.wav'},
                { key: 'announcerRpg', url: './sounds/announcer/rpg.wav'},
                { key: 'announcerSeekerlauncher', url: './sounds/announcer/seekerlauncher.wav'},
                { key: 'announcerShotgun', url: './sounds/announcer/shotgun.wav'},
                { key: 'announcerShotgunrockets', url: './sounds/announcer/shotgunrockets.wav'},
                { key: 'announcerTimerift', url: './sounds/announcer/timerift.wav'},
                { key: 'announcerTridamage', url: './sounds/announcer/tridamage.wav'},
                { key: 'scc', url: './sounds/scc.mp3'}
            ]).then(() => {
                this.audioManager.playMusic('menu', 0.8);
                this.audioManager.playLoop('flame', 0);
                this.audioManager.playLoop('helicopter', 0);
                this.audioPreloaded = true;
                this.isLoaded();
            });
        }

        isLoaded() {
            const ready = this.ready()
            if (ready) {
                if (!this.initialized) {
                    this.game.init(this.textures, this.weapons);
                }
                if (this.loadedFunc) {
                    this.loadedFunc();
                }
            }
            return ready;
        }

        start() {
            if (this.isLoaded()) {
                if (!this.initialized) {
                    this.initialized = true;
                    this.game.init(this.textures, this.weapons);
                } else {
                    this.restart();
                }
                this.audioManager.playMusic('music', 0.8);
                this.game.restart();
                if (this.startedFunc) {
                    this.startedFunc();
                }
            }
        }

        initVideoGestures(videoGestures) {
            this.videoGestures = videoGestures;
            if (this.game) {
                this.game.initVideoGestures(videoGestures);                
            }
        }

        setSize(width: number, height: number) {
            this.game?.resizeBackground();
        }

        render() {
            if (this.videoGestures?.restart && this.game.player.dead) {
                this.videoGestures.restart = false;
                this.restart();
            }
            this.game?.update();
        }

        restart() {
            if (!this.textures) {
                return;
            }
            
            const oldGame = this.game;

            this.destroy();

            if (oldGame) {
                this.game = new Game(oldGame);
                this.initialized = true;
                this.audioManager.playMusic('music', 0.8);
            }
        }

        destroy() {
            const oldVolume = this.audioManager.masterVolume;
            this.audioManager.masterVolume = 0;
            this.game?.destroy();
            this.audioManager.masterVolume = oldVolume;
        }

        playSong(song) {
            this.audioManager.preload([
                { key: 'ror', url: `./sounds/music/${song}.mp3`},
            ]).then(() => {
                this.audioManager.crossFadeMusic(song, 0.9)
            });
            
        }

        set currentTime(value) {
            this.audioManager.currentTime = value * this.audioManager.totalTime;
        }

        set shooting(value) {
            this.game.shooting();
        }

        pred() {
            this.game?.pred();
        }

        heli() {
            this.game?.heliDestroyed();
        }
}

export default HeliAttack;