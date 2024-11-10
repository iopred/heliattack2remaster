import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Vector2 } from 'three';
import { Vector3 } from 'three';

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
scene.add(cube);

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

let gameLoop = null;

function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    if (textMesh) {
        textMesh.rotation.y += 0.01;
    }

    if (gameLoop) {
        gameLoop();
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
        initScene(textures);
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
        this.reloadTime = reloadTime;
        this.bulletSpeed = bulletSpeed;
        this.damage = damage;
        this.bulletTextureUrl = bulletTextureUrl;
        this.reloading = Number.POSITIVE_INFINITY;
        this.bullets = 1;
        this.bulletsSpread = 0;
        this.spread = 0;
    }

    setSpread(spread) {
        this.spread = spread;
        return this;
    }

    setBullets(bullets, bulletsSpread) {
        this.bullets = bullets;
        this.bulletsSpread = bulletsSpread || 0;
        return this;
    }

    init(textures) {
        const texture = textures[this.textureUrl];
        this.geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        this.geometry.translate(texture.image.width / 2, -texture.image.height / 2, 0); 
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        if (this.bulletTextureUrl) {
            this.bulletTexture = textures[this.bulletTextureUrl];
        }
    }

    createBullet(createBulletFunc) {
        let rot = 0;
        if (this.bullets > 1) {
            rot = -this.bulletsSpread * this.bullets / 2;
        }
        for (var i = 0; i < this.bullets; i++) {
            createBulletFunc(this, rot + THREE.MathUtils.randFloat(-this.spread, this.spread));
            rot += this.bulletsSpread;
        }
    }
}

