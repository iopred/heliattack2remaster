import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { Vector2 } from 'three';
import { Vector3 } from 'three';
import {Tween, Easing} from '@tweenjs/tween.js'
import { mx_bilerp_0 } from 'three/src/nodes/materialx/lib/mx_noise.js';
import { velocity } from 'three/webgpu';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

camera.position.set(0, 0, 300);
camera.lookAt(0, 0, 0);

THREE.ColorManagement.enabled = true;

const renderer = new THREE.WebGLRenderer();
// renderer.outputEncoding = THREE.sRGBEncoding;
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2; // Optional, to fine-tune

renderer.setSize(window.innerWidth, window.innerHeight);
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

	renderer.render(scene, camera);
}

function onWindowResize() {


    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Key handling
const keyIsPressed = {
    'ArrowLeft': false,
    'ArrowRight': false,
    'ArrowUp': false,
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
    //console.log("mouse position: (" + mouse.x + ", "+ mouse.y + ")");
    manageRaycasterIntersections(scene, camera, mouse);
    mouse.down = true;
}


function onMouseUp(event){
    mouse.down = false;
}

function onMouseWheel(event){
    if (event.deltaY < 0) {
        mouse.wheel = -1;
    } else if (event.deltaY > 0) {
        mouse.wheel = 1;
    }
};

let game;

function init() {
    window.addEventListener('resize', onWindowResize);
    
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    window.addEventListener('wheel', onMouseWheel, false);

    window.addEventListener('keydown', (e) => { keyIsPressed[e.key] = true; });
    window.addEventListener('keyup', (e) => { keyIsPressed[e.key] = false; });


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
    constructor(name, textureUrl, origin /* {THREE.Vector2} */, barrel /* {THREE.Vector2} */, reloadTime, bulletSpeed, damage, bulletTextureUrl) {
        this.name = name;
        this.textureUrl = textureUrl;
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
        const material = new THREE.MeshBasicMaterial({
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
        let rot = 0;
        if (this.bullets > 1) {
            rot = -this.bulletsSpread * this.bullets / 2;
        }
        for (var i = 0; i < this.bullets; i++) {
            game.createBullet(this, rot + THREE.MathUtils.randFloat(-this.spread, this.spread), this.bulletsOffset * i / this.bullets);
            rot += this.bulletsSpread;
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

        if (this.time % 8 == 0) {
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

        if (this.time % 8 == 0) {
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

        if (this.time % 8 == 0) {
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
            flame.flame.scale.x = flame.flame.scale.y += getScaleDelta(FIRE_TIME, this.time, flame.flameScale, flame.flameScale * 1.25 );
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
            pos.y = -(Math.floor(-pos.y / game.tileSize)) * game.tileSize + 4;

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
    game.playerGroup.position.clone().add(game.playerWeapon.position).toArray(positions, 3); // End point
    this.line.geometry.attributes.position.needsUpdate = true;
}

function grappleUpdate(game, delta) {
    if (this.time == 0) {
        this.time = 1;

        const lineMaterial = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 4 } );

        const points = [];
        points.push( this.object.position );
        points.push( game.playerGroup.position.clone().add(game.playerWeapon.position) );

        const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.line = line;
        scene.add(line);
    }

    if (this.grappled) {
        //this.object.position.copy(game.enemy.group.position.clone().add(this.grappleOffset));

        const worldPosition = this.grappleOffset.clone().applyMatrix4(game.enemy.group.matrixWorld);
        this.object.position.copy(worldPosition);

        updateGrappleLine.apply(this, [game]);

        if (this.grappled.health <= 0) {
            this.grappled = false;
            scene.remove(this.line);

            return true;
        }

        return false;
    }

    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    
    updateGrappleLine.apply(this, [game]);

    if (isTileCollision(pos.x, -pos.y, map1, game.tileSize)) {
        scene.remove(this.line);

        return true;
    }

    if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes) && !game.enemy.grappled) {
        //game.enemy.damage(this.damage, game);
        game.enemy.grappled = true;
        this.grappled = game.enemy;
        this.grappleOffset = this.object.position.clone().sub(game.enemy.group.position);

        return false;
    }

    if (!game.mapBox.containsPoint(pos)) {
        scene.remove(this.line);

        return true;
    }

    return false;
}


const weapons = [
    new Weapon("Machine Gun", 'images/weapons/machinegun.png', new THREE.Vector2(5, 12), new THREE.Vector2(23, -7.5), 5, 8, 10).setSpread(2),
    new Weapon("Akimbo Mac10's", 'images/weapons/mac10s.png', new THREE.Vector2(-2, 21), new THREE.Vector2(28, -8.5), 4, 8, 9).setSpread(8).setBullets(2, 0, 8),
    new Weapon("Shotgun", 'images/weapons/shotgun.png', new THREE.Vector2(5, 12), new THREE.Vector2(30, -7), 25, 8, 15).setBullets(5, 5),
    new Weapon("Shotgun Rockets", 'images/weapons/shotgunrockets.png', new THREE.Vector2(7, 19), new THREE.Vector2(34, -8), 40, 7, 40, 'images/shotgunrocketbullet.png').setBullets(3, 10).setUpdate(shotgunRocketUpdate).setDestroy(shotgunRocketDestroy),
    new Weapon("Grenade Launcher", 'images/weapons/grenadelauncher.png', new THREE.Vector2(13, 18), new THREE.Vector2(29, -7), 30, 25, 75, 'images/grenade.png').setUpdate(grenadeUpdate).setDestroy(explosionDestroy),
    new Weapon("RPG", 'images/weapons/rpg.png', new THREE.Vector2(18, 20), new THREE.Vector2(32, -7), 40, 4, 75, 'images/rpgbullet.png').setUpdate(rpgUpdate).setDestroy(explosionDestroy),
    new Weapon("Rocket Launcher", 'images/weapons/rocketlauncher.png', new THREE.Vector2(19, 23), new THREE.Vector2(25, -9.5), 50, 7, 100, 'images/rocketbullet.png').setUpdate(rocketUpdate).setDestroy(explosionDestroy),
    new Weapon("Seeker Launcher", 'images/weapons/seekerlauncher.png', new THREE.Vector2(24, 28), new THREE.Vector2(24, -9.5), 55, 7, 100, 'images/seekerbullet.png').setUpdate(seekerUpdate).setDestroy(explosionDestroy),
    new Weapon("Flame Thrower", 'images/weapons/flamethrower.png', new THREE.Vector2(9, 16), new THREE.Vector2(29, -7), 1, 8, 2, 'images/flame.png').setSpread(10).setUpdate(flameUpdate),
    new Weapon("Fire Mines", 'images/weapons/mine.png', new THREE.Vector2(-9, 15), new THREE.Vector2(20, -5.5), 100, 3, 5, 'images/minebullet.png').setUpdate(fireMinesUpdate),
    new Weapon("A-Bomb Launcher", 'images/weapons/abomb.png', new THREE.Vector2(22, 30), new THREE.Vector2(36, -13), 150, 3, 300, 'images/abombbullet.png').setUpdate(abombUpdate).setDestroy(abombDestroy),
    new Weapon("Rail Gun", 'images/weapons/railgun.png', new THREE.Vector2(23, 27), new THREE.Vector2(32, -8), 75, 20, 150, 'images/rail.png').setUpdate(railUpdate),
    new Weapon("Grapple Cannon", 'images/weapons/grapplecannon.png', new THREE.Vector2(18, 23), new THREE.Vector2(33, -11), 250, 20, 300, 'images/grapplebullet.png').setUpdate(grappleUpdate),
    new Weapon("Shoulder Cannon", 'images/weapons/shouldercannon.png', new THREE.Vector2(0, 0), new THREE.Vector2(16, 0), 100, 20, 300, 'images/shouldercannon.png').setUpdate(railUpdate),
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
    const u = ((index-1) % tilesPerRow) * size / width;
    const v = 1 - Math.floor((index-1) / tilesPerRow) * size / height;

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
    }

    createTintShader(texture) {
        const tintShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: null },                       // Texture map
                color: { value: new THREE.Color(0xffffff) }, // Base color multiplier
                tint: { value: new THREE.Color(0xffffff) },  // Tint color
                brightness: { value: 2.0 },                  // Brightness multiplier
                enabled: { value: 0.0 }                      // Toggle (1 = enabled, 0 = disabled)
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
                uniform float enabled;    // Toggle for effect
                varying vec2 vUv;      // UV coordinates
        
                void main() {
                    // Sample the texture directly (Three.js now handles SRGBColorSpace)
                    vec4 texColor = texture2D(map, vUv);
        
                    // Apply the base color multiplier
                    vec3 baseColor = texColor.rgb * color;
        
                    // Apply tint and brightness
                    vec3 tintedColor = baseColor * tint * brightness;
        
                    // Mix between base color and tinted color based on enabled flag
                    vec3 finalColor = mix(baseColor, tintedColor, enabled);
        
                    // Output the final color with alpha
                    gl_FragColor = vec4(finalColor, texColor.a); // Preserve texture alpha
                }
            `
        });
        
        // Apply the texture to the shader
        tintShaderMaterial.uniforms.map.value = texture;

        return tintShaderMaterial;
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

        const tintMaterial = this.createTintShader(heliTexture)

        const mesh = this.mesh = new THREE.Mesh(geometry, material);
        this.heliGroup.add(mesh);

        
        const enemyGeometry = new THREE.PlaneGeometry(enemyTexture.image.width, enemyTexture.image.height);
        const enemyMaterial = new THREE.MeshBasicMaterial({
            map: enemyTexture,
            transparent: true,
        });

        const enemyMesh = this.enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemyMesh.position.y = -5;

        this.group.add(enemyMesh);

        const enemyWeapon = this.enemyWeapon = new THREE.Object3D()
        enemyWeapon.add(weapons[0].createMesh());

        this.group.add(enemyWeapon);

        scene.add(this.group)

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

    destroy(game) {
        scene.remove(this.group);

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
            this.group.rotation.z += ((Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) * game.timeScale / 4) * Math.PI / 180;
            
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
                this.targetPosition.y = game.player.position.y+this.playerOffset.y;
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
    }

    fireAtPlayer(game) {
        // Get object position in world coordinates
        const playerPosition = new THREE.Vector3();
        game.playerWeapon.getWorldPosition(playerPosition);

        playerPosition.add(game.player.velocity);

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

        const player = this.player;

        const direction = this.aim + (-5 + Math.random()*10) * Math.PI/180
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.z = direction;

        mesh.position.copy(pivot.add(rotateAroundPivot(weapons[0].barrel, zero, this.aim, !(this.aim > Math.PI/2 || this.aim < -Math.PI/2))));

        scene.add(mesh);

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
        this.health -= damage;
        if (this.health <= 0) {
            this.destroy(game);

            // TODO(Add score)
            // TODO(Add bullettime when killed enemy)

            game.enemy = new Enemy()
            game.enemy.init(game);
        }
    }
}

class Entity {
    constructor(game, textureUrl) {
        this.textureUrl = textureUrl;
        this.tick = 0;
        this.position = new THREE.Vector2(0, 0);
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
        scene.add(mesh);

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
        scene.remove(this.mesh);
    }
}

class DestroyedEnemy extends Entity {
    constructor(game, enemy) {
        super(game, 'images/guyburned.png');

        this.position.copy(enemy.position);
		this.velocity.set(-3 + Math.random() * 6, -5 + Math.random()*5);
        this.mesh.scale.x = enemy.heliGroup.scale.x;
        this.mesh.rotation.z = enemy.group.rotation.z;
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
            if (this.velocity.y < 2) {
                return true;
            } else {
                this.position.y -= this.velocity.y * game.timeScale
                this.velocity.y *= -0.4;
            }

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

        new Explosion(game, this.position.clone(), 150);
    }
}

class Explosion extends Entity {
    constructor(game, position, size) {
        super(game, 'images/explosion.png');

        this.position.copy(position);
        this.targetSize = size * 0.75 / 374;

        this.mesh.scale.x = this.mesh.scale.y = size / 374;
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

const zero = new THREE.Vector3();

class Game {
    constructor() {
        this.enemy = null;
        this.level = 0;
    }

    init(textures) {
        this.textures = textures;

        const tilesheet = this.tilesheet = textures['images/tilesheet.png'];
        const playerTexture = this.playerTexture = textures['images/player.png'];
        const bgTexture = this.bgTexture = textures['images/bg.png'];
        const bulletTexture = this.bulletTexture = textures['images/bullet.png'];

        const tileSize = this.tileSize = 50;

        const world = this.world = new THREE.Group();

        // Set up background
        const bgGeometry = new THREE.PlaneGeometry(bgTexture.image.width, bgTexture.image.height); // Adjust size as needed
        const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture });
        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        background.position.set(bgTexture.image.width / 2, -bgTexture.image.height / 2, -500); // Move it behind other elements
        // scene.add(background);

        scene.background = bgTexture;
        
        const mapHeight = this.mapHeight = map1.length * tileSize;
        const mapWidth = this.mapWidth = map1[0].length * tileSize;

        const bgLayer = this.buildMap(bg1);
        bgLayer.position.set(0, mapHeight - tileSize * 4, -200); // Move it behind other elements-
        bgLayer.scale.x = 2;
        bgLayer.scale.y = 2;
        world.add(bgLayer);

        // Add layers to the scene
        const mapLayer = this.buildMap(map1);
        world.add(mapLayer);

        
        const mapBox = this.mapBox = new THREE.Box3(new THREE.Vector3(0, -mapHeight, 0), new THREE.Vector3(mapWidth, 0, 0));
        mapBox.expandByScalar(tileSize);

        cube.position.x = 400;
        cube.position.y = -400;

        const clock = this.clock = new THREE.Clock();
        let accumulator = this.accumulator = 0;

        const playerSize = 55;
        const playerWidth = playerTexture.image.width;
        const playerHeight = playerTexture.image.height;

        let timeScale = this.timeScale = 1;
        const player = this.player =  {
            tick: 0,
            position: new THREE.Vector2(tileSize / 2, 47),
            velocity: new THREE.Vector2(),
            bounds: {
                min: new THREE.Vector2(-8, -47),
                max: new THREE.Vector2(8, -4),
            },
            jumps: 2,
            jumping: 0,
            weapon: 0,
            hand: new THREE.Vector2(0, 19),
            aim: 0,
        }
        const playerBullets = this.playerBullets = [];
        const enemyBullets = this.enemyBullets = [];
        this.entities = [];

        const playerGroup = this.playerGroup = new THREE.Group();

        // Create the player
        const playerGeometry = new THREE.PlaneGeometry(playerSize, playerSize);
        const playerMaterial = new THREE.MeshBasicMaterial({
            map: playerTexture,
            transparent: true,
        });
        const playerBody = this.playerBody = new THREE.Mesh(playerGeometry, playerMaterial);
        playerBody.position.set(0, playerSize/2, -1);
        setUV(playerGeometry, 1, playerSize, playerWidth, playerHeight);
        playerGroup.add(playerBody);

        const playerWeapon = this.playerWeapon = new THREE.Object3D()
        playerWeapon.add(weapons[0].mesh);

        playerWeapon.position.set(player.hand.x, player.hand.y, 0);
        playerWeapon.rotation.z = -Math.PI/4;

        playerGroup.add(playerWeapon);

        // createBlueLine(0, 19, playerGroup);

        world.add(playerGroup);

        scene.add(world);

        this.updatePlayerGroup();
        this.selectWeapon(12);
        weapons[player.weapon].reloading = Number.POSITIVE_INFINITY;

        this.updateCameraPosition(0);

        this.enemy = new Enemy()
        this.enemy.init(this);
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

                setUV(geometry, index, tileSize, sheetWidth, sheetHeight);

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

    selectWeapon(weaponIndex) {
        this.playerWeapon.remove(weapons[this.player.weapon].mesh);
        this.player.weapon = weaponIndex;
        const weapon = weapons[weaponIndex];
        this.playerWeapon.add(weapon.mesh);
    }

    updatePlayerGroup() {
        // Update position of object, by mapping game position to 3d camera position.
        this.playerGroup.position.set(this.player.position.x, Math.round(-this.player.position.y), 1);
    }

    updatePlayer(delta) {
        const player = this.player;
        let move = false;
        player.tick += this.timeScale;
        if (player.tick >= 1) {
            player.tick %= 1;
            move = true;
        }

        if (move) {
            if (keyIsPressed['ArrowLeft'] == keyIsPressed['ArrowRight']) {
                if (player.velocity.x > 0)  {
                    player.velocity.x = Math.max(0, player.velocity.x - 1);
                } else if (player.velocity.x < 0) {
                    player.velocity.x = Math.min(0, player.velocity.x + 1);
                }
            } else if (keyIsPressed['ArrowLeft']) {
                player.velocity.x = -3;
            } else if (keyIsPressed['ArrowRight']) {
                player.velocity.x = 3;
            }

            if (keyIsPressed['ArrowUp']) { 
                if (player.canJump && player.jumps < 2) {
                    player.canJump = false;
                    player.jumps++;
                    player.jumping = 8;
                    player.velocity.y = Math.min(player.velocity.y, -6);
                } else if (player.jumping > 0) {
                    player.velocity.y = Math.min(player.velocity.y, -6);
                    player.jumping--;
                }
            } else {
                player.canJump = true;
                player.jumping = 0;
            }

            player.velocity.y = Math.min(player.velocity.y + 0.5, this.tileSize);
        }
        
        let [xCol, yCol] = checkTileCollisions(player, this.timeScale, map1, this.tileSize);

        if (player.position.x + player.bounds.min.x <= 0) {
            player.position.x = -player.bounds.min.x;
        } else if (player.position.x + player.bounds.max.x >= this.mapWidth) {
            player.position.x = this.mapWidth - player.bounds.max.x;
        }

        if (player.position.y + player.bounds.max.y >= this.mapHeight) {
            player.position.y = this.mapHeight - player.bounds.max.y;
            yCol = true;          
        }

        if (xCol) {
            player.velocity.x = 0;
        }
        if (yCol) {
            if (player.velocity.y > 0) {
                player.jumps = 0;
                player.jumping = 0;
            }
            player.velocity.y = 0;

        }
        
        player.aim = calculateAngleToMouse(this.playerWeapon, mouse);
        if (player.aim > Math.PI/2 || player.aim < -Math.PI/2) {
            this.playerWeapon.scale.x = -1;
            this.playerWeapon.rotation.z = player.aim + Math.PI;
        } else {
            this.playerWeapon.scale.x = 1;
            this.playerWeapon.rotation.z = player.aim
        }

        if (move) {
            if (mouse.wheel != 0) {
                this.selectWeapon(THREE.MathUtils.euclideanModulo(player.weapon - mouse.wheel, weapons.length));
                mouse.wheel = 0;
            }

            const weapon = weapons[player.weapon];
            weapon.reloading++;
            if (mouse.down) {
                if (weapon.reloading >= weapon.reloadTime) {
                    weapon.createBullet(this);
                    weapon.reloading = 0;
                }
            }
        }

        this.updatePlayerGroup();
    }

    createBullet(weapon, rotation, offset) {
        const pivot = new THREE.Vector3();
        this.playerWeapon.getWorldPosition(pivot);

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
        mesh.position.copy(pos);

        scene.add(mesh);

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
        this.playerGroup.getWorldPosition(worldPos);

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
                scene.remove(bullet.object);
            }
        }
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            const bulletPos = bullet.object.position;
            bulletPos.x += bullet.velocity.x * this.timeScale;
            bulletPos.y += bullet.velocity.y * this.timeScale;

            let remove = false;
            if (isTileCollision(bulletPos.x, -bulletPos.y, map1, this.tileSize) || isPlayerCollision(bulletPos.x, -bulletPos.y, this.player)) {
                remove = true;
            }

            if (remove || !this.mapBox.containsPoint(bulletPos)) {
                this.enemyBullets.splice(i, 1);
                scene.remove(bullet.object);
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

            if (keyIsPressed['Shift']) {
                this.timeScale = 0.1;
            } else {
                this.timeScale = 1;
            }

            this.updatePlayer(delta);

            if (this.enemy) {
                this.enemy.update(this, delta);
            }

            this.updateCameraPosition(delta);
            this.updateBullets(delta);
            this.updateEntities(delta);
            this.accumulator %= 1/60;
        };
        
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

var heliBoxes = [
    new THREE.Box3(new THREE.Vector3(-88, 13, -5), new THREE.Vector3(-72, 28, 5)),
    new THREE.Box3(new THREE.Vector3(-88, -29, -5), new THREE.Vector3(-31, 13, 5)),
    new THREE.Box3(new THREE.Vector3(-31, -37, -5), new THREE.Vector3(55, 35, 5)),
    new THREE.Box3(new THREE.Vector3(55, 0, -5), new THREE.Vector3(77, 20, 5)),
    new THREE.Box3(new THREE.Vector3(55, -33, -5), new THREE.Vector3(100, -1, 5)),
];

function checkPointCollisionWithBoxes(point, enemy, boxes) {
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