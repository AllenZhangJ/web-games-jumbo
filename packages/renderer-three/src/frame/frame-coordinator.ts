export interface FrameStep<TContext> {
  readonly id: string;
  update(context: TContext): void;
}

/** Owns the deterministic render update order. Layers never call each other. */
export class FrameCoordinator<TContext> {
  readonly #steps: readonly FrameStep<TContext>[];
  runCount = 0;

  constructor(steps: readonly FrameStep<TContext>[]) {
    const ids = new Set<string>();
    for (const step of steps) {
      if (!/^[a-z][a-z0-9-]*$/.test(step.id)) {
        throw new TypeError('帧步骤 id 必须是小写短横线标识符。');
      }
      if (ids.has(step.id)) throw new Error(`帧步骤重复：${step.id}`);
      ids.add(step.id);
    }
    this.#steps = Object.freeze([...steps]);
  }

  run(context: TContext): void {
    for (const step of this.#steps) step.update(context);
    this.runCount += 1;
  }

  ids(): readonly string[] {
    return Object.freeze(this.#steps.map(({ id }) => id));
  }
}
