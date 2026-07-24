import { createArenaV1RuleEngine } from './arena-v1-rule-engine.js';
import { createArenaV1MapSystem } from './arena-v1-map-system.js';
import { createArenaV1AuthorityContent } from './arena-v1-authority-content.js';
import { createArenaV1SelectedAuthorityRegistries } from './arena-v1-content-selection.js';
import { createMatchContentSelection } from '@number-strategy-jump/arena-contracts';
import { STAGE4_INITIAL_EQUIPMENT_SPAWNS } from '@number-strategy-jump/arena-v1-content';
import { createArenaV1CharacterRegistry } from '@number-strategy-jump/arena-v1-content';
import { createArenaV1MapRegistry } from '@number-strategy-jump/arena-v1-content';
import { STAGE5_MAP_ID } from '@number-strategy-jump/arena-v1-content';
import {
  STATIC_MAP_ID_PREFIX,
  assertCharacterRegistry,
  createStaticMapDefinition,
  type MapDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  MatchCore,
  createArenaMatchConfig,
  type ArenaMatchConfig,
  type ArenaMatchConfigOverrides,
  type MatchCoreOptions,
} from '@number-strategy-jump/arena-match';
import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

const MATCH_CORE_OPTION_KEYS = new Set([
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
  'mapSystemFactory',
  'characterRegistry',
]);

interface MapRegistryContract {
  require(id: string): MapDefinition;
}

function dataField(record: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}

function resolveArenaV1Config(
  configValue: unknown = {},
  mapRegistry: MapRegistryContract = createArenaV1MapRegistry(),
): ArenaMatchConfigOverrides {
  const config = assertPlainRecord(
    cloneFrozenData(configValue, 'Arena V1 config'),
    'Arena V1 config',
  );
  const contentSelection = config.contentSelection === undefined
    || config.contentSelection === null
    ? null
    : createMatchContentSelection(config.contentSelection);
  const hasCustomArena = Object.prototype.hasOwnProperty.call(config, 'arena');
  const rawMapDefinitionId = config.mapDefinitionId;
  if (rawMapDefinitionId !== undefined && typeof rawMapDefinitionId !== 'string') {
    throw new TypeError('mapDefinitionId 必须是字符串。');
  }
  const requestedMapDefinitionId = rawMapDefinitionId
    ?? contentSelection?.selectedMapDefinitionId;
  if (
    contentSelection !== null
    && requestedMapDefinitionId !== contentSelection.selectedMapDefinitionId
  ) {
    throw new RangeError('mapDefinitionId 与 MatchContentSelection 选择不一致。');
  }
  let arena;
  let mapDefinitionId;
  if (hasCustomArena) {
    arena = config.arena;
    mapDefinitionId = requestedMapDefinitionId ?? createStaticMapDefinition(arena).id;
  } else {
    mapDefinitionId = requestedMapDefinitionId ?? STAGE5_MAP_ID;
    if (mapDefinitionId.startsWith(STATIC_MAP_ID_PREFIX)) {
      throw new RangeError(`MapDefinition ${mapDefinitionId} 需要显式 arena 内容。`);
    }
    arena = mapRegistry.require(mapDefinitionId).arena;
  }
  const equipment = Object.prototype.hasOwnProperty.call(config, 'equipment')
    ? config.equipment
    : {
      initialSpawns: hasCustomArena
        ? []
        : STAGE4_INITIAL_EQUIPMENT_SPAWNS.filter((spawn) => (
          contentSelection === null
          || contentSelection.equipmentDefinitionIds.includes(spawn.definitionId)
        )),
    };
  return {
    ...config,
    arena,
    mapDefinitionId,
    equipment,
    ...(contentSelection === null ? {} : {
      contentSelection,
      participantCharacters: config.participantCharacters
        ?? contentSelection.participantCharacters,
    }),
  } as ArenaMatchConfigOverrides;
}

export function createArenaV1MatchConfig(config: unknown = {}): ArenaMatchConfig {
  return createArenaMatchConfig(resolveArenaV1Config(config));
}

export function createArenaV1MatchCore(options: unknown = {}): MatchCore {
  assertKnownKeys(options, MATCH_CORE_OPTION_KEYS, 'createArenaV1MatchCore options');
  const fullMapRegistry = createArenaV1MapRegistry();
  const fullCharacterRegistry = assertCharacterRegistry(
    dataField(options, 'characterRegistry') ?? createArenaV1CharacterRegistry(),
  );
  const configValue = dataField(options, 'config') ?? {};
  const rawConfig = assertPlainRecord(
    cloneFrozenData(configValue, 'Arena V1 config'),
    'Arena V1 config',
  );
  const selected = rawConfig.contentSelection === undefined
    || rawConfig.contentSelection === null
    ? null
    : createArenaV1SelectedAuthorityRegistries({
      selection: rawConfig.contentSelection,
      mapRegistry: fullMapRegistry,
      characterRegistry: fullCharacterRegistry,
    });
  const mapRegistry = selected?.mapRegistry ?? fullMapRegistry;
  const characterRegistry = selected?.characterRegistry ?? fullCharacterRegistry;
  const configOverrides = resolveArenaV1Config(
    rawConfig,
    mapRegistry,
  );
  const authorityContent = createArenaV1AuthorityContent(
    createArenaMatchConfig(configOverrides),
    { mapRegistry, characterRegistry },
  );
  const ruleEngineFactory = dataField(options, 'ruleEngineFactory')
    ?? ((context: Parameters<NonNullable<MatchCoreOptions['ruleEngineFactory']>>[0]) => (
    createArenaV1RuleEngine({ ...context, authorityContent })
  ));
  const mapSystemFactory = dataField(options, 'mapSystemFactory')
    ?? ((context: Parameters<NonNullable<MatchCoreOptions['mapSystemFactory']>>[0]) => (
    createArenaV1MapSystem({ ...context, authorityContent })
  ));
  const physicsFactory = dataField(options, 'physicsFactory');
  return new MatchCore({
    seed: dataField(options, 'seed'),
    ...(physicsFactory === undefined ? {} : {
      physicsFactory: physicsFactory as NonNullable<MatchCoreOptions['physicsFactory']>,
    }),
    config: configOverrides,
    ruleEngineFactory: ruleEngineFactory as NonNullable<MatchCoreOptions['ruleEngineFactory']>,
    mapSystemFactory: mapSystemFactory as NonNullable<MatchCoreOptions['mapSystemFactory']>,
    characterRegistry: authorityContent.characterRegistry,
  });
}
