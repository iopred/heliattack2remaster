type TouchHandler = (event: TouchEvent, touches: Map<number, { x: number; y: number }>) => void;
type JoystickMoveHandler = (direction: { x: number; y: number }, magnitude: number) => void;

class TouchInputHandler {
  private element: HTMLElement;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();

  private onMoveHandlers: TouchHandler[] = [];
  private onStartHandlers: TouchHandler[] = [];
  private onEndHandlers: TouchHandler[] = [];

  private joystickOrigin: { x: number; y: number } | null = null;
  private joystickMoveHandlers: JoystickMoveHandler[] = [];

  constructor(element: HTMLElement) {
    this.element = element;

    // Bind event listeners
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }

  // Event Handlers
  private handleTouchStart(event: TouchEvent) {
    event.preventDefault(); // Prevent overscroll
    Array.from(event.touches).forEach(touch => {
      this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    });
    this.emitHandlers(this.onStartHandlers, event);

    // Initialize joystick origin if needed
    if (this.joystickOrigin === null && event.touches.length === 1) {
      const touch = event.touches[0];
      this.joystickOrigin = { x: touch.clientX, y: touch.clientY };
    }
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault(); // Prevent overscroll
    Array.from(event.touches).forEach(touch => {
      this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    });
    this.emitHandlers(this.onMoveHandlers, event);

    // Handle joystick movement
    if (this.joystickOrigin && event.touches.length === 1) {
      const touch = event.touches[0];
      const dx = touch.clientX - this.joystickOrigin.x;
      const dy = touch.clientY - this.joystickOrigin.y;
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      const direction = { x: dx / magnitude || 0, y: dy / magnitude || 0 }; // Normalize direction
      this.emitJoystickHandlers(direction, magnitude);
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    Array.from(event.changedTouches).forEach(touch => {
      this.activeTouches.delete(touch.identifier);
    });
    this.emitHandlers(this.onEndHandlers, event);

    // Reset joystick origin if the joystick touch ends
    if (event.touches.length === 0) {
      this.joystickOrigin = null;
    }
  }

  // Emit handlers for general touch events
  private emitHandlers(handlers: TouchHandler[], event: TouchEvent) {
    handlers.forEach(handler => handler(event, new Map(this.activeTouches)));
  }

  // Emit handlers for joystick movement
  private emitJoystickHandlers(direction: { x: number; y: number }, magnitude: number) {
    this.joystickMoveHandlers.forEach(handler => handler(direction, magnitude));
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

  // Clean up listeners
  public destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }
}
export default TouchInputHandler;