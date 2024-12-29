type TouchHandler = (event: TouchEvent, touches: Map<number, { x: number; y: number }>) => void;
type JoystickMoveHandler = (vector: { x: number; y: number }) => void;

class TouchInputHandler {
  private context: CanvasRenderingContext2D;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();

  private onMoveHandlers: TouchHandler[] = [];
  private onStartHandlers: TouchHandler[] = [];
  private onEndHandlers: TouchHandler[] = [];

  private joystickOrigin: { x: number; y: number } | null = null;
  private maxMagnitude: number = 100;
  private joystickThumbPosition: { x: number; y: number } | null = null;
  private joystickVector: { x: number; y: number } = { x: 0, y: 0 };
  private joystickMoveHandlers: JoystickMoveHandler[] = [];

  constructor(private element: HTMLElement, private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!;

    // Bind event listeners
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    // Clear canvas on init
    this.clearCanvas();
  }

  // Event Handlers
  private handleTouchStart(event: TouchEvent) {
    
    Array.from(event.touches).forEach(touch => {
      this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    });
    this.emitHandlers(this.onStartHandlers, event);

    // Initialize joystick origin if needed
    if (this.joystickOrigin === null && event.touches.length) {
      const touch = event.touches[0];
      this.joystickOrigin = { x: touch.clientX, y: touch.clientY };
      this.joystickThumbPosition = { x: touch.clientX, y: touch.clientY };
      this.joystickVector = { x: 0, y: 0 };
      this.renderJoystick();
    }
  }

  private handleTouchMove(event: TouchEvent) {
    
    Array.from(event.touches).forEach(touch => {
      this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    });
    this.emitHandlers(this.onMoveHandlers, event);

    // Handle joystick movement
    if (this.joystickOrigin && event.touches.length) {
      const touch = event.touches[0];

      this.joystickThumbPosition = {
        x: touch.clientX,
        y: touch.clientY,
      };

      this.calculateJoystickVector();

      this.emitJoystickHandlers(this.joystickVector);
      
      this.renderJoystick();
    }
  }

  private calculateJoystickVector() {
    const dx = this.joystickThumbPosition!.x - this.joystickOrigin!.x;
    const dy = this.joystickThumbPosition!.y - this.joystickOrigin!.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const magnitude = Math.min(distance, this.maxMagnitude); // Limit magnitude

    const direction = distance === 0 ? { x: 0, y: 0 } : { x: dx / distance, y: dy / distance }; // Normalize direction
    
    this.joystickVector = {
      x: direction.x * (magnitude / this.maxMagnitude),
      y: direction.y * (magnitude / this.maxMagnitude),
    };
  }

  private handleTouchEnd(event: TouchEvent) {
    Array.from(event.changedTouches).forEach(touch => {
      this.activeTouches.delete(touch.identifier);
    });
    this.emitHandlers(this.onEndHandlers, event);

    // Reset joystick origin if the joystick touch ends
    if (event.touches.length === 0) {
      this.joystickOrigin = null;
      this.emitJoystickHandlers({x: 0, y: 0});
      this.clearCanvas();
    }
  }

  // Emit handlers for general touch events
  private emitHandlers(handlers: TouchHandler[], event: TouchEvent) {
    handlers.forEach(handler => handler(event, new Map(this.activeTouches)));
  }

  // Emit handlers for joystick movement
  private emitJoystickHandlers(vector: { x: number; y: number }) {
    this.joystickMoveHandlers.forEach(handler => handler(vector));
  }

  // Public methods for registering handlers
  public onMove(handler: TouchHandler) {
    this.onMoveHandlers.push(handler);
  }

  public onStart(handler: TouchHandler) {
    this.onStartHandlers.push(handler);
  }

  public onEnd(handler: TouchHandler) {
    this.onEndHandlers.push(handler);
  }

  public onJoystickMove(handler: JoystickMoveHandler) {
    this.joystickMoveHandlers.push(handler);
  }

  // Render joystick on the canvas
  private renderJoystick() {
    if (!this.context) return;

    // Clear canvas
    this.clearCanvas();

    if (this.joystickOrigin && this.joystickThumbPosition) {
      const { x: originX, y: originY } = this.joystickOrigin;
      // const { x: thumbX, y: thumbY } = this.joystickThumbPosition;

      const thumbX = this.joystickOrigin.x + this.joystickVector.x * this.maxMagnitude;
      const thumbY = this.joystickOrigin.y + this.joystickVector.y * this.maxMagnitude;

      // Draw joystick origin (small circle)
      this.context.beginPath();
      this.context.arc(originX, originY, 10, 0, Math.PI * 2);
      this.context.fillStyle = 'rgba(0, 0, 255, 0.5)';
      this.context.fill();
      this.context.closePath();

      // Draw joystick thumb (larger circle)
      this.context.beginPath();
      this.context.arc(thumbX, thumbY, 20, 0, Math.PI * 2);
      this.context.fillStyle = 'rgba(0, 0, 255, 0.7)';
      this.context.fill();
      this.context.closePath();

      // Draw the line connecting origin to thumb
      this.context.beginPath();
      this.context.moveTo(originX, originY);
      this.context.lineTo(thumbX, thumbY);
      this.context.strokeStyle = 'rgba(0, 0, 255, 0.3)';
      this.context.lineWidth = 2;
      this.context.stroke();
      this.context.closePath();
    }
  }

  // Clear the canvas
  private clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public update() {
    const lerpFactor = 0.5; // Adjust this value for smoother or faster transitions
    if (this.joystickOrigin && this.joystickThumbPosition) {

      let originChanged = false;

      if (Math.abs(this.joystickVector.y) > 0.25) {
        if (Math.abs(this.joystickVector.y) > 0.75) {
          this.joystickOrigin.y += (this.joystickThumbPosition.y - this.joystickOrigin.y) * lerpFactor * 1/60;
        } else {
          this.joystickOrigin.y += (this.joystickThumbPosition.y - this.joystickOrigin.y) * lerpFactor * 2 * 1/60;
        }
        originChanged = true;
      }

      if (Math.abs(this.joystickVector.x) > 0.9) {
        this.joystickOrigin.x += (this.joystickThumbPosition.x - this.joystickOrigin.x) * lerpFactor * 1/60;
        originChanged = true;
      }

      if (originChanged) {
        this.calculateJoystickVector();
      }
      
      this.renderJoystick()
    }
  }

  // Clean up listeners
  public destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }
}
export default TouchInputHandler;