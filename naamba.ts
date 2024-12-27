import { Camera, Clock, DOMElement, Scene } from 'three';
import {DampedSpringMotionParams, calcDampedSpringMotionParams, updateDampedSpringMotion } from './spring';
import { sayMessage } from './utils';

const UPDATE_FREQUENCY = 1 / 60;

export default class Naamba {
    private clock:Clock;
    private accumulator:number = 0.0;

    private position:number = 0.0;
    private velocity:number = 60.0;
    private equilibrium:number = 0.0;
    private params:DampedSpringMotionParams;

    constructor(private window: Window, private domElement:DOMElement, private scene: Scene, private camera: Camera) { 
        sayMessage('[kit]');

        this.clock = new Clock();

        const naamba = document.getElementById('naamba')!;
        naamba.removeAttribute('hidden');

        const naambaImage = naamba.getElementsByTagName('img')[0];

        const angularFrequency = 6.0;
        const dampingRatio = 0.2;

        this.params = calcDampedSpringMotionParams(UPDATE_FREQUENCY, angularFrequency, dampingRatio);
    }

    render() {
        const delta = this.clock.getDelta();

        this.accumulator += delta;

        if (this.accumulator > UPDATE_FREQUENCY) {
            const naamba = document.getElementById('naamba')!;
            const naambaImage = naamba.getElementsByTagName('img')[0];
    
            const result = updateDampedSpringMotion(this.position, this.velocity, this.equilibrium, this.params);
            this.position = result.pos;
            this.velocity = result.vel;
    
            naambaImage.style.transform = `rotate(${this.position}deg)`;

            this.accumulator %= UPDATE_FREQUENCY;
        };
    }

    destroy() {
        const naamba = document.getElementById('naamba')!;
        naamba.setAttribute('hidden', '');
    }
}