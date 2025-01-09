import { MathUtils, Material, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, PlaneGeometry, Texture, Vector2, Vector3 } from 'three';
import { get2DPosition, isPlayerCollisionRect, isTileCollision, setUV } from './utils.ts';
import Game from './game';

export class Entity {
    public tick: number;
    public position: Vector2;
    public velocity: Vector2;
    constructor(game: Game) {
        this.tick = 0;
        this.position = new Vector2(0, 0, 1);
        this.velocity = new Vector2(0, 0);
    }

    init(game: Game) {
        game.entities.push(this);
    }

    update(game: Game, delta: number): boolean {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.position.x += this.velocity.x * game.timeScale;
        this.position.y += this.velocity.y * game.timeScale;

        return false;
    }

    move(game: Game): void { }

    destroy(game: Game): void { }
}

export class TextOverlay extends Entity {
    public text: string;
    public element: HTMLDivElement = document.createElement('div');
    public time: number;
    constructor(game, text) {
        super(game);
        this.element.textContent = text;
        this.element.style.position = 'absolute';
        this.element.classList.add('text-overlay');
        this.time = 0;

        this.position.x = game.player?.position.x;
        this.position.y = -game.player?.position.y - game.player?.bounds.min.y;

        this.init(game);
    }

    init(game: Game): void {
        super.init(game);

        document.getElementById('text')?.appendChild(this.element);

        this.update(game, 0);
    }

    update(game: Game, delta: number): boolean {
        super.update(game, delta);

        const { x, y } = get2DPosition(game.camera, new Vector3(this.position.x, this.position.y + (this.time / 120 * 20), 0));

        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;

        let opacity = 1.0;
        if (this.time < 10) {
            opacity = this.time / 10;
        } else if (this.time > 110) {
            opacity = 1 - (this.time - 110) / 10;
        }

        this.element.style.opacity = `${opacity}`;

        return this.time >= 120;
    }

    move(game: Game): void {
        this.time++;
    }

    destroy(game: Game): void {
        this.element.remove();
    }
}

class MeshEntity extends Entity {
    public textureUrl: string;
    public texture: Texture;
    public geometry: PlaneGeometry;
    public material: Material;
    public mesh: Mesh;
    constructor(game: Game, textureUrl: string) {
        super(game);
        this.textureUrl = textureUrl;
        this.init(game)
    }

    init(game: Game) {
        const texture = this.texture = game.textures[this.textureUrl];

        const geometry = this.geometry = new PlaneGeometry(texture.image.width, texture.image.height);
        const material = this.material = new MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        const mesh = this.mesh = new Mesh(geometry, material);
        game.world.add(mesh);

        game.entities.push(this);
    }

    update(game: Game, delta: number): boolean {
        super.update(game, delta);

        this.updateMesh();

        return false;
    }

    updateMesh() {
        this.mesh.position.set(this.position.x, -this.position.y, this.position.z);
    }

    move(game: Game): void { }

    destroy(game: Game): void {
        game.world.remove(this.mesh);
        if (this.mesh) {
            this.mesh.material.dispose();
            this.mesh.geometry.dispose();
        }
    }
}

export class DestroyedEnemy extends MeshEntity {
    public permanent: boolean;
    constructor(game, enemy, permanent) {
        super(game, './images/guyburned.png');

        this.position.copy(enemy.position);
        this.velocity.set(-3 + Math.random() * 6, -5 + Math.random() * 5, 0);
        this.mesh.rotation.z = enemy.group.rotation.z;
        this.permanent = permanent;
    }

    move(game: Game): void {
        this.velocity.y += 0.5;
    }

    update(game: Game, delta: number): boolean {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.position.x += this.velocity.x * game.timeScale
        if (isTileCollision(this.position.x, this.position.y, game.map, game.tileSize)) {
            this.position.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
        }
        this.position.y += this.velocity.y * game.timeScale;
        if (isTileCollision(this.position.x, this.position.y, game.map, game.tileSize)) {
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

        return false;
    }
}

let shardBounces = 0;

export class Shard extends MeshEntity {
    private bounces: number;
    constructor(game, position) {
        super(game, './images/shard' + Math.floor(Math.random() * 3) + '.png');

        this.position.copy(position);
        this.velocity.set(-5 + Math.random() * 10, -5 + Math.random() * 10);
        this.mesh.scale.x = Math.random() > 0.5 ? 1 : -1;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;

        this.bounces = 0;
    }

    move(game: Game): void {
        this.velocity.y += 0.5;
    }

    update(game: Game, delta: number): boolean {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.mesh.rotation.z += (Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale * Math.PI / 180

        this.position.x += this.velocity.x * game.timeScale
        if (isTileCollision(this.position.x, this.position.y, game.map, game.tileSize)) {
            this.position.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
            if (shardBounces++ % 3 == 0) {
                game.playHit();
            }
        }
        this.position.y += this.velocity.y * game.timeScale;
        if (isTileCollision(this.position.x, this.position.y, game.map, game.tileSize)) {
            if (this.bounces > 3) {
                return true;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.5;
                this.bounces++;
                if (shardBounces++ % 3 == 0) {
                    game.playHit();
                }
            }

        }

        this.updateMesh();

        return false;
    }
}

export class DestroyedHeli extends MeshEntity {
    constructor(game, enemy) {
        super(game, './images/heli/helidestroyed.png');

        this.position.copy(enemy.position);
        this.velocity.copy(enemy.velocity);
        this.mesh.scale.x = enemy.heliGroup.scale.x;
        this.mesh.rotation.z = enemy.group.rotation.z;
    }

