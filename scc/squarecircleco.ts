import AudioManager from '../audiomanager';
import { Scene, Camera } from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import TouchVisualizer from "./touchvisualizer";

class SquareCircleCo {
    private touchVisualizer:TouchVisualizer;;
    private timeout:number;

    constructor(private window: Window, private mouse: Object, private keyIsPressed: Object, private scene: Scene, private camera: Camera, private shaderPass: ShaderPass, private audioManager: AudioManager, private gestureCanvas: HTMLCanvasElement, private onComplete:Function) {
        this.touchVisualizer = new TouchVisualizer(window, window.document, gestureCanvas);

        this.timeout = setTimeout(() => this.onComplete(null), 2000);
        this.touchVisualizer.onShape((shape) => this.finish(shape));
    }

    finish(shape) {
        clearTimeout(this.timeout);
        this.onComplete(shape);
    }

    destroy() {
        this.touchVisualizer.destroy();
    }
}

export default SquareCircleCo;