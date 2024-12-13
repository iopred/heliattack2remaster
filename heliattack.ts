
import AudioManager from './audiomanager.js';
import Weapon from './weapon.ts';
import { Scene, TextureLoader, Vector2, Camera } from 'three';
import { loadTexture } from './utils';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {
    abombDestroy,
    abombUpdate,
    defaultBulletUpdate,
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
import { createIframe, isUrl } from './utils'

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

    constructor(window: Window, mouse: Object, keyIsPressed: Object, scene: Scene, camera: Camera, shaderPass: ShaderPass, audioManager: AudioManager, settings: Object) {
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
            { key: 'boom', url: './sounds/game/boom.wav' },
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
        ]).then(() => {
            if (!this.audioPreloaded) {
                this.initGame();
                this.audioPreloaded = true;
            }
            this.isLoaded();
        });
    }

    initGame() {
        this.audioManager.playMusic('menu', 0.8);
        this.audioManager.playLoop('flame', 0.0, 0, false);
        this.audioManager.playLoop('helicopter', 0.0, 0, false);
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
            this.initGame();
        }
    }

    destroy() {
        this.audioManager.stopLoop('flame');
        this.audioManager.stopLoop('helicopter');
        const oldVolume = this.audioManager.masterVolume;
        this.audioManager.masterVolume = 0;
        this.game?.destroy();
        this.audioManager.masterVolume = oldVolume;
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
            this.audioManager.crossFadeMusic(song, 0.9);
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

    rail() {
        this.game?.rail();
    }

    lastWeapon() {
        this.game?.lastWeapon();
    }
}

export default HeliAttack;