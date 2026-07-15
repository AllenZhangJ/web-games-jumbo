export interface ContextCanvas {
  addEventListener?(type: string, listener: (event?: unknown) => void, options?: boolean): void;
  removeEventListener?(type: string, listener: (event?: unknown) => void, options?: boolean): void;
}

export class ContextLifecycle {
  readonly canvas: ContextCanvas;
  readonly onLost: () => void;
  readonly onRestored: () => void;
  lost = false;
  disposed = false;
  readonly listeners: Array<readonly [string, (event?: unknown) => void]> = [];

  constructor(canvas: ContextCanvas, {
    onLost = () => {},
    onRestored = () => {},
  }: {
    readonly onLost?: () => void;
    readonly onRestored?: () => void;
  } = {}) {
    this.canvas = canvas;
    this.onLost = onLost;
    this.onRestored = onRestored;
  }

  bind(): void {
    if (this.disposed || this.listeners.length > 0) return;
    const lost = (event?: unknown): void => {
      const preventDefault = (event as { preventDefault?: () => void } | undefined)?.preventDefault;
      try { preventDefault?.(); } catch { /* Context loss prevention is best effort. */ }
      if (this.disposed) return;
      this.lost = true;
      this.onLost();
    };
    const restored = (): void => {
      if (this.disposed) return;
      this.lost = false;
      this.onRestored();
    };
    for (const entry of [['webglcontextlost', lost], ['webglcontextrestored', restored]] as const) {
      this.canvas.addEventListener?.(entry[0], entry[1], false);
      this.listeners.push(entry);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const [type, listener] of this.listeners.splice(0)) {
      try { this.canvas.removeEventListener?.(type, listener, false); } catch { /* Continue cleanup. */ }
    }
    this.lost = false;
  }
}
