import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
} from './animation-semantics.js';

function stringSet(values, name) {
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const set = new Set();
  for (const [index, value] of values.entries()) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError(`${name}[${index}] 必须是非空字符串。`);
    }
    if (set.has(value)) throw new RangeError(`${name} 不能包含重复项 ${value}。`);
    set.add(value);
  }
  return set;
}

export function resolveAnimationBinding(
  presentationDefinition,
  requestedSemantic,
  capabilities,
) {
  if (!presentationDefinition?.animationMap) {
    throw new TypeError('resolveAnimationBinding 需要 CharacterPresentationDefinition。');
  }
  if (!ARENA_ANIMATION_SEMANTIC_IDS.includes(requestedSemantic)) {
    throw new RangeError(`未知 AnimationSemantic ${String(requestedSemantic)}。`);
  }
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    throw new TypeError('Animation capabilities 必须是对象。');
  }
  const proceduralKeys = stringSet(capabilities.proceduralKeys, 'capabilities.proceduralKeys');
  const clipKeys = stringSet(capabilities.clipKeys, 'capabilities.clipKeys');
  const queue = [requestedSemantic];
  const visited = new Set();
  while (queue.length > 0) {
    const semantic = queue.shift();
    if (visited.has(semantic)) continue;
    visited.add(semantic);
    const binding = presentationDefinition.animationMap[semantic];
    if (!binding) {
      throw new RangeError(`${presentationDefinition.id} 缺少 animation ${semantic}。`);
    }
    const available = binding.sourceKind === ARENA_ANIMATION_SOURCE_KIND.PROCEDURAL
      ? proceduralKeys.has(binding.sourceKey)
      : binding.sourceKind === ARENA_ANIMATION_SOURCE_KIND.CLIP
        ? clipKeys.has(binding.sourceKey)
        : false;
    if (available) {
      return Object.freeze({
        requestedSemantic,
        resolvedSemantic: semantic,
        sourceKind: binding.sourceKind,
        sourceKey: binding.sourceKey,
        loop: binding.loop,
        usedFallback: semantic !== requestedSemantic,
      });
    }
    queue.push(...binding.fallbackSemantics);
  }
  throw new RangeError(
    `${presentationDefinition.id} 无法解析 animation ${requestedSemantic} 的可用 source。`,
  );
}
