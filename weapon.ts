import { MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, Vector2 } from 'three';
import { createTintShader } from './utils';

class Weapon {
    public reloading: number;
    public bullets: number;
    public bulletsSpread: number;
    public bulletsOffset: number;
    public spread: number;

    public update: Function | null;
    public destroy: Function | null;
    public mesh: Mesh;

    public ammo: number;

    public texture: Texture;
    public bulletTexture: Texture;

    constructor(
        public name: string,
        public textureUrl: string | null,
        public announcerSoundKey: string | null,
        public soundKey: string | null,
        public origin: Vector2,
        public barrel: Vector2,
        public reloadTime: number,
        public bulletSpeed: number,
        public damage: number,
        public boxAmmo: number,
        public bulletTextureUrl?: string | null,
    ) {
        this.name = name;
        this.textureUrl = textureUrl;
        this.announcerSoundKey = announcerSoundKey;
        this.soundKey = soundKey;
        this.origin = origin;
        this.barrel = barrel;
        // 30fps -> 60fps
        this.reloadTime = reloadTime * 2;
        this.bulletSpeed = bulletSpeed / 2;
        this.damage = damage;
        this.bulletTextureUrl = bulletTextureUrl;
        this.reloading = Number.POSITIVE_INFINITY;
        this.bullets = 1;
        this.bulletsSpread = 0;
        this.bulletsOffset = 0;
        this.spread = 0;
        this.update = null;
        this.destroy = null;
        // How much ammo in a box.
        this.boxAmmo = boxAmmo;
        this.ammo = 0;
    }

    setSpread(spread) {
        this.spread = spread;
        return this;
    }

    setBullets(bullets, bulletsSpread, bulletsOffset) {
        this.bullets = bullets;
        this.bulletsSpread = bulletsSpread || 0;
        this.bulletsOffset = bulletsOffset || 0;
        return this;
    }

    setUpdate(update) {
        this.update = update;
        return this;
    }

    setDestroy(destroy) {
        this.destroy = destroy;
        return this;
    }

    init(textures) {
        this.texture = textures[this.textureUrl!];
        if (this.bulletTextureUrl) {
            this.bulletTexture = textures[this.bulletTextureUrl];
        }
        this.mesh = this.createMesh();
    }

    createMesh() {
        const texture = this.texture;
        if (!this.texture) {
            // TODO: Add kit gesture mesh creation.
            return new Mesh();
        }
        const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
        const material = true ? createTintShader(texture) : new MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        geometry.translate(texture.image.width / 2, -texture.image.height / 2, 0); 
        const mesh = new Mesh(geometry, material);
        mesh.position.x = -this.origin.x;
        mesh.position.y = this.origin.y;
        return mesh;
    }

    createBullet(game) {
        if (this.soundKey) {
            game.audioManager.playEffect(this.soundKey);
        }
        let rot = 0;
        if (this.bullets > 1) {
            rot = -this.bulletsSpread * this.bullets / 2;
        }
        for (var i = 0; i < this.bullets; i++) {
            game.createBullet(this, rot + MathUtils.randFloat(-this.spread, this.spread), this.bulletsOffset * i / this.bullets);
            rot += this.bulletsSpread;
        }
    }

    collect(game) {
        this.ammo += this.boxAmmo;
        if (this.announcerSoundKey) {
            game.audioManager.playEffect(this.announcerSoundKey);
        }
    }
}

export default Weapon;