import { BufferGeometry, Color, ColorManagement, DirectionalLight, Line, LineBasicMaterial, PCFSoftShadowMap, PerspectiveCamera, Scene, ShaderMaterial, SRGBColorSpace, UniformsUtils, Vector3, WebGLRenderer } from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import AudioManager from './audiomanager';
import VideoGestures from './videogestures';
import WordListener from './wordlistener';
import HeliAttack from './heliattack';
import TouchInputHandler from './touchinputhandler';
import { getDurationMiliseconds, getDurationSeconds, sayMessage, setMessage, setVisible, timeout } from './utils';
import SquareCircleCo from './scc/squarecircleco';
import Naamba from './naamba'
import SmoothScrollHandler from './smoothscrollhandler';
import { LocalStorageWrapper } from './localstoragewrapper';

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

ColorManagement.enabled = true;

const renderer = new WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;
renderer.outputColorSpace = SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;


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
        scanlineIntensity: { value: 1.0 }, // Intensity of scanlines
        scanlineCount: { value: 480.0 }, // Number of scanlines
        colorShift: { value: 0.2 }, // Amount of RGB color shift
        largeLineAberration: { value: 0.6 }, // Toggle large VHS line aberration
        animatedColorShift: { value: 0.005 }, // Animatable color shift amount
        enabled: { value: 0.0 }, // Overall strength of the effect.
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
    uniform float largeLineAberration;
    uniform float animatedColorShift;

    varying vec2 vUv;

    // CRT Bulge distortion
    vec2 applyBulge(vec2 uv) {
        vec2 center = vec2(0.5, 0.5);
        vec2 delta = uv - center;
        float dist = length(delta);
        float edgeFactor = smoothstep(0.4, 0.5, dist); // Reduce bulge near the edges
        delta *= 1.0 + distortion * enabled * dist * dist * (1.0 - edgeFactor);
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

    float applyScanlines(vec2 uv, float scanlineCount) {
        float scanline = sin(uv.y * scanlineCount * 3.14159265);
        // Map scanlines between 0.9 (slightly darker) and 1.0 (no darkening)
        return mix(1.0, 0.9, scanlineIntensity * (0.5 + 0.5 * scanline));
    }

    // Large VHS line aberration with warp effect
    float applyLargeLineAberration(vec2 uv, inout vec2 warpedUV) {
        if (largeLineAberration == 0.0) return 0.0;

        // Double the animation duration, show line only in the first half
        float interval = fract(time * 0.25); // Slower frequency, 0.25 for 2 seconds
        if (interval > 0.5) return 0.0;

        float linePosition = fract(time * 0.5); // Move line vertically
        float distance = abs(uv.y - 1.0 + linePosition);
        float effect = smoothstep(0.03, 0.0, distance); // Thickness of the line

        if (distance < 0.05) {
            warpedUV.y += effect * 0.016 * largeLineAberration; // Warp effect height
        }
        return effect * 0.1 * largeLineAberration; // Intensity of the warp
    }

    // Simulate animated VHS jitter/noise
    float applyNoise(vec2 uv, float time) {
        float noiseStrength = 0.1; // Noise intensity
        return (fract(sin(dot(uv.xy * time, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * noiseStrength * enabled;
    }

    // VHS Wrap-like Warp Effect with Noise at Top and Bottom
    vec2 applyTopAndBottomWarp(vec2 uv, float time) {
        float warpStrength = 0.01; // Warp intensity
        float noiseStrength = 0.005; // Noise intensity

        // Bottom Warp
        float bottomWarp = smoothstep(0.9, 1.0, uv.y) * sin(time * 10.0) * warpStrength;

        // Top Warp
        float topWarp = smoothstep(0.1, 0.0, uv.y) * sin(time * 10.0) * warpStrength;

        // Combine both warps
        float combinedWarp = bottomWarp + topWarp;

        // Apply combined warp effect
        uv.x += combinedWarp * enabled;

        return uv;
    }

    void main() {
        // If enabled is 0, bypass effect
        if (enabled <= 0.0) {
            gl_FragColor = texture2D(tDiffuse, vUv);
            return;
        }

        // Start with the original UVs
        vec2 distortedUV = applyBulge(vUv); // Apply CRT bulge first

        // Apply top and bottom warp effect
        vec2 warpedUV = applyTopAndBottomWarp(distortedUV, time);

        // Apply large VHS line aberration with warp effect
        float aberration = applyLargeLineAberration(warpedUV, warpedUV);

        // Apply animated RGB color shift
        vec4 color = applyColorShift(tDiffuse, warpedUV, animatedColorShift * sin(time * 3.0));

        // Add large VHS line aberration effect
        color.rgb += aberration;

        // Simulate animated VHS noise
        float noise = applyNoise(warpedUV, time);
        color.rgb += noise;

        // Apply scanlines
        float scanline = applyScanlines(vUv, scanlineCount);
        color.rgb = mix(color.rgb, color.rgb * scanline, scanlineIntensity);

        // Blend final result with effect strength
        vec4 original = texture2D(tDiffuse, warpedUV);
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

document.getElementById('game')!.appendChild(renderer.domElement);

const dirLight = new DirectionalLight(0xffffff, 0.4);
dirLight.position.set(0, 0, 1).normalize();
scene.add(dirLight);

function createBlueLine(x, y, object) {
    //create a blue LineBasicMaterial
    const material2 = new LineBasicMaterial({ color: 0x0000ff });

    const points:Vector3[] = [];
    points.push(new Vector3(x - 10, y - 10, -0));
    points.push(new Vector3(x, y, -0));
    points.push(new Vector3(x + 10, y - 10, -0));

    const geometry2 = new BufferGeometry().setFromPoints(points);
    const line = new Line(geometry2, material2);
    object.add(line);
}

function resetScene(scene) {
    // Loop through all child objects in the scene
    while (scene.children.length > 0) {
        const object = scene.children[0];

        // If the object has a geometry, dispose of it
        if (object.geometry) object.geometry.dispose();

        // If the object has a material, dispose of it
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
            } else {
                object.material.dispose();
            }
        }

        // Remove the object from the scene
        scene.remove(object);
    }

    // Clear the background (if any)
    scene.background = null;

    // Optional: Clear environment map
    scene.environment = null;
}


let heliattack: HeliAttack;
function render() {
    let rendered = false;
    
    rendered = rendered || (naamba?.render() || false);
    rendered = rendered || (squarecircleco?.render() || false);
    rendered = rendered || (heliattack?.render() || false);

    if (rendered) {
        composer.render();
    }
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
let lastWheelTime = 0
function onMouseWheel(event) {
    event.preventDefault();

    if (!heliattack?.playing) {
        return;
    }

    const now = window.performance.now();
    if (event.deltaY < 0) {
        if (lastWheelMove == 1 && now < lastWheelTime + getDurationMiliseconds(BPM)) {
            return;
        }
        mouse.wheel = 1;
    } else if (event.deltaY > 0) {
        if (lastWheelMove == -1 && now < lastWheelTime + getDurationMiliseconds(BPM)) {
            return;
        }
        mouse.wheel = -1;
    } else {
        mouse.wheel = 0;
    }
    lastWheelMove = mouse.wheel;
    lastWheelTime = now;
};

const touchInputHandler = new TouchInputHandler(document.body);

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
const history: string[] = [];
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
});


let lastMessage = 0;
const l = new WordListener('l');
l.onWordDetected(async (word) => {
    if (heliattack?.game?.lastTimelineEvent) {
        const thisMessage = ++lastMessage;

        if (heliattack.game.lastTimelineEvent.text.indexOf('[') === 0) {
            setMessage(heliattack.game.lastTimelineEvent.text.split(']')[1]);
        } else {
            setMessage(heliattack.game.lastTimelineEvent.text);
        }
        await timeout(getDurationMiliseconds(BPM) * 4);
        if (thisMessage === lastMessage) {
            setMessage('');
        }
    }
})

function updateMusicIcon() {
    document.getElementById('music-on')!.style.display = audioManager.musicVolume === 0.0 ? 'none' : 'block';
    document.getElementById('music-off')!.style.display = audioManager.musicVolume !== 0.0 ? 'none' : 'block';
}

function updateEffectsIcon() {
    document.getElementById('effects-on')!.style.display = audioManager.effectVolume === 0.0 ? 'none' : 'block';
    document.getElementById('effects-off')!.style.display = audioManager.effectVolume !== 0.0 ? 'none' : 'block';
}

function toggleMusic() {
    settings.musicMuted = !settings.musicMuted;
}

function toggleEffects() {
    settings.effectMuted = !settings.effectMuted;
}

function togglePause() {
    if (heliattack?.playing) {
        setPlaying(!playing);
    }
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
        
        if (heliattack?.isLoaded()) {
            heliattack.initVideoGestures(videoGestures);
        }
    
        showCheat("input/output");
    }

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
        document.getElementById('error-container')!.innerHTML += `<br>${text}`;
        sayMessage('[' + text + ']');
    }
}

let playing = true;

// Key handling
const keyIsPressed: {[key: string]: boolean} = {
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
        if (heliattack) {
            heliattack.pause();
        }
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
    window.addEventListener('wheel', onMouseWheel, { passive: false });
}

window.addEventListener('keydown', (e) => {
    keyIsPressed[e.key] = true;
    history.push(e.key);
    if (e.key.length == 1) {
        let key = e.key.toLowerCase();
        k.listen(key);
        i.listen(key);
        o.listen(key);
        m.listen(key);
        n.listen(key);
        l.listen(key);
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
    if (e.key == 'Escape') {
        togglePause();
    }
});
window.addEventListener('keyup', (e) => { keyIsPressed[e.key] = false; });

let wasPlaying = false;
let paused = false;
window.addEventListener('blur', () => {
    for (const key in keyIsPressed) {
        keyIsPressed[key] = false;
    }
    mouse.down = false;
    
    wasPlaying = heliattack?.playing && playing;
    if (wasPlaying) {
        setPlaying(false);
    } else {
        audioManager.pause();
    }
});
window.addEventListener('focus', () => {
    

    if (heliattack?.playing) {
        if (wasPlaying) {
            setPlaying(true);
        }
    } else {
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

document.getElementById('pause-game')?.addEventListener('click', event => {
    togglePause();
});

document.getElementById('pause-game')?.addEventListener('touch', event => {
    togglePause();
});

document.getElementById('resume-game')?.addEventListener('click', event => {
    togglePause();
});

document.getElementById('resume-game')?.addEventListener('touch', event => {
    togglePause();
});

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
});


if (WebGL.isWebGL2Available()) {
    renderer.setAnimationLoop(render);
} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('error-container')!.appendChild(warning);
}

const audioManager = new AudioManager();
window.audioManager = audioManager;

const settings = {
    set over(value:boolean) {
        setVisible(gameOverMenu, value);
        setVisible(mainMenu, false);
        if (heliattack) {
            heliattack.playing = !value;
        }
        if (value) {
            document.getElementById('ui')?.removeAttribute('playing'); 
            document.getElementById('ui')?.removeAttribute('ingame');
        } else {
            document.getElementById('ui')?.setAttribute('playing', 'true');
            document.getElementById('ui')?.setAttribute('ingame', 'true');
        }

    },
    update() {
        if (videoGestures) {
            videoGestures.update();
        }
        if (smoothScrollHandler) {
            smoothScrollHandler.update()
        }
    },
    set musicMuted(value:boolean) {
        audioManager.musicVolume = value ? 0.0 : settings.musicVolume;
        LocalStorageWrapper.setItem('musicMuted', value);
        updateMusicIcon();
    },
    get musicMuted():boolean {
        const muted = LocalStorageWrapper.getItem<boolean>('musicMuted');
        return (muted !== null && muted !== undefined) ? muted : false;
    },
    set musicVolume(value:number) {
        audioManager.musicVolume = value;
        LocalStorageWrapper.setItem('musicVolume', value);
        updateMusicIcon();
    },
    get musicVolume():number {
        const volume = LocalStorageWrapper.getItem<number>('musicVolume');
        return (volume !== null && volume !== undefined) ? volume : 0.8;
    },
    set effectMuted(value:boolean) {
        audioManager.effectVolume = value ? 0.0 : settings.effectVolume;
        LocalStorageWrapper.setItem('effectMuted', value);
        updateEffectsIcon();
    },
    get effectMuted():boolean {
        const muted = LocalStorageWrapper.getItem<boolean>('effectMuted');
        return (muted !== null && muted !== undefined) ? muted : false;
    },
    set effectVolume(value:number) {
        audioManager.effectVolume = value;
        LocalStorageWrapper.setItem('effectVolume', value);
        updateEffectsIcon();
    },
    get effectVolume():number {
        const volume = LocalStorageWrapper.getItem<number>('effectVolume');
        return (volume !== null && volume !== undefined) ? volume : 0.8;
    },
    get bpm():number {
        return 200;
    }
}

audioManager.musicVolume = settings.musicMuted ? 0.0 : settings.musicVolume;
audioManager.effectVolume = settings.effectMuted ? 0.0 : settings.effectVolume;

updateMusicIcon();
updateEffectsIcon();

let initialized = false;

const mainMenu = document.getElementById('main-menu');
const gameOverMenu = document.getElementById('game-over-menu');

const SKIP_INTRO = false;

async function init() {
    if (initialized) {
        return;
    }
    initialized = true;
    audioManager.init();
    audioManager.masterVolume = 0.2;

    setMessage('Loading...');

    if (!SKIP_INTRO) {
        await createNaamba();
        await createSquareCircleCo();
    }
    await createHeliAttack();
    await createMainMenu();
    await createGameOverMenu();
    
    heliattack.showMainMenu();
    setVisible(mainMenu, true);
}

function setMessageColor(color) {
    document.getElementById('message')!.style.color = 'white';
}

let naamba: Naamba | null = null;

async function createNaamba() {
    setMessage('Loading...');

    naamba = new Naamba(window, renderer.domElement, scene, camera);
    await naamba.preload();
    
    setMessage('');
    await naamba.begin();
    await timeout(getDurationMiliseconds(BPM) * 6);
}

let squarecircleco: SquareCircleCo | null = null;
async function createSquareCircleCo() {
    setMessage('Loading...');

    squarecircleco = new SquareCircleCo(window, renderer.domElement, scene, camera, audioManager);
    await squarecircleco.preload();

    setMessageColor('black');
    setMessage('');
    naamba?.destroy();
    naamba = null;
    resetScene(scene);

    await squarecircleco.begin();

    await timeout(getDurationMiliseconds(BPM) * 2);
}

function createMainMenu() {
    const startButton = document.getElementById('start-game-button')!;

    startButton.addEventListener('click', () => {
        heliattack?.start();
    });

    startButton.addEventListener('touch', () => {
        heliattack?.start();
    });
}

function createGameOverMenu() {
    const restartButton = document.getElementById('restart-game-button')!;

    restartButton.addEventListener('click', () => {
        heliattack?.start();
    });

    restartButton.addEventListener('touch', () => {
        heliattack?.start();
    });

    const mainMenuButton = document.getElementById('main-menu-button')!;

    mainMenuButton.addEventListener('click', () => {
        resetMainMenu();
    });

    mainMenuButton.addEventListener('touch', () => {
        resetMainMenu();
    });
}

function resetMainMenu() {
    setVisible(gameOverMenu, false);
    setVisible(mainMenu, true);

    shaderPass.uniforms.invertEnabled.value = 0.0;
    shaderPass.uniforms.tintEnabled.value = 0.0;
    heliattack?.destroy();
    heliattack?.showMainMenu();

    audioManager.timeScale = 1.0;
}

async function createHeliAttack() {
    setMessage('Loading...');

    heliattack?.destroy();

    heliattack = new HeliAttack(window, mouse, keyIsPressed, scene, camera, shaderPass, vhsPass, audioManager, settings);
    await heliattack.preload();
    
    setMessageColor('white');
    setMessage('');
    squarecircleco?.destroy();
    squarecircleco = null;
    resetScene(scene);

    heliattack.init();
    if (videoGestures) {
        heliattack.initVideoGestures(videoGestures);
    }

    
}

setMessage('Tap to continue');