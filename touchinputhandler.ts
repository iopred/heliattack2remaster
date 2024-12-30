// Define handler types
export type TouchHandler = (event: TouchEvent, touches: Map<number, { x: number; y: number }>) => void;

export type JoystickMoveVector = { x: number; y: number, active: boolean };
export type Joystick = {
  moveHandlerId: number;
  origin: { x: number; y: number };
  thumbPosition: { x: number; y: number };
  initialThumbPosition: { x: number, y: number },
  vector: JoystickMoveVector;
}
export type JoystickMoveHandler = (vector: JoystickMoveVector) => void;

export type OnScreenButtonHandler = (active: boolean) => void;
export type OnScreenButton = {
  id: string;
  identifier?: number;

  x: number;
  bottom: number;
  active: boolean;
  handler: OnScreenButtonHandler;
}

class TouchInputHandler {
  private context: CanvasRenderingContext2D;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();

  private onMoveHandlers: TouchHandler[] = [];
  private onStartHandlers: TouchHandler[] = [];
  private onEndHandlers: TouchHandler[] = [];
  private joystickMoveHandlers: { [key: number]: JoystickMoveHandler[] } = {};

  private joysticks: Map<number, Joystick> = new Map();

  private onScreenButtons: OnScreenButton[] = [];

  private readonly maxMagnitude = 50;
  private readonly joystickRadius = 50;

  private readonly buttonRadius = 20;

  private _drawJoysticks: boolean = false;

  public get drawJoysticks(): boolean {
    return this._drawJoysticks;
  }

  public set drawJoysticks(value: boolean) {
    this._drawJoysticks = value;
    this.renderJoysticks();
  }

  constructor(private element: HTMLElement, private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!;

    // Bind event listeners
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    this.clearCanvas();
  }

  private isWithinOrigin(x: number, y: number, ox: number, oy: number, radius) {
    const dx = x - ox;
    const dy = y - oy;
    return Math.sqrt(dx * dx + dy * dy) <= radius; // Adjust radius as needed
  };

