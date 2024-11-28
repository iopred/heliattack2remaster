import { BufferGeometry, Color, ColorManagement, DirectionalLight, Line, LineBasicMaterial, PerspectiveCamera, Scene, ShaderMaterial, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import AudioManager from './audiomanager.js';
import VideoGestures from './videogestures.ts';
import WordListener from './wordlistener.ts';
import HeliAttack from './heliattack.ts';
import { createTintShader, manageRaycasterIntersections } from './utils';

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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    videoGestures?.resize(window.innerWidth, window.innerHeight);
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
    manageRaycasterIntersections(scene, camera, mouse);
    mouse.down = true;
}


function onMouseUp(event){
    mouse.down = false;
}

function onMouseWheel(event){
    if (event.deltaY < 0) {
        mouse.wheel = 1;
    } else if (event.deltaY > 0) {
        mouse.wheel = -1;
    }
};

const ENABLE_DEBUGGER = true;
function debug() {
    if (ENABLE_DEBUGGER) {
        debugger;
    }
}

const ENABLE_VIDEO_GESTURES = false;

let videoGestures = ENABLE_VIDEO_GESTURES ? new VideoGestures(window, document) : null;
if (videoGestures) {
    videoGestures.resize(window.innerWidth, window.innerHeight);
}
function getAvatar() {
    // TODO: Write Avatar Creator.

    const kit = new Kit();
    kit.pulse()
    // WARNING: For POST requests, body is set to null by browsers.
    var data = "{\r\n    \"launcherJwt\": {{JWT}}\r\n}";

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function() {
    if(this.readyState === 4) {
        console.log(this.responseText);
    }
    });

    xhr.open("POST", "https://api.basement.fun/launcher/");
    xhr.setRequestHeader("X-Service-Method", "channelStatus");

    xhr.send(data);
}

const i = new WordListener("k");
i.onWordDetected((word) => {
    heliattack.restart();
});


const history = [];
const iopred = new WordListener("iopred");
iopred.onWordDetected((word) => {
    if (!videoGestures) {
        videoGestures = new VideoGestures(window, document);
        videoGestures.resize(window.innerWidth, window.innerHeight);
    }
    if (heliattack) {
        heliattack.initVideoGestures(videoGestures);
    }
    history.splice(0, history.length);
    document.getElementById('error-container').style.display = 'initial';
});

// Key handling
const keyIsPressed = {
    'ArrowLeft': false,
    'ArrowRight': false,
    'ArrowUp': false,
    'ArrowDown': false,
    'Control': false,
    'Shift': false,
};

window.addEventListener('resize', onWindowResize);

document.addEventListener('mousemove', onDocumentMouseMove, false);
window.addEventListener('resize', onWindowResize, false);
document.addEventListener('mousedown', onMouseDown, false);
document.addEventListener('mouseup', onMouseUp, false);
window.addEventListener('wheel', onMouseWheel, false);

window.addEventListener('keydown', (e) => {
    keyIsPressed[e.key] = true;
    history.push(e.key);
    i.listen(e.key);
    iopred.listen(history.join(""));
});
window.addEventListener('keyup', (e) => { keyIsPressed[e.key] = false; });
window.addEventListener('blur', () => {
    for (const key in keyIsPressed) {
        keyIsPressed[key] = false;
    }
});

if (WebGL.isWebGL2Available()) {
    renderer.setAnimationLoop(render);
} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('error-container').appendChild(warning);
}

const audioManager = new AudioManager();
let initialized = false;
function init() {
    if (initialized) {
        return;
    }
    initialized = true;
    audioManager.init();
    audioManager.masterVolume = 0.2;

    setMessage("Loading...");

    createHeliAttack();
}

function loaded() {
    setMessage("");
}

function createHeliAttack() {
    if (heliattack) {
        heliattack.destroy();
    }
    heliattack = new HeliAttack(window, mouse, keyIsPressed, scene, camera, shaderPass, audioManager);
    heliattack.init(loaded);
    if (videoGestures) {
        heliattack.initVideoGestures(videoGestures);
    }
}

setMessage('Tap to continue');

function setMessage(text) {
    const message = document.getElementById("message");
    if (text) {
        message.style.display = 'inherit';
    } else {
        message.style.display = 'none';
    }
    message.innerHTML = text;
}