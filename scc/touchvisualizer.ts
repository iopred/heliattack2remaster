type ShapeHandler = (shape) => void;

class TouchVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private touch1: { x: number; y: number } | null = null; // Bottom-left corner
    private touch2: { x: number; y: number } | null = null; // Top-right corner
    private shape: "circle" | "square" = "circle";      // Current shape
    private touch3Active: boolean = false;                // Tracks if touch 3 is present
    private onShapeHandlers: ShapeHandler[] = [];

    private resizeListener: () => void;
    private touchStartListener: (e: TouchEvent) => void;
    private touchMoveListener: (e: TouchEvent) => void;
    private touchEndListener: (e: TouchEvent) => void;

    constructor(private window: Window, private document:Document, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Failed to get canvas rendering context");
        }
        this.ctx = context;

        // Bind and store event listeners
        this.resizeListener = this.resizeCanvas.bind(this);
        this.touchStartListener = this.onTouchStart.bind(this);
        this.touchMoveListener = this.onTouchMove.bind(this);
        this.touchEndListener = this.onTouchEnd.bind(this);

        this.setupCanvas();
        this.addEventListeners();
    }

    private emitShapeEvent(shape) {
        this.onShapeHandlers.forEach(handler => handler(shape));
    }

    public onShape(handler: ShapeHandler) {
        this.onShapeHandlers.push(handler);
    }
    private setupCanvas() {
        this.canvas.width = this.window.innerWidth;
        this.canvas.height = this.window.innerHeight;
        this.window.addEventListener("resize", this.resizeListener);
    }

    private resizeCanvas() {
        this.canvas.width = this.window.innerWidth;
        this.canvas.height = this.window.innerHeight;
        this.draw();
    }

    private addEventListeners() {
        this.document.body.addEventListener("touchstart", this.touchStartListener);
        this.document.body.addEventListener("touchmove", this.touchMoveListener);
        this.document.body.addEventListener("touchend", this.touchEndListener);
      }

    private onTouchStart(e: TouchEvent) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const point = { x: touch.clientX, y: touch.clientY };

            if (!this.touch1) {
                this.touch1 = point;
            } else if (!this.touch2) {
                this.touch2 = point;
            } else if (!this.touch3Active && touch.identifier === 2) {
                this.touch3Active = true;
                this.toggleShape();
            }
        }
        this.draw();
    }

    private onTouchMove(e: TouchEvent) {
        e.preventDefault();
        for (const touch of e.touches) {
            const point = { x: touch.clientX, y: touch.clientY };

            if (this.touch1 && touch.identifier === 0) {
                this.touch1 = point;
            } else if (this.touch2 && touch.identifier === 1) {
                this.touch2 = point;
            }
        }
        this.draw();
    }

    private onTouchEnd(e: TouchEvent) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === 0) {
                this.touch1 = null;
                this.emitShapeEvent({x: 0, y: 0, radius: 32, text: '*'});
            } else if (touch.identifier === 1) {
                this.touch2 = null;
            } else if (touch.identifier === 2) {
                this.touch3Active = false;
            }
        }
        this.draw();
    }

    private toggleShape() {
        this.shape = this.shape === "circle" ? "square" : "circle";
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.touch1 && this.touch2) {
            const x1 = this.touch1.x;
            const y1 = this.touch1.y;
            const x2 = this.touch2.x;
            const y2 = this.touch2.y;

            const width = Math.abs(x2 - x1);
            const height = Math.abs(y2 - y1);

            this.ctx.fillStyle = "rgba(0, 150, 255, 0.5)";
            this.ctx.strokeStyle = "blue";

            if (this.shape === "circle") {
                this.ctx.beginPath();
                this.ctx.ellipse(
                    (x1 + x2) / 2,
                    (y1 + y2) / 2,
                    width / 2,
                    height / 2,
                    0,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
                this.ctx.stroke();
            } else if (this.shape === "square") {
                this.ctx.beginPath();
                this.ctx.rect(x1, y1, width, height);
                this.ctx.fill();
                this.ctx.stroke();
            }
        }
    }

    public destroy() {
        this.onShapeHandlers = [];
        this.window.removeEventListener("resize", this.resizeListener);
        this.document.body.removeEventListener("touchstart", this.touchStartListener);
        this.document.body.removeEventListener("touchmove", this.touchMoveListener);
        this.document.body.removeEventListener("touchend", this.touchEndListener);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.touch1 = null;
        this.touch2 = null;
        this.touch3Active = false;
    }
}

export default TouchVisualizer;