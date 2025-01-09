import AudioManager from '../audiomanager';
import { Camera, Clock, Color, DOMElement, Scene, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import TouchVisualizer from './touchvisualizer';
import { timeout } from '../utils';
import Tween from '../tween';

import { DampedSpringMotionParams, calcDampedSpringMotionParams, updateDampedSpringMotion } from '../spring';
import SpaceColonization from './spacecolonization';
import { renderBranchesAsNodes } from './renderBranchesAsNodes';

const UPDATE_FREQUENCY = 1 / 60;

class SquareCircleCo {
    private clock: Clock;
    private accumulator: number = 0.0;

    private touchVisualizer: TouchVisualizer;;
    private timeout: number;
    private gltf: any;
    private controls: OrbitControls;

    private audioPreload: Promise<any>;
    private gltfPreload: Promise<any>;

    private position: number = 5.0;
    private velocity: number = 60.0;
    private equilibrium: number = 10.0;
    private params: DampedSpringMotionParams;

    private targetCameraPosition = { x: 0, y: 0, z: 0 };
    private cameraVelocity = { x: 0, y: 0, z: 0 };

    private started: boolean = false;

    constructor(private window: Window, private domElement: DOMElement, private scene: Scene, private camera: Camera, private audioManager: AudioManager, private vhsPass: ShaderPass) {
        this.clock = new Clock();

        const angularFrequency = 14.0;
        const dampingRatio = 0.45;
        this.params = calcDampedSpringMotionParams(UPDATE_FREQUENCY, angularFrequency, dampingRatio);

        // this.controls = new OrbitControls(camera, domElement);
    }

    async preload(): Promise<any> {
        if (!this.audioPreload) {
            this.audioPreload = this.audioManager.preload([
                { key: 'scc', url: './sounds/scc.mp3' },
            ]);
        }

        if (!this.gltfPreload) {
            const loader = new GLTFLoader();
            this.gltfPreload = new Promise<any>((resolve, reject) => {
                loader.load(
                    './scc/squarecircleco.glb',
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

        return Promise.all([this.audioPreload, this.gltfPreload]);
    }

    async begin() {
        await this.preload();

        this.scene.background = new Color(0xffffff);
        this.camera.position.z = 10;

        this.scene.add(this.gltf.scene);
        for (const child of this.gltf.scene.children) {
            child.visible = false;
        }

        const cameraPositions = [
            {
                position: {
                    "x": -5.895971978789558,
                    "y": 0.6067273532552642,
                    "z": 3.410383853916852
                },
            },
            {
                position: {
                    "x": -3.109639346099596,
                    "y": 0.049793801292462664,
                    "z": 3.8071172589585682
                },
            },
            {
                position: {
                    "x": 1.4695206414011055,
                    "y": 0.049793801292462664,
                    "z": 3.8071172589585682
                }
            },
            {
                position: {
                    "x": 4.549108823782917,
                    "y": 0.049793801292462664,
                    "z": 3.8071172589585682
                }
            },
            {
                position: {
                    "x": 0,
                    "y": 0,
                    "z": 10,
                }
            }
        ]


        this.camera.position.x = cameraPositions[0].position.x;
        this.camera.position.y = cameraPositions[0].position.y;
        this.camera.position.z = cameraPositions[0].position.z;
        this.targetCameraPosition = cameraPositions[0].position;

        const cube = this.show('cube');
        cube.material = cube.material.clone();
        cube.material.transparent = true;
        cube.material.depthWrite = false;
        cube.material.depthTest = true;

        cube.scale.set(0.00375, 0.00375, 0.00375);


        const logo = this.get('logo');
        logo.material = logo.material.clone();
        logo.material.transparent = true;
        logo.material.opacity = 0;
        logo.material.depthWrite = false;
        logo.material.depthTest = true;

        logo.scale.y = 0.1;

        const square = this.get('square');
        square.material = square.material.clone();
        square.material.transparent = true;
        square.material.opacity = 0;

        square.scale.y = 0.1;

        const circle = this.get('circle');
        circle.material = circle.material.clone();
        circle.material.transparent = true;
        circle.material.opacity = 0;

        circle.scale.y = 0.1;

        const co = this.get('co');
        co.material = co.material.clone();
        co.material.transparent = true;
        co.material.opacity = 0;

        co.scale.y = 0.1;

        cube.position.copy(logo.position);
        cube.position.x += 0.15

        const rot = Math.PI * 2 + 45 * Math.PI / 180;

        cube.rotation.y = 0;

        this.started = true;


        await new Tween(cube.rotation, { y: 0 + rot }, 750).animate();

        logo.visible = true;
        logo.material.opacity = 1;
        // new Tween(logo.material, { opacity: 1 }, 500).animate();

        await new Tween(cube.material, { opacity: 0 }, 250).animate();

        this.audioManager.playEffect('scc');

        await timeout(200)

        // square
        square.visible = true;
        new Tween(square.material, { opacity: 1 }, 100).animate();

        this.targetCameraPosition = cameraPositions[1].position;

        await timeout(300)

        // circle
        circle.visible = true;
        new Tween(circle.material, { opacity: 1 }, 100).animate();

        this.targetCameraPosition = cameraPositions[2].position;

        await timeout(300);

        // co
        co.visible = true;
        new Tween(co.material, { opacity: 1 }, 100).animate();

        this.targetCameraPosition = cameraPositions[3].position;

        await timeout(300);

        this.targetCameraPosition = cameraPositions[4].position;

        const sphereRadius = this.sphereRadius = 100;

        const sc = this.sc = new SpaceColonization({ radius: sphereRadius });


        const kit = new Vector3(107.0, 105.0, 115.0);
        const kat = new Vector3(107.0, 97.0, 115.0);

        // const kit = new Vector3(1, 1, 1)

        sc.initialize(kit);

        sc.addAttractor(kit);
        sc.addAttractor(kat);

        // Add attractors (random for now, can be dynamic later)
        for (let i = 0; i < 100; i++) {
            const randomPoint = new Vector3(
                (Math.random() - 0.5) * 2 * sphereRadius,
                (Math.random() - 0.5) * 2 * sphereRadius,
                (Math.random() - 0.5) * 2 * sphereRadius
            ).normalize().multiplyScalar(sphereRadius);
            randomPoint.add(kit);
            sc.addAttractor(randomPoint);
        }


        sc.grow();
        const mesh = sc.generateMesh();
        this.scene.add(mesh);

        this.camera.lookAt(mesh.position);

        this.colonize = true;

        await this.waitForEnd();
    }

    async waitForEnd(): Promise<void> {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (!this.colonize) {
                    clearInterval(checkInterval); // Stop checking
                    resolve(); // Resolve the promise
                }
            }, 100); // Check every 100ms
        });
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

    show(shape) {
        const s = this.get(shape)
        if (s) {
            s.visible = true;
        }
        return s;
    }

    render(): boolean {
        if (!this.started) {
            return false;
        }

        const delta = this.clock.getDelta();

        this.accumulator += delta;

        if (this.accumulator > UPDATE_FREQUENCY) {
            if (this.colonize) {
                this.sc.grow();
                const group = renderBranchesAsNodes(this.sc.getBranches(), this.scene, this.sphereRadius);

                this.targetCameraPosition = { x: group.position.x, y: group.position.y, z: group.position.z};
                this.camera.position.copy(group.position);
                this.camera.position.z += 10;
                // this.controls.target = group.position;

                this.camera.lookAt(group.position);

                if (group.children.length > 1000) {
                    const previousNodes = this.scene.getObjectByName('nodes');
                    if (previousNodes) this.scene.remove(previousNodes);

                    this.colonize = false;
                    this.targetCameraPosition = { x: 0, y: 0, z: 10};
                }
            } else {
                const x = updateDampedSpringMotion(this.camera.position.x, this.cameraVelocity.x, this.targetCameraPosition.x, this.params);
                this.camera.position.x = x.pos;
                this.cameraVelocity.x = x.vel;

                const y = updateDampedSpringMotion(this.camera.position.y, this.cameraVelocity.y, this.targetCameraPosition.y, this.params);
                this.camera.position.y = y.pos;
                this.cameraVelocity.y = y.vel;

                let targetZ = this.targetCameraPosition.z;

                const referenceAspect = 1; //16/9
                if (this.camera.aspect < referenceAspect) {
                    const scale = referenceAspect / this.camera.aspect;

                    targetZ = targetZ * scale;
                }

                const z = updateDampedSpringMotion(this.camera.position.z, this.cameraVelocity.z, targetZ, this.params);
                this.camera.position.z = z.pos;
                this.cameraVelocity.z = z.vel;

                // this.camera.rotation.y = (this.camera.position.z - 10) / 100;
                this.camera.lookAt(this.targetCameraPosition.x, this.targetCameraPosition.y, 0);
            }

            this.vhsPass.material.uniforms.time.value += 0.01;


            this.accumulator %= UPDATE_FREQUENCY;

            return true;
        }

        return false;
    }

    update() {
        const cube = this.show('cube');
        const logo = this.show('logo');
        if (!cube || !logo) {
            return;
        }

        cube.rotation.y += 0.05;
        cube.position.x += (logo.position.x - cube.position.x) / 2;
        cube.position.y += (logo.position.y - cube.position.y) / 2;
        cube.position.z += (logo.position.z - cube.position.z) / 2;
    }

    destroy() {
        this.controls?.reset();
        this.controls?.dispose();
        if (this.gltf) {
            this.scene.remove(this.gltf.scene);
        }
    }
}

export default SquareCircleCo;