  // Event Handlers
  private handleTouchStart(event: TouchEvent) {

    Array.from(event.changedTouches).forEach((touch) => {
      this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });


      for (const button of this.onScreenButtons) {
        if (this.isWithinOrigin(touch.clientX, touch.clientY, button.x > 0 ? button.x : window.innerWidth + button.x, window.innerHeight - button.bottom, this.buttonRadius)) {
          button.identifier = touch.identifier;
          button.active = true;
          button.handler(true);
        }
      }


      const isLeftJoystick = touch.clientX < window.innerWidth / 2;
      const joystickOrigin = isLeftJoystick
        ? { x: this.joystickRadius + 20, y: window.innerHeight - this.joystickRadius - 20 }
        : { x: window.innerWidth - this.joystickRadius - 20, y: window.innerHeight - this.joystickRadius - 20 };

      if (!this.isWithinOrigin(touch.clientX, touch.clientY, joystickOrigin.x, joystickOrigin.y, this.joystickRadius * 1.1)) return;

      if (this.joysticks.get(touch.identifier)) return;

      const joystick = {
        moveHandlerId: isLeftJoystick ? 0 : 1,
        origin: joystickOrigin,
        thumbPosition: { x: joystickOrigin.x, y: joystickOrigin.y },
        initialThumbPosition: { x: touch.clientX, y: touch.clientY },
        vector: { x: 0, y: 0, active: true },
      }

      this.joysticks.set(touch.identifier, joystick);
      this.emitJoystickHandlers(joystick.moveHandlerId, joystick.vector);
    });
    this.emitHandlers(this.onStartHandlers, event);
    this.renderJoysticks();
  }

  private handleTouchMove(event: TouchEvent) {

    Array.from(event.changedTouches).forEach((touch) => {
      const joystick = this.joysticks.get(touch.identifier);
      if (!joystick) return;

      joystick.thumbPosition = { x: touch.clientX, y: touch.clientY };
      this.calculateJoystickVector(joystick);
      this.emitJoystickHandlers(joystick.moveHandlerId, joystick.vector);
    });
    this.emitHandlers(this.onMoveHandlers, event);
    this.renderJoysticks();
  }

  private handleTouchEnd(event: TouchEvent) {

    Array.from(event.changedTouches).forEach((touch) => {
      this.activeTouches.delete(touch.identifier);

      for (const button of this.onScreenButtons) {
        if (button.identifier === touch.identifier) {
          button.active = false;
          button.handler(false);
        }
      }

      const joystick = this.joysticks.get(touch.identifier);
      if (!joystick) return;

      this.emitJoystickHandlers(joystick.moveHandlerId, { x: 0, y: 0, active: false });
      this.joysticks.delete(touch.identifier);
    });
    this.emitHandlers(this.onEndHandlers, event);
    this.renderJoysticks();
  }

  private calculateJoystickVector(joystick: Joystick) {
    const dx = joystick.thumbPosition!.x - joystick.initialThumbPosition.x;
    const dy = joystick.thumbPosition!.y - joystick.initialThumbPosition.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const magnitude = Math.min(distance, this.maxMagnitude);

    const direction = distance === 0 ? { x: 0, y: 0 } : { x: dx / distance, y: dy / distance };
    joystick.vector = {
      x: direction.x * (magnitude / this.maxMagnitude),
      y: direction.y * (magnitude / this.maxMagnitude),
      active: true,
    };

    if (distance > this.maxMagnitude) {
      joystick.thumbPosition = {
        x: joystick.origin.x + direction.x * this.maxMagnitude,
        y: joystick.origin.y + direction.y * this.maxMagnitude,
      };
    }
  }

  private emitHandlers(handlers: TouchHandler[], event: TouchEvent) {
    handlers.forEach((handler) => handler(event, new Map(this.activeTouches)));
  }

  private emitJoystickHandlers(handlerId: number, vector: { x: number; y: number, active: boolean }) {
    this.joystickMoveHandlers[handlerId].forEach((handler) => handler(vector));
  }

  public onMove(handler: TouchHandler) {
    this.onMoveHandlers.push(handler);
  }

  public onStart(handler: TouchHandler) {
    this.onStartHandlers.push(handler);
  }

  public onEnd(handler: TouchHandler) {
    this.onEndHandlers.push(handler);
  }

  public onJoystickMove(identifier: number, handler: JoystickMoveHandler) {
    if (!this.joystickMoveHandlers[identifier]) {
      this.joystickMoveHandlers[identifier] = [];
    }

    this.joystickMoveHandlers[identifier].push(handler);

  }

  public onOnScreenButton(id: string, x: number, bottom: number, handler: OnScreenButtonHandler) {
    this.onScreenButtons.push({
      id: id,
      x: x,
      bottom: bottom,
      active: false,
      handler: handler,
    });
  }

  private renderJoysticks() {
    this.clearCanvas();

    if (!this.drawJoysticks) {
      return;
    }

    const leftJoystick = {
      origin: { x: this.joystickRadius + 20, y: window.innerHeight - this.joystickRadius - 20 },
      active: false
    };
    const rightJoystick = {
      origin: { x: window.innerWidth - this.joystickRadius - 20, y: window.innerHeight - this.joystickRadius - 20 },
      active: false
    };

    // Check for active joysticks
    this.joysticks.forEach((joystick) => {
      if (!joystick.origin || !joystick.thumbPosition) return;
      if (joystick.moveHandlerId === 0) leftJoystick.active = true;
      else rightJoystick.active = true;

      this.drawJoystick(joystick.origin, { x: joystick.origin.x + joystick.vector.x * this.joystickRadius, y: joystick.origin.y + joystick.vector.y * this.joystickRadius }, true);
    });

    // Render inactive joysticks
    if (!leftJoystick.active) {
      this.drawJoystick(leftJoystick.origin, leftJoystick.origin, false);
    }
    if (!rightJoystick.active) {
      this.drawJoystick(rightJoystick.origin, rightJoystick.origin, false);
    }

    this.onScreenButtons.forEach((button) => {
      this.drawButton(button);
    });
  }

  private drawJoystick(origin: { x: number; y: number }, thumb: { x: number; y: number }, active: boolean) {
    // Draw joystick origin
    this.context.beginPath();
    this.context.arc(origin.x, origin.y, this.joystickRadius, 0, Math.PI * 2);
    this.context.fillStyle = active ? 'rgba(0, 0, 255, 0.3)' : 'rgba(0, 0, 255, 0.1)';
    this.context.fill();
    this.context.closePath();

    // Draw joystick thumb
    this.context.beginPath();
    this.context.arc(thumb.x, thumb.y, 20, 0, Math.PI * 2);
    this.context.fillStyle = active ? 'rgba(0, 0, 255, 0.7)' : 'rgba(0, 0, 255, 0.4)';
    this.context.fill();
    this.context.closePath();

    // Draw line connecting origin to thumb
    if (active) {
      this.context.beginPath();
      this.context.moveTo(origin.x, origin.y);
      this.context.lineTo(thumb.x, thumb.y);
      this.context.strokeStyle = 'rgba(0, 0, 255, 0.5)';
      this.context.lineWidth = 2;
      this.context.stroke();
      this.context.closePath();
    }
  }

  private drawButton(button: OnScreenButton) {
    this.context.beginPath();
    this.context.arc(button.x > 0 ? button.x : window.innerWidth + button.x, window.innerHeight - button.bottom, this.buttonRadius, 0, Math.PI * 2);
    this.context.fillStyle = button.active ? 'rgba(0, 0, 255, 0.3)' : 'rgba(0, 0, 255, 0.1)';
    this.context.fill();
    this.context.closePath();
  }



  private clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  update() {

  }

  public destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }
}

export default TouchInputHandler;
