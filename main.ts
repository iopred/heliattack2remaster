import { BufferGeometry, Color, ColorManagement, DirectionalLight, Line, LineBasicMaterial, PerspectiveCamera, Scene, ShaderMaterial, SRGBColorSpace, UniformsUtils, Vector3, WebGLRenderer } from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import AudioManager from './audiomanager';
import VideoGestures from './videogestures';
import WordListener from './wordlistener';
import HeliAttack from './heliattack';
import TouchInputHandler from './touchinputhandler';
import { sayMessage, setMessage, setVisible, timeout } from './utils';
import SquareCircleCo from './scc/squarecircleco';

import SmoothScrollHandler from './smoothscrollhandler';

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


// VHS Shader
const VHSEffectShader = {
    uniforms: {
        tDiffuse: { value: null }, // The texture from the previous render
        time: { value: 0.0 }, // Time for animation effects
        distortion: { value: 0.1 }, // Amount of CRT bulge
        scanlineIntensity: { value: 0.3 }, // Intensity of scanlines
        scanlineCount: { value: 800.0 }, // Number of scanlines
        colorShift: { value: 0.2 }, // Amount of RGB color shift
        enabled: { value: 0.0 }, // Enable or disable the effect
        largeLineAberration: { value: true }, // Toggle large VHS line aberration
        aberrationProgress: { value: 0.0 }, // Progress of the VHS line warp
        animatedColorShift: { value: 0.01 }, // Animatable color shift amount
        verticalOffset: { value: 0.001 }, // Vertical offset for VHS wrap effect
    },

    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,

    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float time;
      uniform float distortion;
      uniform float scanlineIntensity;
      uniform float scanlineCount;
      uniform float colorShift;
      uniform float enabled;
      uniform bool largeLineAberration;
      uniform float aberrationProgress;
      uniform float animatedColorShift;
      uniform float verticalOffset;

      varying vec2 vUv;

      // CRT Bulge distortion
      vec2 applyBulge(vec2 uv) {
        vec2 center = vec2(0.5, 0.5);
        vec2 delta = uv - center;
        float dist = length(delta);
        float edgeFactor = smoothstep(0.4, 0.5, dist); // Reduce bulge near the edges
        delta *= 1.0 + distortion * dist * dist * (1.0 - edgeFactor);
        return center + delta;
      }

      // Simulate RGB color shift
      vec4 applyColorShift(sampler2D tex, vec2 uv, float shift) {
        vec2 rUV = uv + vec2(shift, 0.0);
        vec2 gUV = uv;
        vec2 bUV = uv - vec2(shift, 0.0);

        float r = texture2D(tex, rUV).r;
        float g = texture2D(tex, gUV).g;
        float b = texture2D(tex, bUV).b;

        return vec4(r, g, b, 1.0);
      }

      // Add scanlines
      float applyScanlines(vec2 uv, float scanlineCount) {
        float scanline = sin(uv.y * scanlineCount * 3.14159265);
        return 1.0 - scanlineIntensity * (0.5 + 0.5 * scanline);
      }

      // Large VHS line aberration
      float applyLargeLineAberration(vec2 uv) {
        if (!largeLineAberration) return 0.0;
        float linePosition = fract(time);
        float distance = abs(uv.y - 1.0 + linePosition);
        float effect = smoothstep(0.02, 0.0, distance); // Thickness of the line
        return effect * 0.1 * enabled; // Intensity of the warp
      }

      // Simulate animated VHS jitter/noise
      float applyNoise(vec2 uv, float time) {
        return (fract(sin(dot(uv.xy * time, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.2;
      }

        float spikeEffect(float time, float interval) {
            float phase = mod(time, interval) / interval; // Normalize time within the interval
            float spike = step(0.95, sin(phase * 6.283185)); // Spikes at sin() peak
            return spike;
        }

      // Apply vertical offset with wrapping
        vec2 applyVerticalOffset(vec2 uv, float offset) {
            float phase = mod(time, 2.0) / 2.0; // Normalize time within the interval
            float spike = step(0.95, sin(phase * 6.283185)); // Spikes at sin() peak

            uv.y = mod(uv.y + offset * spike, 1.0);
            return uv;
        }




      void main() {
        // If enabled is 0, bypass effect
        if (enabled <= 0.0) {
            gl_FragColor = texture2D(tDiffuse, vUv);
            return;
        }

        // Apply vertical offset
        vec2 offsetUV = applyVerticalOffset(vUv, verticalOffset);

        // Apply CRT bulge
        vec2 distortedUV = applyBulge(offsetUV);

        // Apply animated RGB color shift
        vec4 color = applyColorShift(tDiffuse, distortedUV, animatedColorShift * sin(time * 3.0));

        // Apply scanlines
        float scanline = applyScanlines(offsetUV, scanlineCount);
        color.rgb *= scanline;

        // Apply large VHS line aberration
        float aberration = applyLargeLineAberration(offsetUV);
        color.rgb += aberration;

        // Simulate animated VHS noise
        float noise = applyNoise(offsetUV, time);
        color.rgb += noise;

        // Blend final result with effect strength
        vec4 original = texture2D(tDiffuse, offsetUV);
        gl_FragColor = mix(original, color, enabled);
        }
    `,
};

// Create a ShaderPass for the VHS effect
function createVHSEffectPass(): ShaderPass {
    const shaderPass = new ShaderPass(new ShaderMaterial({
        uniforms: UniformsUtils.clone(VHSEffectShader.uniforms),
        vertexShader: VHSEffectShader.vertexShader,
        fragmentShader: VHSEffectShader.fragmentShader,
    }));

    return shaderPass;
}
const vhsPass = createVHSEffectPass();
composer.addPass(vhsPass);

document.getElementById('game').appendChild(renderer.domElement);

const dirLight = new DirectionalLight(0xffffff, 0.4);
dirLight.position.set(0, 0, 1).normalize();
scene.add(dirLight);

function createBlueLine(x, y, object) {
    //create a blue LineBasicMaterial
    const material2 = new LineBasicMaterial({ color: 0x0000ff });

    const points = [];
    points.push(new Vector3(x - 10, y - 10, -0));
    points.push(new Vector3(x, y, -0));
    points.push(new Vector3(x + 10, y - 10, -0));

    const geometry2 = new BufferGeometry().setFromPoints(points);
    const line = new Line(geometry2, material2);
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

const BPM = 200;


const mouse = {
    x: 0,
    y: 0,

    down_: false,
    set down(value) {
        this.down_ = value;
        if (value) {
            debug('mouse is down.');
        }
    },
    get down() {
        return this.down_;
    },
    wheel: 0,
}


const smoothScrollHandler = new SmoothScrollHandler(document.body, BPM * 4)

smoothScrollHandler.onScroll((direction: 'up' | 'down') => {
    mouse.wheel = 1 * (direction === "up" ? 1 : -1);
})



function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

let wasShooting = false;

function onMouseDown(event) {
    init();

    if (!heliattack?.playing) {
        return;
    }

    //manageRaycasterIntersections(scene, camera, mouse);

    if (event.button === 0) {
        mouse.down = true;
    } else if (event.button === 1) {
        mouse.wheel = 1;
    } else if (event.button === 2) {
        heliattack?.weaponSwitch();
        wasShooting = mouse.down;
        mouse.down = false;
    }
}

function onMouseUp(event) {
    if (!heliattack?.playing) {
        return;
    }
    if (event.button === 0) {
        mouse.down = false;
        wasShooting = false;
    } else if (event.button === 1) {
        mouse.wheel = 1;
    } else if (event.button === 2) {
        heliattack?.lastWeapon();
        mouse.down = wasShooting;
    }
}

function onMouseClick(event) {
    if (!heliattack?.playing) {
        return;
    }
    if (event.button === 1) {
        mouse.wheel = 1;
    } else if (event.button === 2) {
    }
}

let lastWheelMove = 0;

function getDurationSeconds(bpm) {
    const timePerBeatSecs = 60 / bpm; // Time for each beat in seconds
    return timePerBeatSecs;
}

function getDurationMiliseconds(bpm) {
    return getDurationSeconds(bpm) * 1000;
}

let lastWheelTime = 0
function onMouseWheel(event) {
    if (!heliattack?.playing) {
        return;
    }

    const now = window.performance.now();
    if (event.deltaY < 0) {
        if (lastWheelMove == 1 && now < lastWheelTime - getDurationSeconds(BPM)) {
            return;
        }
        mouse.wheel = 1;
    } else if (event.deltaY > 0) {
        if (lastWheelMove == -1 && now < lastWheelTime - getDurationSeconds(BPM)) {
            return;
        }
        mouse.wheel = -1;
    }
    lastWheelMove = mouse.wheel;
    lastWheelTime = now;
};

const touchInputHandler = new TouchInputHandler(document);

touchInputHandler.onStart((event) => {
    init();

    if (!heliattack?.playing) {
        return;
    }

    const touch = event.touches[0];
    if (!touch) {
        console.error("no touches while in on start.");
        return;
    }

    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    mouse.down = true;
});

touchInputHandler.onEnd((event) => {
    if (!heliattack?.playing) {
        return;
    }

    if (!event.touches.length) {
        mouse.down = false;
    }
})

touchInputHandler.onMove((event) => {
    if (!heliattack?.playing) {
        return;
    }

    const touch = event.touches[0];
    if (!touch) {
        console.error("no touches while in on start.");
        return;
    }

    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
})

const ENABLE_DEBUGGER = false;
function debug(text) {
    if (ENABLE_DEBUGGER) {
        console.error(text);
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

    xhr.addEventListener('readystatechange', function () {
        if (this.readyState === 4) {
            console.log(this.responseText);
        }
    });

    xhr.open('POST', 'https://api.basement.fun/launcher/');
    xhr.setRequestHeader('X-Service-Method', 'channelStatus');

    xhr.send(data);
}

const k = new WordListener('k');
k.onWordDetected((word) => {
    heliattack?.suicide();
});

let showErrors = false;
const history = [];
const i = new WordListener('i');
i.onWordDetected((word) => {
    showErrors = !showErrors;

    setVisible(document.getElementById('error-container'), showErrors);

    showCheat("errors");
});

const t = new WordListener('t');
t.onWordDetected((word) => {
    heliattack?.start();
});

let showWebcam = false;
const o = new WordListener('o');
o.onWordDetected(async (word) => {
    showWebcam = !showWebcam;

    setVisible(document.getElementById('webcam'), showWebcam);

    if (heliattack?.lastLyric?.processed && !heliattack.lastLyric.displayed) {
        heliattack.lastLyric.displayed = true;
        if (heliattack.lastLyric.func) {
            heliattack.lastLyric.func();
            heliattack.lastLyric.func = null;
        }
        setMessage(heliattack.lastLyric.text);
        await timeout(getDurationMiliseconds(BPM));
        setMessage('');
    }
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

    showCheat("webcam");
});

const retro = new WordListener('retro');
retro.onWordDetected((word) => {
    history.splice(0, history.length);

    heliattack?.start();
    console.error("could not load heli attack 1 assets.")
    setVisible(document.getElementById('error-container'), showErrors);

    showCheat("retro assets")
});

const xylander = new WordListener('xylander');
xylander.onWordDetected((word) => {
    debugger;
    history.splice(0, history.length);

    heliattack?.playSong('https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2FAudioInterface%2Fforgotten-futures-8-december-2024%2F');

    showCheat("go outside and breathe the fumes");
});

const kit = new WordListener('kit');
kit.onWordDetected((word) => {
    history.splice(0, history.length);

    heliattack?.playSong('ror');

    showCheat("remnants of rebellion");
});

const pred = new WordListener('pred');
pred.onWordDetected((word) => {
    history.splice(0, history.length);

    heliattack.pred();

    showCheat("gl hf dd")
});

function showCheat(text) {
    if (text != 'errors') {
        document.getElementById('error-container').innerHTML += `<br>${text}`;
        sayMessage('[' + text + ']');
    }
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


document.addEventListener('mousemove', onDocumentMouseMove, false);
window.addEventListener('resize', onWindowResize, false);
document.addEventListener('mousedown', onMouseDown, false);
document.addEventListener('mouseup', onMouseUp, false);
document.body.addEventListener('click', onMouseClick);

function setPlaying(value) {
    if (!value) {
        audioManager.pause();
        heliattack.pause();
        playing = false;
        document.getElementById('ui')?.removeAttribute('playing');
    } else {
        playing = true
        if (heliattack) {
            heliattack.play();
        }
        audioManager.play();
        document.getElementById('ui')?.setAttribute('playing', 'true');
    }
}

const TOUCH_CONTROLS = false;
let inGame = false;

if (TOUCH_CONTROLS) {
    window.addEventListener("wheel", e => e.preventDefault(), { passive: false })
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
        if (heliattack) {
            heliattack.currentTime = (e.key.charCodeAt(0) - '0'.charCodeAt(0)) / 10;
        }
    }
    if (e.key == "Escape") {
        if (heliattack?.playing) {
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
    // mouse.down = true;
});


if (WebGL.isWebGL2Available()) {
    renderer.setAnimationLoop(render);
} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('error-container').appendChild(warning);
}

const audioManager = new AudioManager();
window.audioManager = audioManager;

const settings = {
    set over(value) {
        setVisible(mainMenu, value);
        if (heliattack) {
            heliattack.playing = !value;
        }
        document.getElementById('ui')?.removeAttribute('playing');
    },
    update() {
        if (videoGestures) {
            videoGestures.update();
        }
        if (smoothScrollHandler) {
            smoothScrollHandler.update()
        }

        if (heliattack) {
            vhsPass.material.uniforms.time.value += (heliattack.game.timeScale + (heliattack.game.player.hyperJumping ? 0.2 : 0)) * 0.01;
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

const mainMenu = document.getElementById('main-menu');

async function init() {
    if (initialized) {
        return;
    }
    initialized = true;
    audioManager.init();
    audioManager.masterVolume = 0.2;

    setMessage('Loading...');

    await scc();
}

function ha(shape) {
    // console.error(shape);
    squarecircleco?.destroy();
    squarecircleco = null;

    setMessage('Loading...');

    createMainMenu();
    createHeliAttack();
}

let squarecircleco: SquareCircleCo | null = null;
async function scc() {
    setMessage("[kit]");
    await timeout(getDurationMiliseconds(BPM) * 4);
    setMessage("naa.mba");
    await timeout(getDurationMiliseconds(BPM) * 4);
    await new SquareCircleCo(window, mouse, keyIsPressed, scene, camera, shaderPass, vhsPass, audioManager, document.getElementById('gesture-canvas') as HTMLCanvasElement, (shape) => ha(shape));
}

function loaded() {
    setMessage('');

    setVisible(mainMenu, true);
}

function started() {
    setMessage('');

    setVisible(mainMenu, false);

    setPlaying(true);
}

function createMainMenu() {
    const startButton = document.getElementById('start-game');

    startButton.addEventListener('click', () => {
        heliattack?.start();
    });

    startButton.addEventListener('touchstart', () => {
        heliattack?.start();
    });

    if (playing) {
        heliattack?.start();
    }
}

function createHeliAttack() {
    heliattack?.destroy();

    heliattack = new HeliAttack(window, mouse, keyIsPressed, scene, camera, shaderPass, vhsPass, audioManager, settings);
    heliattack.init(loaded, started);
    if (videoGestures) {
        heliattack.initVideoGestures(videoGestures);
    }
}

setMessage('Tap to continue');