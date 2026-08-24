import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  projectArenaV2InformationCollectionContentV1,
  projectArenaV2MapDetailContentFieldsV1,
  projectArenaV2MapRouteSkeletonReadV1,
  projectArenaV2WeaponCoreFightReadV1,
  projectArenaV2WeaponDetailContentFieldsV1,
  projectArenaV2WeaponOperationReadV1,
} from '../src/index.js';

describe('Arena V2 information content read projection V1', () => {
  it('projects 20 named weapon collection cards and 20 named segment cards across two maps', () => {
    const projection = projectArenaV2InformationCollectionContentV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    );
    expect(projection).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      defaultSurfaceWired: false,
      ownerId: 'p5-content',
    });
    expect(projection.weapons).toHaveLength(20);
    expect(projection.weapons[0]?.displayName).toBe('冲锋盾');
    expect(projection.weapons[19]?.displayName).toBe('蓄势拳');
    expect(projection.maps).toHaveLength(2);
    expect(projection.maps[0]?.segments).toHaveLength(12);
    expect(projection.maps[1]?.segments).toHaveLength(8);
    expect(projection.maps[0]?.segments[0]?.displayName).toBe('起步平台');
    expect(projection.maps[0]?.segments[11]?.displayName).toBe('终局钢丝');
  });

  it('provides only the five P5-owned weapon detail fields for every weapon', () => {
    for (const weapon of ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons) {
      const operation = projectArenaV2WeaponOperationReadV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
        weapon.weaponDefinitionId,
      );
      expect(operation.weaponDefinitionId).toBe(weapon.weaponDefinitionId);
      expect(operation.catalogId).toBe(weapon.catalogId);
      expect(operation.compactText).toBe(
        weapon.actions[0]!.primaryGesture === 'press' ? '按一下' : '按住松开',
      );
      expect(projectArenaV2WeaponOperationReadV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
        weapon.catalogId,
      )).toEqual(operation);
      const coreFight = projectArenaV2WeaponCoreFightReadV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
        weapon.weaponDefinitionId,
      );
      expect(coreFight).toMatchObject({
        weaponDefinitionId: weapon.weaponDefinitionId,
        catalogId: weapon.catalogId,
        displayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
          weapon.nameMessageId,
        ),
        coreVerb: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
          `arena.v2.verb.${weapon.coreVerb}`,
        ),
        operation,
        tradeoff: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
          weapon.learningProblemMessageId,
        ),
      });
      expect(projectArenaV2WeaponCoreFightReadV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
        weapon.catalogId,
      )).toEqual(coreFight);
      const source = projectArenaV2WeaponDetailContentFieldsV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
        weapon.weaponDefinitionId,
      );
      expect(source.ownerId).toBe('p5-content');
      expect(source.fieldValues.map(({ fieldId }) => fieldId)).toEqual([
        'range-coverage',
        'timing-risk',
        'ground-aerial',
        'counter-inputs',
        'map-consequences',
      ]);
      expect(source.fieldValues.some(({ fieldId }) => fieldId === 'weapon-record')).toBe(false);
      const timingText = source.fieldValues.find(({ fieldId }) => fieldId === 'timing-risk')
        ?.valueText;
      expect(timingText).toContain('秒');
      expect(timingText).not.toContain('tick');
      const operationField = source.fieldValues.find(({ fieldId }) => (
        fieldId === 'ground-aerial'
      ));
      expect(operationField?.valueText).toBe(`核心：${coreFight.compactText}`);
      expect(operationField?.accessibilityText).toBe(coreFight.accessibilityText);
      expect(operationField?.valueText).not.toContain('地面：');
      expect(operationField?.valueText).not.toContain('空中：');
      expect(operationField?.accessibilityText).toContain(operation.accessibilityText);
      expect(operationField?.accessibilityText).toContain('地面：');
      expect(operationField?.accessibilityText).toContain('空中：');
      expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        'arena.v2.field.ground-aerial',
      )).toBe('核心打法');
    }
    expect(() => projectArenaV2WeaponOperationReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      'unknown-weapon',
    )).toThrow(/没有unknown-weapon/);
    expect(() => projectArenaV2WeaponCoreFightReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      'unknown-weapon',
    )).toThrow(/没有unknown-weapon/);
    const firstWeapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons[0]!;
    const mismatchedCatalog = {
      ...ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      weapons: [
        {
          ...firstWeapon,
          actions: [
            firstWeapon.actions[0]!,
            {
              ...firstWeapon.actions[1]!,
              primaryGesture: firstWeapon.actions[0]!.primaryGesture === 'press'
                ? 'hold-release'
                : 'press',
            },
          ],
        },
        ...ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.slice(1),
      ],
    };
    expect(() => projectArenaV2WeaponOperationReadV1(
      mismatchedCatalog,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      firstWeapon.weaponDefinitionId,
    )).toThrow(/基础手势不一致/);
  });

  it('provides only the four P5-owned map detail fields', () => {
    const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps[0]!;
    const skeleton = projectArenaV2MapRouteSkeletonReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      map.mapDefinitionId,
    );
    expect(skeleton.mapDefinitionId).toBe(map.mapDefinitionId);
    expect(skeleton.displayName).toBe('KZ 十二段竞技路线');
    expect(skeleton.visibleText).toBe(
      '起步平台 → 双路迷宫 → 长线钢丝 → 终局钢丝',
    );
    expect(skeleton.compactText).toBe('起步平台→双路迷宫→长线钢丝→终局钢丝');
    expect(skeleton.anchors.map(({ ordinal }) => ordinal)).toEqual([1, 4, 6, 12]);
    const source = projectArenaV2MapDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      map.mapDefinitionId,
    );
    expect(source.fieldValues.map(({ fieldId }) => fieldId)).toEqual([
      'route-goal',
      'hazard-summary',
      'full-route',
      'weapon-consequences',
    ]);
    expect(source.fieldValues.some(({ fieldId }) => (
      fieldId === 'best-record' || fieldId === 'mode-records'
    ))).toBe(false);
    expect(source.fieldValues.find(({ fieldId }) => fieldId === 'full-route')?.valueText)
      .toContain('12.终局钢丝');
    expect(source.fieldValues.find(({ fieldId }) => fieldId === 'full-route')?.valueText)
      .toContain('［缓冲·强度1·重置台］');
    expect(source.fieldValues.find(({ fieldId }) => fieldId === 'route-goal')?.valueText)
      .toContain('两轮分支递进');
    expect(source.fieldValues.find(({ fieldId }) => fieldId === 'weapon-consequences')?.valueText)
      .toContain('地标顺序：起步台→落点岛');
    const routeSkeleton = source.fieldValues.find(({ fieldId }) => (
      fieldId === 'hazard-summary'
    ));
    expect(routeSkeleton?.valueText).toBe(skeleton.visibleText);
    expect(routeSkeleton?.accessibilityText).toContain(
      '起步：第1段起步平台',
    );
    expect(routeSkeleton?.accessibilityText).toContain(
      '第一次变化：第4段双路迷宫',
    );
    expect(routeSkeleton?.accessibilityText).toContain(
      '第一次高潮：第6段长线钢丝',
    );
    expect(routeSkeleton?.accessibilityText).toContain(
      '收官：第12段终局钢丝',
    );
    expect(source.fieldValues.find(({ fieldId }) => fieldId === 'full-route')?.valueText)
      .toContain('危险统计：');
    expect(source.fieldValues.find(({ fieldId }) => fieldId === 'full-route')?.valueText)
      .toContain('3秒');
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      'arena.v2.field.hazard-summary',
    )).toBe('路线骨架');

    const switchbackMap = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps[1]!;
    const switchbackSkeleton = projectArenaV2MapRouteSkeletonReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      switchbackMap.mapDefinitionId,
    );
    const switchback = projectArenaV2MapDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      switchbackMap.mapDefinitionId,
    );
    expect(switchback.fieldValues.find(({ fieldId }) => (
      fieldId === 'hazard-summary'
    ))?.valueText).toBe(switchbackSkeleton.visibleText);
    expect(switchbackSkeleton.compactText).toBe(
      '回折起步台→北转窄道→西向钢丝→西侧收官',
    );
    expect(() => projectArenaV2MapRouteSkeletonReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      'unknown-map',
    )).toThrow(/没有unknown-map/);
  });

  it('reuses the shared concrete practice summary in competitive weapon and map detail fields', () => {
    const weapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons[0]!;
    const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps[0]!;
    const context = {
      modeKind: 'race' as const,
      weaponDefinitionId: weapon.weaponDefinitionId,
      mapDefinitionId: map.mapDefinitionId,
    };
    const weaponSource = projectArenaV2WeaponDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      weapon.weaponDefinitionId,
      context,
    );
    expect(weaponSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'map-consequences'
    ))?.valueText).toContain(
      '当前竞速地图KZ 十二段竞技路线优先练平台入口（第1段·起步平台）、断层（第2段·定向断层）',
    );

    const mapSource = projectArenaV2MapDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      map.mapDefinitionId,
      context,
    );
    expect(mapSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-consequences'
    ))?.valueText).toContain(
      '当前竞速武器冲锋盾优先练平台入口（第1段·起步平台）、断层（第2段·定向断层）',
    );
  });

  it('rejects survival, extra fields and weapon or map identity drift in detail learning context', () => {
    const weapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons[0]!;
    const otherWeapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons[1]!;
    const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps[0]!;
    const otherMap = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps[1]!;
    expect(() => projectArenaV2WeaponDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      weapon.weaponDefinitionId,
      {
        modeKind: 'survival',
        weaponDefinitionId: weapon.weaponDefinitionId,
        mapDefinitionId: map.mapDefinitionId,
      } as never,
    )).toThrow(/只接受1v1或竞速/);
    expect(() => projectArenaV2WeaponDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      weapon.weaponDefinitionId,
      {
        modeKind: 'duel',
        weaponDefinitionId: weapon.weaponDefinitionId,
        mapDefinitionId: map.mapDefinitionId,
        future: true,
      } as never,
    )).toThrow(/future/);
    expect(() => projectArenaV2WeaponDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      weapon.weaponDefinitionId,
      {
        modeKind: 'duel',
        weaponDefinitionId: otherWeapon.weaponDefinitionId,
        mapDefinitionId: map.mapDefinitionId,
      },
    )).toThrow(/武器身份不一致/);
    expect(() => projectArenaV2MapDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      map.mapDefinitionId,
      {
        modeKind: 'duel',
        weaponDefinitionId: weapon.weaponDefinitionId,
        mapDefinitionId: otherMap.mapDefinitionId,
      },
    )).toThrow(/地图身份不一致/);
  });
});
