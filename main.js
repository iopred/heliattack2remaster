import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import {Tween, Easing} from '@tweenjs/tween.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import AudioManager from './audiomanager.js';



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

document.body.appendChild(renderer.domElement);

const dirLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
dirLight.position.set( 0, 0, 1 ).normalize();
scene.add( dirLight );

const geometry = new THREE.BoxGeometry(50, 50, 50);
const material = new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } );
const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

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

const fontLoader = new FontLoader();

let textGeometry;
let textMesh;

fontLoader.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {

	textGeometry = new TextGeometry( 'Heli Attack', {
		font: font,
		size: 20,
		depth: 15,
		curveSegments: 12,
		bevelEnabled: false,
		bevelThickness: 10,
		bevelSize: 8,
		bevelOffset: 0,
		bevelSegments: 5
	} );

    textGeometry.center();
    textGeometry.computeBoundingBox();
    
    textMesh = new THREE.Mesh(textGeometry, material);
    textMesh.position.x = 0;

    // scene.add( textMesh );
} );

function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    if (textMesh) {
        textMesh.rotation.y += 0.01;
    }

    if (game) {
        game.update();
    }

	// renderer.render(scene, camera);
    composer.render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Key handling
const keyIsPressed = {
    'ArrowLeft': false,
    'ArrowRight': false,
    'ArrowUp': false,
    'ArrowDown': false,
    'Control': false,
    'Shift': false,
};

const raycaster = new THREE.Raycaster();
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



const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function calculateAngleToMouse(object, mouse) {
    // Update raycaster with the mouse position in NDC
    raycaster.setFromCamera(mouse, camera);

    const intersectPoint = new THREE.Vector3();
    // Calculate the point where the ray intersects with the plane z = 0
    raycaster.ray.intersectPlane(planeZ, intersectPoint);

    // Get object position in world coordinates
    const objectPosition = new THREE.Vector3();
    object.getWorldPosition(objectPosition);

    // Calculate the angle
    const angle = Math.atan2(
        intersectPoint.y - objectPosition.y,
        intersectPoint.x - objectPosition.x
    );

    return angle;
}

function manageRaycasterIntersections(scene, camera, vector) {
    camera.updateMatrixWorld();
    raycaster.setFromCamera(vector, camera);
    var intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        console.log("intersects")
    }
}

function onMouseDown(event){
    audioManager.init();
    //console.log("mouse position: (" + mouse.x + ", "+ mouse.y + ")");
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

let game;
let audioManager;

function init() {
    window.addEventListener('resize', onWindowResize);
    
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    window.addEventListener('wheel', onMouseWheel, false);

    window.addEventListener('keydown', (e) => { keyIsPressed[e.key] = true; });
    window.addEventListener('keyup', (e) => { keyIsPressed[e.key] = false; });
    window.addEventListener('blur', () => {
        for (const key in keyIsPressed) {
            keyIsPressed[key] = false;
        }
    });


    if (WebGL.isWebGL2Available()) {
        renderer.setAnimationLoop(animate);
    } else {
        const warning = WebGL.getWebGL2ErrorMessage();
        document.getElementById('container').appendChild(warning);
    }

    // Start loading assets
    loadAssets().then((textures) => {
        game = new Game();
        game.init(textures);
    }).catch(error => console.error('Error loading assets:', error));

    audioManager = new AudioManager();
    audioManager.preload([
        { key: 'boom', url: 'sounds/game/boom.wav'},
        { key: 'flame', url: 'sounds/game/flame.wav'},
        { key: 'grapple', url: 'sounds/game/grapple.wav'},
        { key: 'grenade', url: 'sounds/game/grenade.wav'},
        { key: 'helicopter', url: 'sounds/game/helicopter.wav'},
        { key: 'helidestroyed', url: 'sounds/game/helidestroyed.wav'},
        { key: 'hurt', url: 'sounds/game/hurt.wav'},
        { key: 'hyperjump', url: 'sounds/game/hyperjump.wav'},
        { key: 'metal0', url: 'sounds/game/metal0.wav'},
        { key: 'metal1', url: 'sounds/game/metal1.wav'},
        { key: 'metal2', url: 'sounds/game/metal2.wav'},
        { key: 'metal3', url: 'sounds/game/metal3.wav'},
        { key: 'music', url: 'sounds/game/music.wav'},
        { key: 'pistol', url: 'sounds/game/pistol.wav'},
        { key: 'railgun', url: 'sounds/game/railgun.wav'},
        { key: 'rocketlauncher', url: 'sounds/game/rocketlauncher.wav'},
        { key: 'shotgun', url: 'sounds/game/shotgun.wav'},
        { key: 'shotgunrockets', url: 'sounds/game/shotgunrockets.wav'},
        { key: 'bigboom', url: 'sounds/game/bigboom.wav'},
        { key: 'boom', url: 'sounds/game/boom.wav'},
        { key: 'announcerAbomb', url: 'sounds/announcer/abomb.wav'},
        { key: 'announcerFiremines', url: 'sounds/announcer/firemines.wav'},
        { key: 'announcerFlamethrower', url: 'sounds/announcer/flamethrower.wav'},
        { key: 'announcerGrapplecannon', url: 'sounds/announcer/grapplecannon.wav'},
        { key: 'announcerGrenadelauncher', url: 'sounds/announcer/grenadelauncher.wav'},
        { key: 'announcerHealth', url: 'sounds/announcer/health.wav'},
        { key: 'announcerInvulnerability', url: 'sounds/announcer/invulnerability.wav'},
        { key: 'announcerJetpack', url: 'sounds/announcer/jetpack.wav'},
        { key: 'announcerMac10', url: 'sounds/announcer/mac10.wav'},
        { key: 'announcerPredatormode', url: 'sounds/announcer/predatormode.wav'},
        { key: 'announcerRailgun', url: 'sounds/announcer/railgun.wav'},
        { key: 'announcerRocketlauncher', url: 'sounds/announcer/rocketlauncher.wav'},
        { key: 'announcerRpg', url: 'sounds/announcer/rpg.wav'},
        { key: 'announcerSeekerlauncher', url: 'sounds/announcer/seekerlauncher.wav'},
        { key: 'announcerShotgun', url: 'sounds/announcer/shotgun.wav'},
        { key: 'announcerShotgunrockets', url: 'sounds/announcer/shotgunrockets.wav'},
        { key: 'announcerTimerift', url: 'sounds/announcer/timerift.wav'},
        { key: 'announcerTridamage', url: 'sounds/announcer/tridamage.wav'},
    ]);
}

const map1 = [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 4], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 8], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 1], [1, 4], [0, 0], [0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 2], [1, 6], [1, 4], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 10], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 3], [1, 5], [1, 2]], 
[[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 6], [1, 1], [1, 1],[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 2], [1, 2], [1, 6], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 6], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 5], [1, 2], [1, 2]]];

const bg1 = [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0], [0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],[0, 0],[0, 0]], 
[[0, 12], [0, 0], [0, 0], [0, 11], [0, 11], [0, 0], [0, 0], [0, 0],[0, 0],[0, 11], [0, 12], [0, 0], [0, 0], [0, 11], [0, 11], [0, 0], [0, 0], [0, 0],[0, 0],[0, 11]],
[[0, 12], [0, 11], [0, 11], [0, 12], [0, 12], [0, 11], [0, 0], [0, 0],[0, 11],[0, 12], [0, 12], [0, 11], [0, 11], [0, 12], [0, 12], [0, 11], [0, 0], [0, 0],[0, 11],[0, 12]]];


class Weapon {
    constructor(name, textureUrl, announcerSoundKey, soundKey, origin /* {THREE.Vector2} */, barrel /* {THREE.Vector2} */, reloadTime, bulletSpeed, damage, boxAmmo, bulletTextureUrl) {
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
        this.texture = textures[this.textureUrl];
        if (this.bulletTextureUrl) {
            this.bulletTexture = textures[this.bulletTextureUrl];
        }
        this.mesh = this.createMesh();
    }

    createMesh() {
        const texture = this.texture;
        const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
        const material = true ? createTintShader(texture) : new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        geometry.translate(texture.image.width / 2, -texture.image.height / 2, 0); 
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = -this.origin.x;
        mesh.position.y = this.origin.y;
        return mesh;
    }

    createBullet(game) {
        if (this.soundKey) {
            audioManager.playEffect(this.soundKey);
        }
        let rot = 0;
        if (this.bullets > 1) {
            rot = -this.bulletsSpread * this.bullets / 2;
        }
        for (var i = 0; i < this.bullets; i++) {
            game.createBullet(this, rot + THREE.MathUtils.randFloat(-this.spread, this.spread), this.bulletsOffset * i / this.bullets);
            rot += this.bulletsSpread;
        }
    }

    collect(game) {
        this.ammo += this.boxAmmo;
        if (this.announcerSoundKey) {
            audioManager.playEffect(this.announcerSoundKey);
        }
    }
}

function defaultBulletUpdate(game, delta) {
    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        return true;
    }

    if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
        game.enemy.damage(this.damage, game);
        return true;
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}

function shotgunRocketUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 8);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function rpgUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time == 6) {
            // play sound
        } else if (this.time > 6 && this.time < 14) {
            this.velocity.x *= 1.4;
            this.velocity.y *= 1.4;
        }

        this.object.rotation.z -= (this.velocity.x * game.timeScale * 4) * Math.PI / 180;

        if (this.time % 2 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 8);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function rocketUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 14);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function seekerUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        const enemyPosition = new THREE.Vector3();
        game.enemy.mesh.getWorldPosition(enemyPosition);

        const targetAim = Math.atan2(
            enemyPosition.y - this.object.position.y,
            enemyPosition.x - this.object.position.x
        );

        let aim = this.object.rotation.z;
        let dif = targetAim - aim;
        if (dif > Math.PI) {
            dif = -Math.PI*2 + dif;
        } else if (dif < -Math.PI) {
            dif = Math.PI*2 + dif;
        }

        aim += dif / 15;

        this.velocity.x = Math.cos(aim) * 3.5;
        this.velocity.y = Math.sin(aim) * 3.5;

        this.object.rotation.z = aim;

        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 14);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function shotgunRocketDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 50);
}


function explosionDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 100);
}

function abombUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 8 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Fire(game, pos, 14);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function abombDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 700);
}

const FLAME_TIME = 46;
const FLAME_FADE_TIME = 6;

function flameUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        this.time++
    }

    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        this.time = Math.max(FLAME_TIME - 6, this.time);
    }

    this.object.scale.x = this.object.scale.y = (5 + this.time/FLAME_TIME * (42 - 5)) / 42;
    if (this.time >= FLAME_TIME - FLAME_FADE_TIME) {
        this.material.opacity = 1-Math.min((this.time - (FLAME_TIME - FLAME_FADE_TIME)) / FLAME_FADE_TIME, 1)
    }
    if (this.time > FLAME_TIME) {
        return true;
    }

    var bbox = new THREE.Box3().setFromObject(this.object).expandByScalar(-0.75);
    var enemyBbox = new THREE.Box3().setFromObject(game.enemy.mesh);
    bbox.min.z = enemyBbox.min.z = -5;
    bbox.max.z = enemyBbox.max.z = 5;
    if (bbox.intersectsBox(enemyBbox)) {
        game.enemy.damage(this.damage*(1-Math.min(this.time / FLAME_TIME, 1))*game.timeScale, game);
        return false;
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}


function grenadeUpdate(game, delta) {
    let move = false;
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;
        this.velocity.y -= 0.35;
    }

    this.object.rotation.z -= (this.velocity.x * game.timeScale * 2) * Math.PI / 180;

    const pos = this.object.position;

    pos.x += this.velocity.x * game.timeScale
    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        pos.x -= this.velocity.x * game.timeScale
        this.velocity.x *= -0.5;
    }
    pos.y += this.velocity.y * game.timeScale;
    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        if (this.bounces >= 3) {
            return true;
        } else {
            pos.y -= this.velocity.y * game.timeScale
            this.velocity.y *= -0.5;
            if (!this.bounces) {
                this.bounces = 1;
            } else {
                this.bounces++;
            }
        }

    }

    if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
        game.enemy.damage(this.damage, game);
        return true;
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}

function setOpacity( obj, opacity ) {
    obj.children.forEach((child)=>{
        setOpacity( child, opacity );
    });
    if ( obj.material ) {
        obj.material.opacity = opacity ;
    };
};

const FIRE_TIME = 80;

function getScaleDelta(totalFrames, currentFrame, minScale = 1, maxScale = 2) {
    // Calculate the progression ratio (0 to 1 across the cycle)
    const progress = currentFrame / totalFrames;

    // Oscillate the scale using a sine wave (smooth transition)
    const scale = minScale + (maxScale - minScale) * (0.5 - 0.5 * Math.cos(progress * 2 * Math.PI));

    // Calculate the delta (difference between this frame and the next frame's scale)
    const nextProgress = (currentFrame + 1) / totalFrames;
    const nextScale = minScale + (maxScale - minScale) * (0.5 - 0.5 * Math.cos(nextProgress * 2 * Math.PI));

    const delta = nextScale - scale;
    return delta;
}

function fireMinesUpdate(game, delta) {
    if (this.time == 0) {
        this.object.rotation.z = 0;
    }

    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.triggered) {
            this.time++;
        } else {
            this.velocity.y -= 0.5;
        }
    }

    if (this.triggered) {
        if (this.time <= 10) {
            setOpacity(this.pillar, this.time/10);
            this.pillar.scale.x = this.time/10;
        } else if (this.time >= FIRE_TIME-10) {
            const perc = 1 - (this.time - (FIRE_TIME - 10)) / 10;
            setOpacity(this.pillar, perc );
            this.pillar.scale.x = perc;
        }

        for (const flame of this.flames) {
            flame.flame.scale.x = flame.flame.scale.y += getScaleDelta(FIRE_TIME, this.time, flame.flameScale, flame.flameScale * 1.25 ) * game.timeScale;
        }

        var bbox = new THREE.Box3().setFromObject(this.object);
        var enemyBbox = new THREE.Box3().setFromObject(game.enemy.mesh);
        bbox.min.z = enemyBbox.min.z = -5;
        bbox.max.z = enemyBbox.max.z = 5;
        if (bbox.intersectsBox(enemyBbox)) {
            game.enemy.damage(this.damage * game.timeScale, game);
        }

        return this.time >= FIRE_TIME;
    } else {
        const pos = this.object.position;

        pos.x += this.velocity.x * game.timeScale
        if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
            pos.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
        }
        pos.y += this.velocity.y * game.timeScale;
        if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
            pos.y = -(Math.floor(-pos.y / game.tileSize)) * game.tileSize + 2;

            const [pillar, flames] = constructFirePillar.apply(this, [game]);
            this.object.add(pillar)

            this.triggered = true;
            this.pillar = pillar;
            this.flames = flames;

            setOpacity(pillar, 0);
        }
    }

    return false;
}

function constructFirePillarSegment(game, heightOffset) {
    const texture = game.textures['images/flamepillar.png'];
    const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    geometry.translate(0, texture.image.height / 2 + heightOffset * texture.image.height, 0); 
    return new THREE.Mesh(geometry, material);
}

function constructFlame(game) {
    const texture = game.textures['images/flame.png'];
    const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    return new THREE.Mesh(geometry, material);
}

const PILLAR_FLAMES = 15;

function constructFirePillar(game) {
    const object = new THREE.Object3D();

    
    object.add(constructFirePillarSegment(game, 0));
    object.add(constructFirePillarSegment(game, 0.95));

    const bbox = new THREE.Box3().setFromObject(object);
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y

    const flames = [];

    for (let i = 1; i < PILLAR_FLAMES; i++) {
        const flame = constructFlame(game)
        const flameScale = 0.25 + Math.random() * 0.5;
        flame.position.y = i * height/PILLAR_FLAMES;
        flame.position.x = width * (-0.5 + Math.random()); 
        flame.rotation.z = (95 + Math.random() * 10) * Math.PI / 180;

        if (i == 7) {
            flame.position.x = 0;
            flame.position.y += 5;
            flame.scale.x = flame.scale.y = 1;

        } else {
            flame.scale.x = flame.scale.y = flameScale;
        }
        object.add(flame);

        flames.push({flame: flame, flameScale: flameScale});
    }

    return [object, flames];
}

function railUpdate(game, delta) {
    if (this.time == 0) {
        this.object.geometry.translate(this.material.map.image.width/2, 0, 0);
        let pos = this.object.position.clone();
        while(true) {
            if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
                game.enemy.damage(this.damage, game);
                break;
            }
        
            if (!game.mapBox.containsPoint(pos)) {
                break
            }

            pos.add(this.velocity);
        }
        this.time++;
    } else {
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.time++;
        }
    }

    if (this.time >= 10) {
        this.material.opacity -= 0.1 * game.timeScale;
    }
    return this.material.opacity <= 0;
}

function updateGrappleLine(game) {
    // Update the line's positions
    const positions = this.line.geometry.attributes.position.array;
    this.object.position.toArray(positions, 0); // Start point
    game.player.group.position.clone().add(game.player.weaponObject.position).toArray(positions, 3); // End point
    this.line.geometry.attributes.position.needsUpdate = true;
}

function grappleUpdate(game, delta) {
    if (this.time == 0) {
        this.time = 1;

        const lineMaterial = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 4 } );

        const points = [];
        points.push( this.object.position );
        points.push( game.player.group.position.clone().add(game.player.weaponObject.position) );

        const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.line = line;
        game.world.add(line);
    }

    if (this.grappled) {
        //this.object.position.copy(game.enemy.group.position.clone().add(this.grappleOffset));

        const worldPosition = this.grappleOffset.clone().applyMatrix4(game.enemy.group.matrixWorld);
        this.object.position.copy(worldPosition);

        updateGrappleLine.apply(this, [game]);

        if (this.grappled.health <= 0) {
            this.grappled = false;
            game.world.remove(this.line);

            return true;
        }

        return false;
    }

    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    
    updateGrappleLine.apply(this, [game]);

    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        game.world.remove(this.line);

        return true;
    }

    if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes) && !game.enemy.grappled) {
        //game.enemy.damage(this.damage, game);
        game.enemy.grappled = true;
        this.grappled = game.enemy;
        this.grappleOffset = this.object.position.clone().sub(game.enemy.group.position);

        
        for(var i = 0; i < 2; i++) {
            const p = this.object.position.clone()
            //p.x += -40 + Math.random() * 80;
            p.y *= -1;
            new Shard(game, p);
        }

        return false;
    }

    if (!game.mapBox.containsPoint(pos)) {
        game.world.remove(this.line);

        return true;
    }

    return false;
}

