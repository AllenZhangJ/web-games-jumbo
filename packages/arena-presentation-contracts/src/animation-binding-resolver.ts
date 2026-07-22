import { assertKnownKeys, assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  createCharacterPresentationDefinition,
  type CharacterPresentationDefinition,
} from './character-presentation-definition.js';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
  type ArenaAnimationSemantic,
  type ArenaAnimationSourceKind,
} from './animation-semantics.js';

export interface AnimationCapabilities {
  readonly proceduralKeys: readonly string[];
  readonly clipKeys: readonly string[];
}
export interface ResolvedAnimationBinding {
  readonly requestedSemantic: ArenaAnimationSemantic;
  readonly resolvedSemantic: ArenaAnimationSemantic;
  readonly sourceKind: ArenaAnimationSourceKind;
  readonly sourceKey: string;
  readonly loop: boolean;
  readonly usedFallback: boolean;
}
const CAPABILITY_KEYS = new Set(['proceduralKeys', 'clipKeys']);
const SEMANTICS: ReadonlySet<unknown> = new Set(ARENA_ANIMATION_SEMANTIC_IDS);

function stringSet(values: unknown, name: string): ReadonlySet<string> {
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const set = new Set<string>();
  for (let index = 0; index < values.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name} 不能包含空槽或访问器。`);
    }
    const item = assertNonEmptyString(descriptor.value, `${name}[${index}]`);
    if (set.has(item)) throw new RangeError(`${name} 不能包含重复项 ${item}。`);
    set.add(item);
  }
  return set;
}

export function resolveAnimationBinding(
  presentationDefinitionValue: unknown,
  requestedSemanticValue: unknown,
  capabilitiesValue: unknown,
): ResolvedAnimationBinding {
  const presentationDefinition: CharacterPresentationDefinition =
    createCharacterPresentationDefinition(presentationDefinitionValue);
  if (!SEMANTICS.has(requestedSemanticValue)) {
    throw new RangeError(`未知 AnimationSemantic ${String(requestedSemanticValue)}。`);
  }
  const requestedSemantic = requestedSemanticValue as ArenaAnimationSemantic;
  assertKnownKeys(capabilitiesValue, CAPABILITY_KEYS, 'Animation capabilities');
  const proceduralKeys = stringSet(capabilitiesValue.proceduralKeys, 'capabilities.proceduralKeys');
  const clipKeys = stringSet(capabilitiesValue.clipKeys, 'capabilities.clipKeys');
  const queue: ArenaAnimationSemantic[] = [requestedSemantic];
  const visited = new Set<ArenaAnimationSemantic>();
  while (queue.length > 0) {
    const semantic = queue.shift();
    if (!semantic || visited.has(semantic)) continue;
    visited.add(semantic);
    const binding = presentationDefinition.animationMap[semantic];
    const available = binding.sourceKind === ARENA_ANIMATION_SOURCE_KIND.PROCEDURAL
      ? proceduralKeys.has(binding.sourceKey)
      : clipKeys.has(binding.sourceKey);
    if (available) {
      return Object.freeze({
        requestedSemantic, resolvedSemantic: semantic, sourceKind: binding.sourceKind,
        sourceKey: binding.sourceKey, loop: binding.loop,
        usedFallback: semantic !== requestedSemantic,
      });
    }
    queue.push(...binding.fallbackSemantics);
  }
  throw new RangeError(`${presentationDefinition.id} 无法解析 animation ${requestedSemantic} 的可用 source。`);
}
