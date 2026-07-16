import type { VersionedDefinition } from '@number-strategy/game-contracts';
import type { ContentRegistry } from './registry.js';

export interface DisposableResource {
  dispose(): void;
}

export interface ContentSelectionSnapshot {
  readonly requestedId: string;
  readonly selectedId: string;
  readonly version: number;
  readonly usedFallback: boolean;
}

export class ContentSelection<
  TDefinition extends VersionedDefinition,
  TResource extends DisposableResource,
> {
  readonly registry: ContentRegistry<TDefinition>;
  readonly fallbackId: string;
  readonly factory: (definition: TDefinition) => TResource;
  resource: TResource | null = null;
  snapshot: ContentSelectionSnapshot | null = null;
  disposed = false;
  cleanupFailures = 0;
  lastCleanupError: Error | null = null;

  constructor({
    registry,
    fallbackId,
    factory,
  }: {
    readonly registry: ContentRegistry<TDefinition>;
    readonly fallbackId: string;
    readonly factory: (definition: TDefinition) => TResource;
  }) {
    this.registry = registry;
    this.fallbackId = fallbackId;
    this.factory = factory;
  }

  select(requestedId: string): TResource {
    if (this.disposed) throw new Error('内容选择器已销毁。');
    const resolved = this.registry.resolve(requestedId, this.fallbackId);
    const key = definitionKeyOf(resolved.definition);
    if (this.resource && this.snapshot && `${this.snapshot.selectedId}@${this.snapshot.version}` === key) {
      this.snapshot = { ...this.snapshot, requestedId, usedFallback: resolved.usedFallback };
      return this.resource;
    }
    let selected = resolved.definition;
    let usedFallback = resolved.usedFallback;
    let next: TResource;
    try {
      next = this.factory(selected);
    } catch (error) {
      if (selected.id === this.fallbackId) throw error;
      selected = this.registry.get(this.fallbackId);
      usedFallback = true;
      if (this.resource && this.snapshot?.selectedId === selected.id) {
        this.snapshot = {
          requestedId,
          selectedId: selected.id,
          version: selected.version,
          usedFallback,
        };
        return this.resource;
      }
      next = this.factory(selected);
    }
    const previous = this.resource;
    this.resource = next;
    this.snapshot = {
      requestedId,
      selectedId: selected.id,
      version: selected.version,
      usedFallback,
    };
    if (previous) {
      try {
        previous.dispose();
      } catch (error) {
        // Replacement is already committed. A broken old resource must not
        // make the caller treat the new, valid selection as failed.
        this.cleanupFailures += 1;
        this.lastCleanupError = error instanceof Error ? error : new Error(String(error));
      }
    }
    return next;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const resource = this.resource;
    this.resource = null;
    resource?.dispose();
  }
}

function definitionKeyOf(definition: VersionedDefinition): string {
  return `${definition.id}@${definition.version}`;
}
