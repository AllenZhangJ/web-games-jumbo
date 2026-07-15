import type { RenderFrame } from '../frame/render-frame.js';

export interface EffectRuntime {
  readonly id: string;
  handle(frame: RenderFrame): void;
  clear(): void;
  dispose(): void;
}

export type EffectRuntimeFactory = () => EffectRuntime;
