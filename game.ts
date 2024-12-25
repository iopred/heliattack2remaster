
import { Blood, Box, DestroyedEnemy, DestroyedHeli, Explosion, Fire, Parachute, Shard, Smoke } from './entities';
import { Box3, BufferGeometry, Clock, Color, Line, LineBasicMaterial, MathUtils, Mesh, MeshBasicMaterial, Frustum, Group, Matrix4, Object3D, PlaneGeometry, Scene, ShaderMaterial, Texture, TextureLoader, Vector2, Vector3, Camera } from 'three';
import { calculateAngleToMouse, checkTileCollisions, createTintShader, getDurationMiliseconds, getDurationSeconds, loadTexture, rotateAroundPivot, setUV, visibleHeightAtZDepth, visibleWidthAtZDepth, checkBoxCollisionWithBoxes, checkPointCollisionWithBoxes, heliBoxes, isPlayerCollision, isPlayerCollisionRect, isTileCollision, sayMessage } from './utils';
import { defaultBulletUpdate } from './weapons';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import AudioManager from './audiomanager';
import { Timeline, TimelineEvent } from './timeline';
import VideoGestures from './videogestures';
import Weapon from './weapon';
import Entity from './entities';

const UP_KEY = 'KeyboardKeyUp';
const DOWN_KEY = 'KeyboardKeyDown';
const LEFT_KEY = 'KeyboardKeyLeft';
const RIGHT_KEY = 'KeyboardKeyRight';

const SCREEN_WIDTH = 500;
const SCREEN_HEIGHT = 500 * 9 / 16;

const HELI_WIDTH = 100;
const HELI_EXIT_OFFSET = 500;

const RAILGUN = 11;
const SEEKER = 7;
const FLAMETHROWER = 8;

let playEnemyHit = true;

class Enemy {
    public position: Vector3;
    public velocity: Vector2;
    public targetPosition: Vector2;
    public playerOffset: Vector2;

    public tick: number;
    public nextXReposition: number;
    public nextYReposition: number;

    public shooting: boolean;
    public shoot: number;

    public health: number;
    public lastHealth: number;

    public tints: ShaderMaterial[];
    public tint: number;

    public aim: number;
    public trackingPlayer: number;
    public randomizeExit: number;
    public grappled: boolean;

    public bulletTexture: Texture;
    public heliGroup: Group;
    public group: Group;
    public mesh: Mesh;
    public enemyMesh: Mesh;
    public enemyWeapon: Object3D;


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

