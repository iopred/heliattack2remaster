import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
// import { FontLoader } from 'three/addons/loaders/FontLoader.js';
// import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import AudioManager from './audiomanager.js';
import VideoGestures from './videogestures.ts';
import WordListener from './wordlistener.ts';
import HeliAttack from './heliattack.ts';
import { createTintShader, manageRaycasterIntersections } from './utils';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

camera.position.set(0, 0, 300);
camera.lookAt(0, 0, 0);

THREE.ColorManagement.enabled = true;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Set up EffectComposer
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);

// Add a render pass (renders the scene as usual)
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Add the inversion shader pass
const shaderPass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },              // Rendered texture
        invertEnabled: { value: 0.0 },         // Toggle inversion (0 = off, 1 = on)
        tintEnabled: { value: 0.0 },           // Toggle tinting (0 = off, 1 = on)
        tintColor: { value: new THREE.Color(1, 0.5, 0.5) }, // Red tint
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

const dirLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
dirLight.position.set( 0, 0, 1 ).normalize();
scene.add( dirLight );

function createBlueLine(x, y, object) {
    //create a blue LineBasicMaterial
    const material2 = new THREE.LineBasicMaterial( { color: 0x0000ff } );

    const points = [];
    points.push( new THREE.Vector3( x - 10, y - 10, -0 ) );
    points.push( new THREE.Vector3( x, y, -0 ) );
    points.push( new THREE.Vector3( x + 10, y - 10, -0 ) );

    const geometry2 = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry2, material2 );
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
    output();
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

const ENABLE_VIDEO_GESTURES = true;

let videoGestures = ENABLE_VIDEO_GESTURES ? new VideoGestures(window, document) : null;
videoGestures?.resize(window.innerWidth, window.innerHeight);

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

const iopred = new WordListener("iopred");
iopred.onWordDetected((word) => {
    videoGestures = new VideoGestures(window, document);
    heliattack.initVideoGestures(videoGestures);
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

const history = [];
window.addEventListener('keydown', (e) => {
    keyIsPressed[e.key] = true;
    history.push(e.key);
    iopred.emit(history.join(""));
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

function output() {
    audioManager.init();
    audioManager.masterVolume = 0.2;

    if (!heliattack) {
        heliattack = new HeliAttack(window, mouse, keyIsPressed, scene, camera, shaderPass, audioManager);
        heliattack.init();
    }
}