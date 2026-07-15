import type { GameEvent, GameSnapshot } from '@number-strategy/game-contracts';

export interface RenderFrame {
  readonly snapshot: GameSnapshot;
  readonly events: readonly GameEvent[];
  readonly nowMs: number;
  readonly deltaSeconds: number;
}

export interface RenderViewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly safeArea: Readonly<Record<string, number>> | null;
}

export interface RenderLayer {
  resize(viewport: RenderViewport): void;
  update(frame: RenderFrame): void;
  dispose(): void;
}
