
import AudioManager from '../audiomanager.js';
import Weapon from '../weapon.ts';
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
} from '../weapons';
import Game from '../game';
import { createIframe, isUrl, loadTexture } from '../utils'
import VideoGestures from '../videogestures.ts';

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

class Credits {
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
    private settings: {
        over: boolean;
        update: Function;
    }
    private textures: { [key: string]: Texture };
    private videoGestures: VideoGestures;

    public playing: boolean;

    private gltf: any;
    private audioPreload: Promise<any>;
    private gltfPreload: Promise<any>;
    private texturePreload: Promise<any>;

    constructor(window: Window, mouse: Object, joystick: Object, keyIsPressed: { [key: string]: boolean }, private scene: Scene, private camera: Camera, shaderPass: ShaderPass, private vhsPass: ShaderPass, private audioManager: AudioManager, private settings: ISettings) {
        this.game = new Game(window, mouse, joystick, keyIsPressed, scene, camera, shaderPass, vhsPass, this.textures, audioManager, this.weapons);
    }

    overFunction(value: boolean) {
        this.settings.over = value;
    }
    
    updateFunction() {
        this.settings.update();
    }

    async preload(): Promise<any> {
        this.playSong('ror');

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
            { key: `${song}`, url: `./sounds/music/${song}.mp3` },
        ]).then(() => {
            this.game.musicTrack = song;
            // this.audioManager.crossFadeMusic(song, 0.9);
            this.audioManager.playMusic(song, 0.9, this.audioManager.currentTime);
        });

    }

    set currentTime(value) {
        this.audioManager.currentTime = value * this.audioManager.totalTime;
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
}

export default Credits;