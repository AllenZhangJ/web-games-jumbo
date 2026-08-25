import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(new URL(
  '../src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
  import.meta.url,
), 'utf8');

describe('Arena V2 formal GLTF character animation hold candidate V1', () => {
  it('freezes only animation advancement while preserving the normal character sync path', () => {
    expect(SOURCE).toContain("'freezeAnimation'");
    expect(SOURCE).toContain('if (!freezeAnimation || snap)');
    expect(SOURCE).toContain('this.#syncEquipment(');
    expect(SOURCE).toContain('this.root.position.set(');
    expect(SOURCE).toContain('this.root.rotation.y = visualFacingYaw(');
    expect(SOURCE).toContain('this.root.visible = status === \'active\'');
    expect(SOURCE).toContain('this.#controller.update(this.#freezeAnimation ? 0 : delta)');
  });

  it('preflights a replacement weapon before retiring the previous attachment', () => {
    const createIndex = SOURCE.indexOf('const candidate = this.#createHeldEquipmentRecord(definitionId)');
    const consumeIndex = SOURCE.indexOf(
      'this.#syncHeldWeaponReadability(candidate, participant, frameValue)',
      createIndex,
    );
    const mountIndex = SOURCE.indexOf('this.#equipmentSlot.add(candidate.object)', consumeIndex);
    const retireIndex = SOURCE.indexOf('this.#cleanupHeldEquipmentRecord(previous)', mountIndex);
    expect(createIndex).toBeGreaterThan(-1);
    expect(consumeIndex).toBeGreaterThan(createIndex);
    expect(mountIndex).toBeGreaterThan(consumeIndex);
    expect(retireIndex).toBeGreaterThan(mountIndex);
    expect(SOURCE).toContain('readonly #heldEquipmentCleanupDebts = new Set<HeldEquipmentCleanupRecord>()');
    expect(SOURCE).toContain('heldEquipmentReplacementPreflightsBeforeRetiringPrevious: true');
    expect(SOURCE).toContain('failedHeldEquipmentReplacementRetainsRetryableCleanupDebt: true');
  });

  it('supports immediate lifecycle release and clears the hold before disposal', () => {
    expect(SOURCE).toContain('setAnimationHold(value: unknown): void');
    expect(SOURCE).toContain('clearAnimationHolds(): void');
    expect(SOURCE).toMatch(/for \(const view of this\.#views\.values\(\)\)[\s\S]*view\.setAnimationHold\(false\)/u);
    expect(SOURCE).toMatch(/dispose\(\): void \{[\s\S]*this\.#freezeAnimation = false;[\s\S]*this\.#controller\.dispose\(\)/u);
    expect(SOURCE).toContain('freezeAnimation: this.#freezeAnimation');
  });

  it('P6.327-P6.328 keeps formal character View and Factory child commits atomic', () => {
    expect(SOURCE).toContain('#operation: string | null = null');
    expect(SOURCE).toContain('#reentrySequence = 0');
    expect(SOURCE).toContain('#reentryError: Error | null = null');
    expect(SOURCE).not.toContain('#reentryAttempted');
    for (const operation of [
      'feedback-anchor',
      'animation-capabilities',
      'animation-hold',
      'impact-direction',
      'sync',
      'update',
      'impact-readability',
      'debug-snapshot',
      'dispose',
      'create-view',
      'resolve-feedback-anchor',
      'apply-impact-readability',
      'apply-impact-directions',
      'clear-animation-holds',
      'clear-impact-directions',
      'clear-impact-readability',
      'dispose-factory',
    ]) expect(SOURCE).toContain(`#runSynchronousOperation('${operation}'`);
    expect(SOURCE).toContain('viewSynchronousOperationsGuarded: true');
    expect(SOURCE).toContain('factorySynchronousOperationsGuarded: true');
    expect(SOURCE).toContain('swallowedThreeAndControllerReentryFailsViewClosed: true');
    expect(SOURCE).toContain('swallowedChildViewReentryFailsFactoryClosed: true');
    expect(SOURCE).toContain('animationEquipmentImpactAndDebugCommitsOperationIsolated: true');
    expect(SOURCE).toContain('disposalCommitsOperationIsolated: true');
    expect(SOURCE).toContain('stickyReentryUsesMonotonicSequenceAndFirstError: true');
    expect(SOURCE).toContain('viewChildCallbacksCheckedBeforeStateCommit: true');
    expect(SOURCE).toContain(
      'heldEquipmentPublicationWaitsForReadabilityAndMountConfirmation: true',
    );
    expect(SOURCE).toContain('viewCleanupReentryRetainsCurrentAndLaterOwners: true');
    expect(SOURCE).toContain('factoryChildCallbacksCheckedBeforeRegistryCommit: true');
    expect(SOURCE).toContain('factoryViewReleaseCallbackChecksParentOperation: true');
    expect(SOURCE).toContain('factoryCleanupReentryRetainsCurrentAndLaterOwners: true');
  });
});
