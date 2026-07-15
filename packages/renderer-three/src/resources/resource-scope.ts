export interface DisposableResource {
  dispose(): void;
}

/**
 * Owns render-only resources with reverse-order teardown. A resource must have
 * exactly one scope owner so scene/character/effect replacement cannot leak it.
 */
export class RenderResourceScope {
  readonly label: string;
  readonly #resources: DisposableResource[] = [];
  #disposed = false;

  constructor(label: string) {
    if (!label.trim()) throw new TypeError('资源作用域必须有名称。');
    this.label = label;
  }

  own<T extends DisposableResource>(resource: T): T {
    if (this.#disposed) throw new Error(`资源作用域已销毁：${this.label}`);
    if (!resource || typeof resource.dispose !== 'function') {
      throw new TypeError('资源作用域只能接管可销毁资源。');
    }
    this.#resources.push(resource);
    return resource;
  }

  get size(): number {
    return this.#resources.length;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (let index = this.#resources.length - 1; index >= 0; index -= 1) {
      try {
        this.#resources[index]?.dispose();
      } catch {
        // One broken GPU resource must not prevent the remaining graph teardown.
      }
    }
    this.#resources.length = 0;
  }
}
