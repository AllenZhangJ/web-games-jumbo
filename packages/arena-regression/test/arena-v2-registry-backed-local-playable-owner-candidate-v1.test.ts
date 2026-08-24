import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE_PATH =
  'packages/arena-regression/src/arena-v2-registry-backed-local-playable-owner-candidate-v1.ts';

describe('Arena V2 Registry-backed local playable owner candidate V1', () => {
  it('routes the assessment-only entry through the configuration envelope', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const start = source.indexOf('  beginSingleWeaponPromotionFromAssessment(');
    const end = source.indexOf('  promoteNextWeaponFromAssessment(', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const section = source.slice(start, end);
    expect(section).toContain(
      'createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1({',
    );
    expect(section).toContain('registryReference: this.#registryBootstrap!');
    expect(section).toContain('this.#beginSingleWeaponPromotionFromConfiguration(');
    expect(section).toContain('BEGIN_PROMOTION_FROM_ASSESSMENT_OPTION_KEYS');
    expect(section).not.toContain('createArenaV2SingleWeaponRegistrationPlanCandidateV1');
    expect(section).not.toMatch(/\bplan\s*:/u);
  });

  it('retains only the legacy explicit assessment plus plan compatibility entry', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const start = source.indexOf('  beginSingleWeaponPromotion(');
    const end = source.indexOf('  #beginSingleWeaponPromotionFromConfiguration(', start);
    const section = source.slice(start, end);
    expect(section).toContain(
      'createArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1({',
    );
    expect(section).toContain('plan: options.plan');
    expect(source).toContain('assessmentOnlyConfigurationEnvelopeWired: true');
    expect(source).toContain('callerSuppliedPlanCompatibilityEntryRetained: true');
    expect(source).toContain('assessmentOnlyCallerSuppliedPlanAllowed: false');
    expect(section).toContain('BEGIN_PROMOTION_OPTION_KEYS');
  });

  it('rejects promotion accessors and future fields before constructing the promotion owner', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const validationStart = source.indexOf('function exactPromotionOptions(');
    const ownerConstruction = source.indexOf(
      'new ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1({',
    );
    expect(validationStart).toBeGreaterThanOrEqual(0);
    expect(source.slice(validationStart, ownerConstruction)).toContain(
      'assertKnownKeys(value, keys, name)',
    );
    expect(source.slice(validationStart, ownerConstruction)).toContain(
      "Object.hasOwn(descriptor, 'value')",
    );
  });

  it('revalidates both registry sequences before publishing an availability fact', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const start = source.indexOf('function availabilityChange(');
    const end = source.indexOf('\nexport class ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const section = source.slice(start, end);
    expect(section.match(/projectArenaV2RegistryWeaponSequenceCandidateV1\(/gu)).toHaveLength(2);
    expect(section).toContain('previousSequence.nextWeaponId !== expectedWeaponId');
    expect(section).toContain(
      'nextSequence.activeWeaponCount !== previousSequence.activeWeaponCount + 1',
    );
    expect(section).toContain('previousIds.some((weaponId, index) => nextIds[index] !== weaponId)');
    expect(section).toContain('nextIds[nextIds.length - 1] !== expectedWeaponId');
    expect(section).toContain('const hashPattern = /^[0-9a-f]{8}$/u');
    expect(source).toContain('availabilityFactPreviousAndNextSequencesRevalidated: true');
    expect(source).toContain('availabilityFactAppendsNextCatalogWeaponOnly: true');
    expect(source).toContain('availabilityFactHashAndRevisionClosed: true');
  });

  it('snapshots outer and local playable options without executing accessors', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const parserStart = source.indexOf('function ownerOptions(');
    const promotionParserStart = source.indexOf('function exactPromotionOptions(', parserStart);
    expect(parserStart).toBeGreaterThanOrEqual(0);
    expect(promotionParserStart).toBeGreaterThan(parserStart);
    const section = source.slice(parserStart, promotionParserStart);
    expect(section).toContain('Object.getOwnPropertyDescriptors(value)');
    expect(section).toContain("Object.getOwnPropertySymbols(value).length > 0");
    expect(section).toContain("Object.hasOwn(descriptor, 'value')");
    expect(section).toContain('Object.defineProperty(snapshot, key, {');
    expect(source).toContain('const parsedOptions = ownerOptions(options)');
    expect(source).toContain('outerOptionsDescriptorSnapshotBeforeConstruction: true');
    expect(source).toContain('localPlayableOptionsDescriptorSnapshotBeforeSpread: true');
    expect(source).toContain('firstProvisioningOptionsDescriptorSnapshotBeforeHandoff: true');
    expect(source).toContain('optionAccessorsExecuted: false');
    const handoffStart = source.indexOf(
      'export function createArenaV2RegistryBackedLocalPlayableOwnerFromFirstProvisioningCandidateV1(',
    );
    expect(handoffStart).toBeGreaterThanOrEqual(0);
    const handoff = source.slice(handoffStart);
    expect(handoff).toContain('const values = new Map<string, unknown>()');
    expect(handoff).toContain('values.set(key, descriptor.value)');
    expect(handoff).not.toContain('options.provisioningOwner.takeRuntimeBootstrap()');
    expect(handoff).not.toContain('localPlayableOptions: options.localPlayableOptions');
  });

  it('retains nested local construction debt before releasing the shared bootstrap', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    expect(source).toContain(
      'class ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1',
    );
    expect(source).toContain('get cleanupComplete(): boolean');
    expect(source).toContain('retryCleanup(): void');
    const cleanupStart = source.indexOf(
      'function cleanupRegistryBackedLocalPlayableConstructionResourcesCandidateV1(',
    );
    const cleanupEnd = source.indexOf(
      '\n\nexport class ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1',
      cleanupStart,
    );
    expect(cleanupStart).toBeGreaterThanOrEqual(0);
    expect(cleanupEnd).toBeGreaterThan(cleanupStart);
    const cleanup = source.slice(cleanupStart, cleanupEnd);
    expect(cleanup).toContain('debt.retryCleanup()');
    expect(cleanup).toContain('resources.downstreamConstructionDebt === null');
    expect(cleanup).toContain('registryBootstrap.destroy()');
    expect(cleanup.indexOf('debt.retryCleanup()')).toBeLessThan(
      cleanup.indexOf('registryBootstrap.destroy()'),
    );
    expect(source).toContain('constructionCleanupRetainsNestedLocalPlayableDebt: true');
    expect(source).toContain(
      'constructionCleanupWaitsForLocalPlayableBeforeRegistryBootstrap: true',
    );
    expect(source).toContain('constructionCleanupRetriesOnlyIncompleteOwners: true');
    expect(source).toContain(
      'firstProvisioningFactoryDoesNotDoubleDestroyRetainedBootstrap: true',
    );
    const factoryStart = source.indexOf(
      'export function createArenaV2RegistryBackedLocalPlayableOwnerFromFirstProvisioningCandidateV1(',
    );
    const factory = source.slice(factoryStart);
    expect(factory).toContain(
      'ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1',
    );
    expect(factory).toContain('registryBootstrap.snapshot().destroyed');
  });
});
