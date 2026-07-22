import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';

export class HumanMatchStudyWebApp {
  constructor(options: { readonly platform: ArenaPlatformContract; readonly root?: object });
  start(): Promise<this>;
  destroy(): void;
}
