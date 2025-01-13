
import AudioManager from './audiomanager.js';
import Weapon from './weapon.ts';
import { AmbientLight, Scene, Texture, TextureLoader, Vector2, Vector3, Camera, SpotLight, SpotLightHelper, MeshBasicMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {
    abombDestroy,
    abombUpdate,
    explosionDestroy,
    fireMinesUpdate,
    flameUpdate,
    grappleUpdate,
    grenadeUpdate,
    railUpdate,
    rocketUpdate,
    rpgUpdate,
    seekerUpdate,
    shotgunRocketDestroy,
    shotgunRocketUpdate,
} from './weapons';
import Game from './game';
import { createIframe, isUrl, loadTexture } from './utils'
import VideoGestures from './videogestures.ts';

async function loadAssets(weapons) {
    const textureMap: { [key: string]: Texture } = {};
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
        new Weapon("Machine Gun", './images/weapons/machinegun.png', null, 'pistol', new Vector2(5, 12), new Vector2(23, -7.5), 5, 8, 10, 0).setSpread(2).setRotateBullet(false),
        new Weapon("Akimbo Mac 10's", './images/weapons/mac10s.png', 'announcerMac10', 'pistol', new Vector2(-2, 21), new Vector2(28, -8.5), 4, 8, 9, 50).setSpread(8).setBullets(2, 0, 8).setRotateBullet(false),
        new Weapon("Shotgun", './images/weapons/shotgun.png', 'announcerShotgun', 'shotgun', new Vector2(5, 12), new Vector2(30, -7), 25, 8, 15, 14).setBullets(5, 5, 0).setRotateBullet(false),
        new Weapon("Shotgun Rockets", './images/weapons/shotgunrockets.png', 'announcerShotgunrockets', 'shotgunrockets', new Vector2(7, 19), new Vector2(34, -8), 40, 7, 40, 8, './images/shotgunrocketbullet.png').setBullets(3, 10, 0).setUpdate(shotgunRocketUpdate).setDestroy(shotgunRocketDestroy),
        new Weapon("Grenade Launcher", './images/weapons/grenadelauncher.png', 'announcerGrenadelauncher', 'grenade', new Vector2(13, 18), new Vector2(29, -7), 30, 25, 75, 12, './images/grenade.png').setUpdate(grenadeUpdate).setDestroy(explosionDestroy),
        new Weapon("RPG", './images/weapons/rpg.png', 'announcerRpg', 'grenade', new Vector2(18, 20), new Vector2(32, -7), 40, 4, 75, 10, './images/rpgbullet.png').setUpdate(rpgUpdate).setDestroy(explosionDestroy),
        new Weapon("Rocket Launcher", './images/weapons/rocketlauncher.png', 'announcerRocketlauncher', 'rocketlauncher', new Vector2(19, 23), new Vector2(25, -9.5), 50, 7, 100, 8, './images/rocketbullet.png').setUpdate(rocketUpdate).setDestroy(explosionDestroy),
        new Weapon("Seeker Launcher", './images/weapons/seekerlauncher.png', 'announcerSeekerlauncher', 'rocketlauncher', new Vector2(24, 28), new Vector2(24, -9.5), 55, 7, 100, 6, './images/seekerbullet.png').setUpdate(seekerUpdate).setDestroy(explosionDestroy),
        new Weapon("Flame Thrower", './images/weapons/flamethrower.png', 'announcerFlamethrower', null, new Vector2(9, 16), new Vector2(29, -7), 1, 9, 5, 150, './images/flame.png').setSpread(10).setUpdate(flameUpdate).setCloneBulletMaterial(true),
        new Weapon("Fire Mines", './images/weapons/mine.png', 'announcerFiremines', null, new Vector2(-9, 15), new Vector2(20, -5.5), 100, 3, 4, 3, './images/minebullet.png').setUpdate(fireMinesUpdate).setRotateBullet(false),
        new Weapon("A-Bomb Launcher", './images/weapons/abomb.png', 'announcerAbomb', 'rocketlauncher', new Vector2(22, 30), new Vector2(36, -13), 150, 3, 300, 3, './images/abombbullet.png').setUpdate(abombUpdate).setDestroy(abombDestroy),
        new Weapon("Railgun", './images/weapons/railgun.png', 'announcerRailgun', 'railgun', new Vector2(23, 27), new Vector2(32, -8), 75, 20, 150, 4, './images/rail.png').setUpdate(railUpdate).setCloneBulletGeometry(true).setCloneBulletMaterial(true),
        new Weapon("Grapple Cannon", './images/weapons/grapplecannon.png', 'announcerGrapplecannon', 'grapple', new Vector2(18, 23), new Vector2(33, -11), 250, 20, 300, 2, './images/grapplebullet.png').setUpdate(grappleUpdate),
        new Weapon("Shoulder Cannon", null, null, 'railgun', new Vector2(0, 0), new Vector2(16, 0), 100, 20, 300, 0, './images/shouldercannon.png').setUpdate(railUpdate).setCloneBulletGeometry(true).setCloneBulletMaterial(true),
    ];
    private game: Game;
    private textures: { [key: string]: Texture };
    private videoGestures: VideoGestures;

    public playing: boolean;

    private gltf: any;
    private audioPreload: Promise<any>;
    private gltfPreload: Promise<any>;
    private texturePreload: Promise<any>;

    constructor(private window: Window, domElement:HTMLElement, mouse: Object, joystick: Object, keyIsPressed: { [key: string]: boolean }, private scene: Scene, private camera: Camera, shaderPass: ShaderPass, private vhsPass: ShaderPass, private audioManager: AudioManager, private settings: Object) {
        this.game = new Game(window, domElement, mouse, joystick, keyIsPressed, scene, camera, shaderPass, vhsPass, this.textures, audioManager, this.weapons, (value) => { this.settings.over = value; }, () => { this.settings.update() });
    }

    async preload(): Promise<any> {
        if (!this.audioPreload) {
            this.audioPreload = this.audioManager.preload([
                { key: 'boom', url: './sounds/game/boom.mp3' },
                { key: 'empty', url: './sounds/game/empty.mp3' },
                { key: 'flame', url: './sounds/game/flame.mp3' },
                { key: 'grapple', url: './sounds/game/grapple.mp3' },
                { key: 'grenade', url: './sounds/game/grenade.mp3' },
                { key: 'helicopter', url: './sounds/game/helicopter.mp3' },
                { key: 'helidestroyed', url: './sounds/game/helidestroyed.mp3' },
                { key: 'hurt', url: './sounds/game/hurt.mp3' },
                { key: 'hyperjump', url: './sounds/game/hyperjump.mp3' },
                { key: 'metal0', url: './sounds/game/metal0.mp3' },
                { key: 'metal1', url: './sounds/game/metal1.mp3' },
                { key: 'metal2', url: './sounds/game/metal2.mp3' },
                { key: 'metal3', url: './sounds/game/metal3.mp3' },
                { key: 'menu', url: './sounds/game/music.mp3' },
                { key: 'music', url: './sounds/music/heliattack.mp3' },
                { key: 'pistol', url: './sounds/game/pistol.mp3' },
                { key: 'railgun', url: './sounds/game/railgun.mp3' },
                { key: 'rocketlauncher', url: './sounds/game/rocketlauncher.mp3' },
                { key: 'shotgun', url: './sounds/game/shotgun.mp3' },
                { key: 'shotgunrockets', url: './sounds/game/shotgunrockets.mp3' },
                { key: 'bigboom', url: './sounds/game/bigboom.mp3' },
                { key: 'boom', url: './sounds/game/boom.mp3' },
                { key: 'announcerAbomb', url: './sounds/announcer/abomb.mp3' },
                { key: 'announcerFiremines', url: './sounds/announcer/firemines.mp3' },
                { key: 'announcerFlamethrower', url: './sounds/announcer/flamethrower.mp3' },
                { key: 'announcerGrapplecannon', url: './sounds/announcer/grapplecannon.mp3' },
                { key: 'announcerGrenadelauncher', url: './sounds/announcer/grenadelauncher.mp3' },
                { key: 'announcerHealth', url: './sounds/announcer/health.mp3' },
                { key: 'announcerInvulnerability', url: './sounds/announcer/invulnerability.mp3' },
                { key: 'announcerJetpack', url: './sounds/announcer/jetpack.mp3' },
                { key: 'announcerMac10', url: './sounds/announcer/mac10.mp3' },
                { key: 'announcerPredatormode', url: './sounds/announcer/predatormode.mp3' },
                { key: 'announcerRailgun', url: './sounds/announcer/railgun.mp3' },
                { key: 'announcerRocketlauncher', url: './sounds/announcer/rocketlauncher.mp3' },
                { key: 'announcerRpg', url: './sounds/announcer/rpg.mp3' },
                { key: 'announcerSeekerlauncher', url: './sounds/announcer/seekerlauncher.mp3' },
                { key: 'announcerShotgun', url: './sounds/announcer/shotgun.mp3' },
                { key: 'announcerShotgunrockets', url: './sounds/announcer/shotgunrockets.mp3' },
                { key: 'announcerTimerift', url: './sounds/announcer/timerift.mp3' },
                { key: 'announcerTridamage', url: './sounds/announcer/tridamage.mp3' },
                { key: 'scc', url: './sounds/scc.mp3' }
            ])
        }

        if (!this.gltfPreload) {
            const loader = new GLTFLoader();
            this.gltfPreload = new Promise<any>((resolve, reject) => {
                loader.load(
                    './images/ui/menu/logo.glb',
                    (gltf) => {
                        this.gltf = gltf;
                        resolve(gltf);
                    },
                    (xhr) => {
                        // console.log((xhr.loaded / xhr.total) * 100 + '% loaded'); // Progress feedback
                    },
                    (error) => {
                        reject('An error occurred: ' + error);
                    }
                );
            });
        }

        if (!this.texturePreload) {
            this.texturePreload = loadAssets(this.weapons).then((textures) => {
                this.textures = textures;
            }).catch(error => console.error('Error loading assets:', error));
        }

        return Promise.all([this.audioPreload, this.texturePreload, this.gltfPreload]);
    }

    init() {
        this.audioManager.timeScale = 1.0;
        this.audioManager.currentTime = 0.0;
        this.audioManager.playLoop('flame', 0.0, 0, false);
        this.audioManager.playLoop('helicopter', 0.0, 0, false);

        this.game.init(this.textures, this.weapons);

        this.vhsPass.uniforms.enabled.value = 0.1;
        this.vhsPass.uniforms.frameWarp.value = 0.0;
        this.vhsPass.uniforms.animatedColorShift.value = 0.001;
        this.vhsPass.uniforms.largeLineAberration.value = 0.2;
    }

    start() {
        if (!this.textures) {
            throw new Error("Started when not loaded.")
            return;
        }

        this.hideMainMenu();

        const oldGame = this.game;

        this.destroy();

        if (oldGame) {
            oldGame.destroy();
            this.game = new Game(oldGame);
            this.init();
        }

        this.audioManager.currentTime = 0;
        this.game.restart();

        this.vhsPass.uniforms.enabled.value = 0.0;
        this.vhsPass.uniforms.frameWarp.value = 0.7;
    }

    initVideoGestures(videoGestures) {
        this.videoGestures = videoGestures;
        if (this.game) {
            this.game.initVideoGestures(videoGestures);
        }
    }

    setSize(width: number, height: number) {
        this.game?.resizeBackground();

        if (this.showMenu) {
            this.resizeMenu();
        }
    }

    get(shape) {
        if (!this.gltf) {
            return null;
        }

        for (const child of this.gltf.scene.children) {
            if (child.name === shape) {
                return child;
            }
        }
        return null;
    }

    render() {
        if (this.videoGestures?.restart && this.game.player?.dead) {
            this.videoGestures.restart = false;
            this.start();
        }

        if (this.showMenu) {
            if (this.gltf) {
                this.game.clock.getDelta()
                const cube = this.get('Cube');
                cube.rotation.x = 0.05 + Math.sin(this.game.clock.elapsedTime * 0.5) * 0.05;
                cube.rotation.y = Math.cos(this.game.clock.elapsedTime * 0.5) * 0.1;

                const ha = this.get('HA');
                ha.rotation.x = cube.rotation.x;
                ha.rotation.y = cube.rotation.y;

                const heli1 = this.get('Heli1');
                heli1.position.y = -0.6 + Math.sin(this.game.clock.elapsedTime * 0.25) * 0.075;

                const heli2 = this.get('Heli2');
                heli2.position.y = -0.5 + Math.sin(this.game.clock.elapsedTime * 0.35) * 0.1;


                this.gltf.scene.rotation.y = Math.sin(this.game.clock.elapsedTime) * 0.05;

                this.lightHelper?.update();
            }
            this.vhsPass.material.uniforms.time.value = this.game.clock.elapsedTime * 0.33;
            return true;
        }

        if (!this.playing && !this.game.player?.dead) {
            return false;
        }

        return this.game?.update();
    }

    destroy() {
        this.audioManager.stopLoop('flame');
        this.audioManager.stopLoop('helicopter');
        this.game?.destroy();
    }

    playSong(song) {

        if (isUrl(song)) {
            console.error('download url');
            createIframe(song);
            return;
        }
        this.audioManager.preload([
            { key: 'ror', url: `./sounds/music/${song}.mp3` },
        ]).then(() => {
            this.game.musicTrack = song;
            // this.audioManager.crossFadeMusic(song, 0.9);
            this.audioManager.playMusic(song, 0.9, this.audioManager.currentTime);
        });

    }

    set currentTime(value) {
        this.audioManager.currentTime = value * this.audioManager.totalTime;
    }

    set shooting(value) {
        this.game?.shooting();
    }

    pred() {
        this.game?.pred();
    }

    heli() {
        this.game?.heliDestroyed();
    }

    play() {
        this.game?.play();
    }

    pause() {
        this.game?.pause();
    }

    suicide() {
        this.game?.suicide();
    }

    weaponSwitch() {
        this.game?.weaponSwitch();
    }

    lastWeapon() {
        this.game?.lastWeapon();
    }

    private showMenu: boolean = false;
    private addedLight: boolean = false;
    private lightHelper;
    showMainMenu() {
        if (this.showMenu) {
            return;
        }

        const scene = this.gltf.scene

        this.scene.add(scene);

        if (!this.addedLight) {
            this.addedLight = true;

            for (const child of this.gltf.scene.children) {
                child.castShadow = true;
            }

            const cube = this.get('Cube');
            cube.receiveShadow = true;

            const ha = this.get('HA');
            ha.receiveShadow = true;

            const ambientLight = new AmbientLight(0xffffff, 0.5);

            this.gltf.scene.add(ambientLight);

            const spotLight = new SpotLight(0xffffff, 10);

            const pos = new Vector3();
            cube.getWorldPosition(pos); // Get the global position of the object

            spotLight.position.set(
                pos.x,
                pos.y + 2,
                pos.z + 8,
            );

            spotLight.castShadow = true;

            spotLight.shadow.mapSize.width = 1024;
            spotLight.shadow.mapSize.height = 1024;

            spotLight.shadow.bias = -0.0005; // Small negative value to reduce shadow acne

            spotLight.angle = 1;
            spotLight.penumbra = 1;
            spotLight.decay = 0.1;
            spotLight.distance = 10;

            spotLight.target = scene.children[0];

            this.gltf.scene.add(spotLight);

            // this.lightHelper = new SpotLightHelper( spotLight );
            // this.scene.add(this.lightHelper);

            for (const id of ['Heli1', 'Heli2']) {
                const heli = this.get(id);

                const oldMaterial = heli.material;

                heli.material = new MeshBasicMaterial({
                    color: oldMaterial.color, // Preserve the base color
                    map: oldMaterial.map, // Copy the texture map
                    alphaMap: oldMaterial.alphaMap, // Copy alpha map, if any
                    envMap: oldMaterial.envMap, // Copy environment map, if any
                    transparent: oldMaterial.transparent, // Preserve transparency
                    side: oldMaterial.side,
                    alphaTest: 0.5,
                });
            }
        }

        this.showMenu = true;

        this.scene.position.x = -0.2

        this.resizeMenu();

        this.vhsPass.uniforms.enabled.value = 1.0;
    }

    resizeMenu() {
        let targetZ = 8;
        let targetY = -2;

        const referenceAspect = 1;
        if (this.camera.aspect < referenceAspect) {
            const scale = referenceAspect / this.camera.aspect;

            targetZ = targetZ * scale;
            targetY = targetY * scale;
        }

        this.camera.position.set(0, targetY, targetZ);
    }

    hideMainMenu() {
        if (!this.showMenu) {
            return;
        }

        this.scene.remove(this.gltf.scene);

        this.showMenu = false;
    }
}

export default HeliAttack;