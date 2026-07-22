import { describe, expect, it } from 'vitest';
import {
  ARENA_DEFAULT_DEVICE_ACCEPTANCE_DEFINITION_ID,
  ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID,
  createArenaDeviceAcceptanceDefinitionById,
  createArenaPerformanceEvidenceReport,
  createArenaStage9PerformanceDeviceAcceptanceV1Definition,
  createArenaStage9PerformanceV1Policy,
  listArenaDeviceAcceptanceDefinitionIds,
} from '../src/index.js';

describe('Arena Stage 9 evidence content', () => {
  it('固定目录顺序、版本化 Definition 和 Policy 身份', () => {
    const ids = listArenaDeviceAcceptanceDefinitionIds();
    expect(Object.isFrozen(ids)).toBe(true);
    expect(ids[0]).toBe(ARENA_DEFAULT_DEVICE_ACCEPTANCE_DEFINITION_ID);
    expect(ids).toContain(ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID);

    const definition = createArenaStage9PerformanceDeviceAcceptanceV1Definition();
    const policy = createArenaStage9PerformanceV1Policy();
    expect(definition.targets).toHaveLength(6);
    expect(policy.targets).toHaveLength(6);
    expect(definition.getContentHash()).toBe(
      createArenaStage9PerformanceDeviceAcceptanceV1Definition().getContentHash(),
    );
    expect(policy.getContentHash()).toBe(createArenaStage9PerformanceV1Policy().getContentHash());
    expect(createArenaDeviceAcceptanceDefinitionById(definition.id).getContentHash()).toBe(
      definition.getContentHash(),
    );
  });

  it('在组合报告校验前拒绝访问器且不执行', () => {
    let getterCalls = 0;
    const options = {
      get deviceDefinition() {
        getterCalls += 1;
        return null;
      },
      deviceBundle: null,
      performancePolicy: null,
      performanceRecords: [],
    };
    expect(() => createArenaPerformanceEvidenceReport(options)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('拒绝非字符串目录 id，不触发自定义转换', () => {
    let conversionCalls = 0;
    const value = {
      toString() {
        conversionCalls += 1;
        return ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID;
      },
    };
    expect(() => createArenaDeviceAcceptanceDefinitionById(value)).toThrow(/id|字符串/);
    expect(conversionCalls).toBe(0);
  });
});
