import { BufferGeometry, Color, ColorManagement, DirectionalLight, Line, LineBasicMaterial, PerspectiveCamera, Scene, ShaderMaterial, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import AudioManager from './audiomanager.ts';
import VideoGestures from './videogestures.ts';
import WordListener from './wordlistener.ts';
import HeliAttack from './heliattack.ts';
import TouchInputHandler from './touchinputhandler.ts';
import { sayMessage } from './utils.ts';

import SmoothScrollHandler from './smoothscrollhandler.ts';

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

camera.position.set(0, 0, 300);
camera.lookAt(0, 0, 0);

ColorManagement.enabled = true;

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;
renderer.outputColorSpace = SRGBColorSpace;

// Set up EffectComposer
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);

// Add a render pass (renders the scene as usual)
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Add the inversion shader pass
const shaderPass = new ShaderPass(new ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },              // Rendered texture
        invertEnabled: { value: 0.0 },         // Toggle inversion (0 = off, 1 = on)
        tintEnabled: { value: 0.0 },           // Toggle tinting (0 = off, 1 = on)
        tintColor: { value: new Color(1, 0.5, 0.5) }, // Red tint
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float invertEnabled;
        uniform float tintEnabled;
        uniform vec3 tintColor;
        varying vec2 vUv;

        // Function to convert linear color to gamma (sRGB) space
        vec3 linearToGamma(vec3 linearColor) {
            return pow(linearColor, vec3(1.0 / 2.2));
        }

        void main() {
            vec4 texColor = texture2D(tDiffuse, vUv);

            // Invert color
            vec3 invertedColor = 1.0 - texColor.rgb;

            // Mix original and inverted based on invertEnabled
            vec3 color = mix(texColor.rgb, invertedColor, invertEnabled);

            // Apply tint
            color = mix(color, color * tintColor, tintEnabled);

            // Re-encode to gamma (sRGB) space for correct display
            vec3 gammaCorrectedColor = linearToGamma(color);

            gl_FragColor = vec4(gammaCorrectedColor, texColor.a);
        }
    `,
}));
composer.addPass(shaderPass);

document.getElementById('game').appendChild(renderer.domElement);

const dirLight = new DirectionalLight( 0xffffff, 0.4 );
dirLight.position.set( 0, 0, 1 ).normalize();
scene.add( dirLight );

function createBlueLine(x, y, object) {
    //create a blue LineBasicMaterial
    const material2 = new LineBasicMaterial( { color: 0x0000ff } );

    const points = [];
    points.push( new Vector3( x - 10, y - 10, -0 ) );
    points.push( new Vector3( x, y, -0 ) );
    points.push( new Vector3( x + 10, y - 10, -0 ) );

    const geometry2 = new BufferGeometry().setFromPoints( points );
    const line = new Line( geometry2, material2 );
    object.add(line);
}
let heliattack;
function render() {
    heliattack?.render();

	// renderer.render(scene, camera);
    composer.render();
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);

    videoGestures?.setSize(width, height);

    heliattack?.setSize(width, height)
}

const mouse = {
    x: 0,
    y: 0,
    down: false,
    wheel: 0,
}


function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown(event){
    init();
    //manageRaycasterIntersections(scene, camera, mouse);
    mouse.down = true;
}

const BPM = 200;

const smoothScrollHandler = new SmoothScrollHandler(document.body, BPM * 4)
//smoothScrollHandler.on
smoothScrollHandler.onScroll((direction: 'up' | 'down') => {
    mouse.wheel = 1 * (direction === "up" ? 1 : -1);
})

function onMouseUp(event){
    if (event.button === 0) {
        mouse.down = false;
    } else if (event.button === 1) {
        mouse.wheel = 1;
    } else if (event.button === 2) {
        mouse.down = true;
    }
}

let lastWheelMove = 0;

function onMouseWheel(event){
    if (event.deltaY < 0) {
        if (lastWheelMove == 1) {
            return;
        }
        mouse.wheel = 1;
    } else if (event.deltaY > 0) {
        if (lastWheelMove == 1) {
            return;
        }
        mouse.wheel = -1;
    }
    lastWheelMove = mouse.wheel;
};

const touchInputHandler = new TouchInputHandler(document);

touchInputHandler.onStart((event) => {
    init();

    const touch = event.touches[0];
    if (!touch) {
        console.error("no touches while in on start.");
        return;
    }

    mouse.down = true;
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
});

touchInputHandler.onEnd((event) => {
    if (!event.touches.length) {
        mouse.down = false;
    }
})

touchInputHandler.onMove((event) => {
    const touch = event.touches[0];
    if (!touch) {
        console.error("no touches while in on start.");
        return;
    }

    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
})

const ENABLE_DEBUGGER = false;
function debug() {
    if (ENABLE_DEBUGGER) {
        debugger;
    }
}

const ENABLE_VIDEO_GESTURES = false;

let videoGestures = ENABLE_VIDEO_GESTURES ? new VideoGestures(window, document) : null;
if (videoGestures) {
    videoGestures.setSize(window.innerWidth, window.innerHeight);
}
function getAvatar() {
    // TODO: Write Avatar Creator.

    const kit = new Kit();
    kit.pulse()
    // WARNING: For POST requests, body is set to null by browsers.
    var data = '{\r\n    \"launcherJwt\": {{JWT}}\r\n}';

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener('readystatechange', function() {
    if(this.readyState === 4) {
        console.log(this.responseText);
    }
    });

    xhr.open('POST', 'https://api.basement.fun/launcher/');
    xhr.setRequestHeader('X-Service-Method', 'channelStatus');

    xhr.send(data);
}

const k = new WordListener('k');
k.onWordDetected((word) => {
    heliattack.suicide();
});

let showErrors = false;
const history = [];
const i = new WordListener('i');
i.onWordDetected((word) => {
    showErrors = !showErrors;
    
    setVisible(document.getElementById('error-container'), showErrors);

    showCheat("errors");
});

let showWebcam = false;
const o = new WordListener('o');
o.onWordDetected((word) => {
    showWebcam = !showWebcam;
    
    setVisible(document.getElementById('webcam'), showWebcam);

    showCheat("webcam");

    console.error('show video for next bar');
});

function toggleMusic() {
    audioManager.musicVolume = (audioManager.musicVolume === 0.0 ? settings.musicVolume : 0.0);
}

function toggleEffects() {
    audioManager.effectVolume = (audioManager.effectVolume === 0.0 ? settings.effectVolume : 0.0);
}

const m = new WordListener('m');
m.onWordDetected((word) => {
    toggleMusic();

    showCheat(audioManager.musicVolume === 0.0 ? "music off" : "music on");
});

const n = new WordListener('n');
n.onWordDetected((word) => {
    toggleEffects();

    showCheat(audioManager.effectVolume === 0.0 ? "sound off" : "sound on");
});


const io = new WordListener('io');
io.onWordDetected((word) => {
    history.splice(0, history.length);

    if (!videoGestures) {
        videoGestures = new VideoGestures(window, document);
        videoGestures.setSize(window.innerWidth, window.innerHeight);
    }
    if (heliattack?.isLoaded()) {
        heliattack.initVideoGestures(videoGestures);
    }

    showCheat("enable gestures");
});

const retro = new WordListener('retro');
retro.onWordDetected((word) => {
    history.splice(0, history.length);
    
    heliattack.restart();
    heliattack.start();
    console.error("could not load heli attack 1 assets.")
    setVisible(document.getElementById('error-container'), showErrors);

    showCheat("retro assets")
});

const xylander = new WordListener('xylander');
xylander.onWordDetected((word) => {
    debugger;
    history.splice(0, history.length);

    if (heliattack) {
        heliattack.playSong('https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2FAudioInterface%2Fforgotten-futures-8-december-2024%2F');
    }

    showCheat("go outside and breathe the fumes");
});

const kit = new WordListener('kit');
kit.onWordDetected((word) => {
    history.splice(0, history.length);

    if (heliattack) {
        heliattack.playSong('ror');
    }

    showCheat("remnants of rebellion");
});

const pred = new WordListener('pred');
pred.onWordDetected((word) => {
    history.splice(0, history.length);

    heliattack.pred();

    showCheat("gl hf dd")
});

function showCheat(text) {
    document.getElementById('error-container').innerHTML += `<br>${text}`;

    setMessage(text);
}

let playing = true;

// Key handling
const keyIsPressed = {
    'ArrowLeft': false,
    'ArrowRight': false,
    'ArrowUp': false,
    'ArrowDown': false,
    'Control': false,
    'Shift': false,
    'Space': false,
};

window.addEventListener('resize', onWindowResize);

document.addEventListener('mousemove', onDocumentMouseMove, false);
window.addEventListener('resize', onWindowResize, false);
document.addEventListener('mousedown', onMouseDown, false);
document.addEventListener('mouseup', onMouseUp, false);

function setPlaying(value) {
    if (!value) {
        audioManager.pause();
        heliattack.pause();
        playing = false;
        setMenuVisible(true);
        document.getElementById('ui')?.removeAttribute('playing');
    } else {
        playing = true
        if (heliattack) {
            heliattack.play();
        }
        audioManager.play();
        setMenuVisible(false);
        
        document.getElementById('ui')?.setAttribute('playing', 'true');
    }
}

const TOUCH_CONTROLS = false;
let inGame = false;

if (TOUCH_CONTROLS) {
    window.addEventListener("wheel", e => e.preventDefault(), { passive:false })
} else {
    window.addEventListener('wheel', onMouseWheel, false);
}
window.addEventListener('keydown', (e) => {
    keyIsPressed[e.key] = true;
    history.push(e.key);
    if (e.key.length == 1) {
        k.listen(e.key);
        i.listen(e.key);
        o.listen(e.key);
        m.listen(e.key);
        n.listen(e.key);
    }
    xylander.listen(history.join(''));
    pred.listen(history.join(''));
    retro.listen(history.join(''));
    io.listen(history.join(''));
    kit.listen(history.join(''));
    if (e.key >= '0' && e.key <= '9') {
        heliattack.currentTime = (e.key.charCodeAt(0) - '0'.charCodeAt(0)) / 10
    }
    if (e.key == "Escape") {
        if (heliattack.playing) {
            setPlaying(!playing);
        }
    }
});
window.addEventListener('keyup', (e) => { keyIsPressed[e.key] = false; });

let wasPlaying = false;
window.addEventListener('blur', () => {
    if (playing) {
        wasPlaying = true;
    }
    for (const key in keyIsPressed) {
        keyIsPressed[key] = false;
    }
    mouse.down = false;
    audioManager.pause();
    if (heliattack) {
        heliattack.pause();
    }
    playing = false
});
window.addEventListener('focus', () => {
    if (wasPlaying) {
        playing = true
        if (heliattack) {
            heliattack.play();
        }
        audioManager.play();
    }
});

document.getElementById('music-enable')?.addEventListener('touch', event => {
    toggleMusic();
});

document.getElementById('music-enable')?.addEventListener('click', event => {
    toggleMusic();
});

document.getElementById('effects-enable')?.addEventListener('touch', event => {
    toggleEffects();
});

document.getElementById('effects-enable')?.addEventListener('click', event => {
    toggleEffects();
});

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    mouse.down = true;
});


if (WebGL.isWebGL2Available()) {
    renderer.setAnimationLoop(render);
} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('error-container').appendChild(warning);
}

const audioManager = new AudioManager();

const settings = {
    set menu(value) {
        setMenuVisible(value);
    },
    set over(value) {
        setMenuVisible(value);
        setVisible(mainMenu, value);
        heliattack.playing = !value;
        document.getElementById('ui')?.removeAttribute('playing');
    },
    update() {
        if (videoGestures) {
            videoGestures.update();
        }
        if (smoothScrollHandler) {
            smoothScrollHandler.update()
        }
    },
    set musicVolume(value) {
        audioManager.musicVolume = value;
        // TODO(Store in localstorage)
    },
    get musicVolume() {
        return 0.8;
    },
    set effectVolume(value) {
        audioManager.effectVolume = value;
        // TODO(Store in localstorage)
    },
    get effectVolume() {
        return 0.8;
    },
    get bpm() {
        return 200;
    }
}

// settings.musicVolume = 0.0;

let initialized = false;

const menu = document.getElementById('menu');
const mainMenu = document.getElementById('main-menu');

setVisible(menu, true);

async function init() {
    if (initialized) {
        return;
    }
    initialized = true;
    audioManager.init();
    audioManager.masterVolume = 0.2;
    
    setVisible(menu, true);

    setMessage('Loading...');

    createMainMenu();
    createHeliAttack();

    setMenuVisible(true);

    await scc();
}

async function scc() {
    await audioManager.preload([
        { key: 'scc', url: './sounds/scc.mp3'},
    ]).then(() => {
        audioManager.playEffect('scc');
        setMessage("kit");
    });
}

function loaded() {
    setMessage('');

    setVisible(mainMenu, true);
}

function started() {
    setMessage('');

    setMenuVisible(false);
    setVisible(mainMenu, false);

    setPlaying(true);
}

function setMenuVisible(value) {
    setVisible(menu, value);
}

function createMainMenu() {
    const startButton = document.getElementById('start-game');

    startButton.addEventListener('click', () => {
        if (heliattack.isLoaded()) {
            heliattack.start();
        }
    });

    startButton.addEventListener('touchstart', () => {
        if (heliattack.isLoaded()) {
            heliattack.start();
        }
    });

    if (playing) {
        if (heliattack && heliattack.isLoaded()) {
            heliattack.start();
        }
    }
}

function createHeliAttack() {
    if (heliattack) {
        heliattack.destroy();
    }


    heliattack = new HeliAttack(window, mouse, keyIsPressed, scene, camera, shaderPass, audioManager, settings);
    heliattack.init(loaded, started);
    if (videoGestures) {
        heliattack.initVideoGestures(videoGestures);
    }
}

function setVisible(element, visible) {
    element.hidden = !visible;
}

setMessage('Tap to continue');

function setMessage(text) {
    const message = document.getElementById('message');
    setVisible(message, text);
    message.innerHTML = text;

    if (showErrors) {
        sayMessage(text);
    }
}

setMenuVisible(true);