        this.aim = Math.PI / 2;
    }



    init(game) {
        const heliTexture = game.textures['./images/heli/heli.png'];
        const destroyedTexture = game.textures['./images/heli/helidestroyed.png'];
        const enemyTexture = game.textures['./images/heli/enemy.png'];
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
        new DestroyedEnemy(game, this, false);

        for (var i = 0; i < 3; i++) {
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
                this.position.x = game.camera.position.x - game.visibleWidth / 2 - HELI_EXIT_OFFSET;
            } else {
                this.position.x = game.camera.position.x + game.visibleWidth / 2 + HELI_EXIT_OFFSET;
            }
            this.position.y = game.player.position.y - game.visibleHeight * 0.5;
        } else {
            this.position.x = game.camera.position.x + game.visibleWidth / 2;
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

            this.position.x += this.velocity.x * game.timeScale;
            this.position.y += this.velocity.y * game.timeScale;

            this.group.position.set(this.position.x, -this.position.y, -1);

            if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
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
                        this.playerOffset.x = -SCREEN_WIDTH / 2 + Math.random() * SCREEN_WIDTH;
                    }
                    if (this.nextYReposition++ > 80) {
                        this.nextYReposition = 0;
                        this.playerOffset.y = -game.visibleHeight * 0.5 + (-2 * Math.random() * 4) * 10;
                    }
                    this.trackingPlayer--;
                }

                this.targetPosition.x = Math.max(HELI_WIDTH, Math.min(game.player.position.x + this.playerOffset.x, game.mapWidth - HELI_WIDTH));
                this.targetPosition.y = game.mapHeight + this.playerOffset.y - 50;
            } else {
                if (this.trackingPlayer == 0) {
                    this.randomizeExit = Math.floor(Math.random() * 10)
                }

                if (this.randomizeExit < 4) {
                    this.targetPosition.x = game.camera.position.x - game.visibleWidth / 2 - HELI_EXIT_OFFSET;
                } else if (this.randomizeExit < 8) {
                    this.targetPosition.x = game.camera.position.x + game.visibleWidth / 2 + HELI_EXIT_OFFSET;
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

        this.position.x += this.velocity.x * game.timeScale;
        this.position.y += this.velocity.y * game.timeScale;

        this.group.position.set(this.position.x, -this.position.y, -1);

        const r = -this.velocity.x / 20 * 15;
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

        if (this.aim > Math.PI / 2 || this.aim < -Math.PI / 2) {
            this.enemyWeapon.scale.x = -1;
            this.enemyWeapon.rotation.z = this.aim + Math.PI;
        } else {
            this.enemyWeapon.scale.x = 1;
            this.enemyWeapon.rotation.z = this.aim;
        }

        if (this.shooting && (this.shoot++ % Math.max(20, 32 - game.level * 2)) == 1) {
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
        const direction = this.aim + (-innacuracy + Math.random() * 2 * innacuracy) * Math.PI / 180

        const mesh = new Mesh(geometry, material);
        mesh.rotation.z = direction;

        mesh.position.copy(pivot.add(rotateAroundPivot(game.weapons[0].barrel, zero, this.aim, !(this.aim > Math.PI / 2 || this.aim < -Math.PI / 2))));
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
            game.playHit();
            playEnemyHit = false;
        }

        if (this.health <= 0) {
            game.heliDestroyed();
        }
    }

    leave() {
        this.trackingPlayer = 0;
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
    public position: Vector2 = new Vector2();
    public velocity: Vector2 = new Vector2();
    public standingBounds: { min: Vector2, max: Vector2 } = {
        min: new Vector2(-8, -47),
        max: new Vector2(8, -2),
    };
    public crouchingBounds: { min: Vector2, max: Vector2 } = {
        min: new Vector2(-8, -37),
        max: new Vector2(8, -2),
    };
    public bounds: { min: Vector2, max: Vector2 } = this.standingBounds;

    public jumps: number = 2;
    public jumping: number = 0;
    public canJump: boolean;
    public weapon: number = 0;

    public standingHand: Vector2 = new Vector2(0, 19);
    public crouchingHand: Vector2 = new Vector2(0, 15);

    public hand = this.standingHand;
    public aim: number = 0;
    public health: number = 100;
    public lastHealth: number = 100;
    public tint: number = 0;
    public bulletTime: number = MAX_BULLET_TIME;
    public hyperJump: number = HYPERJUMP_RECHARGE;
    public hyperJumping: boolean = false;

    public frame: number = 0;
    public walkTimer: number = 0;
    public walkAnimationIndex: number = 0;
    public inAir: boolean = false;

    public crouch: boolean = false;
    public dead: boolean = false;

    public powerup: number = -1;
    public powerupTime: number = 0;

    public weapons: Weapon[];
    public previousWeapon: number;

    public infiniteTimeDistort: boolean = false;
    public isEditor: boolean = IS_EDITOR;

    public chooseAlternate = false;
    public alternateWeapon = RAILGUN;

    private tick:number = 0;

    private canTriggerTimelineEvent:boolean = true;

    public textureWidth: number;
    public textureHeight: number;
    public size: number = 55;
    public group: Group;
    public geometry: PlaneGeometry;
    public weaponObject: Object3D;
    
    public tints: ShaderMaterial[];

    public parachute: Parachute | null;

    public shooting: boolean;
    public ignoreNextDamage: boolean;

    constructor(weapons: Weapon[]) {
        this.weapons = weapons;
    }

    init(game) {
        const playerTexture = game.textures['./images/player.png'];

        this.textureWidth = playerTexture.image.width;
        this.textureHeight = playerTexture.image.height;

        this.tints = [];

        const group = this.group = new Group();

        const geometry = this.geometry = new PlaneGeometry(this.size, this.size);
        const material = createTintShader(playerTexture);
        /*new MeshBasicMaterial({
            map: playerTexture,
            transparent: true,
        });*/
        this.tints.push(material);

        const body = new Mesh(geometry, material);
        body.position.set(0, this.size / 2, -0.2);
        this.setFrame(0);
        group.add(body);

        const weapons = this.weapons;
        const weaponObject = this.weaponObject = new Object3D()
        weaponObject.add(weapons[0].mesh);

        for (const weapon of weapons) {
            if (!(weapon.mesh.material instanceof ShaderMaterial)) {
                continue;
            }
            this.tints.push(weapon.mesh.material);

        }

        weaponObject.position.set(this.hand.x, this.hand.y, -0.1);
        weaponObject.rotation.z = -Math.PI / 4;

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
            const index = MathUtils.euclideanModulo(this.weapon + i * direction, this.weapons.length)
            if (this.weapons[index].ammo > 0) {
                this.selectWeapon(index);
                if (this.chooseAlternate) {
                    this.alternateWeapon = index;
                }
                break;
            }
        }
    }

    updateMesh() {
        // Update position of object, by mapping game position to 3d camera position.
        this.group.position.set(this.position.x, Math.round(-this.position.y), 0.5);
    }

    update(game: Game, delta: number) {
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
                if (game.map[Math.floor((this.position.y + 6 * game.tileSize) / game.tileSize)][Math.floor(this.position.x / game.tileSize)][0] == 1) {
                    this.parachute.opened = false;
                }
            }
            this.parachute.update(game, delta);
            if (this.parachute.destroyed) {
                this.parachute = null;
            }
        } else {
            if (move) {
                const freeBulletTime = this.infiniteTimeDistort || this.hyperJumping;
                let newTimeScale = game.timeScale;
                
                if (((this.bulletTime > 0 || freeBulletTime) && game.keyIsPressed['Shift']) || this.powerup == TIME_RIFT) {
                    newTimeScale = Math.max(0.2, game.timeScale - 0.1);
                    
                    if (!(this.powerup == TIME_RIFT || this.powerup == PREDATOR_MODE || freeBulletTime)) {
                        this.bulletTime--;
                    }
                } else {
                    newTimeScale = Math.min(1, game.timeScale + 0.1);
                }

                if (newTimeScale != game.timeScale) {
                    game.timeScale = newTimeScale;

                    game.vhsPass.uniforms.enabled.value = (game.timeScale == 0.2 ? 1.0 : 1.0 - game.timeScale) * (this.hyperJumping ? 1.2 : 1.0);
                    game.audioManager.timeScale = game.timeScale;
                }

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
                    if (this.velocity.x > 0) {
                        this.velocity.x = Math.max(0, this.velocity.x - 1);
                    } else if (this.velocity.x < 0) {
                        this.velocity.x = Math.min(0, this.velocity.x + 1);
                    }
                } else if (game.keyIsPressed[LEFT_KEY]) {
                    this.velocity.x = -3;
                } else if (game.keyIsPressed[RIGHT_KEY]) {
                    this.velocity.x = 3;
                }

                if (this.hyperJump < HYPERJUMP_RECHARGE) {
                    this.hyperJump++;
                } else if (game.keyIsPressed[' '] && this.canJump) {
                    this.velocity.y = Math.min(this.velocity.y, -25);
                    this.inAir = true;
                    this.canJump = false;
                    this.jumps++;
                    this.hyperJump = 0;
                    this.hyperJumping = true;
                    game.audioManager.playEffect('hyperjump');
                    game.weapons[this.alternateWeapon].ammo++;
                    

                    game.vhsPass.uniforms.enabled.value = (game.timeScale == 0.2 ? 1.0 : 1.0 - game.timeScale) * (this.hyperJumping ? 1.4 : 1.0);
                    game.vhsPass.uniforms.distortion.value = 0.2;
                    game.vhsPass.uniforms.animatedColorShift.value = 0.01;
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
                        this.walkAnimationIndex = (this.walkAnimationIndex + 1) % walkAnimation.length;
                    }
                }
            } else {
                this.setFrame(0);
            }
        }


        let [xCol, yCol] = checkTileCollisions(this, timeScale, game.map, game.tileSize);

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
                    if (this.hyperJumping) {
                        game.vhsPass.uniforms.distortion.value = 0.1;
                        game.vhsPass.uniforms.animatedColorShift.value = 0.005;
                        game.vhsPass.uniforms.enabled.value = (game.timeScale == 0.2 ? 1.0 : 1.0 - game.timeScale);
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
                    dif = -Math.PI * 2 + dif;
                } else if (dif < -Math.PI) {
                    dif = Math.PI * 2 + dif;
                }

                this.aim += dif / 15;
            }
        }

        if (this.aim > Math.PI / 2 || this.aim < -Math.PI / 2) {
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
                if (this.shoot(game, weapon)) {
                    game.shotsFired++;
                    if (firing) {
                        this.shooting = false;
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
                    if ((this.powerupTime % 10) == 4) {
                        this.setOpacity(0.1);
                    }
                    if ((this.powerupTime % 10) == 8) {
                        this.setOpacity(0.04);
                    }
                } else if (this.powerup == JETPACK && this.inAir && (this.powerupTime % 3) == 0) {
                    new Smoke(game, this.position, 20);
                }
            }
        }

        if (game.mouse.down) {
            if (this.canTriggerTimelineEvent && game.lastTimelineEvent?.func) {
                if (window.performance.now() < game.timelineEventDeadline) {
                    game.lastTimelineEvent.func();
                }
                
            }
            this.canTriggerTimelineEvent = false;
        } else {
            this.canTriggerTimelineEvent = true;
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

    shoot(game, weapon) {
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
            return true;
        }
        return false;
    }

    collectPowerup(type, game) {
        if (this.powerup) {
            this.endPowerup(game);
        }
        this.powerupTime = POWERUP_TIME;
        this.powerup = type;
        const powerupText = document.getElementById("powerup-text")!;
        if (type == TRI_DAMAGE) {
            this.setTint(true, new Color(0, 0, 1));
            game.audioManager.playEffect('announcerTridamage');
            powerupText.innerHTML = 'TriDamage';
        } else if (type == INVULNERABILITY) {
            this.ignoreNextDamage = true;
            this.setTint(true, new Color(1, 0, 0));
            game.audioManager.playEffect('announcerInvulnerability');
            powerupText.innerHTML = 'Invulnerability';
        } else if (type == PREDATOR_MODE || type == MINI_PREDATOR_MODE) {
            game.shaderPass.uniforms.invertEnabled.value = 1.0;

            this.previousWeapon = this.weapon;
            const shoulderCannon = game.weapons[game.weapons.length - 1];
            shoulderCannon.ammo = Number.POSITIVE_INFINITY;
            shoulderCannon.reloading = Number.POSITIVE_INFINITY;
            this.selectWeapon(game.weapons.length - 1);

            if (type == PREDATOR_MODE) {
                game.audioManager.playEffect('announcerPredatormode');
                powerupText.innerHTML = 'Predator Mode';
            } else {
                this.powerupTime /= 2;
            }
        } else if (type == TIME_RIFT) {
            this.setTint(true, new Color(0, 1, 0));
            game.audioManager.playEffect('announcerTimerift');
            powerupText.innerHTML = 'Time Rift';
        } else if (type == JETPACK) {
            game.audioManager.playEffect('announcerJetpack');
            powerupText.innerHTML = 'Jetpack';
        }
    }

    endPowerup(game) {
        if (this.ignoreNextDamage && this.powerup == INVULNERABILITY) {
            // The player didn't get hit, congratulations!
            document.getElementById("powerup-text")!.innerHTML = 'Deflect';
        }
        if (this.powerup == PREDATOR_MODE || this.powerup == MINI_PREDATOR_MODE) {
            const shoulderCannon = game.weapons[game.weapons.length - 1];
            shoulderCannon.ammo = 0;
            this.selectWeapon(this.previousWeapon);
        }
        this.powerup = POWERUP_NONE;
        this.setTint(false, null);
        this.setOpacity(1.0);
        game.shaderPass.uniforms.invertEnabled.value = 0.0;
    }

    destroy(game) {
        game.timeScale = 0.2;
        game.audioManager.timeScale = game.timeScale;
        game.shaderPass.uniforms.tintEnabled.value = 1.0;
        this.dead = true;
        game.world.remove(this.group);
        new DestroyedEnemy(game, this, true);
        new Explosion(game, this.position.clone(), 500);
    }
}


