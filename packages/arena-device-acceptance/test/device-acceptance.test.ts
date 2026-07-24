import { describe, expect, it } from 'vitest';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
  createArenaDeviceAcceptanceDefinition,
  createArenaBuildManifest,
  createArenaStage6DeviceAcceptanceV1Definition,
  createArenaStage8ProductDeviceAcceptanceV1Definition,
} from '../src/index.js';

describe('device acceptance definitions', () => {
  it('keeps stable stage 6 and stage 8 target catalogs', () => {
    const stage6 = createArenaStage6DeviceAcceptanceV1Definition();
    const stage8 = createArenaStage8ProductDeviceAcceptanceV1Definition();
    expect(stage6.targets).toHaveLength(5);
    expect(stage8.targets).toHaveLength(6);
    expect(stage8.getTarget('wechat-ios-phone')?.requiredOsNames).toEqual(['iOS']);
    expect(createArenaStage6DeviceAcceptanceV1Definition().getContentHash())
      .toBe(stage6.getContentHash());
  });

  it('rejects an accessor without executing it', () => {
    const definition = createArenaStage6DeviceAcceptanceV1Definition();
    let getterCalls = 0;
    const value = {
      ...definition.toJSON(),
      get id(): string {
        getterCalls += 1;
        return definition.id;
      },
    };
    expect(() => createArenaDeviceAcceptanceDefinition(value)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('publishes a frozen, deterministic build manifest', () => {
    const manifest = createArenaBuildManifest({
      schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
      buildId: 'arena-test-build',
      commit: 'a'.repeat(40),
      sourceDirty: false,
      target: 'web',
      defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
      artifacts: [{ path: 'index.html', sha256: 'b'.repeat(64), byteLength: 128 }],
    });
    expect(manifest.getArtifact('index.html')?.byteLength).toBe(128);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(createArenaBuildManifest(manifest)).toBe(manifest);
  });
});
