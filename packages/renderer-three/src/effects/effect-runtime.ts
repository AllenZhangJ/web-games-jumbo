import type { RenderFrame } from '../frame/render-frame.js';

export interface EffectRuntime<TFrame = RenderFrame> {
  readonly id: string;
  update(frame: TFrame): void;
  clear(): void;
  dispose(): void;
}

export type EffectRuntimeFactory<TFrame = RenderFrame> = () => EffectRuntime<TFrame>;
