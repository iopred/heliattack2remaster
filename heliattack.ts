
import AudioManager from './audiomanager.js';
import Weapon from './weapon.ts';
import { Scene, Texture, TextureLoader, Vector2, Vector3, Camera, SpotLight, SpotLightHelper, MeshBasicMaterial } from 'three';
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
import { createIframe, isUrl, loadTexture} from './utils'
import VideoGestures from './videogestures.ts';

async function loadAssets(weapons) {
    const textureMap: {[key: string]: Texture} = {};
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
        new Weapon("Akimbo Mac 10's", './images/weapons/mac10s.png', 'announcerMac10', 'pistol', new Vector2(-2, 21), new Vector2(28, -8.5), 4, 8, 9, 50).setSpread(8).setBullets(2, 0, 8),
        new Weapon("Shotgun", './images/weapons/shotgun.png', 'announcerShotgun', 'shotgun', new Vector2(5, 12), new Vector2(30, -7), 25, 8, 15, 14).setBullets(5, 5, 0),
        new Weapon("Shotgun Rockets", './images/weapons/shotgunrockets.png', 'announcerShotgunrockets', 'shotgunrockets', new Vector2(7, 19), new Vector2(34, -8), 40, 7, 40, 8, './images/shotgunrocketbullet.png').setBullets(3, 10, 0).setUpdate(shotgunRocketUpdate).setDestroy(shotgunRocketDestroy),
        new Weapon("Grenade Launcher", './images/weapons/grenadelauncher.png', 'announcerGrenadelauncher', 'grenade', new Vector2(13, 18), new Vector2(29, -7), 30, 25, 75, 12, './images/grenade.png').setUpdate(grenadeUpdate).setDestroy(explosionDestroy),
        new Weapon("RPG", './images/weapons/rpg.png', 'announcerRpg', 'grenade', new Vector2(18, 20), new Vector2(32, -7), 40, 4, 75, 10, './images/rpgbullet.png').setUpdate(rpgUpdate).setDestroy(explosionDestroy),
        new Weapon("Rocket Launcher", './images/weapons/rocketlauncher.png', 'announcerRocketlauncher', 'rocketlauncher', new Vector2(19, 23), new Vector2(25, -9.5), 50, 7, 100, 8, './images/rocketbullet.png').setUpdate(rocketUpdate).setDestroy(explosionDestroy),
        new Weapon("Seeker Launcher", './images/weapons/seekerlauncher.png', 'announcerSeekerlauncher', 'rocketlauncher', new Vector2(24, 28), new Vector2(24, -9.5), 55, 7, 100, 6, './images/seekerbullet.png').setUpdate(seekerUpdate).setDestroy(explosionDestroy),
        new Weapon("Flame Thrower", './images/weapons/flamethrower.png', 'announcerFlamethrower', null, new Vector2(9, 16), new Vector2(29, -7), 1, 9, 5, 150, './images/flame.png').setSpread(10).setUpdate(flameUpdate),
        new Weapon("Fire Mines", './images/weapons/mine.png', 'announcerFiremines', null, new Vector2(-9, 15), new Vector2(20, -5.5), 100, 3, 4, 3, './images/minebullet.png').setUpdate(fireMinesUpdate),
        new Weapon("A-Bomb Launcher", './images/weapons/abomb.png', 'announcerAbomb', 'rocketlauncher', new Vector2(22, 30), new Vector2(36, -13), 150, 3, 300, 3, './images/abombbullet.png').setUpdate(abombUpdate).setDestroy(abombDestroy),
        new Weapon("Railgun", './images/weapons/railgun.png', 'announcerRailgun', 'railgun', new Vector2(23, 27), new Vector2(32, -8), 75, 20, 150, 4, './images/rail.png').setUpdate(railUpdate),
        new Weapon("Grapple Cannon", './images/weapons/grapplecannon.png', 'announcerGrapplecannon', 'grapple', new Vector2(18, 23), new Vector2(33, -11), 250, 20, 300, 2, './images/grapplebullet.png').setUpdate(grappleUpdate),
        new Weapon("Shoulder Cannon", null, null, 'railgun', new Vector2(0, 0), new Vector2(16, 0), 100, 20, 300, 0, './images/shouldercannon.png').setUpdate(railUpdate),
    ];
    private game: Game;
    private textures: {[key: string]: Texture};
    private videoGestures: VideoGestures;

    public playing: boolean;

    private gltf:any;
    private audioPreload: Promise<any>;
    private gltfPreload: Promise<any>;
    private texturePreload: Promise<any>;

    constructor(window: Window, mouse: Object, joystick: Object, keyIsPressed: {[key: string]: boolean}, private scene: Scene, private camera: Camera, shaderPass: ShaderPass, vhsPass: ShaderPass, private audioManager: AudioManager, private settings: Object) {
        this.game = new Game(window, mouse, joystick, keyIsPressed, scene, camera, shaderPass, vhsPass, this.textures, audioManager, this.weapons, (value) => { this.settings.over = value; }, () => { this.settings.update() });
    }

    async preload():Promise<any> {
        if (!this.audioPreload) {
            this.audioPreload =  this.audioManager.preload([
                { key: 'boom', url: './sounds/game/boom.wav' },
                { key: 'empty', url: './sounds/game/empty.wav' },
                { key: 'flame', url: './sounds/game/flame.wav' },
                { key: 'grapple', url: './sounds/game/grapple.wav' },
                { key: 'grenade', url: './sounds/game/grenade.wav' },
                { key: 'helicopter', url: './sounds/game/helicopter.wav' },
                { key: 'helidestroyed', url: './sounds/game/helidestroyed.wav' },
                { key: 'hurt', url: './sounds/game/hurt.wav' },
                { key: 'hyperjump', url: './sounds/game/hyperjump.wav' },
                { key: 'metal0', url: './sounds/game/metal0.wav' },
                { key: 'metal1', url: './sounds/game/metal1.wav' },
                { key: 'metal2', url: './sounds/game/metal2.wav' },
                { key: 'metal3', url: './sounds/game/metal3.wav' },
                { key: 'menu', url: './sounds/game/music.wav' },
                { key: 'music', url: './sounds/music/heliattack.mp3' },
                { key: 'pistol', url: './sounds/game/pistol.wav' },
                { key: 'railgun', url: './sounds/game/railgun.wav' },
                { key: 'rocketlauncher', url: './sounds/game/rocketlauncher.wav' },
                { key: 'shotgun', url: './sounds/game/shotgun.wav' },
                { key: 'shotgunrockets', url: './sounds/game/shotgunrockets.wav' },
                { key: 'bigboom', url: './sounds/game/bigboom.wav' },
                { key: 'boom', url: './sounds/game/boom.wav' },
                { key: 'announcerAbomb', url: './sounds/announcer/abomb.wav' },
                { key: 'announcerFiremines', url: './sounds/announcer/firemines.wav' },
                { key: 'announcerFlamethrower', url: './sounds/announcer/flamethrower.wav' },
                { key: 'announcerGrapplecannon', url: './sounds/announcer/grapplecannon.wav' },
                { key: 'announcerGrenadelauncher', url: './sounds/announcer/grenadelauncher.wav' },
                { key: 'announcerHealth', url: './sounds/announcer/health.wav' },
                { key: 'announcerInvulnerability', url: './sounds/announcer/invulnerability.wav' },
                { key: 'announcerJetpack', url: './sounds/announcer/jetpack.wav' },
                { key: 'announcerMac10', url: './sounds/announcer/mac10.wav' },
                { key: 'announcerPredatormode', url: './sounds/announcer/predatormode.wav' },
                { key: 'announcerRailgun', url: './sounds/announcer/railgun.wav' },
                { key: 'announcerRocketlauncher', url: './sounds/announcer/rocketlauncher.wav' },
                { key: 'announcerRpg', url: './sounds/announcer/rpg.wav' },
                { key: 'announcerSeekerlauncher', url: './sounds/announcer/seekerlauncher.wav' },
                { key: 'announcerShotgun', url: './sounds/announcer/shotgun.wav' },
                { key: 'announcerShotgunrockets', url: './sounds/announcer/shotgunrockets.wav' },
                { key: 'announcerTimerift', url: './sounds/announcer/timerift.wav' },
                { key: 'announcerTridamage', url: './sounds/announcer/tridamage.wav' },
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
            this.game = new Game(oldGame);
            this.init();
        }

        this.audioManager.currentTime = 0;
        this.game.restart();
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

        if (this.showMenu) {
            if (this.gltf) {
                this.game.clock.getDelta()
                const cube = this.get('Cube');
                cube.rotation.x = Math.sin(this.game.clock.elapsedTime * 0.5) * 0.1;
                cube.rotation.y = Math.cos(this.game.clock.elapsedTime * 0.5) * 0.2;

                const plane = this.get('Plane');
                plane.position.z = 0.5;

                plane.position.y = 1.5 + Math.sin(this.game.clock.elapsedTime * 0.25) * 0.1;

                this.gltf.scene.rotation.y = Math.sin(this.game.clock.elapsedTime) * 0.05;

                this.lightHelper?.update();
            }
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

    private showMenu:boolean = false;
    private addedLight:boolean = false;
    private lightHelper;
    showMainMenu() {
        const scene = this.gltf.scene
        
        this.scene.add(scene);

        if (!this.addedLight) {
            this.addedLight = true;

            for (const child of this.gltf.scene.children) {
                child.castShadow = true;
                // child.receiveShadow = true;
            }

            const cube = this.get('Cube');
            cube.receiveShadow = true;

            // var ambientLight = new AmbientLight( 0xFFFFFF, 0.1 );
            // scene.add( ambientLight );

            const spotLight = new SpotLight( 0xffffff, 10);

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

            this.scene.add(spotLight);

            this.lightHelper = new SpotLightHelper( spotLight );
            // this.scene.add(this.lightHelper);

            const plane = this.get('Plane');

            const oldMaterial = plane.material;

            plane.material = new MeshBasicMaterial({
                color: oldMaterial.color, // Preserve the base color
                map: oldMaterial.map, // Copy the texture map
                alphaMap: oldMaterial.alphaMap, // Copy alpha map, if any
                envMap: oldMaterial.envMap, // Copy environment map, if any
                transparent: oldMaterial.transparent, // Preserve transparency
                side: oldMaterial.side,
                alphaTest: 0.5,
            });
        }

        this.camera.position.set(0, -2, 8);

        this.showMenu = true;

        this.audioManager.playMusic('menu', 0.4);

        window.a = this;
    }

    hideMainMenu() {
        this.scene.remove(this.gltf.scene);
        
        this.showMenu = false;
    }
}

export default HeliAttack;