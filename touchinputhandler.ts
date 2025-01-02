// Define handler types
export type TouchHandler = (event: TouchEvent, touches: Map<number, { x: number; y: number }>) => void;

export type JoystickMoveVector = { x: number; y: number, active: boolean };
export type Joystick = {
  identifier?: number;

  x: number;
  bottom: number;
  active: boolean;

  origin: { x: number; y: number };
  thumbPosition: { x: number; y: number };
  initialThumbPosition: { x: number, y: number },
  vector: JoystickMoveVector;

  handler: JoystickMoveHandler;
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

  private joysticks: Joystick[] = [];///Map<number, Joystick> = new Map();

  private onScreenButtons: OnScreenButton[] = [];

  private readonly maxMagnitude = 50;
  static readonly joystickRadius = 50;

  static readonly buttonRadius = 20;

  private _drawJoysticks: boolean = false;

  public get drawJoysticks(): boolean {
    return this._drawJoysticks;
  }

  public set drawJoysticks(value: boolean) {
    this._drawJoysticks = value;
    this.render();
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
        if (!button.active && this.isWithinOrigin(touch.clientX, touch.clientY, button.x > 0 ? button.x : window.innerWidth + button.x, window.innerHeight - button.bottom, TouchInputHandler.buttonRadius)) {
          button.identifier = touch.identifier;
          button.active = true;
          button.handler(true);
        }
      }

      for (const joystick of this.joysticks) {
        if (!joystick.active && this.isWithinOrigin(touch.clientX, touch.clientY, joystick.x > 0 ? joystick.x : window.innerWidth + joystick.x, window.innerHeight - joystick.bottom, TouchInputHandler.joystickRadius)) {
          joystick.identifier = touch.identifier;
          joystick.active = true;

          joystick.origin = { x: joystick.x > 0 ? joystick.x : window.innerWidth + joystick.x, y: window.innerHeight - joystick.bottom };
          joystick.thumbPosition = { x: touch.clientX, y: touch.clientY };
          joystick.initialThumbPosition = { x: touch.clientX, y: touch.clientY };

          this.calculateJoystickVector(joystick);

          joystick.handler(joystick.vector);
        }
      }
    });
    this.emitHandlers(this.onStartHandlers, event);
    this.render();
  }

  private handleTouchMove(event: TouchEvent) {

    Array.from(event.changedTouches).forEach((touch) => {
      for (const joystick of this.joysticks) {
        if (joystick.active && joystick.identifier === touch.identifier) {

          joystick.thumbPosition = { x: touch.clientX, y: touch.clientY };

          this.calculateJoystickVector(joystick);

          joystick.handler(joystick.vector);
        }
      }
    });
    this.emitHandlers(this.onMoveHandlers, event);
    this.render();
  }

  private handleTouchEnd(event: TouchEvent) {

    Array.from(event.changedTouches).forEach((touch) => {
      this.activeTouches.delete(touch.identifier);

      for (const button of this.onScreenButtons) {
        if (button.active && button.identifier === touch.identifier) {
          button.active = false;
          button.handler(false);
        }
      }

      for (const joystick of this.joysticks) {
        if (joystick.active && joystick.identifier === touch.identifier) {
          joystick.vector = { x: 0, y: 0, active: false };
          joystick.active = false;
          joystick.identifier = -1;
          joystick.handler(joystick.vector);
        }
      }
    });
    this.emitHandlers(this.onEndHandlers, event);
    this.render();
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

  public onJoystickMove(x: number, bottom: number, handler: JoystickMoveHandler) {
    this.joysticks.push({
      identifier: -1,
      x: x,
      bottom: bottom,
      active: false,
      vector: { x: 0, y: 0, active: false },
      handler: handler,
      origin: { x: x > 0 ? x : window.innerWidth + x, y: window.innerHeight - bottom },
      thumbPosition: { x: 0, y: 0 },
      initialThumbPosition: { x: 0, y: 0 },
    });
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

  private render() {
    this.clearCanvas();

    if (!this.drawJoysticks) {
      return;
    }

    // Check for active joysticks
    for (const joystick of this.joysticks) {
      this.drawJoystick(joystick.origin, { x: joystick.origin.x + joystick.vector.x * TouchInputHandler.joystickRadius, y: joystick.origin.y + joystick.vector.y * TouchInputHandler.joystickRadius }, joystick.active);
    }

    for (const button of this.onScreenButtons) {
      this.drawButton(button);
    }
  }

  private drawJoystick(origin: { x: number; y: number }, thumb: { x: number; y: number }, active: boolean) {
    // Draw joystick origin
    this.context.beginPath();
    this.context.arc(origin.x, origin.y, TouchInputHandler.joystickRadius, 0, Math.PI * 2);
    this.context.fillStyle = active ? 'rgba(0, 0, 255, 0.4)' : 'rgba(0, 0, 255, 0.2)';
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
    this.context.arc(button.x > 0 ? button.x : window.innerWidth + button.x, window.innerHeight - button.bottom, TouchInputHandler.buttonRadius, 0, Math.PI * 2);
    this.context.fillStyle = button.active ? 'rgba(0, 0, 255, 0.4)' : 'rgba(0, 0, 255, 0.2)';
    this.context.fill();
    this.context.closePath();
  }



  private clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  update() {
    
  }

  public setSize(width: number, height: number) {
    this.render();
  }

  public destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }
}

export default TouchInputHandler;
