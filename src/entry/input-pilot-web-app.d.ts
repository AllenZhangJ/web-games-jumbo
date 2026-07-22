import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';

export class InputPilotWebApp {
  constructor(options: { readonly platform: ArenaPlatformContract; readonly root?: object });
  start(): Promise<this>;
  getSnapshot(): unknown;
  destroy(): void;
}
