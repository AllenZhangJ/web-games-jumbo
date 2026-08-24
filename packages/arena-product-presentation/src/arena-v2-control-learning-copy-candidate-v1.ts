import {
  ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1,
  ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1,
  type ArenaV2InputConceptCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1,
  ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1,
} from '@number-strategy-jump/arena-presentation-runtime';

const CONTROL_CONCEPT_LABELS: Readonly<Record<ArenaV2InputConceptCandidateV1, string>> =
  Object.freeze({
    [ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.DIRECTION]: '方向',
    [ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.JUMP]: '跳跃',
    [ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.PRIMARY_ATTACK]: '主攻击',
  });
if (ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.concepts.length !== 3
  || ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.crouchEnabled
  || ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.blockEnabled
  || ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.dashEnabled
  || ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.slamEnabled) {
  throw new RangeError('Arena V2操作学习文案只允许方向、跳跃、主攻击三概念合同。');
}
const CONTROL_CONCEPTS = Object.freeze(
  ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.concepts.map(
    (concept) => CONTROL_CONCEPT_LABELS[concept],
  ),
);
const CONCISE_CONTROL_TEXT = CONTROL_CONCEPTS.join(' + ');
const SPOKEN_CONTROL_TEXT = `${
  CONTROL_CONCEPT_LABELS[ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.DIRECTION]
}、${CONTROL_CONCEPT_LABELS[ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.JUMP]}和${
  CONTROL_CONCEPT_LABELS[ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.PRIMARY_ATTACK]
}`;
const PLATFORM_CONTROL_TEXT = `${
  ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.visibleText
}；${ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.visibleText}`;
const PLATFORM_CONTROL_ACCESSIBILITY_TEXT = `${
  ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.accessibilityText
}；${ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.accessibilityText}`;

export const ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  inputContractContentHash:
    ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.contentHash,
  concepts: CONTROL_CONCEPTS,
  conciseControlText: CONCISE_CONTROL_TEXT,
  spokenControlText: SPOKEN_CONTROL_TEXT,
  platformControlText: PLATFORM_CONTROL_TEXT,
  platformControlAccessibilityText: PLATFORM_CONTROL_ACCESSIBILITY_TEXT,
  quickStartText:
    `角色可选；${PLATFORM_CONTROL_TEXT}；所有角色操作不变，3分钟掌握基础`,
  characterLearningText:
    `${CONCISE_CONTROL_TEXT}；${PLATFORM_CONTROL_TEXT}；3分钟内可掌握基础`,
  loadingReadyText: `${PLATFORM_CONTROL_TEXT}；无格挡、无额外按键`,
  characterDifferenceText: '角色只改变可读手感与动作差异，不增加格挡或额外操作键',
  ownsInputMapping: false as const,
  addsInputConcepts: false as const,
  rejectsExpandedInputContract: true as const,
  forcedInactiveInputFields:
    ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.inputFrameProjection.forcedInactive,
  coveredCharacterCount: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.characterCount,
  coveredWeaponCount: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.weaponCount,
  coveredMapCount: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.mapCount,
  coveredMapSegmentCount:
    ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.mapSegmentCount,
  validationStatus: 'not-run' as const,
  defaultSurfaceWired: false as const,
});