const weapons = [
    new Weapon("Machine Gun", 'images/weapons/machinegun.png', new THREE.Vector2(5, 12), new THREE.Vector2(23, -7.5), 5, 8, 10).setSpread(2),
    new Weapon("Akimbo Mac10's", 'images/weapons/mac10s.png', new THREE.Vector2(-2, 21), new THREE.Vector2(28, -8.5), 4, 8, 9).setSpread(8).setBullets(2),
    new Weapon("Shotgun", 'images/weapons/shotgun.png', new THREE.Vector2(5, 12), new THREE.Vector2(30, -7), 25, 8, 15).setBullets(5, 5),
    new Weapon("Shotgun Rockets", 'images/weapons/shotgunrockets.png', new THREE.Vector2(7, 19), new THREE.Vector2(34, -8), 40, 7, 40, 'images/shotgunrocketbullet.png').setBullets(3, 10),
    new Weapon("Grenade Launcher", 'images/weapons/grenadelauncher.png', new THREE.Vector2(13, 18), new THREE.Vector2(29, -7), 30, 15, 75, 'images/grenade.png'),
    new Weapon("RPG", 'images/weapons/rpg.png', new THREE.Vector2(18, 20), new THREE.Vector2(32, -7), 40, 4, 75, 'images/rpgbullet.png'),
    new Weapon("Rocket Launcher", 'images/weapons/rocketlauncher.png', new THREE.Vector2(19, 23), new THREE.Vector2(25, -9.5), 50, 7, 100, 'images/rocketbullet.png'),
    new Weapon("Seeker Launcher", 'images/weapons/seekerlauncher.png', new THREE.Vector2(24, 28), new THREE.Vector2(24, -9.5), 55, 7, 100, 'images/seekerbullet.png'),
    new Weapon("Flame Thrower", 'images/weapons/flamethrower.png', new THREE.Vector2(9, 16), new THREE.Vector2(29, -7), 1, 8, 2, 'images/flamebullet.png'),
    new Weapon("Fire Mines", 'images/weapons/mine.png', new THREE.Vector2(-9, 15), new THREE.Vector2(20, -5.5), 100, 3, 5, 'images/minebullet.png'),
    new Weapon("A-Bomb Launcher", 'images/weapons/abomb.png', new THREE.Vector2(22, 30), new THREE.Vector2(36, -13), 150, 3, 300, 'images/abombbullet.png'),
    new Weapon("Rail Gun", 'images/weapons/railgun.png', new THREE.Vector2(23, 27), new THREE.Vector2(32, -8), 75, 20, 150, 'images/rail.png'),
    new Weapon("Grapple Cannon", 'images/weapons/grapplecannon.png', new THREE.Vector2(18, 23), new THREE.Vector2(33, -11), 250, 20, 300, 'images/grapplebullet.png'),
    new Weapon("Shoulder Cannon", 'images/weapons/shouldercannon.png', new THREE.Vector2(0, 0), new THREE.Vector2(16, 0), 100, 20, 300, 'images/shouldercannon.png'),
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
                    entity.position[axis] = tilePos * tileSize - entity.bounds.max[axis] - 1;
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

function initScene(textures) {
    const tilesheet = textures['images/tilesheet.png'];
    const playerTexture = textures['images/player.png'];
    const bgTexture = textures['images/bg.png'];
    const bulletTexture = textures['images/bullet.png'];

    
    const zero = new THREE.Vector3();

    const tileSize = 50;
    const sheetWidth = tilesheet.image.width;
    const sheetHeight = tilesheet.image.height;

    const world = new THREE.Group();

    // Set up background
    const bgGeometry = new THREE.PlaneGeometry(bgTexture.image.width, bgTexture.image.height); // Adjust size as needed
    const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    background.position.set(bgTexture.image.width / 2, -bgTexture.image.height / 2, -500); // Move it behind other elements
    // scene.add(background);

    scene.background = bgTexture;
    
    const buildMap = (map) => {
        const group = new THREE.Group();
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const [_, index] = map[y][x];
                
                // Skip empty tiles
                if (index === 0) continue;
                
                // Create geometry and material with UV mapping
                const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
                const material = new THREE.MeshBasicMaterial({ 
                    map: tilesheet,
                    transparent: true
                });

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

    
    const mapHeight = map1.length * tileSize;
    const mapWidth = map1[0].length * tileSize;

    const bgLayer = buildMap(bg1);
    bgLayer.position.set(0, mapHeight - tileSize * 4, -200); // Move it behind other elements-
    bgLayer.scale.x = 2;
    bgLayer.scale.y = 2;
    world.add(bgLayer);

    // Add layers to the scene
    const mapLayer = buildMap(map1);
    world.add(mapLayer);

    
    const mapBox = new THREE.Box3(new THREE.Vector3(0, -mapHeight, 0), new THREE.Vector3(mapWidth, 0, 0));
    mapBox.expandByScalar(tileSize);

    cube.position.x = 400;
    cube.position.y = -400;

    const clock = new THREE.Clock();
    let accumulator = 0;

    const playerSize = 55;
    const playerWidth = playerTexture.image.width;
    const playerHeight = playerTexture.image.height;

    let timeScale = 1;
    const player = {
        tick: 0,
        position: new THREE.Vector2(tileSize / 2, 47),
        velocity: new THREE.Vector2(),
        bounds: {
            min: new THREE.Vector2(-12, -47),
            max: new THREE.Vector2(8, -4),
        },
        jumps: 2,
        jumping: 0,
        weapon: 0,
        hand: new THREE.Vector2(0, 19),
        aim: 0,
    }
    const playerBullets = [];
    const enemyBullets = [];

    const playerGroup = new THREE.Group();

    // Create the player
    const playerGeometry = new THREE.PlaneGeometry(playerSize, playerSize);
    const playerMaterial = new THREE.MeshBasicMaterial({
        map: playerTexture,
        transparent: true,
    });
    const playerBody = new THREE.Mesh(playerGeometry, playerMaterial);
    playerBody.position.set(0, playerSize/2, -1);
    setUV(playerGeometry, 1, playerSize, playerWidth, playerHeight);
    playerGroup.add(playerBody);

    const playerWeapon = new THREE.Object3D()
    playerWeapon.add(weapons[0].mesh);

    playerWeapon.position.set(player.hand.x, player.hand.y, 0);
    playerWeapon.rotation.z = -Math.PI/4;

    playerGroup.add(playerWeapon);

    // createBlueLine(0, 19, playerGroup);

    world.add(playerGroup);

    scene.add(world);
    
    function selectWeapon(weaponIndex) {
        playerWeapon.remove(weapons[player.weapon].mesh);
        player.weapon = weaponIndex;
        const weapon = weapons[weaponIndex];
        playerWeapon.add(weapon.mesh);

        updateWeaponPosition();
    }

    function updatePlayerGroup() {
        // Update position of object, by mapping game position to 3d camera position.
        playerGroup.position.set(player.position.x, Math.round(-player.position.y), 1);
    }

    function updateWeaponPosition() {
        const weapon = weapons[player.weapon];
        weapon.mesh.position.x = -weapon.origin.x;
        weapon.mesh.position.y = weapon.origin.y;
    }

    updatePlayerGroup();
    selectWeapon(4);
    weapons[player.weapon].reloading = Number.POSITIVE_INFINITY;

    // Player movement logic
    function updatePlayer(timeScale, delta) {
        player.tick += timeScale;
        while (player.tick > 1) {
            player.tick -= 1;
        
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
                    player.jumping = 16;
                    player.velocity.y = Math.min(player.velocity.y, -4);
                } else if (player.jumping > 0) {
                    player.velocity.y = Math.min(player.velocity.y, -4);
                    player.jumping--;
                }
            } else {
                player.canJump = true;
                player.jumping = 0;
            }

            player.velocity.y = Math.min(player.velocity.y + 0.5, tileSize);
        }
        
        let [xCol, yCol] = checkTileCollisions(player, timeScale, map1, tileSize);

        if (player.position.x + player.bounds.min.x <= 0) {
            player.position.x = -player.bounds.min.x;
        } else if (player.position.x + player.bounds.max.x >= mapWidth) {
            player.position.x = mapWidth - player.bounds.max.x;
        }

        if (player.position.y + player.bounds.max.y >= mapHeight) {
            player.position.y = mapHeight - player.bounds.max.y;
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
        
        player.aim = calculateAngleToMouse(playerWeapon, mouse);
        if (player.aim > Math.PI/2 || player.aim < -Math.PI/2) {
            playerWeapon.scale.x = -1;
            playerWeapon.rotation.z = player.aim + Math.PI;
        } else {
            playerWeapon.scale.x = 1;
            playerWeapon.rotation.z = player.aim
        }

        if (mouse.wheel != 0) {
            selectWeapon(THREE.MathUtils.euclideanModulo(player.weapon - mouse.wheel, weapons.length));
            mouse.wheel = 0;
        }

        const weapon = weapons[player.weapon];
        weapon.reloading++;
        if (mouse.down) {
            if (weapon.reloading > weapon.reloadTime) {
                weapon.createBullet(createBullet);
                weapon.reloading = 0;
            }
        }

        updatePlayerGroup();
    }

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

    function createBullet(weapon, rotation) {
        const pivot = new THREE.Vector3();
        playerWeapon.getWorldPosition(pivot);

        const texture = weapon.bulletTexture || bulletTexture;

        const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });

        const direction = player.aim + rotation * Math.PI/180
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.z = direction;

        mesh.position.copy(pivot.add(rotateAroundPivot(weapon.barrel, zero, player.aim, !(player.aim > Math.PI/2 || player.aim < -Math.PI/2))));

        scene.add(mesh);
        playerBullets.push({
            velocity: new THREE.Vector3(
                weapon.bulletSpeed * Math.cos(direction),
                weapon.bulletSpeed * Math.sin(direction),
                0),
            object: mesh,
        });
    }

    function updateCameraPosition(timeScale, delta) {
        let worldPos = new THREE.Vector3();
        playerGroup.getWorldPosition(worldPos);

        let visibleWidth = visibleWidthAtZDepth(0, camera)/2;
        let visibleHeight = visibleHeightAtZDepth(0, camera)/2;

        camera.position.x = THREE.MathUtils.damp(camera.position.x, Math.min(Math.max(Math.round(worldPos.x), visibleWidth), mapWidth - visibleWidth), 10, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, Math.min(Math.max(Math.round(worldPos.y), -(mapHeight - visibleHeight)), -visibleHeight), 10, delta);
    }

    function updateBullets(timeScale, delta) {
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const bullet = playerBullets[i];
            bullet.object.position.add(bullet.velocity);
            //bullet.object.rotation.z += 5 * Math.PI/180;
            if (!mapBox.containsPoint(bullet.object.position)) {
                playerBullets.splice(i, 1);
                scene.remove(bullet.object);
            }
        }
    }

    // Game loop
    gameLoop = function () {
        const delta = clock.getDelta();

        accumulator += delta;

        if (accumulator > 1/60) {
            updatePlayer(timeScale, delta);
            updateCameraPosition(timeScale, delta);
            updateBullets(timeScale, delta);
            accumulator %= 1/60;
        };
        
    }


}

init();