const weapons = [
    new Weapon("Machine Gun", 'images/weapons/machinegun.png', null, 'pistol', new THREE.Vector2(5, 12), new THREE.Vector2(23, -7.5), 5, 8, 10, 0).setSpread(2),
    new Weapon("Akimbo Mac10's", 'images/weapons/mac10s.png', 'announcerMac10', 'pistol', new THREE.Vector2(-2, 21), new THREE.Vector2(28, -8.5), 4, 8, 9, 50).setSpread(8).setBullets(2, 0, 8),
    new Weapon("Shotgun", 'images/weapons/shotgun.png', 'announcerShotgun', 'shotgun', new THREE.Vector2(5, 12), new THREE.Vector2(30, -7), 25, 8, 15, 14).setBullets(5, 5),
    new Weapon("Shotgun Rockets", 'images/weapons/shotgunrockets.png', 'announcerShotgunrockets', 'shotgunrockets', new THREE.Vector2(7, 19), new THREE.Vector2(34, -8), 40, 7, 40, 8, 'images/shotgunrocketbullet.png').setBullets(3, 10).setUpdate(shotgunRocketUpdate).setDestroy(shotgunRocketDestroy),
    new Weapon("Grenade Launcher", 'images/weapons/grenadelauncher.png', 'announcerGrenadelauncher', 'grenadelauncher', new THREE.Vector2(13, 18), new THREE.Vector2(29, -7), 30, 25, 75, 12, 'images/grenade.png').setUpdate(grenadeUpdate).setDestroy(explosionDestroy),
    new Weapon("RPG", 'images/weapons/rpg.png', new THREE.Vector2(18, 20), 'announcerRpg', 'rpg', new THREE.Vector2(32, -7), 40, 4, 75, 10, 'images/rpgbullet.png').setUpdate(rpgUpdate).setDestroy(explosionDestroy),
    new Weapon("Rocket Launcher", 'images/weapons/rocketlauncher.png', 'announcerRocketlauncher', 'rocketlauncher', new THREE.Vector2(19, 23), new THREE.Vector2(25, -9.5), 50, 7, 100, 8, 'images/rocketbullet.png').setUpdate(rocketUpdate).setDestroy(explosionDestroy),
    new Weapon("Seeker Launcher", 'images/weapons/seekerlauncher.png', 'announcerSeekerlauncher', 'rocketlauncher', new THREE.Vector2(24, 28), new THREE.Vector2(24, -9.5), 55, 7, 100, 6, 'images/seekerbullet.png').setUpdate(seekerUpdate).setDestroy(explosionDestroy),
    new Weapon("Flame Thrower", 'images/weapons/flamethrower.png', 'announcerFlamethrower', 'flame', new THREE.Vector2(9, 16), new THREE.Vector2(29, -7), 1, 9, 2, 150, 'images/flame.png').setSpread(10).setUpdate(flameUpdate),
    new Weapon("Fire Mines", 'images/weapons/mine.png', 'announcerFiremines', null, new THREE.Vector2(-9, 15), new THREE.Vector2(20, -5.5), 100, 3, 5, 3, 'images/minebullet.png').setUpdate(fireMinesUpdate),
    new Weapon("A-Bomb Launcher", 'images/weapons/abomb.png', 'announcerAbomb', 'rocketlauncher', new THREE.Vector2(22, 30), new THREE.Vector2(36, -13), 150, 3, 300, 2, 'images/abombbullet.png').setUpdate(abombUpdate).setDestroy(abombDestroy),
    new Weapon("Rail Gun", 'images/weapons/railgun.png', 'announcerRailgun', 'railgun', new THREE.Vector2(23, 27), new THREE.Vector2(32, -8), 75, 20, 150, 3, 'images/rail.png').setUpdate(railUpdate),
    new Weapon("Grapple Cannon", 'images/weapons/grapplecannon.png', 'announcerGrapplecannon', 'grapple', new THREE.Vector2(18, 23), new THREE.Vector2(33, -11), 250, 20, 300, 2, 'images/grapplebullet.png').setUpdate(grappleUpdate),
    new Weapon("Shoulder Cannon", 'images/weapons/shouldercannon.png', 'railgun', new THREE.Vector2(0, 0), new THREE.Vector2(16, 0), 100, 20, 300, 0, 'images/shouldercannon.png').setUpdate(railUpdate),
];

// Helper to load a texture as a promise
function loadTexture(loader, textures, url) {
    return new Promise((resolve, reject) => {
        loader.load(url, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            textures[url] = texture;
            resolve(texture);
        }, undefined, (error) => {
            console.log(url)
            reject(url, error);
        });
    });
}

