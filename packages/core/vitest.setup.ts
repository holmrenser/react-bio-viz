/*
 * jsdom has no `PointerEvent`, so Testing Library falls back to a plain `Event` and drops
 * `clientX`/`clientY`/`shiftKey`/`button` — which every drag, click-select and reorder gesture
 * test needs. A `MouseEvent` subclass carries all of those, plus the pointer-specific fields.
 */
if (typeof window !== "undefined" && !("PointerEvent" in window)) {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  (window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill;
}
