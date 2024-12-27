export default class Tween {
    // Tween properties
    private startTime: number;
    private duration: number;
    private startValues: { [key: string]: number };
    private endValues: { [key: string]: number };
    private object: any;

    constructor(object: any, endValues: { [key: string]: number }, duration: number) {
        this.object = object;
        this.endValues = endValues;
        this.duration = duration;
        this.startValues = {};
    }

    // Initialize the tween by storing the start values
    private initialize() {
        for (const key in this.endValues) {
            if (this.endValues.hasOwnProperty(key)) {
                this.startValues[key] = this.object[key] || 0;
            }
        }
    }

    // Linear interpolation function
    private interpolate(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    // The main method to animate the object over time
    async animate(): Promise<void> {
        return new Promise((resolve) => {
            this.startTime = performance.now();
            this.initialize();

            const update = () => {
                const elapsed = performance.now() - this.startTime;
                const t = Math.min(elapsed / this.duration, 1); // Ensure t is between 0 and 1

                // Update object properties
                for (const key in this.endValues) {
                    if (this.endValues.hasOwnProperty(key)) {
                        this.object[key] = this.interpolate(this.startValues[key], this.endValues[key], t);
                    }
                }

                // Continue animation if not complete
                if (t < 1) {
                    requestAnimationFrame(update);
                } else {
                    resolve(); // Animation is complete
                }
            };

            requestAnimationFrame(update); // Start animation
        });
    }
}
