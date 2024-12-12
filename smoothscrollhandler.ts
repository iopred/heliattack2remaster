type ScrollEventHandler = (direction: 'up' | 'down') => void;

class SmoothScrollHandler {
  private element: HTMLElement;
  private onScrollHandlers: ScrollEventHandler[] = [];
  private lastTouchDistance: number | null = null;
  private debounceTimeout: number | null = null;
  private debounceDelay: number;

  constructor(element: HTMLElement, debounceDelay: number = 300) {
    this.element = element;
    this.debounceDelay = debounceDelay;

    // Bind event listeners
    this.element.addEventListener('touchstart', event => this.handleTouchStart(event), { passive: false });
    this.element.addEventListener('touchmove', event => this.handleTouchMove(event), { passive: false });
    this.element.addEventListener('touchend', event => this.handleTouchEnd());
  }

  private handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.lastTouchDistance = this.getDistance(touch1, touch2);
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (event.touches.length === 2 && this.lastTouchDistance !== null) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = this.getDistance(touch1, touch2);

      const delta = currentDistance - this.lastTouchDistance;

      if (Math.abs(delta) > 30) {
        const direction = delta > 0 ? 'down' : 'up';

        // Debounce the event
        if (!this.debounceTimeout) {
          this.emitScrollEvent(direction);
          this.debounceTimeout = window.setTimeout(() => {
            this.debounceTimeout = null;
          }, this.debounceDelay);
        }
      }
      this.lastTouchDistance = currentDistance;
    }
  }

  private handleTouchEnd() {
    this.lastTouchDistance = null;
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private emitScrollEvent(direction: 'up' | 'down') {
    this.onScrollHandlers.forEach(handler => handler(direction));
  }

  public onScroll(handler: ScrollEventHandler) {
    this.onScrollHandlers.push(handler);
  }

  public destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  public update() {
    
  }
}

export default SmoothScrollHandler;