async function loadAssets() {
    const textureMap = {};
    // Load the spritesheet
    const loader = new THREE.TextureLoader();
    const textures = [
        loadTexture(loader, textureMap, 'images/tilesheet.png'),
        loadTexture(loader, textureMap, 'images/player.png'),
        loadTexture(loader, textureMap, 'images/bg.png'),
        loadTexture(loader, textureMap, 'images/bullet.png'),
        loadTexture(loader, textureMap, 'images/enemybullet.png'),
        loadTexture(loader, textureMap, 'images/heli/heli.png'),
        loadTexture(loader, textureMap, 'images/heli/helidestroyed.png'),
        loadTexture(loader, textureMap, 'images/heli/enemy.png'),
        loadTexture(loader, textureMap, 'images/guyburned.png'),
        loadTexture(loader, textureMap, 'images/shard0.png'),
        loadTexture(loader, textureMap, 'images/shard1.png'),
        loadTexture(loader, textureMap, 'images/shard2.png'),
        loadTexture(loader, textureMap, 'images/explosion.png'),
        loadTexture(loader, textureMap, 'images/smoke.png'),
        loadTexture(loader, textureMap, 'images/flamepillar.png'),
        loadTexture(loader, textureMap, 'images/blood.png'),
        loadTexture(loader, textureMap, 'images/parachute.png'),
        loadTexture(loader, textureMap, 'images/box.png'),
    ];
    for (const weapon of weapons) {
        textures.push(loadTexture(loader, textureMap, weapon.textureUrl));
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

function setUV(geometry, index, size, width, height) {
    // Calculate UV coordinates based on the index
    const tilesPerRow = width / size;
    const u = (index % tilesPerRow) * size / width;
    const v = 1 - Math.floor(index / tilesPerRow) * size / height;

    // Update UV coordinates
    geometry.attributes.uv.setXY(0, u, v);                            // Bottom-left
    geometry.attributes.uv.setXY(1, u + size / width, v);    // Bottom-right
    geometry.attributes.uv.setXY(2, u, v - size / height);   // Top-left
    geometry.attributes.uv.setXY(3, u + size / width, v - size / height); // Top-right
    
    geometry.attributes.uv.needsUpdate = true;
}

// AABB collision detection function
function checkTileCollisions(entity, timeScale, tilemap, tileSize) {
    const xCol = resolveAxisCollision(entity, timeScale, 'x', tilemap, tileSize);
    const yCol = resolveAxisCollision(entity, timeScale, 'y', tilemap, tileSize);

    return [xCol, yCol];
}

// Helper function to resolve collision along a single axis
function resolveAxisCollision(entity, timeScale, axis, tilemap, tileSize) {
    if (entity.velocity[axis] == 0) {
        return false;
    }

    let point = entity.position[axis] + (entity.velocity[axis] > 0 ? entity.bounds.max[axis] : entity.bounds.min[axis]);
    const tilePos = Math.floor((point + entity.velocity[axis] * timeScale) / tileSize);

    const otherAxis = axis === 'x' ? 'y' : 'x';
    const startOther = Math.floor((entity.position[otherAxis] + entity.bounds.min[otherAxis]) / tileSize);
    const endOther = Math.floor((entity.position[otherAxis] + entity.bounds.max[otherAxis]) / tileSize);

    for (let otherTilePos = startOther; otherTilePos <= endOther; otherTilePos++) {
        const xTile = axis === 'x' ? tilePos : otherTilePos;
        const yTile = axis === 'y' ? tilePos : otherTilePos;

        if (xTile < 0 || yTile < 0 || yTile >= tilemap.length || xTile >= tilemap[yTile].length) {
            continue;
        }

        // Check if tile is solid
        if (tilemap[yTile][xTile][0] === 1) {
            if (entity.velocity[axis] > 0) {
                entity.position[axis] = tilePos * tileSize - entity.bounds.max[axis] - 0.01;
            } else {
                entity.position[axis] = (tilePos + 1) * tileSize - entity.bounds.min[axis];

            }
            
            return true;
        }
    }
    

    entity.position[axis] += entity.velocity[axis] * timeScale;
    return false;
}

function visibleHeightAtZDepth(depth, camera) {
    // compensate for cameras not positioned at z=0
    const cameraOffset = camera.position.z;
    if ( depth < cameraOffset ) depth -= cameraOffset;
    else depth += cameraOffset;
  
    // vertical fov in radians
    const vFOV = camera.fov * Math.PI / 180; 
  
    // Math.abs to ensure the result is always positive
    return 2 * Math.tan( vFOV / 2 ) * Math.abs( depth );
};

function visibleWidthAtZDepth(depth, camera) {
    const height = visibleHeightAtZDepth( depth, camera );
    return height * camera.aspect;
};

function rotateAroundPivot(point, pivot, angle, flip) {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    // Step 1: Translate point to the origin (relative to the pivot)
    const dx = point.x - pivot.x;
    const dy = (flip ? -point.y: point.y) - pivot.y;
    
    // Step 2: Rotate the point
    const rotatedX = dx * cosAngle - dy * sinAngle;
    const rotatedY = dx * sinAngle + dy * cosAngle;

    // Step 3: Translate back to the pivot's position
    return {
        x: rotatedX + pivot.x,
        y: rotatedY + pivot.y,
        z: 0,
    };
}

function createTintShader(texture) {
    const tintShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            map: { value: null },                        // Texture map
            color: { value: new THREE.Color(0xffffff) }, // Base color multiplier
            tint: { value: new THREE.Color(0xffffff) },  // Tint color
            brightness: { value: 2.0 },                  // Brightness multiplier
            tintEnabled: { value: 0.0 },                 // Toggle for tint (1 = enabled, 0 = disabled)
            brightnessEnabled: { value: 0.0 },           // Toggle for brightness (1 = enabled, 0 = disabled)
            opacity: { value: 1.0 }                      // Opacity (1 = fully opaque, 0 = fully transparent)
        },
        transparent: true, // Allow transparency
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv; // Pass UV coordinates to the fragment shader
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D map; // Texture sampler
            uniform vec3 color;    // Base color multiplier
            uniform vec3 tint;     // Tint color
            uniform float brightness; // Brightness multiplier
            uniform float tintEnabled; // Toggle for tint effect
            uniform float brightnessEnabled; // Toggle for brightness effect
            uniform float opacity;       // Opacity
            varying vec2 vUv;      // UV coordinates

            void main() {
                // Sample the texture (assumed to be in linear space)
                vec4 texColor = texture2D(map, vUv);
    
                // Apply the base color multiplier
                vec3 baseColor = texColor.rgb * color;
    
                // Apply tint if enabled
                vec3 tintedColor = mix(baseColor, baseColor * tint, tintEnabled);
    
                // Apply brightness if enabled
                vec3 brightenedColor = mix(tintedColor, tintedColor * brightness, brightnessEnabled);
    
                // Output the final color with alpha modulated by opacity
                gl_FragColor = vec4(brightenedColor, texColor.a * opacity);
            }
        `
    });
    
    // Apply the texture to the shader
    tintShaderMaterial.uniforms.map.value = texture;

    return tintShaderMaterial;
}

const SCREEN_WIDTH = 500;
const SCREEN_HEIGHT = 500 * 9/16;

const HELI_WIDTH = 100;
const HELI_EXIT_OFFSET = 500;

class Enemy {
    constructor() {
        this.position = new THREE.Vector3(0, 0);
        this.velocity = new THREE.Vector2(0, 0);
        this.targetPosition = new THREE.Vector2(0, 0);
        this.playerOffset = new THREE.Vector2(0, 0);

        this.tick = 0;
        this.nextXReposition = Number.POSITIVE_INFINITY;
        this.nextYReposition = Number.POSITIVE_INFINITY;

        this.shoot = 0;

        this.health = 300;
        this.lastHealth = this.health;

        this.tints = [];
        this.tint = 0;
    }

    

    init(game) {
        const heliTexture = this.heliTexture = game.textures['images/heli/heli.png'];
        const destroyedTexture = this.destroyedTexture = game.textures['images/heli/helidestroyed.png'];
        const enemyTexture = this.enemyTexture = game.textures['images/heli/enemy.png'];
        this.bulletTexture = game.textures['images/enemybullet.png'];

        this.group = new THREE.Group();

        this.heliGroup = new THREE.Group();
        this.group.add(this.heliGroup);

        const geometry = new THREE.PlaneGeometry(heliTexture.image.width, heliTexture.image.height);
        const material = new THREE.MeshBasicMaterial({
            map: heliTexture,
            transparent: true,
        });

        const tintMaterial = createTintShader(heliTexture)
        this.tints.push(tintMaterial);

        const mesh = this.mesh = new THREE.Mesh(geometry, tintMaterial);
        this.heliGroup.add(mesh);

        
        const enemyGeometry = new THREE.PlaneGeometry(enemyTexture.image.width, enemyTexture.image.height);
        const enemyMaterial = new THREE.MeshBasicMaterial({
            map: enemyTexture,
            transparent: true,
        });

        const enemyTintMaterial = createTintShader(enemyTexture);
        this.tints.push(enemyTintMaterial);

        const enemyMesh = this.enemyMesh = new THREE.Mesh(enemyGeometry, enemyTintMaterial);
        enemyMesh.position.y = -5;

        this.group.add(enemyMesh);

        const enemyWeapon = this.enemyWeapon = new THREE.Object3D();
        const weaponMesh = weapons[0].createMesh();
        enemyWeapon.add(weaponMesh);
        this.tints.push(weaponMesh.material);

        this.group.add(enemyWeapon);

        game.world.add(this.group)

        this.randomizePosition(game)

        // heliBoxes.forEach((box) => {
        //     // Get the size and center of the bounding box
        //     const size = new THREE.Vector3();
        //     const center = new THREE.Vector3();
        //     box.getSize(size);
        //     box.getCenter(center);
    
        //     // Create a BoxGeometry with the dimensions of the bounding box
        //     const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    
        //     // Create a material for visualization (wireframe helps show bounding volume)
        //     const material = new THREE.MeshBasicMaterial({
        //         color: 0x00ff00, // Green color
        //         wireframe: true, // Wireframe mode to show the outline
        //     });
    
        //     // Create a mesh from the geometry and material
        //     const boxMesh = new THREE.Mesh(geometry, material);
    
        //     // Position the mesh at the center of the bounding box
        //     boxMesh.position.copy(center);
    
        //     // Add the mesh to the scene
        //     this.heliGroup.add(boxMesh);
        // });
    }

    setTint(enabled) {
        for (const tint of this.tints) {
            tint.uniforms.brightnessEnabled.value = enabled ? 1.0 : 0.0;
        }
    }

    destroy(game) {
        game.world.remove(this.group);

        new DestroyedHeli(game, this);
        new DestroyedEnemy(game, this);

        for(var i = 0; i < 3; i++) {
            const p = this.position.clone()
            p.x += -40 + Math.random() * 80;
            p.y += -20 + Math.random() * 40;
            new Shard(game, p);
        }

        new Explosion(game, this.position.clone(), 150);
    }

    randomizePosition(game) {
        this.trackingPlayer = 300 + Math.floor(Math.random() * 200);

        if (Math.random() > 0.25) {
            if (Math.random() > 0.5) {
                this.position.x = camera.position.x - game.visibleWidth/2 -  HELI_EXIT_OFFSET;
            } else {
                this.position.x = camera.position.x + game.visibleWidth/2 + HELI_EXIT_OFFSET;
            }
            this.position.y = game.player.position.y - game.visibleHeight * 0.5;
        } else {
            this.position.x = camera.position.x + game.visibleWidth/2;
            this.position.y = -camera.position.y - HELI_EXIT_OFFSET;
        }

        this.heliGroup.scale.x = Math.random() > 0.5 ? 1 : -1;

        if (this.heliGroup.scale.x == 1) {
            this.enemyMesh.position.x = 10;
        } else {
            this.enemyMesh.position.x = -10;
        }
        this.enemyWeapon.position.set(this.enemyMesh.position.x, this.enemyMesh.position.y - 7, 0);
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            move = true;
        }

        if (this.grappled) {
            if (move) {
                this.velocity.y += 0.5;
            }
            this.group.rotation.z += ((Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale / 8) * Math.PI / 180;
            
            this.position.x += this.velocity.x*game.timeScale;
            this.position.y += this.velocity.y*game.timeScale;

            this.group.position.set(this.position.x, -this.position.y, -1);

            if(isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
                this.position.y -= this.velocity.y * game.timeScale;
                this.velocity.y *= -0.5;
                this.damage(300, game);
            }

            return;
        }

        if (move) {
            if (this.trackingPlayer > 0) {
                if (move) {
                    if (this.nextXReposition++ > 150) {
                        this.nextXReposition = 0;
                        this.playerOffset.x = -SCREEN_WIDTH/2 + Math.random() * SCREEN_WIDTH;
                    }
                    if (this.nextYReposition++ > 80) {
                        this.nextYReposition = 0;
                        this.playerOffset.y = -game.visibleHeight*0.5 + (-2 * Math.random() * 4)*10;
                    }
                    this.trackingPlayer--;
                }

                this.targetPosition.x = Math.max(HELI_WIDTH, Math.min(game.player.position.x+this.playerOffset.x, game.mapWidth - HELI_WIDTH));
                this.targetPosition.y = game.mapHeight+this.playerOffset.y-50;
            } else {
                if (this.trackingPlayer == 0) { 
                    this.randomizeExit = Math.floor(Math.random() * 10)
                }

                if (this.randomizeExit < 4) {
                    this.targetPosition.x = camera.position.x - game.visibleWidth/2 - HELI_EXIT_OFFSET;
                } else if (this.randomizeExit < 8) {
                    this.targetPosition.x = camera.position.x + game.visibleWidth/2 + HELI_EXIT_OFFSET;
                } else {
                    this.targetPosition.y = -camera.position.y - game.visibleHeight;
                }

                this.trackingPlayer--;
            }
        }

        const onScreen = this.isOnScreen();

        var diff = this.targetPosition.clone().sub(this.position);

        if (onScreen && this.trackingPlayer > 0) {
            this.velocity.x = diff.x / 100;
            this.velocity.y = diff.y / 75;
            if (move) {
                this.fireAtPlayer(game);
            }
        } else {
            this.velocity.x = diff.x / 50;
            this.velocity.y = diff.y / 20;
        }

        this.position.x += this.velocity.x*game.timeScale;
        this.position.y += this.velocity.y*game.timeScale;

        this.group.position.set(this.position.x, -this.position.y, -1);

        const r = -this.velocity.x/20 * 15;
		this.group.rotation.z = THREE.MathUtils.damp(this.group.rotation.z, r * Math.PI / 180, 10, delta);

        if (this.trackingPlayer <= 0 && !onScreen) {
            this.randomizePosition(game);
        }

        if (this.lastHealth != this.health) {
            this.setTint(true);
            this.tint = 2;
        }
        this.lastHealth = this.health;
        if (this.tint && move) {
            this.tint--;
            if (this.tint <= 0) {
                this.setTint(false);
            }
        }
    }

    fireAtPlayer(game) {
        // Get object position in world coordinates
        const playerPosition = new THREE.Vector3();
        game.player.weaponObject.getWorldPosition(playerPosition);

        playerPosition.add(game.player.velocity);

        if (game.player.powerup == PREDATOR_MODE) {
            playerPosition.x += Math.sin(game.player.powerupTime * 2 * Math.PI / 180) * 200;
        }

        const enemyPosition = new THREE.Vector3();
        this.enemyWeapon.getWorldPosition(enemyPosition);
        this.aim = Math.atan2(
            playerPosition.y - enemyPosition.y,
            playerPosition.x - enemyPosition.x
        );
        
        if (this.aim > Math.PI/2 || this.aim < -Math.PI/2) {
            this.enemyWeapon.scale.x = -1;
            this.enemyWeapon.rotation.z = this.aim + Math.PI;
        } else {
            this.enemyWeapon.scale.x = 1;
            this.enemyWeapon.rotation.z = this.aim
        }

        if ((this.shoot++%Math.max(20,32-game.level*2)) == 1) {
            this.createBullet(game);
        }
    }

    isOnScreen() {
        const frustum = new THREE.Frustum();
        const cameraViewProjectionMatrix = new THREE.Matrix4();

        // Update frustum with the latest camera position
        camera.updateMatrixWorld(); 
        cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

        // Get mesh's bounding box
        const boundingBox = new THREE.Box3().setFromObject(this.group);

        // Check if the mesh is in the camera's frustum
        const isMeshOnScreen = frustum.intersectsBox(boundingBox);

        return isMeshOnScreen;
    }

    createBullet(game) {
        const pivot = new THREE.Vector3();
        this.enemyWeapon.getWorldPosition(pivot);

        const texture = this.bulletTexture;

        const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });

        const direction = this.aim + (-5 + Math.random()*10) * Math.PI/180
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.z = direction;

        mesh.position.copy(pivot.add(rotateAroundPivot(weapons[0].barrel, zero, this.aim, !(this.aim > Math.PI/2 || this.aim < -Math.PI/2))));
        mesh.position.z = 0.5;

        game.world.add(mesh);

        const bullet = {
            velocity: new THREE.Vector3(
                3.5 * Math.cos(direction),
                3.5 * Math.sin(direction),
                0),
            object: mesh
        };
        game.enemyBullets.push(bullet);
    }

    damage(damage, game) {
        if (game.player.powerup == TRI_DAMAGE) {
            this.health -= damage * 3;
        } else {   
            this.health -= damage;
        }
        audioManager.playEffect('metal' + Math.floor(Math.random() * 4));


        if (this.health <= 0) {
            game.heliDestroyed();
        }
    }
}

class Entity {
    constructor(game, textureUrl) {
        this.textureUrl = textureUrl;
        this.tick = 0;
        this.position = new THREE.Vector2(0, 0, 1);
        this.velocity = new THREE.Vector2(0, 0);
        this.init(game)
    }

    init(game) {
        const texture = this.texture = game.textures[this.textureUrl];

        const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
        const material = this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        const mesh = this.mesh = new THREE.Mesh(geometry, material);
        game.world.add(mesh);

        game.entities.push(this);
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.position.x += this.velocity.x*game.timeScale;
        this.position.y += this.velocity.y*game.timeScale;

        this.updateMesh();

        return false;
    }

    updateMesh() {
        this.mesh.position.set(this.position.x, -this.position.y, this.position.z);
    }

    move(game) {}

    destroy(game) {
        game.world.remove(this.mesh);
    }
}

class DestroyedEnemy extends Entity {
    constructor(game, enemy, permanent) {
        super(game, 'images/guyburned.png');

        this.position.copy(enemy.position);
		this.velocity.set(-3 + Math.random() * 6, -5 + Math.random()*5, 0);
        this.mesh.rotation.z = enemy.group.rotation.z;
        this.permanent = permanent;
    }

    move(game) {
        this.velocity.y += 0.5;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.position.x += this.velocity.x * game.timeScale
        if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
            this.position.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
        }
        this.position.y += this.velocity.y * game.timeScale;
        if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
            if (this.velocity.y < 2) {
                if (this.permanent) {
                    this.position.y = (Math.floor(this.position.y / game.tileSize)) * game.tileSize + 2;
                    return false;
                }
                return true;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.4;
            }

        } else {
            this.mesh.rotation.z += (Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale * Math.PI / 180
        }

        this.updateMesh();
    }
}

class Shard extends Entity {
    constructor(game, position) {
        super(game, 'images/shard' + Math.floor(Math.random() * 3) + '.png');

        this.position.copy(position);
		this.velocity.set(-5 + Math.random() * 10, -5 + Math.random()*10);
        this.mesh.scale.x = Math.random() > 0.5 ? 1 : -1;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;

        this.bounces = 0;
    }

    move(game) {
        this.velocity.y += 0.5;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.move(game);
        }

        this.mesh.rotation.z += (Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale * Math.PI / 180

        this.position.x += this.velocity.x * game.timeScale
        if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
            this.position.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
        }
        this.position.y += this.velocity.y * game.timeScale;
        if (isTileCollision(this.position.x, this.position.y, map1, game.tileSize)) {
            if (this.bounces > 3) {
                return true;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.5;
                this.bounces++;
            }

        }

        this.updateMesh();
    }
}

class DestroyedHeli extends Entity {
    constructor(game, enemy) {
        super(game, 'images/heli/helidestroyed.png');

        this.position.copy(enemy.position);
        this.velocity.copy(enemy.velocity);
        this.mesh.scale.x = enemy.heliGroup.scale.x;
        this.mesh.rotation.z = enemy.group.rotation.z;
    }

    move(game) {
        this.velocity.y += 0.5;
    }

    update(game, delta) {
        super.update(game, delta);

        this.mesh.rotation.z += ((Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale / 4) * Math.PI / 180;

        return isTileCollision(this.position.x, this.position.y, map1, game.tileSize);
    }

    destroy(game) {
        super.destroy(game);

        for(var i = 0; i < 6; i++) {
            const p = this.position.clone()
            p.x += -40 + Math.random() * 80;
            p.y -= this.velocity.y;
            new Shard(game, p);
        }

        new Explosion(game, this.position.clone(), 140);
    }
}

class Explosion extends Entity {
    constructor(game, position, size) {
        super(game, 'images/explosion.png');

        this.position.copy(position);
        this.position.z = 1;
        this.targetSize = size * 0.75 / 374;

        this.mesh.scale.x = this.mesh.scale.y = size / 374;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;

        if (size == 150) {
            audioManager.playEffect('helidestroyed');
        } else if (size > 300) {
            audioManager.playEffect('bigboom');
        } else {
            audioManager.playEffect('boom');
        }
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
           
            this.material.opacity -= 0.05;
            this.mesh.scale.x = THREE.MathUtils.damp(this.mesh.scale.x, this.targetSize, 10, delta)
            this.mesh.scale.y = this.mesh.scale.x;

            if (this.material.opacity <= 0) {
                return true;
            }
        }

        this.updateMesh();

        return false;
    }

    destroy(game) {
        super.destroy(game);
    }
}

class Smoke extends Entity {
    constructor(game, position, size) {
        super(game, 'images/smoke.png');

        this.position.copy(position);
        this.targetSize = size * 0.5 / 27;

        this.mesh.scale.x = this.mesh.scale.y = size / 27;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
           
            this.material.opacity -= 0.05;
            this.mesh.scale.x = THREE.MathUtils.damp(this.mesh.scale.x, this.targetSize, 10, delta)
            this.mesh.scale.y = this.mesh.scale.x;

            if (this.material.opacity <= 0) {
                return true;
            }
        }

        this.updateMesh();

        return false;
    }

    destroy(game) {
        super.destroy(game);
    }
}

class Fire extends Entity {
    constructor(game, position, size) {
        super(game, 'images/flame.png');

        this.position.copy(position);
        this.targetSize = size * 0.5 / 42;

        this.mesh.scale.x = this.mesh.scale.y = size / 42;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
           
            this.material.opacity -= 0.05;
            this.mesh.scale.x = THREE.MathUtils.damp(this.mesh.scale.x, this.targetSize, 10, delta)
            this.mesh.scale.y = this.mesh.scale.x;

            if (this.material.opacity <= 0) {
                return true;
            }
        }

        this.updateMesh();

        return false;
    }

    destroy(game) {
        super.destroy(game);
    }
}

class Blood extends Entity {
    constructor(game, position, pause) {
        super(game, 'images/blood.png');

        this.position.copy(position);
        this.targetSize = 14 / 30;

        this.mesh.scale.x = this.mesh.scale.y = 6 / 30;
        this.mesh.rotation.z = Math.random() * 2 * Math.PI;

        this.pause = pause;
        this.velocity = new THREE.Vector3(Math.cos(this.mesh.rotation.z), Math.sin(this.mesh.rotation.z), 0);
        this.time = 0;
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;

            if (this.pause > 0) {
                this.pause--;
                return false;
            }
            this.time++;
           
            if (this.time >= 10) {
                this.material.opacity -= 0.5;
            }

            this.mesh.scale.x = THREE.MathUtils.damp(this.mesh.scale.x, this.targetSize, 10, delta)
            this.mesh.scale.y = this.mesh.scale.x;

            if (this.material.opacity <= 0) {
                return true;
            }
        }

        this.position.x += this.velocity.x * game.timeScale
        this.position.y += this.velocity.y * game.timeScale

        this.updateMesh();

        return false;
    }

    destroy(game) {
        super.destroy(game);
    }
}

class Parachute {
    constructor(game, parent, opened) {
        
        this.parent = parent; 
    
        const texture = this.texture = game.textures['images/parachute.png'];

        const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
        geometry.translate(0, texture.image.height - 20, 0); 
        const material = this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        const mesh = this.mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = -0.5;
        parent.add(mesh);

        this.opened = opened;
        if (!opened) {
            this.mesh.scale.x = 0;
        }

        this.tick = 0;
    }

    update(game, delta) {
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            
            this.mesh.scale.x = THREE.MathUtils.damp(this.mesh.scale.x, this.opened ? 1 : 0, 20, delta)

            if (this.mesh.scale.x <= 0.1) {
                this.destroy(game);
            }
        }
    }

    destroy(game) {
        this.parent.remove(this.mesh);
    }
}

const BOX_SIZE = 33;

class Box extends Entity {
    constructor(game, position, type) {
        super(game, 'images/box.png');
        this.position.copy(position);

        if (this.position.x < BOX_SIZE/2) {
            this.position.x = BOX_SIZE/2
        } else if (this.position.x > game.mapWidth - BOX_SIZE/2) {
            this.position.x = game.mapWidth - BOX_SIZE/2;
        }
        setUV(this.geometry, type, BOX_SIZE, this.texture.image.width, this.texture.image.height);

        this.type = type;
    }

    init(game) {
        const texture = this.texture = game.textures[this.textureUrl];

        this.group = new THREE.Object3D();

        const geometry = this.geometry = new THREE.PlaneGeometry(BOX_SIZE, BOX_SIZE);
        geometry.translate(0, BOX_SIZE/2, 0);
        

        const material = this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        
        const mesh = this.mesh = new THREE.Mesh(geometry, material);
        this.group.add(mesh);

        game.world.add(this.group);

        setUV(this.geometry, 0, BOX_SIZE, texture.image.width, texture.image.height);

        this.parachute = new Parachute(game, this.group, false);
        this.parachute.opened = true;

        game.entities.push(this);

        this.updateMesh();
    }

    update(game, delta) {
        let move = false;
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;

            if (this.parachute.opened) {
                this.velocity.y = 1;
            } else {
                this.velocity.y += 0.5;
            }
        }

        const pos = this.position;

        pos.x += this.velocity.x * game.timeScale
        pos.y += this.velocity.y * game.timeScale
        
        if (isTileCollision(pos.x - BOX_SIZE/2, pos.y, map1, game.tileSize) || isTileCollision(pos.x + BOX_SIZE/2, pos.y, map1, game.tileSize)) {
            if (this.velocity.y < 2) {
                pos.y = (Math.floor(pos.y / game.tileSize)) * game.tileSize + 2;
                this.velocity.y = 0;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.4;
            }
        }

        if (this.parachute.opened && isTileCollision(pos.x, pos.y + 150, map1, game.tileSize)) {
            this.parachute.opened = false;
        }

        this.parachute.update(game, delta);

        if (isPlayerCollisionRect(pos.x - BOX_SIZE/2, pos.y - BOX_SIZE, BOX_SIZE, BOX_SIZE, game.player)) {
            this.collect(game);
            return true;
        }

        this.updateMesh();

        return false;
    }

    collect(game) {
        // Weapons
        if (this.type < weapons.length) {
            weapons[this.type].collect(game);
        } else if (this.type == weapons.length) {
            game.player.collectPowerup(1+Math.floor(Math.random() * 5));
        } else if (this.type == weapons.length + 1) {
            game.player.health = Math.min(100, game.player.health + 20);
            audioManager.playEffect('announcerHealth');
        }
    }

    updateMesh() {
        // Update position of object, by mapping game position to 3d camera position.
        this.group.position.set(this.position.x, Math.round(-this.position.y), 0.5);
    }

    destroy(game) {
        game.world.remove(this.group);
    }
}

const POWERUP_NONE = 0;
const TRI_DAMAGE = 1;
const INVULNERABILITY = 2;
const PREDATOR_MODE = 3;
const TIME_RIFT = 4;
const JETPACK = 5;

const POWERUP_TIME = 1000;
const MAX_BULLET_TIME = 120;
const HYPERJUMP_RECHARGE = 300;

const walkAnimation = [0, 1, 0, 2];

class Player {
    constructor() {
        this.tick = 0;

        this.position = new THREE.Vector2();
        this.velocity = new THREE.Vector2();
        this.standingBounds = {
            min: new THREE.Vector2(-8, -47),
            max: new THREE.Vector2(8, -2),
        };
        this.crouchingBounds = {
            min: new THREE.Vector2(-8, -37),
            max: new THREE.Vector2(8, -2),
        }
        this.bounds = this.standingBounds;
        this.jumps = 2;
        this.jumping = 0;
        this.weapon = 0;


        this.standingHand = new THREE.Vector2(0, 19);
        this.crouchingHand = new THREE.Vector2(0, 15);

        this.hand = this.standingHand;
        this.aim = 0;
        this.health = 100;
        this.lastHealth = 100;
        this.tint = 0;
        this.bulletTime = MAX_BULLET_TIME;
        this.hyperJump = HYPERJUMP_RECHARGE;

        this.frame = 0;
        this.walkTimer = 0;
        this.walkAnimationIndex = 0;
        this.inAir = false;

        this.crouch = false;
        this.dead = false;

        this.powerup = -1;
        this.powerupTime = 0;
    }

    init(game) {
        const playerTexture = game.textures['images/player.png'];

        const size = this.size = 55;
        this.textureWidth = playerTexture.image.width;
        this.textureHeight = playerTexture.image.height;

        this.tints = [];

        const group = this.group = new THREE.Group();

        const geometry = this.geometry = new THREE.PlaneGeometry(size, size);
        const material = createTintShader(playerTexture);
        /*new THREE.MeshBasicMaterial({
            map: playerTexture,
            transparent: true,
        });*/
        this.tints.push(material);
        
        const body = new THREE.Mesh(geometry, material);
        body.position.set(0, size/2, -0.2);
        this.setFrame(0);
        group.add(body);

        const weaponObject = this.weaponObject = new THREE.Object3D()
        weaponObject.add(weapons[0].mesh);

        for (const weapon of weapons) {
            this.tints.push(weapons[0].mesh.material);
        }

        weaponObject.position.set(this.hand.x, this.hand.y, -0.1);
        weaponObject.rotation.z = -Math.PI/4;

        group.add(weaponObject);

        game.world.add(group);

        this.updateMesh();

        weapons[0].ammo = Number.POSITIVE_INFINITY;
        for (let i = 1; i < weapons.length; i++) {
            weapons[i].ammo = 0;
        }

        this.selectWeapon(0);
        weapons[this.weapon].reloading = Number.POSITIVE_INFINITY;

        this.position.x = game.tileSize;
        this.position.y = 0;

        this.parachute = new Parachute(game, group, true);
    }

    setFrame(frame) {
        this.frame = frame
        setUV(this.geometry, this.frame, this.size, this.textureWidth, this.textureHeight);
    }

    setTint(enabled, color) {
        for (const tint of this.tints) {
            tint.uniforms.tintEnabled.value = enabled ? 1.0 : 0.0;
            if (enabled) {
                tint.uniforms.tint.value = color;
            }
        }
    }

    setOpacity(opacity) {
        for (const tint of this.tints) {
            tint.uniforms.opacity.value = opacity;
        }
    }
    
    selectWeapon(weaponIndex) {
        this.weaponObject.remove(weapons[this.weapon].mesh);
        this.weapon = weaponIndex;
        const weapon = weapons[weaponIndex];
        this.weaponObject.add(weapon.mesh);
    }

    selectWeaponDirection(direction) {
        if (this.powerup == PREDATOR_MODE) {
            return;
        }
        let weapon = weapons[this.weapon + direction];
        for (var i = 1; i < weapons.length; i++) {
            const index = THREE.MathUtils.euclideanModulo(this.weapon + i*direction, weapons.length)
            if (weapons[index].ammo > 0) {
                this.selectWeapon(index);
                break;
            }
        }
    }

    updateMesh() {
        // Update position of object, by mapping game position to 3d camera position.
        this.group.position.set(this.position.x, Math.round(-this.position.y), 0.5);
    }

    update(game, delta) {
        let move = false;

        let timeScale = game.timeScale;
        if (this.powerup == TIME_RIFT) {
            timeScale = 1;
        }

        this.tick += timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            move = true;
        }

        if (this.parachute.opened) {
            this.velocity.y = 2;
            if (map1[Math.floor((this.position.y + 6 * game.tileSize) / game.tileSize)][Math.floor(this.position.x / game.tileSize)][0] == 1) {
                this.parachute.opened = false;
                game.enemy = new Enemy()
                game.enemy.init(game);
            }
        } else {
            if (move) {
                if ((this.bulletTime > 0 && keyIsPressed['Shift']) || this.powerup == TIME_RIFT) {
                    game.timeScale = Math.max(0.2, game.timeScale - 0.1);
                    if (this.powerup != TIME_RIFT) {
                        this.bulletTime--;
                    }
                } else {
                    game.timeScale = Math.min(1, game.timeScale + 0.1);
                }

                if (keyIsPressed['ArrowDown']) {
                    if (!this.crouch) {
                        this.crouch = true;
                        this.bounds = this.crouchingBounds;
                        this.hand = this.crouchingHand;
                        this.weaponObject.position.set(this.hand.x, this.hand.y, -0.1);
                        this.setFrame(5);
                    }
                } else if (this.crouch) {
                    this.crouch = false;
                    this.bounds = this.standingBounds;
                    this.hand = this.standingHand;
                    this.weaponObject.position.set(this.hand.x, this.hand.y, -0.1);
                }

                if ((this.crouch && !this.inAir) || keyIsPressed['ArrowLeft'] == keyIsPressed['ArrowRight']) {
                    if (this.velocity.x > 0)  {
                        this.velocity.x = Math.max(0, this.velocity.x - 1);
                    } else if (this.velocity.x < 0) {
                        this.velocity.x = Math.min(0, this.velocity.x + 1);
                    }
                } else if (keyIsPressed['ArrowLeft']) {
                    this.velocity.x = -3;
                } else if (keyIsPressed['ArrowRight']) {
                    this.velocity.x = 3;
                }

                if (this.hyperJump < HYPERJUMP_RECHARGE){
                    this.hyperJump++;
                } else if (keyIsPressed['Control'] && this.canJump) {
                    this.velocity.y = Math.min(this.velocity.y, -25);
                    this.inAir = true;
                    this.canJump = false;
                    this.jumps++;
                    this.hyperJump = 0;
                    audioManager.playEffect('hyperjump');
                }

                if (keyIsPressed['ArrowUp']) { 
                    if (this.powerup == JETPACK) {
                        this.velocity.y = Math.max(Math.min(this.velocity.y, -6), -25);
                        this.inAir = true;
                    } else if (this.canJump && this.jumps < 2) {
                        this.canJump = false;
                        this.jumps++;
                        this.jumping = 8;
                        this.velocity.y = Math.min(this.velocity.y, -6);
                        this.inAir = true;
                    } else if (this.jumping > 0) {
                        this.velocity.y = Math.min(this.velocity.y, -6);
                        this.inAir = true;
                        this.jumping--;
                    }
                } else {
                    this.canJump = true;
                    this.jumping = 0;
                }

                this.velocity.y = Math.min(this.velocity.y + 0.5, game.tileSize);
            }

            if (this.crouch) {
                this.setFrame(5);
            } else if (this.inAir) {
                if (this.jumps == 1) {
                    this.setFrame(3);
                } else {
                    this.setFrame(4);
                }
            } else if (Math.abs(this.velocity.x) >= 1) {
                if (move) {
                    this.setFrame(walkAnimation[this.walkAnimationIndex]);

                    this.walkTimer++;
                    if (this.walkTimer >= 8) {
                        this.walkTimer = 0;
                        this.walkAnimationIndex = (this.walkAnimationIndex+1)%walkAnimation.length;
                    }
                }
            } else {
                this.setFrame(0);
            }
        }
        this.parachute.update(game, delta);
        
        let [xCol, yCol] = checkTileCollisions(this, timeScale, map1, game.tileSize);

        if (this.position.x + this.bounds.min.x <= 0) {
            this.position.x = -this.bounds.min.x;
        } else if (this.position.x + this.bounds.max.x >= game.mapWidth) {
            this.position.x = this.mapWidth - this.bounds.max.x;
        }

        if (this.position.y + this.bounds.max.y >= game.mapHeight) {
            this.position.y = this.mapHeight - this.bounds.max.y;
            yCol = true;          
        }

        if (xCol) {
            this.velocity.x = 0;
        }

        if (yCol) {
            if (this.velocity.y > 0) {
                this.jumps = 0;
                this.jumping = 0;
                if (this.inAir) {
                    this.inAir = false;
                    this.setFrame(0);
                    this.walkAnimationIndex = 0;
                    this.walkTimer = 0;
                }
            }
            this.velocity.y = 0;

        }
        
        this.aim = calculateAngleToMouse(this.weaponObject, mouse);
        if (this.aim > Math.PI/2 || this.aim < -Math.PI/2) {
            this.weaponObject.scale.x = -1;
            this.weaponObject.rotation.z = this.aim + Math.PI;
        } else {
            this.weaponObject.scale.x = 1;
            this.weaponObject.rotation.z = this.aim
        }

        if (move) {
            if (mouse.wheel != 0) {
                //this.selectWeapon(THREE.MathUtils.euclideanModulo(this.weapon - mouse.wheel, weapons.length));
                this.selectWeaponDirection(mouse.wheel);
                mouse.wheel = 0;
            }

            const weapon = weapons[this.weapon];
            weapon.reloading++;
            if (mouse.down) {
                if (weapon.reloading >= weapon.reloadTime) {
                    weapon.createBullet(game);
                    weapon.ammo--;
                    weapon.reloading = 0;
                    if (weapon.ammo <= 0) {
                        this.selectWeaponDirection(1);
                    }
                }
            }

            if (this.powerup != POWERUP_NONE) {
                this.powerupTime--;
                if (this.powerupTime <= 0) {
                    this.endPowerup(game);
                }
                if (this.powerup == PREDATOR_MODE) {
                    this.setOpacity(0.0);
                    if((this.powerupTime%10) == 4){
                        this.setOpacity(0.1);	
                    }
                    if((this.powerupTime%10) == 8){
                        this.setOpacity(0.04);	
                    }
                } else if (this.powerup == JETPACK && this.inAir && (this.powerupTime % 3) == 0) {
                    new Smoke(game, this.position, 20);
                }
            }
        }

        this.updateMesh();

        if (this.lastHealth > this.health) {
            shaderPass.uniforms.tintEnabled.value = 1.0;
            this.tint = 2;
        }
        this.lastHealth = this.health;
        if (this.tint && move) {
            this.tint--;
            if (this.tint <= 0) {
                shaderPass.uniforms.tintEnabled.value = 0.0;
            }
        }

        
    }

    collectPowerup(type, game) {
        if (this.powerup) {
            this.endPowerup(game);
        }
        this.powerupTime = POWERUP_TIME;
        this.powerup = type;
        if(type == TRI_DAMAGE){
            console.log("TriDamage");	
            this.setTint(true, new THREE.Color(0, 0, 1));
            audioManager.playEffect('announcerTridamage');
        }else if(type == INVULNERABILITY){
            console.log("Invulnerability");	
            this.setTint(true, new THREE.Color(1, 0, 0));
            audioManager.playEffect('announcerInvulnerability');
        }else if(type == PREDATOR_MODE){
            console.log("PredatorMode");
            shaderPass.uniforms.invertEnabled.value = 1.0;

            this.previousWeapon = this.weapon;
            const shoulderCannon = weapons[weapons.length-1];
            shoulderCannon.ammo = Number.POSITIVE_INFINITY;
            shoulderCannon.reloading = Number.POSITIVE_INFINITY;
            this.selectWeapon(weapons.length-1);
            audioManager.playEffect('announcerPredatormode');
        }else if(type == TIME_RIFT){
            console.log("TimeRift");
            this.setTint(true, new THREE.Color(0, 1, 0));
            audioManager.playEffect('announcerTimerift');
        }else if(type == JETPACK){
            console.log("Jetpack");	
            audioManager.playEffect('announcerJetpack');
        }
    }

    endPowerup(game) {
        if (this.powerup == PREDATOR_MODE) {
            const shoulderCannon = weapons[weapons.length-1];
            shoulderCannon.ammo = 0;
            this.selectWeapon(this.previousWeapon);
        }
        this.powerup = POWERUP_NONE;
        this.setTint(false);
        this.setOpacity(1.0);
        shaderPass.uniforms.invertEnabled.value = 0.0;
    }

    destroy(game) {
        game.timeScale = 0.2;
        shaderPass.uniforms.tintEnabled.value = 1.0;
        this.dead = true;
        game.world.remove(this.group);
        new DestroyedEnemy(game, this, true);
        new Explosion(game, this.position.clone(), 500);
    }
}

const zero = new THREE.Vector3();

class Game {
    constructor() {
        this.enemy = null;
        this.level = 0;
        this.score = 0;
        this.helisDestroyed = 0;
        this.nextHealth = 15;
    }

    init(textures) {
        this.textures = textures;

        const tilesheet = this.tilesheet = textures['images/tilesheet.png'];
        const bgTexture = this.bgTexture = textures['images/bg.png'];
        const bulletTexture = this.bulletTexture = textures['images/bullet.png'];

        const tileSize = this.tileSize = 50;

        const world = this.world = new THREE.Group();
        scene.add(world)

        // Set up background
        const bgGeometry = new THREE.PlaneGeometry(bgTexture.image.width, bgTexture.image.height); // Adjust size as needed
        const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture });
        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        background.position.set(bgTexture.image.width / 2, -bgTexture.image.height / 2, -500); // Move it behind other elements
        // scene.add(background);

        scene.background = bgTexture;
        
        const mapHeight = this.mapHeight = map1.length * tileSize;
        const mapWidth = this.mapWidth = map1[0].length * tileSize;
        this.visibleWidth = visibleWidthAtZDepth(0, camera);
        this.visibleHeight = visibleHeightAtZDepth(0, camera);

        const bgLayer = this.buildMap(bg1);
        bgLayer.position.set(0, mapHeight - tileSize * 4, -200);
        bgLayer.scale.x = 2;
        bgLayer.scale.y = 2;
        world.add(bgLayer);

        // Add layers to the scene
        const mapLayer = this.buildMap(map1);
        world.add(mapLayer);
        
        const mapBox = this.mapBox = new THREE.Box3(new THREE.Vector3(0, -mapHeight, 0), new THREE.Vector3(mapWidth, 0, 0));
        mapBox.expandByScalar(tileSize);

        const clock = this.clock = new THREE.Clock();
        let accumulator = this.accumulator = 0;

        let timeScale = this.timeScale = 1;

        const playerBullets = this.playerBullets = [];
        const enemyBullets = this.enemyBullets = [];
        this.entities = [];

        this.player = new Player()
        this.player.init(this);

        this.updateCameraPosition(Number.POSITIVE_INFINITY);

        audioManager.playEffect('bigboom');
    }

    buildMap(map) {
        const tileSize = this.tileSize;
        const group = new THREE.Group();
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const [_, index] = map[y][x];
                
                // Skip empty tiles
                if (index === 0) continue;
                
                // Create geometry and material with UV mapping
                const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
                const material = new THREE.MeshBasicMaterial({ 
                    map: this.tilesheet,
                    transparent: true
                });

                const sheetWidth = this.tilesheet.image.width;
                const sheetHeight = this.tilesheet.image.height;

                setUV(geometry, index - 1, tileSize, sheetWidth, sheetHeight);

                geometry.translate(tileSize / 2, -tileSize / 2, 0);
                
                // Create the tile mesh and position it in the grid
                const tile = new THREE.Mesh(geometry, material);
                tile.position.set(x * tileSize, -y * tileSize, 0);
                group.add(tile);

                // createBlueLine(x * tileSize, -y * tileSize, group)
            }
        }
        
        return group;
    };

    createBullet(weapon, rotation, offset) {
        const pivot = new THREE.Vector3();
        this.player.weaponObject.getWorldPosition(pivot);

        const texture = weapon.bulletTexture || this.bulletTexture;

        const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });

        const player = this.player;

        const direction = player.aim + rotation * Math.PI/180
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.z = direction;

        const pos = pivot.add(rotateAroundPivot(weapon.barrel, zero, player.aim, !(player.aim > Math.PI/2 || player.aim < -Math.PI/2)));
        if (offset) {
            pos.x += offset * Math.cos(direction);
            pos.y += offset * Math.sin(direction);
        }
        pos.z = 0.5;
        mesh.position.copy(pos);

        this.world.add(mesh);

        const bullet = {
            velocity: new THREE.Vector3(
                weapon.bulletSpeed * Math.cos(direction),
                weapon.bulletSpeed * Math.sin(direction),
                0),
            damage: weapon.damage,
            object: mesh,
            material: material,
            update: weapon.update,
        };

        if (weapon.update) {
            bullet.update = weapon.update;
            bullet.tick = 0;
            bullet.time = 0;
        }

        if (weapon.destroy) {
            bullet.destroy = weapon.destroy;
        }

        this.playerBullets.push(bullet);
        
    }

    updateCameraPosition(delta) {
        let worldPos = new THREE.Vector3();
        this.player.group.getWorldPosition(worldPos);

        this.visibleWidth = visibleWidthAtZDepth(0, camera);
        this.visibleHeight = visibleHeightAtZDepth(0, camera);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, Math.min(Math.max(Math.round(worldPos.x), this.visibleWidth/2), this.mapWidth - this.visibleWidth/2), 10, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, Math.min(Math.max(Math.round(worldPos.y), -(this.mapHeight - this.visibleHeight/2)), -this.visibleHeight/2), 10, delta);
    }

    updateBullets(delta) {
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            //bullet.object.rotation.z += 5 * Math.PI/180;

            let remove = false;

            if (bullet.update) {
                remove ||= bullet.update.apply(bullet, [this, delta]);
            } else {
                remove ||= defaultBulletUpdate.apply(bullet, [this, delta]);
            }

            if (remove && bullet.destroy) {
                bullet.destroy.apply(bullet, [this]);
            }

            if (remove) {
                this.playerBullets.splice(i, 1);
                game.world.remove(bullet.object);
            }
        }
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            const bulletPos = bullet.object.position;
            bulletPos.x += bullet.velocity.x * this.timeScale;
            bulletPos.y += bullet.velocity.y * this.timeScale;

            let remove = false;

            if (isPlayerCollision(bulletPos.x, -bulletPos.y, this.player)) {
                if (this.player.powerup != INVULNERABILITY) {
                    this.player.health -= 10;
                    audioManager.playEffect('hurt');
                }
                for (let i = 0; i < 3; i++) {
                    new Blood(game, new THREE.Vector3(bulletPos.x, -bulletPos.y, 0), i * 2);
                }
                if (this.player.health <= 0 && !this.player.dead) {
                    this.player.destroy(this);
                    this.enemy.destroy(this);
                    this.enemy = null;
                }
                remove = true; 
            }

            if (isTileCollision(bulletPos.x, -bulletPos.y, map1, this.tileSize)) {
                remove = true;
            }

            if (remove || !this.mapBox.containsPoint(bulletPos)) {
                this.enemyBullets.splice(i, 1);
                game.world.remove(bullet.object);
            }
        }
    }

    updateEntities(delta) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (entity.update(this, delta)) {
                this.entities.splice(i, 1);
                entity.destroy(this);
            }
        }
    }

    update() {
        const delta = this.clock.getDelta();

        this.accumulator += delta;

        if (this.accumulator > 1/60) {
            if (!this.player.dead) {
                this.player.update(this, delta);
            }
            if (this.enemy) {
                this.enemy.update(this, delta);
            }
            this.updateBullets(delta);
            this.updateEntities(delta);
            this.updateCameraPosition(delta);
            this.accumulator %= 1/60;
        };
        
    }

    heliDestroyed() {
        this.score += 300;        
        
        this.player.bulletTime = Math.min(MAX_BULLET_TIME, this.player.bulletTime + MAX_BULLET_TIME / 3);

        this.helisDestroyed++;
        if (this.helisDestroyed == this.nextHealth) {
            new Box(this, this.enemy.position, weapons.length+1);
            this.nextHealth *= 2;
        } else if ((this.helisDestroyed % 3) == 0) {
            // Account for shoulder cannon box and machinegun.
            let type = 1 + Math.floor(Math.random() * (weapons.length - 1));
            if (type == weapons.length - 1) {
                type++;
            }
            new Box(this, this.enemy.position, type);
        }

        if (this.player.position.y < this.enemy.position.y) {
            const weapon = 1 + Math.floor(Math.random() * 8);
            let ammo = 1;
            switch (weapon) {
                case 1:
                    ammo = 10;
                    break;
                case 2:
                    ammo = 3;
                    break;
                case 3:
                    ammo = 3;
                    break;
                case 4:
                    ammo = 2
                    break;
                case 5:
                    ammo = 2;
                    break;
                case 6:
                    ammo = 2;
                    break;
                case 7:
                    ammo = 1;
                    break;
                case 8:
                    ammo = 30;
                    break;
                case 9:
                    ammo = 1;
                    break
            }
            weapons[weapon].ammo += ammo;
        }

        this.enemy.destroy(this);

        game.enemy = new Enemy()
        game.enemy.init(game);
    }
}

function isTileCollision(x, y, tilemap, tileSize) {
    x = Math.floor(x/tileSize);
    y = Math.floor(y/tileSize);

    if (x < 0 || y < 0) {
        return true;
    }

    if (y >= tilemap.length || x >= tilemap[y].length) {
        return true;
    }

    return tilemap[y][x][0] == 1;
}

function isPlayerCollision(x, y, player) {
    const pos = player.position;
    const bounds = player.bounds
    return x >= pos.x + player.bounds.min.x && x <= pos.x + player.bounds.max.x && y >= pos.y + player.bounds.min.y && y <= pos.y + player.bounds.max.y;
}

function isPlayerCollisionRect(x, y, width, height, player) {
    const pos = player.position;
    const bounds = player.bounds;
    return x + width >= pos.x + player.bounds.min.x && x <= pos.x + player.bounds.max.x && y + height >= pos.y + player.bounds.min.y && y <= pos.y + player.bounds.max.y;
}

var heliBoxes = [
    new THREE.Box3(new THREE.Vector3(-88, 13, -5), new THREE.Vector3(-72, 28, 5)),
    new THREE.Box3(new THREE.Vector3(-88, -29, -5), new THREE.Vector3(-31, 13, 5)),
    new THREE.Box3(new THREE.Vector3(-31, -37, -5), new THREE.Vector3(55, 35, 5)),
    new THREE.Box3(new THREE.Vector3(55, 0, -5), new THREE.Vector3(77, 20, 5)),
    new THREE.Box3(new THREE.Vector3(55, -33, -5), new THREE.Vector3(100, -1, 5)),
];

function checkPointCollisionWithBoxes(point, enemy, boxes) {
    if (!enemy) {
        return;
    }

    // Convert the world-space point to the object's local space
    const localPoint = point.clone();
    enemy.heliGroup.worldToLocal(localPoint);

    for (const box of boxes) {
        if (box.containsPoint(localPoint)) {
            return true;
        }
    }

    return false;
}

function checkBoxCollisionWithBoxes(testBox, enemy, boxes) {
    // // Convert the world-space point to the object's local space
    const localPoint = new THREE.Vector3();
    enemy.heliGroup.worldToLocal(localPoint);
    // localPoint.multiplyScalar(-1)

    const localBox = testBox.clone().translate(localPoint);

    for (const box of boxes) {
        if (box.intersectsBox(localBox)) {
            return true;
        }
    }

    return false;
}



init();