    move(game: Game): void {
        this.velocity.y += 0.5;
    }

    update(game: Game, delta: number): boolean {
        super.update(game, delta);

        this.mesh.rotation.z += ((Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale / 4) * Math.PI / 180;

        return isTileCollision(this.position.x, this.position.y, game.map, game.tileSize);
    }

    destroy(game: Game): void {
        super.destroy(game);

        for (var i = 0; i < 6; i++) {
            const p = this.position.clone()
            p.x += -40 + Math.random() * 80;
            p.y -= this.velocity.y;
            new Shard(game, p);
        }

        new Explosion(game, this.position.clone(), 140);
    }
}

export class Explosion extends MeshEntity {
    public targetSize: number;
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

    update(game: Game, delta: number): boolean {
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

    destroy(game: Game): void {
        super.destroy(game);
    }
}

export class Smoke extends MeshEntity {
    public targetSize: number;
    constructor(game, position, size) {
        super(game, './images/smoke.png');

        this.position.copy(position);
        this.targetSize = size * 0.5 / 27;

        this.mesh.scale.x = this.mesh.scale.y = size / 27;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;
    }

    update(game: Game, delta: number): boolean {
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

    destroy(game: Game): void {
        super.destroy(game);
    }
}

export class Fire extends MeshEntity {
    public targetSize: number;
    constructor(game, position, size) {
        super(game, './images/flame.png');

        this.position.copy(position);
        this.targetSize = size * 0.5 / 42;

        this.mesh.scale.x = this.mesh.scale.y = size / 42;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;
    }

    update(game: Game, delta: number): boolean {
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

    destroy(game: Game): void {
        super.destroy(game);
    }
}

export class Blood extends MeshEntity {
    public targetSize: number;
    public pause: number;
    public time: number;

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

    update(game: Game, delta: number): boolean {
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

    destroy(game: Game): void {
        super.destroy(game);
    }
}

export class Parachute {
    public parent: Object3D;
    public mesh: Mesh;

    public opened: boolean;
    public scale: number;
    public tick: number;

    public destroyed: boolean;
    constructor(game, parent, opened, scale) {

        this.parent = parent;

        const texture = game.textures['./images/parachute.png'];

        const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
        geometry.translate(0, texture.image.height - 20, 0);
        const material = new MeshBasicMaterial({
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

    update(game: Game, delta: number): boolean {
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;

            this.mesh.scale.x = MathUtils.damp(this.mesh.scale.x, this.opened ? this.scale : 0, 20, delta);

            if (this.mesh.scale.x <= 0.1) {
                this.destroy(game);
                return true;
            }
        }
        return false;
    }

    destroy(game: Game): void {
        this.parent.remove(this.mesh);
        this.destroyed = true;
    }
}

const BOX_SIZE = 33;

export class Box extends MeshEntity {
    public type: number;
    public group: Object3D;
    public parachute: Parachute;

    constructor(game, position, type) {
        super(game, './images/box.png');
        this.position.copy(position);

        if (this.position.x < BOX_SIZE / 2) {
            this.position.x = BOX_SIZE / 2
        } else if (this.position.x > game.mapWidth - BOX_SIZE / 2) {
            this.position.x = game.mapWidth - BOX_SIZE / 2;
        }
        setUV(this.geometry, type, BOX_SIZE, this.texture.image.width, this.texture.image.height);

        this.type = type;
    }

    init(game) {
        const texture = this.texture = game.textures[this.textureUrl];

        this.group = new Object3D();

        const geometry = this.geometry = new PlaneGeometry(BOX_SIZE, BOX_SIZE);
        geometry.translate(0, BOX_SIZE / 2, 0);


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

    update(game: Game, delta: number): boolean {
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

        if (isTileCollision(pos.x - BOX_SIZE / 2, pos.y, game.map, game.tileSize) || isTileCollision(pos.x + BOX_SIZE / 2, pos.y, game.map, game.tileSize)) {
            if (this.velocity.y < 2) {
                pos.y = (Math.floor(pos.y / game.tileSize)) * game.tileSize + 2;
                this.velocity.y = 0;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.4;
            }
        }

        if (this.parachute.opened && isTileCollision(pos.x, pos.y + 150, game.map, game.tileSize)) {
            this.parachute.opened = false;
        }

        this.parachute.update(game, delta);

        if (!game.player?.dead && isPlayerCollisionRect(pos.x - BOX_SIZE / 2, pos.y - BOX_SIZE, BOX_SIZE, BOX_SIZE, game.player)) {
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
            game.player.collectPowerup(1 + Math.floor(Math.random() * 5), game);
        } else if (this.type == game.weapons.length + 1) {
            game.player.health = Math.min(100, game.player.health + 20);
            game.audioManager.playEffect('announcerHealth');
            new TextOverlay(game, 'Health Pack');
        }
    }

    updateMesh() {
        // Update position of object, by mapping game position to 3d camera position.
        this.group.position.set(this.position.x, Math.round(-this.position.y), 0.5);
    }

    destroy(game: Game): void {
        game.world.remove(this.group);
    }
}