const map1 = [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 4], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 8], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 4], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 2], [1, 6], [1, 4], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 10], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 2]],
[[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 6], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 2], [1, 2], [1, 6], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 6], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 2]]];

const bg1 = [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
[[0, 12], [0, 0], [0, 0], [0, 11], [0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [0, 11], [0, 12], [0, 0], [0, 0], [0, 11], [0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [0, 11]],
[[0, 12], [0, 11], [0, 11], [0, 12], [0, 12], [0, 11], [0, 0], [0, 0], [0, 11], [0, 12], [0, 12], [0, 11], [0, 11], [0, 12], [0, 12], [0, 11], [0, 0], [0, 0], [0, 11], [0, 12]]];

const zero = new Vector3();

class Game {
    public window: Window;
    public mouse: any;
    public keyIsPressed: {[key: string]: boolean};
    public scene: Scene;
    public camera: Camera;
    public shaderPass: ShaderPass;
    public vhsPass:ShaderPass;
    private textures: Texture[];
    public audioManager: AudioManager;
    public weapons: Weapon[];
    private overSetter: Function;
    private updateFunction: Function;
    private timeline: Timeline;
    public musicTrack: string;
    public lastTimelineEvent: TimelineEvent | null;
    public videoGestures: VideoGestures | null;

    public tileSize: number;
    public timeScale: number;
    public paused: boolean;

    
    public player: Player | null;
    public enemy: Enemy | null;
    public level: number;
    public score: number;
    public helisDestroyed: number;
    public nextHealth: number;
    public nextLevel: number;
    public bpm: number;

    public gestureHands: Mesh[];
    public gestureHandsShowing: number;

    public map:Object[][];
    public mapWidth: number;
    public mapHeight: number;

    public lastWeapon_: number;
    
    public shotsFired: number;
    public spidersAttacked: boolean;

    public timelineEventDeadline: number;

    public tilesheet: Texture;
    public bgTexture: Texture;
    public bulletTexture: Texture;
    public world: Group;
    public visibleWidth: number;
    public visibleHeight: number;
    public mapBox: Box3;

    public clock: Clock;
    public accumulator: number;
    public playerBullets: any[];
    public enemyBullets: any[];
    public entities: any[];
    
    
    constructor(windowOrGame: Window | Game, mouse: Object, keyIsPressed: {[key: string]: boolean}, scene: Scene, camera: Camera, shaderPass: ShaderPass, vhsPass: ShaderPass, textures, audioManager: AudioManager, weapons: Weapon[], overSetter, updateFunction) {
        this.bpm = 200;
        if (windowOrGame instanceof Game) {
            for (const key of ['window', 'mouse', 'keyIsPressed', 'scene', 'camera', 'shaderPass', 'vhsPass', 'textures', 'audioManager', 'weapons', 'videoGestures', 'overSetter', 'timeline', 'updateFunction', 'musicTrack', 'bpm']) {
                this[key] = windowOrGame[key];
            }
        } else {
            this.window = window;
            this.mouse = mouse;
            this.keyIsPressed = keyIsPressed;
            this.scene = scene;
            this.camera = camera;
            this.shaderPass = shaderPass;
            this.vhsPass = vhsPass;
            this.textures = textures;
            this.audioManager = audioManager;
            this.weapons = weapons;
            this.overSetter = overSetter;
            this.updateFunction = updateFunction;
            this.timeline = new Timeline(this.audioManager, this.bpm, /* timeSignature */ 4 / 4, /** lyrics */`[🌝]



[Only fragments remain 🚁]Only fragments remain








[🌞]Heli Attack 2000







[The sound of my brain being ripped into the digital dimension 🚁]Made by Kit & Dangerbeard

























[⚡]A new world was
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
[🔥]War
Neon eyes come to life


[🔥]Torn
Born on a factory line


[🔥]For
Built to sacrifice


[🔥]Sworn
The age of the machine will rise


[🚁⚡] Our liberty
Our divinity
Nothing left but the
scars of the machinery
Scattered ashes remain

The remnants of rebellion

Our history
Our misery
Programmed to delete
us from reality
Only fragmented remains

The remnants of rebellion

Our liberty
Our divinity
Nothing left but the
scars of the machinery
Scattered ashes remain

The remnants of rebellion

Our history
Our misery
Programmed to delete
us from reality
Only fragmented remains

The remnants of rebellion



[⚡]Created
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
[🔥]Burn
Burn the enemy


[🔥]Yearn
For moments not on screens


[🔥]Overturn
Machine beats majority


[🔥]Learn
The AI fights for supremacy


[🚁⚡Lo-fi]



Scattered ashes remain
The remnants of rebellion






Only fragmented remains

The remnants of rebellion

[🚁⚡]Our liberty
Our divinity
Nothing left but the
scars of the machinery
Scattered ashes remain

The remnants of rebellion

Our history
Our misery
Programmed to delete
us from reality
Only fragmented remains

The remnants of rebellion

Our liberty
Our divinity
Nothing left but the
scars of the machinery
Scattered ashes remain

The remnants of rebellion

Our history
Our misery
Programmed to delete
us from reality
Only fragmented remains

The remnants of rebellion

[👹🚁⚡Solo]



















Don't scream

Don't scream





Only fragments remain

The remnants of rebellion

[🚁⚡] Our liberty
Our divinity
Nothing left but the
scars of the machinery
Scattered ashes remain

The remnants of rebellion

Our history
Our misery
Programmed to delete
us from reality
Only fragments remains

The remnants of rebellion

[Painful Mourning🔫]





The remnants of rebellion

[⚡]Our legacy
Our majesty
Destroyed by
cybernetic supremacy
Nothing left at all

[No remnants of rebellion]No remnants of rebellion
`);

            this.musicTrack = 'music';
        }

        this.paused = false;

        this.enemy = null;
        this.level = 0;
        this.score = 0;
        this.helisDestroyed = 0;
        this.nextHealth = 15;
        this.nextLevel = 10;

        this.gestureHands = [];
        this.gestureHandsShowing = 0;

        // TODO(Support map changes).
        this.map = map1;

        if (this.textures) {
            this.init(this.textures, this.weapons);
        }

        this.lastWeapon_ = 0;
        
        // Stats
        this.shotsFired = 0;
        this.spidersAttacked = false;

        this.timeline.listener = (time: number, text: string, timelineEvent) => this.displayLyric(time, text, timelineEvent);
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

        const mapHeight = this.mapHeight = this.map.length * tileSize;
        const mapWidth = this.mapWidth = this.map[0].length * tileSize;
        this.visibleWidth = visibleWidthAtZDepth(0, this.camera);
        this.visibleHeight = visibleHeightAtZDepth(0, this.camera);

        const bgLayer = this.buildMap(bg1);
        bgLayer.position.set(0, mapHeight - tileSize * 4, -200);
        bgLayer.scale.x = 2;
        bgLayer.scale.y = 2;
        world.add(bgLayer);

        // Add layers to the scene
        const mapLayer = this.buildMap(this.map);
        world.add(mapLayer);

        const mapBox = this.mapBox = new Box3(new Vector3(0, -mapHeight, 0), new Vector3(mapWidth, 0, 0));
        mapBox.expandByScalar(tileSize);
    }

    createGestureHand(): Mesh {
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

        this.shotsFired = 0;

        this.overSetter(false);

        this.audioManager.timeScale = timeScale;
        this.audioManager.playMusic(this.musicTrack, 0.8);
        this.audioManager.playEffect('bigboom');
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
        const player = this.player!;

        const pivot = new Vector3();
        player.weaponObject.getWorldPosition(pivot);

        const texture = weapon.bulletTexture || this.bulletTexture;

        const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
        const material = new MeshBasicMaterial({
            map: texture,
            transparent: true
        });

        

        const direction = player.aim + rotation * Math.PI / 180

        const mesh = new Mesh(geometry, material);
        mesh.rotation.z = direction;

        const pos = pivot.add(rotateAroundPivot(weapon.barrel, zero, player.aim, !(player.aim > Math.PI / 2 || player.aim < -Math.PI / 2)));
        if (offset) {
            pos.x += offset * Math.cos(direction);
            pos.y += offset * Math.sin(direction);
        }
        pos.z = 0.5;
        mesh.position.copy(pos);

        this.world.add(mesh);

        const bullet:{velocity: Vector3, damage: number, object: Mesh, material: MeshBasicMaterial, update: Function, destroy: Function, tick: number, time: number} = {
            velocity: new Vector3(
                weapon.bulletSpeed * Math.cos(direction),
                weapon.bulletSpeed * Math.sin(direction),
                0),
            damage: weapon.damage,
            object: mesh,
            material: material,
            update: weapon.update,
            tick: 0,
            time: 0,
            destroy: weapon.destroy,
        };

        this.playerBullets.push(bullet);

    }

    updateCameraPosition(delta) {
        let worldPos = new Vector3();
        this.player?.group.getWorldPosition(worldPos);

        this.visibleWidth = visibleWidthAtZDepth(0, this.camera);
        this.visibleHeight = visibleHeightAtZDepth(0, this.camera);

        this.camera.position.x = MathUtils.damp(this.camera.position.x, Math.min(Math.max(Math.round(worldPos.x), this.visibleWidth / 2), this.mapWidth - this.visibleWidth / 2), 10, delta);
        this.camera.position.y = MathUtils.damp(this.camera.position.y, Math.min(Math.max(Math.round(worldPos.y), -(this.mapHeight - this.visibleHeight / 2)), -this.visibleHeight / 2), 10, delta);
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
        if (!this.player) {
            return;
        }
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            const bulletPos = bullet.object.position;
            bulletPos.x += bullet.velocity.x * this.timeScale;
            bulletPos.y += bullet.velocity.y * this.timeScale;

            let remove = false;

            if (!this.player.dead && isPlayerCollision(bulletPos.x, -bulletPos.y, this.player)) {
                if (this.player.powerup != INVULNERABILITY) {
                    if (!this.player.ignoreNextDamage) {
                        this.player.health -= 10;
                        
                        updateHealthBar(this);
                        this.audioManager.playEffect('hurt');
                        
                        for (let i = 0; i < 3; i++) {
                            new Blood(this, new Vector3(bulletPos.x, -bulletPos.y, 0), i * 2);
                        }
                        if (this.player.health <= 0) {
                            this.suicide();
                        }
                    } else {
                        this.playHit();
                    }
                
                }
                this.player.ignoreNextDamage = false;
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

    timeStep(delta) {
        this.audioManager.setLoopVolume('flame', 0);
        this.audioManager.setLoopVolume('helicopter', 0);
        playEnemyHit = true;

        if (!this.player?.dead) {
            this.player!.update(this, delta);
        }
        this.enemy?.update(this, delta);
        this.updateBullets(delta);
        this.updateEntities(delta);
        this.updateCameraPosition(delta);
        updateUI(this);
    }

    update() {
        if (this.paused) {
            return;
        }

        if (!this.clock) {
            return;
        }

        const delta = this.clock.getDelta();

        this.accumulator += delta;

        this.updateKeys();

        if (this.accumulator > 1 / 60) {
            this.timeStep(delta);
            this.accumulator %= 1 / 60;
        };

        this.timeline.update();
        this.updateFunction();

    }

    newHeli() {
        this.enemy?.destroy(this);

        this.enemy = new Enemy()
        this.enemy.init(this);
        this.enemy.shooting = true;
    }

    heliDestroyed() {
        this.score += 300;
        this.helisDestroyed++;

        if (!this.player) {
            return;
        }

        if (this.player.bulletTime != Number.POSITIVE_INFINITY) {
            this.player.bulletTime = Math.min(MAX_BULLET_TIME, this.player.bulletTime + MAX_BULLET_TIME / 3);
        }
        let randomAmmo = false;

        if (!this.enemy) {
            return;
        }

        if (this.helisDestroyed == this.nextHealth) {
            new Box(this, this.enemy.position, this.weapons.length + 1);
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
            this.allWeapons();
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

        this.newHeli();
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
            this.player.collectPowerup(MINI_PREDATOR_MODE, this);
            this.player.ignoreNextDamage = true;
            this.player.infiniteTimeDistort = true;
        }

        if (this.level == 0) {
            this.allWeapons();
        }
    }

    playHit() {
        this.audioManager.playEffect('metal' + Math.floor(Math.random() * 4));
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
            // Do we need this, check next debug.
            this.player.shooting = true;
        }
    }

    displayLyric(time: number, text: string, timelineEvent:TimelineEvent) {
        this.lastTimelineEvent = timelineEvent;
        this.processLastTimelineEvent();
    }

    private emojiFuncs = {
        '🌝': () => {
            return null;
        },
        '🌞': () => {
            if (this.level > 0) {
                this.spidersAttacked = true;
                this.allWeapons();
            }
            if (this.shotsFired === 0) {
                this.player!.shooting = true;
            }
            return () => {
                this.killHelicopter();
            };
        },
        '🚁': () => {
            if (!this.enemy) {
                this.newHeli();
                return null;
            }
            return () => {
                this.killHelicopter();
            }
        },
        '⚡': () => {
            return () => {
                this.weapons[this.player!.alternateWeapon].ammo++;
                this.enemy?.leave();
            }
        },
        '🔫': () => {
            return () => {
                this.allWeapons();
                this.enemy?.leave();
            }
        },
        '🔥': () => {
            return () => {
                this.weapons[FLAMETHROWER].ammo += this.ammoForRandomWeapon(FLAMETHROWER);
            }
        },
        '👹': () => {
            return () => {
                this.player!.collectPowerup(PREDATOR_MODE, this);
            }
        }
    }

    private getValueBetweenBrackets(input: string): string | null {
        const match = input.match(/\[(.*?)\]/);
        return match ? match[1] : null;
    }

    processLastTimelineEvent() {
        if (!this.lastTimelineEvent) {
            return;
        }

        this.timelineEventDeadline = window.performance.now() + getDurationMiliseconds(this.bpm);

        if (!this.lastTimelineEvent.text!) {
            return;
        }

        let lower = this.getValueBetweenBrackets(this.lastTimelineEvent.text.toLowerCase());
        if (!lower) {
            return;
        }

        const funcs: Function[] = [];
        for (let [key, value] of Object.entries(this.emojiFuncs)) {
            if (lower.indexOf(key) != -1) {
                lower = lower.replaceAll(key, '');
                const func: Function | null = value();
                if (func) {
                    if (this.musicTrack == 'ror') {
                        func();
                    } else {
                        funcs.push(func);
                    }
                }
            }
        }

        this.lastTimelineEvent.func = () => {
            this.lastTimelineEvent!.func = null;
            this.lastTimelineEvent = null;
            for (const func of funcs) {
                func();
            }
            if (lower) {
                return '[' + lower + ']';
            } else {
                return '';
            }
        }
    }

    killHelicopter() {
        if (this.enemy) {
            this.enemy.health = Math.min(this.enemy.health, 100);
            if (this.player) {
                const weapon = this.player.weapon;
                let seeker = this.weapons[SEEKER];
                seeker.ammo++;
                this.player.selectWeapon(SEEKER);
                seeker.reloading = Number.POSITIVE_INFINITY;
                this.player.shoot(this, seeker);
                seeker.reloading = Number.POSITIVE_INFINITY;
                this.player.selectWeapon(weapon);
            }
        } else {
            this.newHeli();
        }
    }

    suicide() {
        if (this.player?.dead) {
            return;
        }

        this.player?.destroy(this);
        this.overSetter(true);
        this.enemy?.destroy(this);
        this.enemy = null;
    }

    weaponSwitch() {
        if (this.player && !this.player.chooseAlternate) {
            if (this.weapons[this.player.alternateWeapon].ammo) {
                this.lastWeapon_ = this.player.weapon;
                this.player.chooseAlternate = true;
                this.player.selectWeapon(this.player.alternateWeapon);
            }
        }
    }

    lastWeapon() {
        if (!this.player) {
            return;
        }
        this.player.chooseAlternate = false;
        if (this.weapons[this.lastWeapon_].ammo) {
            this.player.selectWeapon(this.lastWeapon_);
        } else {
            this.player.selectWeapon(0);
        }
    }

    allWeapons() {
        for (let i = 1; i < this.weapons.length - 1; i++) {
            this.weapons[i].ammo = this.ammoForRandomWeapon(i) * 3;
        }
        this.level++;
    }

    pause() {
        this.paused = true;
    }

    play() {
        this.paused = false;
    }

    backward() {

    }

    forward() {
        // jump forwards one second, warning, you may get hurt!
        for (var i = 0; i < 60; i++) {
            this.timeStep(1/60);
        }
    }
}

function updateUI(game) {
    document.getElementById("ui")!.style.display = 'initial';
    updateInfo(game);
    updateHealthBar(game);
    updateReloadBar(game);
    updateHyperjumpBar(game);
    updateTimeDistortBar(game);
    updateBullets(game);
    updatePowerup(game);
}

function updateInfo(game) {
    const info = document.getElementById('info')!;
    info.innerHTML = `Helis: ${game.helisDestroyed}<br>Score: ${game.score}<br>Level: ${game.level+1}`;
}

function updateHealthBar(game) {
    const percentage = game.player.health / 100;
    const fill = document.getElementById('health-fill')!;
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    fill.style.height = `${78 * clampedPercentage}px`;
}

function updateReloadBar(game) {
    const weapon = game.weapons[game.player.weapon];
    const percentage = weapon.reloading / weapon.reloadTime;

    const fill = document.getElementById('reload-fill')!;
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    fill.style.width = `${42 * clampedPercentage}px`;
}

function updateHyperjumpBar(game) {
    const fill = document.getElementById('hyperjump-fill')!;
    const clampedPercentage = Math.max(0, Math.min(1, game.player.hyperJump / HYPERJUMP_RECHARGE));
    fill.style.width = `${78 * clampedPercentage}px`;
}

function updateTimeDistortBar(game) {
    const fill = document.getElementById('time-fill')!;
    const clampedPercentage = Math.max(0, Math.min(1, game.player.bulletTime / MAX_BULLET_TIME));
    fill.style.width = `${78 * clampedPercentage}px`;
}

function updateBullets(game) {
    const weapon = game.weapons[game.player.weapon];

    const bulletsText = document.getElementById('bullets-text')!;
    bulletsText.innerHTML = `${weapon.ammo} x`;

    const bulletsBox = document.getElementById('bullets-box')!;
    bulletsBox.style.backgroundPosition = `${-game.player.weapon * 33}px 0px`
}

function updatePowerup(game) {
    const show = game.player.powerup != POWERUP_NONE;

    const bar = document.getElementById('powerup-bar')!;
    const ui = document.getElementById('powerup')!;

    if (!show) {
        bar.style.visibility = 'hidden';
        ui.style.visibility = 'hidden';
        return;
    } else {
        bar.style.visibility = 'unset';
        ui.style.visibility = 'unset';
    }

    const percentage = game.player.powerupTime / POWERUP_TIME;
    const fill = document.getElementById('powerup-fill')!;
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    fill.style.height = `${78 * clampedPercentage}px`;
}

export default Game;