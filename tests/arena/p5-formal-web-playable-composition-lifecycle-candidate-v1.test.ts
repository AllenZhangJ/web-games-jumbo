import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertSynchronousReturn,
} from '../../packages/arena-contracts/src/synchronous-return-boundary.js';

const SOURCE_PATH = 'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts';
const MATCH_HOST_SOURCE_PATH = 'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts';
const MATCH_SURFACE_SOURCE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-formal-match-surface-candidate-v1.ts';
const THREE_STAGE_SOURCE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts';
const THREE_PRELOADER_SOURCE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts';
const THREE_CAMERA_SOURCE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-formal-three-camera-controller-candidate-v1.ts';
const THREE_VFX_SOURCE_PATH = 'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts';
const WEB_AUDIO_SOURCE_PATH = 'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts';
const LOCAL_PLAYABLE_SOURCE_PATH =
  'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts';
const LOCAL_PLAYABLE_BINDING_SOURCE_PATH =
  'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts';
const KEYBOARD_DRIVER_SOURCE_PATH =
  'src/entry/arena-v2-local-match-keyboard-driver-candidate-v1.ts';
const POINTER_DRIVER_SOURCE_PATH =
  'src/entry/arena-v2-local-match-pointer-driver-candidate-v1.ts';
const POINTER_SURFACE_SOURCE_PATH =
  'src/entry/arena-v2-formal-web-pointer-surface-candidate-v1.ts';
const TWENTY_WEAPON_FEEDBACK_VFX_PORT_SOURCE_PATH =
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.ts';
const FEEDBACK_EFFECT_CONSUMER_SOURCE_PATH =
  'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts';
const TWENTY_WEAPON_FEEDBACK_HUD_HOST_SOURCE_PATH =
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts';
const MODE_HUD_PRESENTATION_HOST_SOURCE_PATH =
  'packages/arena-product-presentation/src/arena-v2-mode-hud-presentation-host-v1.ts';
const INFORMATION_DOM_SURFACE_SOURCE_PATH =
  'src/entry/arena-v2-information-dom-surface-candidate-v1.ts';
const INFORMATION_CANVAS_SURFACE_SOURCE_PATH =
  'src/entry/arena-v2-information-canvas-surface-candidate-v1.ts';
const PERSISTENT_REGISTRY_PUBLICATION_PORT_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-persistent-registry-publication-port-candidate-v1.ts';
const SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-single-weapon-registry-publication-owner-candidate-v1.ts';
const SINGLE_WEAPON_PERSISTENT_REGISTRATION_HOST_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-single-weapon-persistent-registration-host-candidate-v1.ts';
const SINGLE_WEAPON_REGISTRY_PROMOTION_COORDINATOR_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-single-weapon-registry-promotion-coordinator-candidate-v1.ts';
const FIRST_WEAPON_REGISTRY_INITIALIZATION_OWNER_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-first-weapon-registry-initialization-owner-candidate-v1.ts';
const FIRST_WEAPON_REGISTRY_PROVISIONING_OWNER_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-first-weapon-registry-provisioning-owner-candidate-v1.ts';
const SYNCHRONOUS_RETURN_SOURCE_PATH =
  'packages/arena-contracts/src/synchronous-return-boundary.ts';
const REGISTRY_OWNER_SOURCE_PATH =
  'packages/arena-regression/src/arena-v2-registry-backed-local-playable-owner-candidate-v1.ts';
const INFORMATION_MODE_SESSION_HOST_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-information-mode-session-host-candidate-v1.ts';
const HUD_READY_LEARNING_MODE_SESSION_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-hud-ready-learning-mode-session-candidate-v1.ts';
const LEARNING_MODE_SESSION_BRIDGE_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-learning-mode-session-bridge-candidate-v1.ts';
const MODE_PRODUCT_SESSION_V2_SOURCE_PATH =
  'packages/arena-product-session/src/mode-product-session-v2.ts';
const MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_SOURCE_PATH =
  'packages/arena-session/src/mode-authoritative-local-match-session-v3.ts';
const MODE_MATCH_RUNTIME_V6_SOURCE_PATH =
  'packages/arena-match/src/mode-match-runtime-v6.ts';
const MODE_AUTHORITATIVE_QUICK_MATCH_SERVICE_V3_SOURCE_PATH =
  'packages/arena-quick-match/src/mode-authoritative-quick-match-service-v3.ts';
const QUICK_MATCH_BUNDLE_FACTORY_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-quick-match-bundle-factory-candidate-v1.ts';
const MODE_LEARNING_SESSION_FACTORY_SOURCE_PATH =
  'packages/arena-product-composition/src/arena-v2-mode-learning-session-factory-candidate-v1.ts';

function source(): string {
  return readFileSync(SOURCE_PATH, 'utf8');
}

function matchHostSource(): string {
  return readFileSync(MATCH_HOST_SOURCE_PATH, 'utf8');
}

function matchSurfaceSource(): string {
  return readFileSync(MATCH_SURFACE_SOURCE_PATH, 'utf8');
}

function threeStageSource(): string {
  return readFileSync(THREE_STAGE_SOURCE_PATH, 'utf8');
}

function threePreloaderSource(): string {
  return readFileSync(THREE_PRELOADER_SOURCE_PATH, 'utf8');
}

function threeCameraSource(): string {
  return readFileSync(THREE_CAMERA_SOURCE_PATH, 'utf8');
}

function threeVfxSource(): string {
  return readFileSync(THREE_VFX_SOURCE_PATH, 'utf8');
}

function webAudioSource(): string {
  return readFileSync(WEB_AUDIO_SOURCE_PATH, 'utf8');
}

function localPlayableSource(): string {
  return readFileSync(LOCAL_PLAYABLE_SOURCE_PATH, 'utf8');
}

function localPlayableBindingSource(): string {
  return readFileSync(LOCAL_PLAYABLE_BINDING_SOURCE_PATH, 'utf8');
}

function keyboardDriverSource(): string {
  return readFileSync(KEYBOARD_DRIVER_SOURCE_PATH, 'utf8');
}

function pointerDriverSource(): string {
  return readFileSync(POINTER_DRIVER_SOURCE_PATH, 'utf8');
}

function pointerSurfaceSource(): string {
  return readFileSync(POINTER_SURFACE_SOURCE_PATH, 'utf8');
}

function twentyWeaponFeedbackVfxPortSource(): string {
  return readFileSync(TWENTY_WEAPON_FEEDBACK_VFX_PORT_SOURCE_PATH, 'utf8');
}

function feedbackEffectConsumerSource(): string {
  return readFileSync(FEEDBACK_EFFECT_CONSUMER_SOURCE_PATH, 'utf8');
}

function twentyWeaponFeedbackHudHostSource(): string {
  return readFileSync(TWENTY_WEAPON_FEEDBACK_HUD_HOST_SOURCE_PATH, 'utf8');
}

function modeHudPresentationHostSource(): string {
  return readFileSync(MODE_HUD_PRESENTATION_HOST_SOURCE_PATH, 'utf8');
}

function informationDomSurfaceSource(): string {
  return readFileSync(INFORMATION_DOM_SURFACE_SOURCE_PATH, 'utf8');
}

function informationCanvasSurfaceSource(): string {
  return readFileSync(INFORMATION_CANVAS_SURFACE_SOURCE_PATH, 'utf8');
}

function persistentRegistryPublicationPortSource(): string {
  return readFileSync(PERSISTENT_REGISTRY_PUBLICATION_PORT_SOURCE_PATH, 'utf8');
}

function singleWeaponRegistryPublicationOwnerSource(): string {
  return readFileSync(SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_SOURCE_PATH, 'utf8');
}

function singleWeaponPersistentRegistrationHostSource(): string {
  return readFileSync(SINGLE_WEAPON_PERSISTENT_REGISTRATION_HOST_SOURCE_PATH, 'utf8');
}

function singleWeaponRegistryPromotionCoordinatorSource(): string {
  return readFileSync(SINGLE_WEAPON_REGISTRY_PROMOTION_COORDINATOR_SOURCE_PATH, 'utf8');
}

function firstWeaponRegistryInitializationOwnerSource(): string {
  return readFileSync(FIRST_WEAPON_REGISTRY_INITIALIZATION_OWNER_SOURCE_PATH, 'utf8');
}

function firstWeaponRegistryProvisioningOwnerSource(): string {
  return readFileSync(FIRST_WEAPON_REGISTRY_PROVISIONING_OWNER_SOURCE_PATH, 'utf8');
}

function synchronousReturnSource(): string {
  return readFileSync(SYNCHRONOUS_RETURN_SOURCE_PATH, 'utf8');
}

function registryOwnerSource(): string {
  return readFileSync(REGISTRY_OWNER_SOURCE_PATH, 'utf8');
}

function informationModeSessionHostSource(): string {
  return readFileSync(INFORMATION_MODE_SESSION_HOST_SOURCE_PATH, 'utf8');
}

function hudReadyLearningModeSessionSource(): string {
  return readFileSync(HUD_READY_LEARNING_MODE_SESSION_SOURCE_PATH, 'utf8');
}

function learningModeSessionBridgeSource(): string {
  return readFileSync(LEARNING_MODE_SESSION_BRIDGE_SOURCE_PATH, 'utf8');
}

function modeProductSessionV2Source(): string {
  return readFileSync(MODE_PRODUCT_SESSION_V2_SOURCE_PATH, 'utf8');
}

function modeAuthoritativeLocalMatchSessionV3Source(): string {
  return readFileSync(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_SOURCE_PATH, 'utf8');
}

function modeMatchRuntimeV6Source(): string {
  return readFileSync(MODE_MATCH_RUNTIME_V6_SOURCE_PATH, 'utf8');
}

function modeAuthoritativeQuickMatchServiceV3Source(): string {
  return readFileSync(MODE_AUTHORITATIVE_QUICK_MATCH_SERVICE_V3_SOURCE_PATH, 'utf8');
}

function quickMatchBundleFactorySource(): string {
  return readFileSync(QUICK_MATCH_BUNDLE_FACTORY_SOURCE_PATH, 'utf8');
}

function modeLearningSessionFactorySource(): string {
  return readFileSync(MODE_LEARNING_SESSION_FACTORY_SOURCE_PATH, 'utf8');
}

function section(value: string, start: string, end: string): string {
  const startIndex = value.indexOf(start);
  const endIndex = value.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing section start: ${start}`);
  assert.notEqual(endIndex, -1, `missing section end: ${end}`);
  return value.slice(startIndex, endIndex);
}

test('P5.3x contains native Promise rejections without invoking hostile thenables', () => {
  const value = source();
  const helper = section(value, 'function rejectThenable(', 'function finiteAtLeast(');
  const brandProbe = helper.indexOf('Reflect.apply(NATIVE_PROMISE_THEN');
  const descriptorScan = helper.indexOf("Object.getOwnPropertyDescriptor(cursor, 'then')");
  assert.notEqual(brandProbe, -1);
  assert.notEqual(descriptorScan, -1);
  assert.equal(brandProbe < descriptorScan, true, 'Promise brand probe must precede descriptor scan');
  assert.doesNotMatch(helper, /\.then\s*\(/u, 'ordinary thenable.then must never execute');

  const failure = section(value, '#commitFailure(error: unknown)', '#recordFailure(error: unknown)');
  assert.match(failure, /if \(!this\.#constructionComplete\)[\s\S]*if \(!this\.#hasConstructionFailure\)/u);
  const runtimeFailure = failure.slice(failure.indexOf("if (this.#state === 'disposed'"));
  const failedGuard = runtimeFailure.indexOf("this.#state === 'failed'");
  const lastErrorCommit = runtimeFailure.indexOf('this.#lastError = error');
  assert.equal(failedGuard !== -1 && failedGuard < lastErrorCommit, true,
    'late runtime failures must not replace the first failure identity');
  assert.match(
    failure,
    /rejectThenable\(\s*this\.#onError\(error\),\s*'Arena V2 formal Web playable composition onError'/u,
  );
});

test('P5.3zzzvz/P6.403 projects authority canMove into read-only touch feedback', () => {
  const composition = source();
  const pointerSurface = pointerSurfaceSource();
  const visualTokens = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-ui-visual-tokens-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1',
    'touchMoveAvailability: TOUCH_MOVE_AVAILABILITY',
    'requireArenaV2UiMoveAvailabilityVisualTokenV1',
  ]) {
    assert.equal(visualTokens.includes(marker), true);
  }
  for (const marker of [
    'applyMovementAvailability(',
    'clearMovementAvailability()',
    'visualMovementAvailabilityFromAuthorityCanMove: true',
    'visualMovementAvailabilityReadOnly: true',
    'visualMovementBlockedDoesNotDisableInput: true',
    'movementAvailabilityState:',
  ]) {
    assert.equal(pointerSurface.includes(marker), true);
  }
  assert.match(
    composition,
    /projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1[\s\S]*state: authority\.canMove[\s\S]*state: authority\.state/u,
  );
  assert.match(
    composition,
    /applyMovementAvailability\(movementAndJump\.movement\)[\s\S]*applyPrimaryActionAvailability\(primary\)[\s\S]*applyJumpActionAvailability\(movementAndJump\.jump\)/u,
  );
  assert.doesNotMatch(pointerSurface, /movementAvailability[\s\S]{0,120}pointerEvents\s*=\s*'none'/u);
});

test('P2.5l/P5.3zzzwa/P6.404 publishes real press and hold affordance in all modes', () => {
  const composition = source();
  const authoritySources = [
    readFileSync(
      'packages/arena-regression/src/arena-duel-authoritative-runtime-candidate-v1.ts',
      'utf8',
    ),
    readFileSync(
      'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
      'utf8',
    ),
    readFileSync(
      'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
      'utf8',
    ),
  ];
  for (const authority of authoritySources) {
    assert.match(authority, /localPrimaryAffordanceProjectedFromRuleEngine: true/u);
    assert.match(authority, /localPrimaryHoldAffordanceProjectedFromRuleEngine: true/u);
    assert.doesNotMatch(
      authority,
      /#localSidecar[\s\S]{0,1400}reason: 'not-requested'/u,
    );
  }
  assert.match(
    composition,
    /primaryKind === 'selected' \|\| primaryHoldKind === 'selected'/u,
  );
  assert.match(composition, /commitment\.status === 'charging'/u);
  assert.match(composition, /primaryAvailabilityIncludesActiveHoldCommitment: true/u);
  assert.match(composition, /primaryGestureHintUsesAuthorityChargeLevel: true/u);
});

test('P2.0g-C2 preflights an explicit Mode Registry before host or resource ownership', () => {
  const value = source();
  const constructor = section(
    value,
    '  constructor(value: unknown) {',
    '\n  get state(): CompositionState',
  );
  const preflight = constructor.indexOf(
    'adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({',
  );
  const raceCountGuard = constructor.indexOf(
    "if (!Object.hasOwn(source, 'raceParticipantCount'))",
  );
  const survivalCountGuard = constructor.indexOf(
    "if (!Object.hasOwn(source, 'survivalEnemyCount'))",
  );
  const hostRead = constructor.indexOf('const mount = hostRoot(source.hostRoot);');
  const firstDom = constructor.indexOf("documentObject.createElement('div')");
  const localOptions = constructor.indexOf('const localPlayableOptions = {');
  assert.equal(
    raceCountGuard !== -1
      && survivalCountGuard !== -1
      && raceCountGuard < preflight
      && survivalCountGuard < preflight
      && preflight !== -1
      && preflight < hostRead
      && hostRead < firstDom
      && firstDom < localOptions,
    true,
    'explicit Mode Registry preflight must precede hostRoot, DOM and Local Host ownership',
  );
  assert.match(constructor, /\.\.\.\(hasModeRegistryCandidate \? \{ modeRegistryCandidate \} : \{\}\)/u);
  assert.match(
    constructor,
    /\.\.\.\(raceParticipantCount === undefined\s*\? \{\}\s*: \{ raceParticipantCount \}\)/u,
  );
  assert.match(
    constructor,
    /\.\.\.\(survivalEnemyCount === undefined\s*\? \{\}\s*: \{ survivalEnemyCount \}\)/u,
  );
  const registryOwnerBranch = section(
    constructor,
    'if (!hasRegistryBootstrapOptions && !hasTransferredRegistryBootstrap)',
    'informationSurface = new ArenaV2InformationDomSurfaceCandidateV1',
  );
  assert.match(
    registryOwnerBranch,
    /new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1\(\s*localPlayableOptions/u,
  );
  assert.match(registryOwnerBranch, /registryBootstrap: source\.registryBootstrap/u);
  assert.match(
    registryOwnerBranch,
    /registryBootstrapOptions: source\.registryBootstrapOptions/u,
  );
  assert.match(registryOwnerBranch, /localPlayableOptions,/u);
  assert.doesNotMatch(
    constructor,
    /(?:const|let|this\.[#\w]+)\s*=\s*adaptArenaV2FormalWebModeRegistryPreflightCandidateV1/u,
    'the diagnostic summary must not be cached, exposed or treated as authorization',
  );

  const metadata = section(
    value,
    'export const ARENA_V2_FORMAL_WEB_PLAYABLE_COMPOSITION_CANDIDATE_V1',
    '\n});',
  );
  assert.match(metadata, /explicitModeRegistryPreflightTopLevelConsumerWired: true/u);
  assert.match(metadata, /explicitModeRegistryRuntimePolicyConsumptionWired: false/u);

  const defaultEntry = readFileSync('src/entry/web-arena-v2-formal-candidate.ts', 'utf8');
  assert.doesNotMatch(defaultEntry, /modeRegistryCandidate/u);
});

test('P5 weapon availability is read only by normal information rendering after maintenance', () => {
  const binding = localPlayableBindingSource();
  const provider = section(
    binding,
    '  #informationProjectionOptions():',
    '\n  #bindSurfaceIntent()',
  );
  const providerCall = provider.indexOf('this.#weaponAvailabilityChangeProvider()');
  const synchronousGuard = provider.indexOf('rejectThenable(', providerCall);
  const publishOptions = provider.indexOf(
    'return Object.freeze({ ...this.#selection, weaponAvailabilityChange });',
  );
  assert.equal(
    providerCall !== -1
      && providerCall < synchronousGuard
      && synchronousGuard < publishOptions,
    true,
    'the provider result must pass the synchronous boundary before projection options publish',
  );
  assert.equal(
    binding.match(/this\.#informationProjectionOptions\(\)/gu)?.length,
    1,
    'weapon availability may be read only by the normal information render path',
  );
  const render = section(binding, '  #renderCurrent():', '\n  readonly #handleIntent');
  assert.match(render, /const informationProjectionOptions = this\.#informationProjectionOptions\(\);/u);
  assert.match(
    render,
    /getInformationCurrentScreenComposition\(\s*informationProjectionOptions/u,
  );

  const synchronousBoundary = synchronousReturnSource();
  assert.match(synchronousBoundary, /if \(thenDescriptor === null\) return;/u);
  assert.match(synchronousBoundary, /if \(!Object\.hasOwn\(thenDescriptor, 'value'\)\)/u);
  assert.match(synchronousBoundary, /返回then字段，必须同步完成/u);
  assert.doesNotMatch(synchronousBoundary, /thenDescriptor\.value\s*\(/u);
  let hostileThenCalls = 0;
  assert.throws(() => assertSynchronousReturn(Object.freeze({
    then() {
      hostileThenCalls += 1;
    },
  }), 'weapon availability provider hostile thenable'), /then字段/);
  assert.throws(() => assertSynchronousReturn(
    Object.freeze({ then: null }),
    'weapon availability provider null thenable',
  ), /then字段/);
  let thenGetterCalls = 0;
  const getterThenable = Object.defineProperty({}, 'then', {
    enumerable: true,
    get() {
      thenGetterCalls += 1;
      return () => undefined;
    },
  });
  assert.throws(() => assertSynchronousReturn(
    getterThenable,
    'weapon availability provider accessor thenable',
  ), /访问器thenable/);
  assert.equal(hostileThenCalls, 0, 'provider thenables must never execute');
  assert.equal(thenGetterCalls, 0, 'provider then accessors must never execute');

  const composition = source();
  assert.match(
    composition,
    /weaponAvailabilityChangeProvider: \(\) => \(\s*registryOwner!\.snapshot\(\)\.lastAvailabilityChange\s*\)/u,
  );
  const maintenanceProjection = section(
    composition,
    '  #registryProjectionAfterMaintenance():',
    '\n  #recordFailure(',
  );
  assert.match(maintenanceProjection, /return projection;/u);
  assert.doesNotMatch(maintenanceProjection, /renderCurrent|#recordFailure/u);

  const begin = section(
    composition,
    '  beginSingleWeaponRegistryPromotion(',
    '\n  beginSingleWeaponRegistryPromotionFromAssessment(',
  );
  assert.match(begin, /owner\.beginSingleWeaponPromotion\(options\);/u);
  assert.match(begin, /return this\.#registryProjection\(\)!;/u);
  assert.doesNotMatch(begin, /#registryProjectionAfterMaintenance|renderCurrent|#recordFailure/u);

  const stable = section(
    composition,
    '  advanceSingleWeaponRegistryPromotionToStable()',
    '\n  publishAndPromoteSingleWeaponRegistry()',
  );
  assert.match(stable, /owner\.advanceSingleWeaponPromotionToStable\(\);/u);
  assert.match(stable, /return this\.#registryProjectionAfterMaintenance\(\);/u);
  assert.doesNotMatch(stable, /renderCurrent|#recordFailure/u);

  const owner = registryOwnerSource();
  const capture = section(
    owner,
    '  #captureCompletedPromotion(): void {',
    '\n  beginSingleWeaponPromotion(',
  );
  assert.match(capture, /snapshot\(\)\.state !== 'promoted'/u);
  assert.match(capture, /this\.#lastAvailabilityChange = availabilityChange/u);
  assert.match(owner, /#lastAvailabilityChange:[\s\S]*?= null;/u);
  const beginOwner = section(
    owner,
    '  beginSingleWeaponPromotion(',
    '\n  #beginSingleWeaponPromotionFromConfiguration(',
  );
  assert.doesNotMatch(beginOwner, /#captureCompletedPromotion|#lastAvailabilityChange\s*=/u);
});

test('P5.3zzzsc defaults the single result action to a content-stable replay', () => {
  const composition = source();
  assert.match(
    composition,
    /resultDecision: source\.resultDecision \?\? 'play-again'/u,
  );
  assert.match(composition, /defaultResultPrimaryDecision: 'play-again'/u);

  const binding = localPlayableBindingSource();
  const projection = section(
    binding,
    'function resultPrimaryActionRenderPlan(',
    '\n\nfunction bottomNavigationItem(',
  );
  assert.match(projection, /if \(plan\.identity !== 'result-reward'\) return plan;/u);
  assert.match(projection, /label: '同组合再来一局'/u);
  assert.match(projection, /保留当前模式、武器和地图/u);
  assert.match(projection, /selectedModeKind === 'survival'/u);
  assert.match(projection, /label: '同地图再来一局'/u);
  assert.match(projection, /仍然空手开局，在场上拾取武器/u);
  assert.match(projection, /label: `了解下一把：\$\{recommendation\.nextWeaponDisplayName\}`/u);
  assert.match(projection, /当前武器已经加入收藏/u);
  assert.match(projection, /projectArenaV2NextLearningSignatureReadCandidateV1\(/u);
  assert.match(projection, /learningSignature\.expandedText/u);
  assert.match(projection, /结果页下一把武器推荐与成长目标签名漂移/u);
  assert.match(projection, /结果页下一张地图推荐与成长目标签名漂移/u);
  assert.match(projection, /learningSignatureValueCount !== 1/u);
  assert.match(projection, /const recoveryPending = recovery\.retryRequired \|\| recovery\.restartRequired/u);
  assert.match(projection, /label: `了解下一张：\$\{recommendation\.nextMapDisplayName\}`/u);
  assert.match(projection, /当前地图已经加入收藏/u);
  assert.match(projection, /learningSignature\.accessibilityText/u);
  assert.match(projection, /随后可以进入模式选择/u);
  assert.match(binding, /function resultPreparationTargetDisplayName\(/u);
  assert.match(projection, /recommendation\.targetScreenId !== 'mode-select'/u);
  assert.match(projection, /label: `调整为\$\{compactTargets\.join\('＋'\)\}`/u);
  assert.match(projection, /按长期目标调整为\$\{accessibleTargets\.join\('、'\)\}后进入模式确认页/u);
  assert.match(projection, /具体调整路线没有实际选择变化/u);
  assert.match(projection, /生存仍然空手开局，目标武器/u);
  assert.match(projection, /需要在场上遇到后拾取/u);
  assert.match(projection, /不会直接开始不能稳定推进目标的组合/u);
  assert.match(binding, /function resultExplicitNextGoalCopy\(/u);
  assert.match(binding, /label: `确认\$\{compactTargets\.join\('＋'\)\}`/u);
  assert.match(binding, /label: `了解目标武器：\$\{targetWeaponDisplayName\}`/u);
  assert.match(binding, /label: `了解目标地图：\$\{targetMapDisplayName\}`/u);
  assert.match(binding, /label: `查看目标武器：\$\{learningSignature\.weaponDisplayName\}`/u);
  assert.match(binding, /label: '返回首页继续'/u);
  assert.match(binding, /结果页显式下一目标缺少可达页面/u);
  assert.match(projection, /text: '长期目标'/u);
  assert.match(projection, /text: primitive\.text/u);
  assert.doesNotMatch(projection, /同组合再来一局；长期/u);
  assert.match(projection, /长期成长目标：\$\{/u);
  assert.match(projection, /label: '重试结算'/u);
  assert.match(projection, /label: '需要重启'/u);
  assert.match(projection, /primaryActionCount !== 1/u);
  assert.match(projection, /nextGoalLabelCount !== 1 \|\| nextGoalValueCount !== 1/u);
  assert.match(projection, /primitive\.intentId !== 'play-again-or-next'/u);
  assert.match(binding, /weaponDefinitionId: this\.#selection\.selectedWeaponDefinitionId \?\? null/u);
  assert.match(binding, /mapDefinitionId: this\.#selection\.selectedMapDefinitionId \?\? null/u);
  assert.match(binding, /explicitNextGoalNamesExactExistingDestination: true/u);
  assert.match(binding, /explicitNextGoalReusesModeWeaponMapAndHomePages: true/u);
  assert.match(binding, /explicitNextGoalAddsNoPageOrAction: true/u);
  assert.match(
    binding,
    /this\.#resultDecision = resultDecision\(value\);\s*this\.#preferGoalAlignedResultRecommendation = false;\s*if \(this\.#state === 'information'\) this\.#renderCurrent\(\);/u,
  );
  assert.match(composition, /preferGoalAlignedResultRecommendation: source\.resultDecision === undefined/u);
  assert.match(composition, /defaultResultPrimaryDecisionAdvancesAfterCollectionCompletion: true/u);
  assert.match(composition, /explicitResultDecisionAlwaysWins: true/u);
  assert.match(binding, /supportsDefaultNextCollectionTargetAfterCollectionRecommendation: true/u);
  assert.match(binding, /explicitResultDecisionDisablesDefaultRecommendation: true/u);
  assert.match(binding, /#lastRenderedResultPrimaryRecommendation/u);
  assert.match(binding, /结果页主动作缺少已渲染推荐身份/u);
  assert.match(binding, /expectedResultCollectionTargetKind/u);
  assert.match(binding, /expectedResultCollectionTargetDefinitionId/u);
  assert.match(binding, /expectedResultRecommendationKind/u);
  assert.match(binding, /expectedResultGoalId/u);
  assert.match(binding, /expectedResultTargetScreenId/u);
  assert.match(binding, /expectedResultTargetModeKind/u);
  assert.match(binding, /expectedResultTargetWeaponDefinitionId/u);
  assert.match(binding, /expectedResultTargetMapDefinitionId/u);
  assert.match(binding, /resultPrimaryClickUsesLastRenderedRecommendation: true/u);
  assert.match(binding, /resultCollectionTargetIdentityRevalidatedBeforeNavigation: true/u);
  assert.match(binding, /resultGoalRouteIdentityRevalidatedBeforeNavigation: true/u);
  assert.match(binding, /resultGoalRouteModeSynchronizesFromHostAfterNavigation: true/u);
  assert.match(binding, /navigationSelectionSynchronizesFromSingleNarrowHostRead: true/u);
  assert.match(binding, /getInformationNavigationSelectionRead\(\)/u);
  assert.doesNotMatch(binding, /const routedProfile =/u);
  assert.match(binding, /resultNextMapRouteSkeletonUsesExistingGoalValue: true/u);
  assert.match(binding, /resultNextMapRouteSkeletonUsesSharedMapProjection: true/u);
  assert.match(binding, /resultNextWeaponCoreFightUsesExistingGoalValue: true/u);
  assert.match(binding, /resultNextWeaponCoreFightUsesSharedWeaponProjection: true/u);
  assert.match(binding, /resultLearningSignatureUsesProfileNextGoalIdentity: true/u);
  assert.match(binding, /resultLearningSignatureUsesSharedHomeReadProjection: true/u);
  assert.match(binding, /#revealFocusedInformationField/u);
  assert.match(binding, /deferred:\$\{fieldId\}:value/u);
  assert.match(binding, /recordsBottomNavigationFocusConsumed: true/u);
  assert.match(binding, /recordsFocusUsesRenderedPrimitiveGeometry: true/u);
  assert.match(binding, /recordsFocusAddsNoPageOrAction: true/u);
  assert.match(binding, /focusFieldId !== 'recent-records' \|\| targetScreenId !== 'home'/u);
  assert.match(binding, /this\.#surface\.revealPrimitive\(primitiveId\)/u);
  assert.match(binding, /resultCrossChallengeCanShowWeaponAndMapSignature: true/u);
  assert.match(binding, /resultNavigationRecommendationDoesNotSelectLearningSignature: true/u);
  assert.match(binding, /settlementRecoverySkipsNextContentRead: true/u);
  assert.match(binding, /renderReusesPipelineRecoveryAndNextGoalRead: true/u);
  assert.match(binding, /renderReusesPipelineResultRecommendations: true/u);
  assert.match(binding, /interactionGateReusesSingleRecoveryRead: true/u);
  assert.match(binding, /interactionGateUsesAggregateInformationAndRecoveryRead: true/u);
  assert.match(binding, /learningSettlementRecovery: recovery/u);
  assert.match(binding, /resultPrimaryRecommendation,/u);
  assert.match(binding, /resultNextGoalRecommendation,/u);
  const renderCurrent = section(
    binding,
    '  #renderCurrent(): ArenaV2UiRenderPlanV1 | null {',
    '\n  #notifySurface(',
  );
  assert.doesNotMatch(renderCurrent, /getLearningSettlementRecoveryRead\(\)/u);
  assert.doesNotMatch(renderCurrent, /getInformationNextLearningGoalRead\(\)/u);
  assert.doesNotMatch(renderCurrent, /getInformationResultPrimaryRecommendation\(\)/u);
  assert.doesNotMatch(renderCurrent, /getInformationResultNextGoalRecommendation\(\)/u);
  const handleIntent = section(
    binding,
    '  readonly #handleIntent = (intentValue: unknown): void => {',
    '\n  get state(): ArenaV2InformationLocalPlayableSurfaceBindingStateCandidateV1 {',
  );
  assert.equal(handleIntent.match(/getLearningSettlementRecoveryRead\(\)/gu)?.length, 2);
  assert.match(handleIntent, /getInformationInteractionGateRead\(\)/u);
  assert.match(handleIntent, /const recoveryAtIntentStart =/u);
  assert.match(handleIntent, /startsMatch && recoveryAtIntentStart\.retryRequired/u);
  assert.match(binding, /weaponDefinitionId: nextLearningGoal\.weaponDefinitionId/u);
  assert.match(binding, /mapDefinitionId: nextLearningGoal\.mapDefinitionId/u);
  assert.match(
    binding,
    /resultNextWeaponDisplayNameRevalidatedAgainstSharedProjection: true/u,
  );
  assert.match(
    binding,
    /resultNextMapDisplayNameRevalidatedAgainstSharedProjection: true/u,
  );
  assert.match(binding, /modePreparationRuleDetailSecondaryActionWired: true/u);
  assert.match(binding, /modePreparationRuleDetailReusesExistingPages: true/u);
  assert.match(binding, /modeCharacterSelectionSecondaryActionWired: true/u);
  assert.match(binding, /modeCharacterSelectionReturnsThroughExistingSaveAction: true/u);
  assert.match(binding, /competitivePreparationOptionalDetailActionsWired: true/u);
  assert.match(binding, /competitivePreparationPrimaryStartRemainsDirect: true/u);
  assert.match(binding, /preparationPagesCanReturnToModeSelectWithoutStarting: true/u);
  assert.match(
    binding,
    /survivalPreparationRemainsUnarmedWithoutWeaponSelectionAction: true/u,
  );
  assert.match(binding, /survivalPreparationOptionalCollectionActionsWired: true/u);
  assert.match(binding, /survivalPreparationWeaponActionCannotEquipLoadout: true/u);
  assert.match(binding, /survivalPreparationPrimaryStartRemainsDirect: true/u);
  assert.match(binding, /modePrimaryStartRemainsDirect: true/u);
  assert.match(binding, /arena\.v2\.mode-preparation-link\./u);
  assert.match(binding, /arena\.v2\.mode-character-link\.character-select/u);
  assert.match(binding, /arena\.v2\.competitive-preparation-link\./u);
  assert.match(binding, /arena\.v2\.survival-preparation-link\./u);
  assert.match(binding, /this\.#host\.openDeclaredLink\(\{/u);
  assert.match(binding, /supportsDefaultGoalAlignedResultRecommendation: true/u);
  assert.match(binding, /stableOrCurrentEligibleConditionalReplayKeepsPlayAgain: true/u);
  assert.match(binding, /routeAdjustmentReusesSingleResultPrimaryAction: true/u);
  assert.match(binding, /defaultGoalAdjustmentCanEnterModeSelectDirectly: true/u);
  assert.match(binding, /settledExplicitNextGoalRouteIdentityAlsoFrozen: true/u);
  assert.match(binding, /playAgainCopyRespectsSurvivalUnarmedRule: true/u);
  assert.match(binding, /competitivePlayAgainCopyRetainsSelectedWeapon: true/u);
  assert.match(composition, /#assertRenderedResultCollectionTarget\(/u);
  assert.match(composition, /#assertRenderedResultRouteIdentity\(/u);
  assert.match(composition, /展示的下一把武器与实际导航目标发生漂移/u);
  assert.match(composition, /展示的下一张地图与实际导航目标发生漂移/u);
  assert.match(composition, /展示的长期目标路线与实际导航目标发生漂移/u);
  assert.match(composition, /下一把武器推荐与目标路线类型不一致/u);
  assert.match(composition, /下一张地图推荐与目标路线类型不一致/u);
  assert.match(composition, /resultGoalAlignedSingleActionRecommendationWired: true/u);
  assert.match(composition, /resultRenderedGoalRouteIdentityRevalidatedBeforeNavigation: true/u);
  assert.match(composition, /modePreparationRuleDetailSecondaryNavigationWired: true/u);
  assert.match(composition, /modeCharacterSelectionSecondaryNavigationWired: true/u);
  assert.match(composition, /competitivePreparationOptionalDetailNavigationWired: true/u);
  assert.match(composition, /survivalPreparationOptionalCollectionNavigationWired: true/u);
  assert.match(composition, /preparationDetailSingleSourceReturnWired: true/u);
  assert.match(composition, /detailDirectorySecondaryNavigationWired: true/u);
  assert.match(composition, /detailAdjacentContinuousBrowseWired: true/u);
  assert.match(composition, /detailBrowseVisibleDirectoryPositionWired: true/u);
  assert.match(composition, /detailAdjacentTargetNamesVisible: true/u);
  assert.match(composition, /detailSelectedIdentityVisibleInQuestion: true/u);
  assert.match(composition, /weaponDetailCoreFightReadoutWired: true/u);
  assert.match(composition, /mapDetailFourAnchorRouteSkeletonWired: true/u);
  assert.match(composition, /mapDirectoryFourAnchorRouteSkeletonWired: true/u);
  assert.match(composition, /preparationMapRouteSkeletonWired: true/u);
  assert.match(composition, /resultNextMapRouteSkeletonWired: true/u);
  assert.match(composition, /resultNextWeaponCoreFightWired: true/u);
  assert.match(composition, /weaponDirectoryBasicGestureReadoutWired: true/u);
  assert.match(composition, /weaponDirectoryCoreFightReadoutWired: true/u);
  assert.match(composition, /preparationWeaponCoreFightWired: true/u);
  assert.match(composition, /modeSelectionShortContentSignatureWired: true/u);
  assert.match(composition, /homeNextLearningSignatureWired: true/u);
  assert.match(composition, /resultNextLearningSignatureWired: true/u);
  assert.match(composition, /nextLearningGoalLightweightReadWired: true/u);
  assert.match(
    composition,
    /projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1\(/u,
  );
  assert.match(
    composition,
    /weaponDefinitionId: pages\.profiles\.learning\.nextGoal\.weaponDefinitionId/u,
  );
  assert.match(
    composition,
    /mapDefinitionId: pages\.profiles\.learning\.nextGoal\.mapDefinitionId/u,
  );
  assert.match(composition, /segmentDefinitionId: nextGoal\.segmentDefinitionId/u);
  assert.match(binding, /segmentDefinitionId: nextLearningGoal\.segmentDefinitionId/u);
  assert.match(binding, /resultLearningSignaturePreservesExactMapSegmentGoal: true/u);
  assert.match(binding, /detailDirectorySecondaryActionWired: true/u);
  assert.match(binding, /detailDirectoryActionPreservesSelection: true/u);
  assert.match(binding, /detailDirectoryReturnRevealsCurrentSelection: true/u);
  assert.match(binding, /detailDirectoryRevealUsesRenderedSelectionActionIdentity: true/u);
  assert.match(binding, /detailAdjacentBrowseActionsWired: true/u);
  assert.match(binding, /detailAdjacentBrowseReusesCurrentDetailScreen: true/u);
  assert.match(formal, /elevenPagePlayerReachabilityRoutesWired: true/u);
  assert.match(formal, /modeAndPreparationOptionalDepthNavigationWired: true/u);
  assert.match(formal, /preparationPagesExplicitReturnToModeWired: true/u);
  assert.match(formal, /preparationDetailSingleSourceReturnWired: true/u);
  assert.match(formal, /detailDirectorySecondaryNavigationWired: true/u);
  assert.match(formal, /detailDirectoryReturnPreservesSelection: true/u);
  assert.match(formal, /detailDirectoryReturnRevealsCurrentSelection: true/u);
  assert.match(formal, /detailDirectoryRevealUsesPreviewAwareRenderPlanGeometry: true/u);
  assert.match(formal, /detailAdjacentContinuousBrowseWired: true/u);
  assert.match(formal, /detailBrowseVisibleDirectoryPositionWired: true/u);
  assert.match(formal, /detailAdjacentTargetNamesVisible: true/u);
  assert.match(formal, /detailSelectedIdentityVisibleInQuestion: true/u);
  assert.match(formal, /weaponDetailCoreFightReadoutWired: true/u);
  assert.match(formal, /mapDetailFourAnchorRouteSkeletonWired: true/u);
  assert.match(formal, /mapDirectoryFourAnchorRouteSkeletonWired: true/u);
  assert.match(formal, /preparationMapRouteSkeletonWired: true/u);
  assert.match(formal, /resultNextMapRouteSkeletonWired: true/u);
  assert.match(formal, /resultNextWeaponCoreFightWired: true/u);
  assert.match(formal, /weaponDirectoryBasicGestureReadoutWired: true/u);
  assert.match(formal, /weaponDirectoryCoreFightReadoutWired: true/u);
  assert.match(formal, /preparationWeaponCoreFightWired: true/u);
  assert.match(formal, /modeSelectionShortContentSignatureWired: true/u);
  assert.match(formal, /homeNextLearningSignatureWired: true/u);
  assert.match(formal, /homeRecordSummaryWired: true/u);
  assert.match(formal, /recordsBottomNavigationFocusWired: true/u);
  assert.match(formal, /resultNextLearningSignatureWired: true/u);
  assert.match(formal, /nextLearningGoalLightweightReadWired: true/u);
  assert.match(formal, /detailAdjacentBrowseExcludesInactiveWeapons: true/u);
  assert.match(formal, /informationPrimaryStartActionsRemainDirect: true/u);
  assert.match(formal, /survivalCollectionNavigationCannotEquipBeforeMatch: true/u);
  assert.match(composition, /modeSelectionPrimaryStartRemainsDirect: true/u);
  assert.match(composition, /#resolveDefaultGoalAlignedPreparationRoute\(/u);
  assert.match(composition, /resultRecommendationKind === 'prepare-next-goal'/u);
  assert.match(composition, /resultDefaultAdjustmentUsesShortestPreparedRoute: true/u);
  assert.match(composition, /#fullCatalogReplayCombinationFromRouteFit\(/u);
  assert.match(composition, /fullCatalogExplicitNextGoalUsesReplayCombination: true/u);
  assert.match(composition, /fullCatalogReplayStopsAtExistingModeConfirmation: true/u);
  assert.match(composition, /activeScopeCompletionStillReturnsHome: true/u);
  assert.match(composition, /survivalReplayNavigationNeverEquipsSuggestedWeapon: true/u);
  assert.match(composition, /#fullCatalogReplayCombinationFromLearningRead\(/u);
  assert.match(composition, /homeFullCatalogReplayUsesSharedCombination: true/u);
  assert.match(
    composition,
    /homeFullCatalogReplayRevalidatesRenderedIdentityOnClick: true/u,
  );
  assert.match(composition, /homeFullCatalogReplayStopsAtExistingModeConfirmation: true/u);
  assert.match(
    composition,
    /homeFullCatalogSurvivalReplayNeverPreselectsWeapon: true/u,
  );
  assert.match(composition, /#assertRenderedHomeReplayCombinationIdentity\(/u);
  assert.match(composition, /expectedHomeReplayCycleLength/u);
  assert.match(
    composition,
    /replayCombination\.modeKind === 'survival'[\s\S]*\? null[\s\S]*selectedPlayableWeaponDefinitionId/u,
  );
  assert.match(composition, /getInformationResultNextGoalRecommendation\(\)/u);
  assert.match(binding, /recovery\.retryRequired \|\| recovery\.restartRequired/u);
  assert.match(binding, /playAgainResultGoalCopyExplainsGrowthContinuity: true/u);
  assert.match(
    binding,
    /playAgainImmediateActionAndLongTermGoalStaySeparate: true/u,
  );
  assert.match(binding, /fullCatalogExplicitNextGoalReusesExistingAction: true/u);
  assert.match(binding, /fullCatalogExplicitNextGoalStopsAtModeConfirmation: true/u);
  assert.match(binding, /fullCatalogSurvivalExplicitNextGoalKeepsUnarmedStart: true/u);
  assert.match(binding, /homeFullCatalogReplayButtonNamesCyclePosition: true/u);
  assert.match(binding, /homeFullCatalogReplayClickUsesLastRenderedIdentity: true/u);
  assert.match(binding, /homeFullCatalogReplayReusesPrimaryAction: true/u);
  assert.match(binding, /activeScopeCompletionKeepsFreeChoiceHomeAction: true/u);
  assert.match(binding, /`准备复练 \$\{cycleOrdinal\}\/\$\{cycleLength\}`/u);
  assert.match(binding, /expectedHomeReplaySurvivalWeaponRequiresWorldPickup/u);
  assert.match(binding, /kind: 'next-map'/u);
  assert.match(binding, /nextMapDefinitionId/u);
});

test('P5.3zzzr projects the same validated availability fact onto one weapon card', () => {
  const playable = localPlayableSource();
  const selection = section(
    playable,
    '  getInformationCurrentScreenSelectionProjection(',
    '\n  getSnapshot(): unknown',
  );
  const weaponBranchStart = selection.indexOf("if (screenId === 'weapon-index')");
  const baseSelection = selection.indexOf('const selection = Object.freeze({', weaponBranchStart);
  const availabilityProjection = selection.indexOf(
    'return projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1({',
    baseSelection,
  );
  assert.equal(
    weaponBranchStart !== -1
      && baseSelection !== -1
      && availabilityProjection > baseSelection,
    true,
    'the exact weapon selection must be closed before the availability description projection',
  );
  const projectionCall = selection.slice(availabilityProjection);
  assert.match(
    projectionCall,
    /localInformationProjectionSelection\(value\)\.weaponAvailabilityChange/u,
  );
  assert.match(
    projectionCall,
    /learningRead\.profile\.collections\.weaponDefinitionIds/u,
  );
  assert.doesNotMatch(
    projectionCall.slice(0, projectionCall.indexOf('\n    }')),
    /#activeRegistryBinding|registryOwner|registryReference/u,
    'the card marker must consume the already supplied fact instead of re-reading Registry',
  );
});

test('P5.3zztg reuses one Definition-backed weapon operation readout in directory cards', () => {
  const playable = localPlayableSource();
  const selection = section(
    playable,
    '  getInformationCurrentScreenSelectionProjection(',
    '\n  getSnapshot(): unknown',
  );
  const weaponBranchStart = selection.indexOf("if (screenId === 'weapon-index')");
  const weaponBranchEnd = selection.indexOf(
    'const firstMap = collectionContent.maps[0]',
    weaponBranchStart,
  );
  const weaponBranch = selection.slice(weaponBranchStart, weaponBranchEnd);
  assert.match(weaponBranch, /projectArenaV2WeaponCoreFightReadV1\(/u);
  assert.match(weaponBranch, /coreFight\.compactText/u);
  assert.match(weaponBranch, /weapon\.weaponDefinitionId/u);
  assert.doesNotMatch(weaponBranch, /primaryGesture|commitTicks|expireTicks/u);
});

test('P5.3zzzth reuses the detail four-anchor route skeleton in map directory cards', () => {
  const playable = localPlayableSource();
  const selection = section(
    playable,
    '  getInformationCurrentScreenSelectionProjection(',
    '\n  getSnapshot(): unknown',
  );
  const mapBranchStart = selection.indexOf(
    'const firstMap = collectionContent.maps[0]',
  );
  const mapBranch = selection.slice(mapBranchStart);
  assert.match(mapBranch, /projectArenaV2MapRouteSkeletonReadV1\(/u);
  assert.match(mapBranch, /routeSkeleton\.compactText/u);
  assert.match(mapBranch, /map\.mapDefinitionId/u);
  assert.doesNotMatch(mapBranch, /experienceBeat ===|firstTwist|firstClimax/u);
});

test('P5.3zzzva collection selection freezes one Profile and active Registry read', () => {
  const playable = localPlayableSource();
  const selection = section(
    playable,
    '  getInformationCurrentScreenSelectionProjection(',
    '\n  getSnapshot(): unknown',
  );
  const collectionBranch = selection.slice(
    selection.indexOf('const requested = localInformationProjectionSelection(value);'),
  );
  assert.equal(
    selection.match(/this\.getInformationPageProjections\(value\)/gu)?.length,
    1,
  );
  assert.doesNotMatch(collectionBranch, /this\.getInformationCollectionRead\(\)/u);
  assert.doesNotMatch(collectionBranch, /this\.getInformationLearningProfileRead\(\)/u);
  assert.match(collectionBranch, /const learningProjection = pages\.profiles\.learning;/u);
  assert.match(collectionBranch, /learningRead\.eligibleWeaponDefinitionIds/u);
  assert.match(collectionBranch, /const collectionContent = pages\.collectionContent;/u);
  assert.doesNotMatch(collectionBranch, /this\.#activeRegistryBinding\(\)/u);
  assert.doesNotMatch(collectionBranch, /this\.getInformationPageProjections\(value\)/u);
});

test('P5.3x coalesces audio activation and records synchronous child failures', () => {
  const value = source();
  const activation = section(value, 'activateAudioAndEnterHome(): Promise<this>', 'refreshLayout(): void');
  assert.match(
    activation,
    /if \(this\.#activationOperation !== null\) return this\.#activationOperation;/u,
  );
  assert.equal(
    activation.match(/this\.#matchHost\.activateFormalAudio\(\)/gu)?.length,
    1,
    'one activation operation must start at most one child activation',
  );
  assert.match(activation, /catch \(error\) \{\s*this\.#recordFailure\(error\);\s*throw error;/u);

  const preparation = section(value, 'prepareFormalAssets(): Promise<this>', 'loadAndPrepare(): Promise<this>');
  assert.match(
    preparation,
    /this\.#state === 'disposed' \|\| this\.#state === 'failed'/u,
  );
  assert.match(preparation, /catch \(error\) \{\s*this\.#recordFailure\(error\);\s*throw error;/u);
});

test('P5.3zz rejects late audio activation without reviving or refailing a closed match host', () => {
  const value = matchHostSource();
  const activation = section(value, 'activateFormalAudio(): Promise<this>', 'createCharacterSelectionFormalPreviewMountOwner');
  assert.match(activation, /if \(this\.#state !== 'preloaded'\)/u);
  assert.match(
    activation,
    /if \(this\.#state === 'disposed' \|\| this\.#state === 'failed'\) throw error;/u,
  );
  assert.equal(
    activation.indexOf("this.#state !== 'preloaded'")
      < activation.indexOf('return this;'),
    true,
    'activation may return the host only after the accepting state is rechecked',
  );
  assert.match(value, /lateAudioActivationCannotReviveOrRefailClosedHost: true/u);
});

test('P5.3x rejects surface-change disposal reentry before parent resources mutate', () => {
  const value = source();
  const usability = section(value, '#assertUsable(operation: string)', '#recordFailure');
  assert.match(usability, /if \(this\.#surfaceTransitioning\)/u);
  const transition = section(value, '#handleSurfaceChange(change: unknown)', '#handleDriverStateChange');
  assert.match(transition, /if \(this\.#surfaceTransitioning\)/u);
  assert.match(transition, /this\.#surfaceTransitioning = true;/u);
  assert.match(transition, /finally \{\s*this\.#surfaceTransitioning = false;/u);

  const disposal = section(value, 'dispose(): void {', '\n}\n\nexport const');
  const capturePriorFailure = disposal.indexOf("const failedBeforeDispose = this.#state === 'failed'");
  const cleanupStarts = disposal.indexOf('this.#disposing = true');
  assert.equal(
    capturePriorFailure !== -1 && capturePriorFailure < cleanupStarts,
    true,
    'dispose must capture the pre-existing failure before cleanup starts',
  );
  const transitionGuard = disposal.indexOf('if (this.#surfaceTransitioning)');
  const disposingCommit = disposal.indexOf('this.#disposing = true');
  const firstOwnedMutation = disposal.indexOf(
    'this.#collectionPreviewVisibilityRequested = false',
  );
  assert.equal(
    transitionGuard < disposingCommit && disposingCommit < firstOwnedMutation,
    true,
    'reentrant dispose must reject before changing parent or child ownership',
  );

  const resize = section(value, 'readonly #handleResize', '\n\n  load(): this');
  assert.match(resize, /this\.#disposing \|\| this\.#surfaceTransitioning/u);
});

test('P5.3x constructor rollback and dispose preserve reverse outer ownership order', () => {
  const value = source();
  const journalInitialization = section(
    value,
    'if (offlineRetentionOptions !== null) {',
    '\n      localHost = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  );
  const journalCleanup = journalInitialization.indexOf(
    'offlineRetentionObservationJournal.destroy()',
  );
  const rejectIncompleteCleanup = journalInitialization.indexOf('if (errors.length > 1)');
  const releaseJournalIdentity = journalInitialization.indexOf(
    'offlineRetentionObservationJournal = null',
  );
  assert.equal(
    journalCleanup < rejectIncompleteCleanup
      && rejectIncompleteCleanup < releaseJournalIdentity,
    true,
    'failed Journal ownership may be released only after cleanup succeeds',
  );

  const rollback = section(
    value,
    '} catch (error) {\n      const cleanupErrors: unknown[] = [];',
    '\n  get state(): CompositionState',
  );
  const rollbackDriver = rollback.lastIndexOf('driver.dispose()');
  const rollbackJournal = rollback.lastIndexOf('offlineRetentionObservationJournal.destroy()');
  const rollbackPointer = rollback.lastIndexOf('pointerSurface.dispose()');
  const rollbackDom = rollback.lastIndexOf('container.remove()');
  assert.equal(
    rollbackDriver < rollbackJournal
      && rollbackJournal < rollbackPointer
      && rollbackPointer < rollbackDom,
    true,
    'rollback must release driver-owned tree, journal, pointer, then mounted DOM',
  );

  const disposal = section(value, 'dispose(): void {', '\n}\n\nexport const');
  const listener = disposal.indexOf('this.#resizeCleanup()');
  const driver = disposal.indexOf('this.#driver.dispose()');
  const journal = disposal.indexOf('this.#offlineRetentionObservationJournal.destroy()');
  const pointer = disposal.indexOf('this.#pointerSurface.dispose()');
  const dom = disposal.indexOf('this.#container.remove()');
  assert.equal(
    listener < driver && driver < journal && journal < pointer && pointer < dom,
    true,
    'dispose must stop callbacks before releasing the owned tree and DOM',
  );
  assert.match(disposal, /this\.#prepareOperation = null;/u);
  assert.match(disposal, /this\.#activationOperation = null;/u);
  assert.match(
    disposal,
    /failedBeforeDispose \? \[failureBeforeDispose, \.\.\.errors\] : errors/u,
  );

  const metadata = section(
    value,
    'export const ARENA_V2_FORMAL_WEB_PLAYABLE_COMPOSITION_CANDIDATE_V1',
    '\n});',
  );
  assert.match(
    metadata,
    /offlineRetentionObservationJournalOpenFailureAfterCompleteCleanupBlocksGame: false/u,
  );
  assert.match(
    metadata,
    /offlineRetentionObservationJournalCleanupIncompleteBlocksConstruction: true/u,
  );
  assert.doesNotMatch(metadata, /offlineRetentionObservationJournalFailureBlocksGame/u);
});

test('P5.3zzzul continues only the retained constructor owner after match host settles', () => {
  const value = source();
  const constructor = section(value, '  constructor(value: unknown) {', '\n  get state');
  assert.match(
    constructor,
    /let retryConstructionOwnerAfterMatchHostSettles: \(\(\) => void\) \| null = null/u,
  );
  assert.match(
    constructor,
    /else retryConstructionOwnerAfterMatchHostSettles\?\.\(\)/u,
  );
  assert.match(constructor, /constructionOwnerRollbackInProgress/u);
  assert.match(constructor, /constructionOwnerRollbackContinuationRequested = true/u);
  assert.match(constructor, /const disposeConstructionOwner = \(\): void =>/u);
  assert.match(
    constructor,
    /if \(driver !== null\) driver\.dispose\(\);[\s\S]*else binding\?\.dispose\(\)/u,
  );
  assert.match(
    constructor,
    /同步清理债务保留原Owner；没有新的异步事件时不自旋/u,
  );
  assert.match(
    value,
    /matchHostSettlementContinuesIncompleteConstructionOwnerRollback: true/u,
  );
  assert.match(
    value,
    /synchronousHostSettlementCannotReenterConstructionOwnerRollback: true/u,
  );
  assert.match(
    value,
    /synchronousHostSettlementPreservesOnePostAttemptContinuation: true/u,
  );
  assert.match(value, /constructionRollbackContinuationDoesNotPoll: true/u);
});

test('P5.3zn/P6.12a captures the Learning baseline before a match generation can start', () => {
  const value = localPlayableSource();
  const owner = section(
    value,
    'export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
    'export function createArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  );
  const dispatch = section(
    owner,
    '  dispatchPrimaryIntent(value: unknown): unknown {',
    '\n  stepMatch(value: unknown): unknown {',
  );
  const unresolvedBaselineGuard = dispatch.indexOf(
    'this.#learningSettlementRecoveryOwner.assertCanStartMatch();',
  );
  const baselineCapture = dispatch.indexOf(
    'this.#profileOwner.learningProfileService.getSnapshot();',
  );
  const matchMutation = dispatch.indexOf(
    'host.dispatchPrimaryIntent(navigationIntent)',
  );
  const matchStartParse = dispatch.indexOf('const matchStart = ownDataField(');
  const baselineCommit = dispatch.indexOf(
    'this.#learningSettlementRecoveryOwner.captureMatchStartBaseline(',
  );
  const firstPostDispatchNonCriticalWork = Math.min(
    dispatch.indexOf('this.#applyNextGoalNavigationRoute(nextGoalRoute)'),
    dispatch.indexOf('this.#completeNextGoalImpression(selectedNextGoal)'),
    dispatch.indexOf('this.#collectCatalogImpressionForCurrentScreen()'),
  );
  assert.equal(
    unresolvedBaselineGuard !== -1
      && baselineCapture > unresolvedBaselineGuard
      && baselineCapture < matchMutation
      && matchStartParse > matchMutation
      && baselineCommit > matchStartParse
      && baselineCommit < firstPostDispatchNonCriticalWork,
    true,
    'baseline must publish immediately after matchStart parsing and before non-critical work',
  );
  assert.doesNotMatch(
    dispatch.slice(unresolvedBaselineGuard, matchMutation),
    /pendingGrantCaptured/u,
    'any unconsumed baseline must block the next generation even before a Grant is captured',
  );
  assert.match(
    value,
    /learningSettlementBaselineCapturedBeforeMatchStartMutation: true/u,
  );
  assert.match(value, /indeterminateMatchStartFailsClosedUntilDestroy: true/u);
  assert.match(
    dispatch,
    /catch \(error\) \{[\s\S]*?#failIndeterminateMatchStart\([\s\S]*?throw error;/u,
  );
  const hostSection = section(
    owner,
    '  #host(): ArenaThreeModeAuthoritativePlayableHostCandidateV1 {',
    '\n\n  #failIndeterminateMatchStart(',
  );
  const hostGuard = hostSection.indexOf('if (this.#indeterminateMatchStartFailure !== null)');
  const settlementReentryGuard = hostSection.indexOf(
    'if (this.#learningSettlementFinalizationActive)',
  );
  const hostReturn = hostSection.indexOf('return this.#playableHost;');
  const destroyClear = owner.indexOf('this.#indeterminateMatchStartFailure = null;');
  assert.equal(
    settlementReentryGuard !== -1
      && settlementReentryGuard < hostGuard
      && hostGuard < hostReturn
      && destroyClear > hostReturn,
    true,
    'settlement reentry and indeterminate start must reject host use before returning the owner',
  );
  const localDestroy = section(owner, '  destroy(): void {', '\n  }\n}');
  assert.match(localDestroy, /if \(this\.#learningSettlementFinalizationActive\)/u);
  assert.match(value, /learningSettlementFinalizationReentryBlocked: true/u);
});

test('P6.58 commits offline retention sequence only after collector success', () => {
  const value = localPlayableSource();
  const owner = section(
    value,
    'export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
    'export function createArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  );
  const commit = section(
    owner,
    '  #commitRetentionObservation(',
    '\n\n  #selectedModeDefinitionIds()',
  );
  const collect = commit.indexOf('collector.collect(observation);');
  const sequenceCommit = commit.indexOf(
    'this.#retentionObservationEventSequence = eventSequence;',
  );
  assert.equal(
    collect !== -1 && sequenceCommit > collect,
    true,
    'retention sequence may advance only after the synchronous collector succeeds',
  );
  assert.match(commit, /if \(this\.#retentionObservationCollectionActive\)/u);
  assert.match(commit, /finally \{\s*this\.#retentionObservationCollectionActive = false;/u);
  assert.match(owner, /Arena留存观察提交期间不能重入本地Playable Host/u);
  assert.match(owner, /Arena留存观察提交期间不能销毁本地Playable Host/u);
  assert.match(value, /retentionObservationSequenceCommitsAfterCollectorSuccess: true/u);
  assert.match(value, /retentionObservationCollectorReentryBlocked: true/u);
});

test('P6.12 keeps recovery on the result surface and requires a second click to navigate', () => {
  const binding = localPlayableBindingSource();
  const intent = section(
    binding,
    '  readonly #handleIntent = (intentValue: unknown): void => {',
    '\n\n  load(): this',
  );
  const pendingRecovery = intent.indexOf(
    "screenId === 'result-reward'\n        && intentId === 'play-again-or-next'",
  );
  const retry = intent.indexOf(
    'this.#host.retryLearningSettlementProjectionRecovery()',
    pendingRecovery,
  );
  const rerender = intent.indexOf('const rendered = this.#renderCurrent();', retry);
  const notify = intent.indexOf('this.#notifySurface(', rerender);
  const earlyReturn = intent.indexOf('return;', notify);
  const normalDispatch = intent.indexOf('this.#host.dispatchPrimaryIntent({');
  assert.equal(
    pendingRecovery !== -1
      && pendingRecovery < retry
      && retry < rerender
      && rerender < notify
      && notify < earlyReturn
      && earlyReturn < normalDispatch,
    true,
    'pending recovery must retry, repaint and return before normal result navigation',
  );
  assert.match(intent, /status: recoveryStatus/u);
  assert.match(intent, /'learning-settlement-recovered'/u);
  assert.match(intent, /'learning-settlement-recovery-deferred'/u);
  assert.match(
    intent,
    /if \(startsMatch && recoveryAtIntentStart\.retryRequired\)/u,
  );
  assert.match(intent, /reason: 'settlement-recovery-pending'/u);

  const explicitRetry = section(
    binding,
    '  retryLearningSettlementProjectionRecovery(): ReturnType<',
    '\n\n  dispose(): void',
  );
  const hostRetry = explicitRetry.indexOf(
    'this.#host.retryLearningSettlementProjectionRecovery()',
  );
  const explicitRerender = explicitRetry.indexOf('this.#renderCurrent()', hostRetry);
  assert.equal(
    hostRetry !== -1 && hostRetry < explicitRerender,
    true,
    'programmatic retry must commit recovery before repainting the same information surface',
  );
  assert.match(explicitRetry, /this\.#state !== 'information'/u);

  const formal = source();
  const formalRetry = section(
    formal,
    '  retryLearningSettlementProjectionRecovery(): ReturnType<',
    '\n\n  beginSingleWeaponRegistryPromotion',
  );
  assert.match(formalRetry, /this\.#activeSurface !== 'information'/u);
  assert.match(
    formalRetry,
    /return this\.#binding\.retryLearningSettlementProjectionRecovery\(\);/u,
  );
});

test('P5.3zzztv/P6.92 freezes the rendered home continuation before accepting it', () => {
  const owner = localPlayableSource();
  const binding = localPlayableBindingSource();
  const dispatch = section(
    owner,
    '  dispatchPrimaryIntent(value: unknown): unknown {',
    '\n  stepMatch(value: unknown): unknown {',
  );
  const resolve = dispatch.indexOf(
    'this.#nextLearningGoalContinuationRouteReadFromLearningRead(readClickLearning())',
  );
  const revalidate = dispatch.indexOf('this.#assertRenderedHomeContinuationRouteIdentity(');
  const navigate = dispatch.indexOf('host.dispatchPrimaryIntent(navigationIntent)');
  const commit = dispatch.indexOf('this.#applyNextGoalNavigationRoute(homeContinuationRoute)');
  assert.equal(
    resolve !== -1 && resolve < revalidate && revalidate < navigate && navigate < commit,
    true,
    'home continuation must be resolved and revalidated before navigation, then committed after it',
  );
  assert.match(owner, /Arena首页已渲染的下一局建议与点击时续玩路由发生漂移/u);
  assert.match(owner, /targetScreenId: 'mode-select' as const/u);
  assert.match(owner, /continuation\.targetWeaponRequiresWorldPickup/u);
  assert.match(owner, /homeContinuationNavigationUsesFrozenGoalWeaponScope: true/u);
  assert.match(
    owner,
    /primaryIntentReusesSingleLearningSettlementAndRouteFitRead: true/u,
  );
  assert.match(
    dispatch,
    /homeContinuationRead!\.eligibleWeaponDefinitionIds/u,
  );
  assert.match(owner, /homeContinuationNeverAutoStartsMatch: true/u);
  assert.match(owner, /homeSurvivalContinuationNeverPreselectsWeapon: true/u);
  assert.match(binding, /#lastRenderedHomeContinuationRoute/u);
  assert.match(binding, /首页主动作缺少已渲染续玩路由身份/u);
  assert.match(binding, /expectedHomeContinuationGoalId/u);
  assert.match(binding, /homePrimaryClickRevalidatesLastRenderedContinuationIdentity: true/u);
  assert.match(binding, /function homeContinuationPrimaryActionRenderPlan\(/u);
  assert.match(binding, /label = modeLabel === null \? '选择模式' : `去\$\{modeLabel\}`/u);
  assert.match(binding, /再次确认后才开始\$\{modeLabel\}，不会自动开局/u);
  assert.match(binding, /route\.targetWeaponRequiresWorldPickup\s*\? route\.requiresTargetMapSelection/u);
  assert.match(binding, /homePrimaryLabelNamesRecommendedExistingMode: true/u);
  assert.match(binding, /homePrimaryAccessibilityExplainsSelectionAndConfirmation: true/u);
  assert.match(binding, /homeAcceptedContinuationStillStopsAtModeConfirmation: true/u);
  assert.match(binding, /homeSurvivalContinuationPreservesUnarmedMatchStart: true/u);
});

test('P6.93 observes accepted home continuation only from the frozen next-match start', () => {
  const owner = localPlayableSource();
  const dispatch = section(
    owner,
    '  dispatchPrimaryIntent(value: unknown): unknown {',
    '\n  stepMatch(value: unknown): unknown {',
  );
  const navigate = dispatch.indexOf('host.dispatchPrimaryIntent(navigationIntent)');
  const accept = dispatch.indexOf(
    'this.#pendingHomeContinuationFollowObservation =\n          acceptedHomeContinuationObservation;',
  );
  const complete = dispatch.indexOf(
    'this.#completeHomeContinuationFollowObservation(matchPresentation);',
  );
  assert.equal(
    navigate !== -1 && accept > navigate && complete > navigate,
    true,
    'home continuation observation may be accepted only after navigation and completed after start',
  );
  assert.match(owner, /#frozenMatchStartContentIdentity\(/u);
  assert.match(owner, /matchPresentation\.getSceneReadFrame\(\)/u);
  assert.match(owner, /kind: 'home-continuation-followed'/u);
  assert.match(owner, /authorityTick: actual\.authorityTick/u);
  assert.match(owner, /homeContinuationFollowObservationOptInWired: true/u);
  assert.match(owner, /homeContinuationFollowUsesFrozenMatchStartScene: true/u);
  assert.match(owner, /homeContinuationObservationFailureNeverBlocksMatchStart: true/u);
  const journal = readFileSync(
    'packages/arena-product-progression/src/arena-v2-offline-retention-observation-journal-candidate-v1.ts',
    'utf8',
  );
  assert.match(journal, /legacySixMetricEnvelopeMigratesInMemory: true/u);
  assert.match(journal, /legacyPayloadHashVerifiedBeforeMigration: true/u);
  assert.match(journal, /source\.metrics\.length === LEGACY_KIND_ORDER\.length/u);
  assert.equal(
    journal.indexOf('createDeterministicDataHash(\n    payloadForHash')
      < journal.indexOf('? envelope(normalizedPayload)'),
    true,
    'legacy six-metric payload hash must be verified before the seventh zero metric is adopted',
  );
});

test('P5.3zzztx/P6.94 keeps home preparation feedback independent from retention', () => {
  const owner = localPlayableSource();
  const presentation = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-content-information-projection-candidate-v1.ts',
    'utf8',
  );
  assert.match(owner, /#acceptedHomeContinuationPreparation:/u);
  assert.match(owner, /#continuationPreparationReadFromLearningRead\(/u);
  assert.match(owner, /homeContinuationPreparationStateIndependentFromRetentionCollector: true/u);
  assert.match(owner, /modeConfirmationShowsHomeContinuationPreparationState: true/u);
  assert.match(owner, /adjustedHomeContinuationStillAllowsCurrentSelection: true/u);
  assert.match(owner, /homeContinuationPreparationState: continuationPreparation\.state/u);
  assert.match(presentation, /\? '目标已准备｜'/u);
  assert.match(presentation, /\? '当前组合已与首页目标不同，可按当前选择开始。'/u);
});

test('P5.3zzzty/P6.95 carries only the validated start-combination receipt to result', () => {
  const owner = localPlayableSource();
  const presentation = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-result-home-continuation-receipt-information-projection-candidate-v1.ts',
    'utf8',
  );
  assert.match(owner, /#captureHomeContinuationMatchReceipt\(matchPresentation: unknown\)/u);
  assert.match(owner, /#projectHomeContinuationMatchReceipt\(/u);
  assert.match(owner, /catch \(error\) \{\n      this\.#homeContinuationMatchReceiptError = error;\n      return fieldSource;/u);
  assert.match(owner, /this\.#frozenMatchStartContentIdentity\(matchPresentation\)/u);
  assert.match(owner, /projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1/u);
  assert.match(owner, /resultHomeContinuationReceiptUsesValidatedMatchStartScene: true/u);
  assert.match(owner, /resultHomeContinuationReceiptFailureNeverBlocksMatch: true/u);
  assert.match(presentation, /不表示目标已经完成/u);
  assert.match(presentation, /fieldCountAdded: 0/u);
  assert.match(presentation, /writesAuthorityProfileRewardOrTask: false/u);
});

test('P5.3zzzua/P6.96 reuses the continuation session for result goal preparation', () => {
  const owner = localPlayableSource();
  const modePresentation = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-content-information-projection-candidate-v1.ts',
    'utf8',
  );
  const receiptPresentation = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-result-home-continuation-receipt-information-projection-candidate-v1.ts',
    'utf8',
  );
  assert.match(owner, /#captureResultGoalContinuationPreparation\(/u);
  assert.match(owner, /resultRecommendationKind === 'prepare-next-goal'/u);
  assert.match(owner, /acceptedResultContinuationPreparation/u);
  assert.match(owner, /source: 'result' as const/u);
  assert.match(owner, /Arena结果页目标准备与当前长期目标的模式、武器或地图发生漂移/u);
  assert.match(owner, /route\.selectedModeKind === 'survival'/u);
  assert.match(owner, /this\.#pendingHomeContinuationFollowObservation = null/u);
  assert.match(owner, /resultGoalPreparationNeverWritesHomeContinuationMetric: true/u);
  assert.match(owner, /homeContinuationPreparationSource: continuationPreparation\.source/u);
  assert.match(modePresentation, /已按上局结算目标准备当前组合/u);
  assert.match(modePresentation, /当前组合已与上局结算目标不同/u);
  assert.match(modePresentation, /continuationPreparationCopyUsesExplicitSource: true/u);
  assert.match(receiptPresentation, /acceptedSources: Object\.freeze\(\['home', 'result'\] as const\)/u);
  assert.match(receiptPresentation, /sourceCopyNeverInferredFromGoalOrSelection: true/u);
  assert.match(receiptPresentation, /上局结算目标回执/u);
});

test('P5.3zzzub/P6.97 keeps optional depth but clears an explicitly abandoned goal flow', () => {
  const owner = localPlayableSource();
  const openDeclaredLink = section(
    owner,
    '  openDeclaredLink(value: unknown): unknown {',
    '\n  openBottomNavigation(value: unknown): unknown {',
  );
  const openBottomNavigation = section(
    owner,
    '  openBottomNavigation(value: unknown): unknown {',
    '\n  selectInformationMode(value: unknown): void {',
  );
  assert.match(owner, /#clearContinuationPreparationAfterExplicitExit\(\): void/u);
  assert.match(owner, /continuationPreparationOptionalDepthPreservesSession: true/u);
  assert.match(owner, /continuationPreparationExplicitExitClearsAfterNavigation: true/u);
  assert.match(owner, /continuationPreparationExitCompletesOnlyPendingHomeObservation: true/u);
  assert.match(openDeclaredLink, /const outcome = this\.#host\(\)\.openDeclaredLink\(value\)/u);
  assert.match(openDeclaredLink, /targetScreenId === 'weapon-index' \|\| targetScreenId === 'map-index'/u);
  assert.match(openDeclaredLink, /this\.#clearContinuationPreparationAfterExplicitExit\(\)/u);
  assert.match(openBottomNavigation, /const outcome = this\.#host\(\)\.openBottomNavigation\(value\)/u);
  assert.match(openBottomNavigation, /this\.#clearContinuationPreparationAfterExplicitExit\(\)/u);
  assert.match(owner, /if \(this\.#pendingHomeContinuationFollowObservation !== null\)/u);
  assert.doesNotMatch(openDeclaredLink, /targetScreenId === 'character-select'[\s\S]*clearContinuation/u);
});

test('P5.3zzzuf/P6.98 carries result collection detail into mode confirmation', () => {
  const owner = localPlayableSource();
  const dispatch = section(
    owner,
    '  dispatchPrimaryIntent(value: unknown): unknown {',
    '\n  stepMatch(value: unknown): unknown {',
  );
  const navigate = dispatch.indexOf('host.dispatchPrimaryIntent(navigationIntent)');
  const pending = dispatch.indexOf(
    'this.#pendingResultCollectionDetailPreparation =\n          acceptedResultCollectionDetailPreparation;',
  );
  const accepted = dispatch.indexOf(
    'this.#acceptedHomeContinuationPreparation =\n        acceptedResultCollectionDetailReturnPreparation;',
  );
  assert.equal(navigate !== -1 && pending > navigate && accepted > navigate, true);
  assert.match(owner, /#captureResultCollectionDetailPreparation\(/u);
  assert.match(owner, /#revalidateResultCollectionDetailPreparation\(/u);
  assert.match(owner, /resultCollectionDetailCarriesPendingGoalPreparation: true/u);
  assert.match(owner, /resultCollectionDetailRevalidatesGoalBeforeModeConfirmation: true/u);
  assert.match(owner, /resultCollectionDetailAdjacentBrowseBecomesAdjustedPreparation: true/u);
  assert.match(owner, /resultCollectionDetailExitClearsPendingPreparation: true/u);
  assert.match(owner, /recommendationKind === 'next-weapon'/u);
  assert.match(owner, /recommendationKind === 'next-map'/u);
  assert.match(owner, /Arena结果页收藏详情返回模式页前长期目标身份发生漂移/u);
  assert.match(owner, /pendingResultCollectionDetailPreparation:/u);
  assert.match(owner, /this\.#pendingResultCollectionDetailPreparation = null/u);
});

test('P5.3zzzug/P6.99 receipts only a revalidated goal-aligned replay', () => {
  const owner = localPlayableSource();
  const binding = localPlayableBindingSource();
  const dispatch = section(
    owner,
    '  dispatchPrimaryIntent(value: unknown): unknown {',
    '\n  stepMatch(value: unknown): unknown {',
  );
  const revalidate = dispatch.indexOf('this.#captureGoalAlignedPlayAgainPreparation(');
  const navigate = dispatch.indexOf('host.dispatchPrimaryIntent(navigationIntent)');
  const receipt = dispatch.indexOf('this.#captureHomeContinuationMatchReceipt(matchPresentation)');
  assert.equal(revalidate !== -1 && navigate > revalidate && receipt > navigate, true);
  assert.match(owner, /#captureGoalAlignedPlayAgainPreparation\(/u);
  assert.match(owner, /routeFit\.kind !== fitKind/u);
  assert.match(owner, /routeFit\.deterministicCurrentReplayCanAdvance/u);
  assert.match(owner, /routeFit\.conditionalCurrentReplayCanAdvance/u);
  assert.match(owner, /Arena已渲染的目标对齐复玩与点击时长期目标或当前组合发生漂移/u);
  assert.match(owner, /goalAlignedPlayAgainUsesRenderedRouteFitIdentity: true/u);
  assert.match(owner, /goalAlignedPlayAgainRevalidatesStableOrConditionalFit: true/u);
  assert.match(owner, /goalAlignedPlayAgainReceiptUsesValidatedMatchStartScene: true/u);
  assert.match(owner, /arbitraryPlayAgainNeverClaimsGoalContinuation: true/u);
  assert.match(binding, /expectedResultPlayAgainFitKind/u);
  assert.match(binding, /expectedResultPlayAgainGoalId/u);
  assert.match(binding, /expectedResultPlayAgainModeKind/u);
  assert.match(binding, /expectedResultPlayAgainTargetWeaponDefinitionId/u);
  assert.match(binding, /expectedResultPlayAgainTargetMapDefinitionId/u);
});

test('P5.3zzzuh/P6.100 routes explicit next-goal through the same continuation session', () => {
  const owner = localPlayableSource();
  assert.match(owner, /explicitNextGoalReusesModeOrDetailContinuationSession: true/u);
  assert.match(owner, /explicitNextGoalUnsupportedRoutesNeverClaimPreparation: true/u);
  assert.match(
    owner,
    /resultRecommendationKind === 'prepare-next-goal'\s*\|\| resultRecommendationKind === 'next-goal'/u,
  );
  assert.match(owner, /resultRecommendationKind === 'next-goal'[\s\S]*nextGoalRoute\.targetScreenId === 'weapon-detail'/u);
  assert.match(owner, /nextGoalRoute\.targetScreenId === 'map-detail'/u);
  assert.match(owner, /nextGoalRoute\.targetScreenId === 'weapon-detail'\s*\? 'next-weapon'\s*: 'next-map'/u);
});

test('P5.3zzzui/P6.101 retires stale continuation identity before it can claim a match', () => {
  const owner = localPlayableSource();
  const modeProjection = section(
    owner,
    '  getInformationModeContentProjection(): ReturnType<',
    '\n  getInformationLoadingProjection()',
  );
  const dispatch = section(
    owner,
    '  dispatchPrimaryIntent(value: unknown): unknown {',
    '\n  stepMatch(value: unknown): unknown {',
  );
  assert.match(owner, /#isContinuationPreparationCurrentFromRead\(/u);
  assert.match(owner, /#continuationPreparationReadFromLearningRead\(/u);
  assert.match(owner, /#continuationPreparationGoalDrifted\(\)/u);
  assert.match(owner, /#clearContinuationPreparationIfGoalDrifted\(\)/u);
  assert.match(owner, /this\.#nextLearningGoalContinuationRoute\(\)/u);
  assert.match(owner, /this\.#resultNextGoalRouteFit\(\)/u);
  assert.match(owner, /return Object\.freeze\(\{ state: 'none', source: 'none' \}\)/u);
  assert.match(
    modeProjection,
    /const continuationPreparation = this\.#continuationPreparationReadFromLearningRead\(/u,
  );
  assert.match(modeProjection, /homeContinuationPreparationState: continuationPreparation\.state/u);
  assert.match(modeProjection, /homeContinuationPreparationSource: continuationPreparation\.source/u);
  assert.equal(
    dispatch.indexOf('this.#clearContinuationPreparationAfterExplicitExit()')
      < dispatch.indexOf('host.dispatchPrimaryIntent(navigationIntent)'),
    true,
    'stale continuation identity must be cleared before a primary action can start a match',
  );
  assert.match(owner, /staleContinuationPreparationHiddenWithoutMutation: true/u);
  assert.match(owner, /staleContinuationPreparationClearedBeforeNextAction: true/u);
  assert.match(owner, /staleContinuationNeverCreatesMatchReceipt: true/u);
  assert.match(owner, /staleResultDetailContinuesAsOrdinaryNavigation: true/u);
});

test('P5.3zza stops the owned runtime tree after any top-level composition failure', () => {
  const value = source();
  const aggregateFailure = section(value, 'function normalizeCompositionFailure(', '/**\n * One owner');
  assert.doesNotMatch(aggregateFailure, /String\(value\)/u);
  assert.match(aggregateFailure, /Object\.defineProperty\(error, 'originalError'/u);
  const constructor = section(value, '  constructor(value: unknown) {', '\n  get state(): CompositionState');
  assert.match(constructor, /if \(this\.#hasConstructionFailure\) throw this\.#constructionFailure;/u);
  const failure = section(
    value,
    '  #recordFailure(error: unknown): void {',
    '\n\n  #applyCollectionPreviewVisibility',
  );
  assert.match(failure, /if \(!this\.#constructionComplete\)/u);
  assert.match(failure, /this\.#hasConstructionFailure = true;/u);
  assert.match(failure, /this\.#scheduleFailureShutdown\(\);/u);
  const shutdown = section(
    value,
    '  #scheduleFailureShutdown(): void {',
    '\n\n  #cleanupOwnedRuntimeResources',
  );
  assert.match(shutdown, /this\.#cleanupOwnedRuntimeResources\(errors\)/u);
  const cleanup = section(
    value,
    '  #cleanupOwnedRuntimeResources(errors: unknown[]): void {',
    '\n\n  #applyCollectionPreviewVisibility',
  );
  const resize = cleanup.indexOf('this.#resizeCleanup()');
  const driver = cleanup.indexOf('this.#driver.dispose()');
  const journal = cleanup.indexOf('this.#offlineRetentionObservationJournal.destroy()');
  const pointer = cleanup.indexOf('this.#pointerSurface.dispose()');
  assert.equal(
    resize !== -1 && resize < driver && driver < journal && journal < pointer,
    true,
    'failure shutdown must stop callbacks and the driver-owned authority tree before platform input',
  );
  assert.match(shutdown, /if \(!this\.#constructionComplete/u);
  assert.match(shutdown, /this\.#failureShutdownScheduled = true;/u);
  assert.match(shutdown, /if \(this\.#state === 'disposed'\) return;/u);
  assert.match(value, /synchronousConstructionFailureUsesRollbackChain: true/u);
  assert.match(value, /arbitraryConstructionFailureValuePreservedWithoutStringification: true/u);
  assert.match(value, /anyCompositionFailureStopsOwnedDriverBeforeNextPlatformTurn: true/u);
  assert.match(value, /failureShutdownReleasesOwnedRuntimeResources: true/u);
});

test('P5.3zzu closes failed intent transactions without relying on a still-bound surface callback', () => {
  const binding = localPlayableBindingSource();
  const rejected = section(
    binding,
    '  readonly #handleRejected = (error: unknown, intentId: string | null): never => {',
    '\n\n  readonly #handleIntent',
  );
  assert.match(rejected, /this\.#state === 'failed' \|\| this\.#state === 'disposed'/u);
  assert.match(rejected, /throw error/u);
  const intent = section(
    binding,
    '  readonly #handleIntent = (intentValue: unknown): void => {',
    '\n\n  load(): this',
  );
  assert.match(intent, /catch \(error\) \{/u);
  assert.match(intent, /this\.#reject\(error, intentId\)/u);
  assert.match(
    binding,
    /intentTransactionFailureClosesBindingWithoutSurfaceRejectedCallback: true/u,
  );
  assert.match(
    binding,
    /surfaceRejectedCallbackDoesNotRepeatClosedBindingFailure: true/u,
  );
});

test('P5.3zzv closes the binding when settlement recovery presentation also fails', () => {
  const binding = localPlayableBindingSource();
  const settlement = section(
    binding,
    '  settleMatch(): unknown {',
    '\n\n  retryLearningSettlementProjectionRecovery()',
  );
  assert.match(settlement, /getLearningSettlementRecoveryRead\(\)/u);
  assert.match(settlement, /结算失败且恢复状态读取失败/u);
  assert.match(settlement, /this\.#leaveMatchSurface\(\)/u);
  assert.match(settlement, /this\.#renderCurrent\(\)/u);
  assert.match(settlement, /this\.#notifySurface\('information', outcome\)/u);
  assert.match(settlement, /结算恢复页面提交失败/u);
  assert.match(settlement, /return this\.#reject\(new AggregateError/u);
  assert.match(binding, /settlementRecoverySurfaceFailureClosesBinding: true/u);
});

test('P5.3zze shares one partial-cleanup ledger between failure shutdown and dispose', () => {
  const value = source();
  const cleanup = section(
    value,
    '  #cleanupOwnedRuntimeResources(errors: unknown[]): void {',
    '\n\n  #applyCollectionPreviewVisibility',
  );
  assert.match(cleanup, /#ownedRuntimeCleanupComplete\(\): boolean/u);
  assert.match(cleanup, /if \(!this\.#resizeCleanupCompleted\)/u);
  assert.match(cleanup, /this\.#resizeCleanupCompleted = true/u);
  assert.match(cleanup, /if \(!this\.#driverDisposed\)/u);
  assert.match(cleanup, /this\.#driverDisposed = true/u);
  assert.match(cleanup, /this\.#offlineRetentionObservationJournalDestroyed = true/u);
  assert.match(cleanup, /this\.#pointerSurfaceDisposed = true/u);
  const dispose = section(value, '  dispose(): void {', '\n}\n\nexport function');
  assert.match(dispose, /this\.#cleanupOwnedRuntimeResources\(errors\)/u);
  assert.match(dispose, /this\.#ownedRuntimeCleanupComplete\(\) && !this\.#containerRemoved/u);
  assert.match(dispose, /this\.#containerRemoved = true/u);
  assert.match(dispose, /const cleanupComplete = this\.#ownedRuntimeCleanupComplete\(\)/u);
  assert.match(value, /failureShutdownAndDisposeShareCleanupLedger: true/u);
  assert.match(value, /cleanupRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(value, /failureShutdownRetainsDiagnosticContainerUntilDispose: true/u);
  assert.match(value, /containerRemovalWaitsForOwnedRuntimeCleanup: true/u);
  assert.match(value, /terminalStateRequiresOwnedRuntimeAndContainerCleanup: true/u);
});

test('P5.3zzb pauses keyboard and pointer authority while the platform is hidden', () => {
  const keyboard = keyboardDriverSource();
  const keyboardVisibility = section(
    keyboard,
    '  #bindVisibility(): void {',
    '\n\n  #replaceInput(',
  );
  assert.match(keyboardVisibility, /visibility platform\.onHide/u);
  assert.match(keyboardVisibility, /visibility platform\.onShow/u);
  assert.match(keyboardVisibility, /visibility platform\.isHidden/u);
  assert.match(keyboardVisibility, /if \(this\.#visibilityBinding\)/u);
  assert.match(keyboardVisibility, /this\.#platformHidden = observedHidden \|\| hidden;/u);
  const keyboardStart = section(keyboard, '  start(): boolean {', '\n\n  pause(): boolean {');
  assert.match(keyboardStart, /if \(this\.#readPlatformHidden\(\)\)/u);
  const keyboardPause = section(keyboard, '  pause(): boolean {', '\n\n  resume(): boolean {');
  assert.match(keyboardPause, /this\.#visibilityPaused = false;/u);
  const keyboardResume = section(keyboard, '  resume(): boolean {', '\n\n  settle(): unknown {');
  assert.match(keyboardResume, /不能在平台隐藏时恢复/u);
  assert.match(keyboard, /this\.#cleanups = retained;/u);
  assert.match(keyboard, /input\.destroy\(\);\s*this\.#assertTransitionCommit\(\);\s*this\.#input = null;/u);
  assert.match(keyboard, /failedInputCleanupRetainsRetryOwnership: true/u);
  assert.match(keyboard, /failedInputBindRollbackRetainsRetryOwnership: true/u);

  const pointer = pointerDriverSource();
  const pointerInputShow = section(
    pointer,
    '  readonly #onShow = (): void => {',
    '\n\n  bind(): boolean {',
  );
  assert.doesNotMatch(
    pointerInputShow,
    /this\.resume\(\);/u,
    'the sampler may resume only when the driver accepts automatic or manual resume',
  );
  const pointerVisibility = section(
    pointer,
    '  #handleVisibility(visibility: VisibilityState): void {',
    '\n\n  readonly #frame',
  );
  assert.match(pointerVisibility, /this\.#platformHidden = true;/u);
  assert.match(pointerVisibility, /this\.#platformHidden = this\.#platformHidden \|\| hidden;/u);
  const pointerStart = section(pointer, '  start(): boolean {', '\n\n  pause(): boolean {');
  assert.match(pointerStart, /不能在平台隐藏时启动/u);
  const pointerResume = section(pointer, '  resume(): boolean {', '\n\n  settle(): unknown {');
  assert.match(pointerResume, /不能在平台隐藏时恢复/u);
  assert.match(pointer, /input\.destroy\(\);\s*this\.#assertTransitionCommit\(\);\s*this\.#input = null;/u);
  assert.match(pointer, /failedInputCleanupRetainsRetryOwnership: true/u);
  assert.match(pointer, /failedInputBindRollbackRetainsRetryOwnership: true/u);

  const surface = pointerSurfaceSource();
  assert.match(surface, /isHidden\(\): boolean \{[\s\S]*?return this\.#document\.hidden;/u);
  const composition = source();
  assert.match(composition, /visibilityPlatform: keyboardVisibilityPlatform/u);
  assert.match(composition, /windowObject\.addEventListener\('pagehide', hide\)/u);
  assert.match(composition, /windowObject\.addEventListener\('focus', show\)/u);
});

test('P6.243 fails keyboard and pointer drivers closed after swallowed synchronous reentry', () => {
  for (const [name, value] of [
    ['keyboard', keyboardDriverSource()],
    ['pointer', pointerDriverSource()],
  ] as const) {
    assert.match(value, /#transitionOperation: string \| null = null/u, `${name} operation owner`);
    assert.match(value, /#reentrySequence = 0/u, `${name} monotonic reentry sequence`);
    assert.doesNotMatch(value, /#reentryAttempted/u, `${name} removes resettable reentry bool`);
    assert.match(value, /#reentryError: Error \| null = null/u, `${name} first reentry error`);
    assert.match(value, /#transitionFailure: unknown = null/u, `${name} primary failure`);
    assert.match(
      value,
      /#assertUsable\(operation: string\): void \{\s*this\.#assertNoTransition\(operation\);/u,
      `${name} guards before terminal and idempotent paths`,
    );
    assert.match(
      value,
      /get state\(\): DriverState \{\s*this\.#assertNoTransition\([^)]*state read[^)]*\);/u,
      `${name} state read guard`,
    );
    assert.match(
      value,
      /getSnapshot\(\): Readonly<[\s\S]*?this\.#assertNoTransition\([^)]*snapshot read[^)]*\);/u,
      `${name} snapshot read guard`,
    );
    const frame = section(value, '  readonly #frame =', '\n\n  #fail(error: unknown): void {');
    assert.match(frame, /this\.#beginTransition\([^)]* frame[^)]*\)/u, `${name} frame begin`);
    assert.match(frame, /this\.#endTransition\([^)]* frame[^)]*\)/u, `${name} frame end`);
    const dispose = section(value, '  dispose(): void {', '\n  }\n}\n\nexport const');
    assert.ok(
      dispose.indexOf('#assertNoTransition') < dispose.indexOf("#state === 'destroyed'"),
      `${name} checks reentry before idempotent dispose`,
    );
    assert.match(dispose, /#beginTransition\([^)]* dispose[^)]*\)/u, `${name} dispose begin`);
    assert.match(dispose, /#endTransition\([^)]* dispose[^)]*\)/u, `${name} dispose end`);
    assert.match(value, /swallowedBindingInputLoopOrObserverReentryFailsClosed: true/u);
    assert.match(value, /stateAndSnapshotReadsRejectedDuringTransition: true/u);
    assert.match(value, /disposeCommitsUnderStickyTransitionGuard: true/u);
    assert.match(value, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
    assert.match(value, /bindingInputLoopAndObserverCallbacksCheckedBeforeStateCommit: true/u);
    assert.match(value, /cleanupReentryRetainsCurrentAndLaterOwners: true/u);
    assert.match(value, /snapshotChildrenCheckedBeforeAggregatePublication: true/u);
    assert.match(value, /idempotentLifecycleChecksFollowTransitionGuard: true/u);
  }
});

test('P6.244 commits every local playable Binding call under one sticky transition', () => {
  const binding = localPlayableBindingSource();
  assert.match(binding, /#transitionOperation: string \| null = null/u);
  assert.match(binding, /#reentrySequence = 0/u);
  assert.match(binding, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(binding, /#reentryAttempted/u);
  assert.match(binding, /#transitionFailure: unknown = null/u);
  assert.match(
    binding,
    /#assertLive\(operation: string\): void \{\s*this\.#assertNoTransition\(operation\);/u,
  );
  assert.match(
    binding,
    /get state\(\): BindingState \{\s*this\.#assertNoTransition\([^)]*state read[^)]*\);/u,
  );
  assert.match(
    binding,
    /get lastRenderPlan\(\): ArenaV2UiRenderPlanV1 \| null \{\s*this\.#assertNoTransition/u,
  );
  assert.ok((binding.match(/this\.#runTransition\(/gu) ?? []).length >= 15);
  const intent = section(
    binding,
    '  readonly #handleIntent =',
    '\n\n  load(): this {',
  );
  assert.match(intent, /#beginTransition\([^)]* intent[^)]*\)/u);
  assert.match(intent, /#endTransition\([^)]* intent[^)]*, intentId\)/u);
  assert.ok(
    intent.indexOf('#endTransition') < intent.indexOf('#matchDriverStart()'),
    'the attached Driver may start only after the Binding intent transition commits',
  );
  const load = section(binding, '  load(): this {', '\n\n  renderCurrent():');
  assert.ok(load.indexOf('#assertLive') < load.indexOf("#state !== 'created'"));
  assert.match(load, /#beginTransition\([^)]* load[^)]*\)/u);
  assert.match(load, /#endTransition\([^)]* load[^)]*, null\)/u);
  const dispose = section(binding, '  dispose(): void {', '\n  }\n}\n\nexport const');
  assert.ok(dispose.indexOf('#assertNoTransition') < dispose.indexOf("#state === 'disposed'"));
  assert.match(dispose, /#beginTransition\(operation\)/u);
  assert.match(dispose, /#endTransition\(operation, null\)/u);
  assert.match(binding, /allPublicHostSurfaceAndMatchCallsCommitUnderStickyTransition: true/u);
  assert.match(binding, /swallowedHostSurfaceMatchDriverOrObserverReentryFailsClosed: true/u);
  assert.match(binding, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(
    binding,
    /hostSurfaceMatchAndObserverCallbacksCheckedBeforeStateCommit: true/u,
  );
  assert.match(binding, /cleanupReentryRetainsCurrentAndLaterOwners: true/u);
  assert.match(
    binding,
    /attachedMatchDriverStartUsesIndependentGuardedTransition: true/u,
  );
  assert.match(binding, /stateAndLastRenderPlanReadsRejectedDuringTransition: true/u);
  assert.match(binding, /idempotentLoadAndDisposeCheckReentryBeforeFastPath: true/u);
  assert.match(binding, /matchDriverStartsOnlyAfterIntentTransitionCommits: true/u);
});

test('P6.245 fails the formal pointer surface closed after swallowed callback reentry', () => {
  const surface = pointerSurfaceSource();
  assert.match(surface, /#operation: string \| null = null/u);
  assert.match(surface, /#reentrySequence = 0/u);
  assert.doesNotMatch(surface, /#reentryAttempted/u);
  assert.match(surface, /#reentryError: Error \| null = null/u);
  assert.match(surface, /#operationFailure: unknown = null/u);
  assert.match(
    surface,
    /#assertUsable\(operation: string\): void \{\s*this\.#assertNoOperation\(operation\);/u,
  );
  assert.match(
    surface,
    /get visible\(\): boolean \{\s*this\.#assertNoOperation\([^)]*visible read[^)]*\);/u,
  );
  assert.match(
    surface,
    /getSnapshot\(\): Readonly<Record<string, unknown>> \{\s*this\.#assertNoOperation/u,
  );
  assert.ok((surface.match(/this\.#runEventOperation\(/gu) ?? []).length >= 7);
  assert.match(surface, /#failClosed\(error: unknown\): never/u);
  assert.match(surface, /this\.#visible = false;[\s\S]*this\.#unbindInput/u);
  const bindInput = section(surface, '  #bindInputOwned(', '\n\n  bindInput(');
  assert.ok(bindInput.indexOf('#assertNoOperation') < bindInput.indexOf('if (completed) return'));
  assert.match(bindInput, /#runOperation\(operation/u);
  const lifecycleCleanup = section(
    surface,
    '  #publicLifecycleCleanup(',
    '\n\n  #handlePointerDown(',
  );
  assert.ok(
    lifecycleCleanup.indexOf('#assertNoOperation')
      < lifecycleCleanup.indexOf('if (completed) return'),
  );
  const dispose = section(surface, '  dispose(): void {', '\n  }\n}\n\nexport const');
  assert.ok(dispose.indexOf('#assertNoOperation') < dispose.indexOf('if (this.#disposed)'));
  assert.match(dispose, /#beginOperation\(operation\)/u);
  assert.match(dispose, /#endOperation\(operation\)/u);
  assert.match(surface, /pointerAndLifecycleCallbacksCommitUnderStickyOperation: true/u);
  assert.match(surface, /swallowedDomInputLifecycleOrObserverReentryFailsClosed: true/u);
  assert.match(surface, /publicVisibilityAndSnapshotReadsRejectOperationMiddleState: true/u);
  assert.match(surface, /inputAndLifecycleCleanupClosuresUseSurfaceOperationGuard: true/u);
  assert.match(surface, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(surface, /domInputLifecycleAndObserverCallbacksCheckedBeforeStateCommit: true/u);
  assert.match(surface, /cleanupReentryRetainsCurrentAndLaterOwners: true/u);
  assert.match(surface, /pointerEventCallbacksStopAtFirstReentrySequenceChange: true/u);
  assert.match(surface, /idempotentVisibilityAndDisposeCheckReentryBeforeFastPath: true/u);
});

test('P6.246 fails the twenty-weapon feedback VFX port closed after swallowed reentry', () => {
  const port = twentyWeaponFeedbackVfxPortSource();
  assert.match(port, /#operation: string \| null = null/u);
  assert.match(port, /#reentrySequence = 0/u);
  assert.doesNotMatch(port, /#reentryAttempted/u);
  assert.match(port, /#reentryError: Error \| null = null/u);
  assert.match(port, /#operationFailure: unknown = null/u);
  assert.match(
    port,
    /#assertActive\(operation: string\): void \{\s*this\.#assertNoOperation\(operation\);/u,
  );
  assert.match(
    port,
    /get state\(\): ArenaV2TwentyWeaponFeedbackVfxPortStateCandidateV1 \{\s*this\.#assertNoOperation/u,
  );
  assert.match(
    port,
    /getSnapshot\(\): ArenaV2TwentyWeaponFeedbackVfxPortSnapshotCandidateV1 \{\s*this\.#assertNoOperation/u,
  );
  for (const [start, end] of [
    ['  present(value: unknown): void {', '\n\n  remove(value: unknown): void {'],
    ['  remove(value: unknown): void {', '\n\n  clear(): void {'],
    ['  clear(): void {', '\n\n  getSnapshot():'],
    ['  dispose(): void {', '\n  }\n}\n\nexport const'],
  ] as const) {
    const operation = section(port, start, end);
    assert.match(operation, /#beginOperation\(/u);
    assert.match(operation, /#endOperation\(/u);
  }
  const dispose = section(port, '  dispose(): void {', '\n  }\n}\n\nexport const');
  assert.ok(dispose.indexOf('#assertNoOperation') < dispose.indexOf("#state === 'disposed'"));
  assert.match(port, /swallowedDownstreamReentryFailsClosed: true/u);
  assert.match(port, /presentRemoveClearAndDisposeCommitUnderStickyOperation: true/u);
  assert.match(port, /stateAndSnapshotReadsRejectedDuringOperation: true/u);
  assert.match(port, /idempotentRemoveAndDisposeCheckReentryBeforeFastPath: true/u);
  assert.match(port, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(port, /downstreamCallbacksCheckedBeforeActiveIdentityCommit: true/u);
  assert.match(port, /swallowedDownstreamClearReentryRetainsIdentityAndStopsDispose: true/u);
  assert.match(port, /downstreamOwnershipReleasedOnlyAfterConfirmedDispose: true/u);
});

test('P6.247 closes swallowed reentry across the feedback consumer and weapon HUD host', () => {
  const consumer = feedbackEffectConsumerSource();
  const host = twentyWeaponFeedbackHudHostSource();
  assert.match(consumer, /#reentrySequence = 0/u);
  assert.doesNotMatch(consumer, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'externalEffectCallbacksCheckedBeforeLaterEffectsOrProjectionWatermark: true',
    'swallowedExternalEffectReentryStopsLaterEffectDispatch: true',
    'cleanupReentryRetainsCurrentAndLaterEffectOwnership: true',
  ]) assert.match(consumer, new RegExp(marker));
  assert.match(host, /#reentrySequence = 0/u);
  assert.doesNotMatch(host, /#reentryAttempted/u);
  for (const value of [consumer, host]) {
    assert.match(value, /#reentryError: Error \| null = null/u);
    assert.match(value, /#operationFailure: unknown = null/u);
    assert.match(value, /#assertNoOperation\(operation: string\): void/u);
    assert.match(value, /#endOperation\(/u);
    assert.match(value, /this\.#state = [^;]*FAILED;\s*this\.#cleanupStarted = true/u);
  }
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'innerHostAndExternalEffectCallbacksCheckedBeforeIdentityCommit: true',
    'swallowedExternalEffectReentryStopsIdentityDeletionAndQueuePruning: true',
    'swallowedInnerHostCleanupReentryRetainsInnerHostOwnership: true',
  ]) assert.match(host, new RegExp(marker));
  assert.match(
    consumer,
    /get state\(\): ConsumerState \{\s*this\.#assertNoOperation\([^)]*state read[^)]*\);/u,
  );
  assert.match(
    host,
    /get state\(\): ArenaV2TwentyWeaponFeedbackHudHostStateCandidateV1 \{\s*this\.#assertNoOperation/u,
  );
  const consumerDispose = section(
    consumer,
    '  dispose(): void {',
    '\n  }\n}\n\nexport const',
  );
  const hostDispose = section(host, '  dispose(): void {', '\n  }\n}\n\nexport const');
  assert.ok(
    consumerDispose.indexOf('#assertNoOperation')
      < consumerDispose.indexOf('EFFECT_CONSUMER_STATE_V1.DISPOSED'),
  );
  assert.ok(
    hostDispose.indexOf('#assertNoOperation')
      < hostDispose.indexOf('HUD_HOST_STATE_CANDIDATE_V1.DISPOSED'),
  );
  assert.match(consumer, /swallowedVisualOrAudioReentryFailsClosed: true/u);
  assert.match(consumer, /loadEpochConsumeAndDisposeCommitUnderStickyOperation: true/u);
  assert.match(host, /swallowedInnerHostVisualOrAudioReentryFailsClosed: true/u);
  assert.match(host, /epochConsumeAndDisposeCommitUnderStickyOperation: true/u);
  assert.match(consumer, /stateAndSnapshotReadsRejectedDuringOperation: true/u);
  assert.match(host, /stateAndSnapshotReadsRejectedDuringOperation: true/u);
});

test('P6.248 fails the generic HUD presentation host closed after swallowed child reentry', () => {
  const host = modeHudPresentationHostSource();
  assert.match(host, /#reentrySequence = 0/u);
  assert.doesNotMatch(host, /#reentryAttempted/u);
  assert.match(host, /#reentryError: Error \| null = null/u);
  assert.match(host, /#operationFailure: unknown = null/u);
  assert.match(
    host,
    /#assertUsable\(operation: string\): void \{\s*this\.#assertNoOperation\(operation\);/u,
  );
  assert.match(
    host,
    /get state\(\): ArenaV2ModeHudPresentationHostStateV1 \{\s*this\.#assertNoOperation/u,
  );
  const failure = section(host, '  #closeFailed(error: unknown): never {', '\n\n  #cleanupChildren');
  assert.ok(failure.indexOf('this.#state =') < failure.indexOf('this.#cleanupChildren()'));
  const dispose = section(host, '  dispose(): void {', '\n  }\n}\n\nexport const');
  assert.ok(dispose.indexOf('#assertNoOperation') < dispose.indexOf('STATE_V1.DISPOSED'));
  assert.match(host, /swallowedChildConsumerOrExternalEffectReentryFailsClosed: true/u);
  assert.match(host, /epochConsumeAndDisposeCommitUnderStickyOperation: true/u);
  assert.match(host, /stateAndSnapshotReadsRejectedDuringOperation: true/u);
  assert.match(host, /idempotentDisposeChecksReentryBeforeFastPath: true/u);
  assert.match(host, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(host, /childCallbacksCheckedBeforeCrossChildProgressOrHostCommit: true/u);
  assert.match(host, /swallowedChildCleanupReentryRetainsCurrentAndLaterOwners: true/u);
});

test('P6.329-P6.330 upgrades Information DOM and Canvas to monotonic sticky commits', () => {
  const dom = informationDomSurfaceSource();
  const canvas = informationCanvasSurfaceSource();
  for (const surface of [dom, canvas]) {
    assert.match(surface, /#reentrySequence = 0/u);
    assert.match(surface, /#reentryError: Error \| null = null/u);
    assert.doesNotMatch(surface, /#reentryAttempted|#operationFailure/u);
    assert.match(surface, /#runSynchronousOperation<T>/u);
    assert.match(surface, /#assertCurrentOperationCommit\(\): void/u);
    const dispose = section(surface, '  dispose(): void {', '\n  }\n}\n\nexport const');
    assert.ok(dispose.indexOf('#assertNoOperation') < dispose.indexOf('STATE_CANDIDATE_V1.DISPOSED'));
    assert.match(surface, /publicOperationsCommitUnderStickyOperation: true/u);
    assert.match(surface, /idempotentCleanupAndDisposeCheckReentryBeforeFastPath: true/u);
    assert.match(surface, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  }
  assert.match(dom, /swallowedPlatformOrObserverReentryFailsClosed: true/u);
  assert.match(canvas, /swallowedCanvasDomOrObserverReentryFailsClosed: true/u);
  assert.match(dom, /platformCallbacksCheckedBeforeSurfaceCommit: true/u);
  assert.match(dom, /cleanupReentryRetainsCurrentAndLaterDomOwners: true/u);
  assert.match(canvas, /canvasAndDomCallbacksCheckedBeforeSurfaceCommit: true/u);
  assert.match(canvas, /cleanupReentryRetainsCurrentAndLaterCanvasOwners: true/u);
  const domUnbind = section(dom, '    return () => {', '\n    };',);
  const canvasUnbind = section(canvas, '    return () => {', '\n    };');
  assert.ok(domUnbind.indexOf('#assertNoOperation') < domUnbind.indexOf('if (!active) return'));
  assert.ok(canvasUnbind.indexOf('#assertNoOperation') < canvasUnbind.indexOf('if (!active) return'));
});

test('P6.250 commits Information DOM and Canvas events before invoking callbacks', () => {
  const dom = informationDomSurfaceSource();
  const canvas = informationCanvasSurfaceSource();
  for (const surface of [dom, canvas]) {
    assert.match(surface, /#runEventOperation<T>/u);
    assert.ok((surface.match(/this\.#runEventOperation\(/gu) ?? []).length >= 6);
    assert.match(surface, /#releasingPointerCapture = false/u);
    assert.match(surface, /if \(this\.#releasingPointerCapture\) return/u);
    assert.match(surface, /pointerKeyboardWheelAndVisibilityEventsCommitUnderStickyOperation: true/u);
    const pointerUp = section(
      surface,
      '  readonly #handlePointerUp =',
      '\n\n  readonly #handleKeyDown =',
    );
    assert.ok(pointerUp.indexOf('#runEventOperation') < pointerUp.indexOf('#dispatch(intentId)'));
  }
  assert.match(dom, /intentAndScrollObserversRunAfterSurfaceOperationCommit: true/u);
  assert.match(canvas, /intentCallbacksRunAfterSurfaceOperationCommit: true/u);
});

test('P6.251 fails persistent Registry publication closed after swallowed port reentry', () => {
  const value = persistentRegistryPublicationPortSource();
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /this\.#reentrySequence \+= 1/u);
  assert.match(value, /#assertNoReentrySince\(/u);
  assert.match(value, /#runExternalOperation<T>/u);
  assert.match(value, /swallowedStorageOrLeaseReentryFailsClosed: true/u);
  assert.match(value, /storageAndLeaseCallbacksCheckedByReentrySequence: true/u);
  assert.match(value, /publicReadsRejectedDuringTransition: true/u);
  assert.match(value, /idempotentDestroyChecksReentryBeforeFastPath: true/u);
  assert.ok((value.match(/this\.#runExternalOperation\(/gu) ?? []).length >= 10);

  for (const method of [
    '  read():',
    '  readHead():',
    '  readEnvelope():',
    '  readActive():',
    '  readActiveHead():',
    '  readUnactivatedPending():',
  ]) {
    const body = section(value, method, '\n  }');
    assert.match(body, /this\.#notTransitioning\(\)/u);
  }
  const snapshot = section(value, '  snapshot():', '\n  destroy():');
  assert.match(snapshot, /this\.#notTransitioning\(\)/u);

  const open = section(value, '  open():', '\n  #readCurrent():');
  assert.ok(
    open.indexOf('leaseAcquired = this.#requireLease().acquire()')
      < open.indexOf("this.#assertNoReentrySince(acquireReentrySequence, '租约获取')"),
    'lease ownership must be retained before swallowed acquire reentry is rejected',
  );
  assert.match(open, /打开失败租约释放/u);
  assert.doesNotMatch(open, /return this\.read\(\)/u);

  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(destroy.indexOf('#notTransitioning') < destroy.indexOf("#state === 'destroyed'"));
  assert.ok(destroy.indexOf("this.#state = 'failed'") < destroy.indexOf("'销毁'"));
});

test('P6.252 closes swallowed reentry across Registry publication Owner and Host', () => {
  const owner = singleWeaponRegistryPublicationOwnerSource();
  assert.match(owner, /#reentrySequence = 0/u);
  assert.match(owner, /#runPortOperation<T>/u);
  assert.match(owner, /swallowedPortReentryFailsClosed: true/u);
  assert.match(owner, /portCallbacksCheckedByReentrySequence: true/u);
  assert.match(owner, /snapshotRejectedDuringTransition: true/u);
  assert.match(owner, /if \(this\.#state === 'failed'\) throw error/u);
  const ownerSnapshot = section(owner, '  snapshot():', '\n  }\n\n  destroy():');
  assert.match(ownerSnapshot, /this\.#notTransitioning\(\)/u);
  for (const method of ['  publish():', '  rollback():']) {
    const body = section(owner, method, '\n  }');
    assert.match(body, /this\.#beginTransition\(\)/u);
    assert.match(body, /this\.#endTransition\(\)/u);
    assert.doesNotMatch(body, /return this\.snapshot\(\)/u);
  }

  const host = singleWeaponPersistentRegistrationHostSource();
  assert.match(host, /#reentryAttempted = false/u);
  assert.match(host, /#reentryError: Error \| null = null/u);
  assert.match(host, /swallowedChildReentryFailsClosed: true/u);
  assert.match(host, /publicationActivationAndDestroyCommitUnderStickyTransition: true/u);
  assert.match(host, /snapshotRejectedDuringTransition: true/u);
  assert.match(host, /idempotentDestroyChecksReentryBeforeFastPath: true/u);
  assert.ok((host.match(/this\.#transition\(\(\) =>/gu) ?? []).length >= 6);
  assert.match(host, /this\.#state = 'failed'[\s\S]*this\.#transitioning = false/u);
  const hostSnapshot = section(host, '  snapshot():', '\n  }\n\n  destroy():');
  assert.match(hostSnapshot, /this\.#notTransitioning\(\)/u);
  const hostDestroy = section(host, '  destroy():', '\n  }\n}');
  assert.ok(hostDestroy.indexOf('#notTransitioning') < hostDestroy.indexOf("#state === 'destroyed'"));
});

test('P6.253 preserves exact Registry promotion watermarks across swallowed child reentry', () => {
  const value = singleWeaponRegistryPromotionCoordinatorSource();
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.match(value, /#runChildOperation<T>/u);
  assert.match(value, /swallowedChildReentryCannotPublishPromoted: true/u);
  assert.match(value, /childCallsCheckedByReentrySequence: true/u);
  assert.match(value, /promotionWatermarksCommittedBeforeReentryCheck: true/u);
  assert.match(value, /snapshotRejectedDuringTransition: true/u);
  assert.match(value, /failedCoordinatorRejectsRegistryRead: true/u);
  assert.ok((value.match(/this\.#runChildOperation\(/gu) ?? []).length >= 10);

  const childOperation = section(value, '  #runChildOperation<T>(', '\n  #endTransition():');
  assert.ok(
    childOperation.indexOf('onCommitted?.(result)')
      < childOperation.indexOf('this.#assertNoReentrySince(reentrySequence, operation)'),
    'durable child watermark must be retained before swallowed reentry is rejected',
  );
  const promotion = section(value, '  publishAndPromote():', '\n  retryReferenceAfterActivation():');
  assert.match(promotion, /let durableActivated = false/u);
  assert.match(promotion, /let referencePromoted = false/u);
  assert.match(promotion, /let publicationSealed = false/u);
  assert.match(promotion, /this\.#state = 'activated-reference-stale'/u);
  assert.match(promotion, /this\.#state = 'reference-promoted-unsealed'/u);
  assert.match(promotion, /if \(publicationSealed\)[\s\S]*this\.#state = 'failed'/u);

  const snapshot = section(value, '  snapshot():', '\n  }\n\n  destroy():');
  assert.match(snapshot, /this\.#notTransitioning\(\)/u);
  const destroy = section(value, '  destroy():', '\n  }\n}');
  assert.ok(destroy.indexOf('#notTransitioning') < destroy.indexOf("#state === 'destroyed'"));
});

test('P6.254 fails the first-weapon Initialization Owner closed on parent-level reentry', () => {
  const value = firstWeaponRegistryInitializationOwnerSource();
  assert.match(value, /#operation: InitializationOperation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.match(value, /#failed = false/u);
  assert.match(value, /swallowedCoordinatorReentryFailsOwnerClosed: true/u);
  assert.match(value, /coordinatorResultCommittedBeforeReentryCheck: true/u);
  assert.match(value, /snapshotAndRegistryReadRejectedDuringOperation: true/u);
  assert.match(value, /failedOwnerCannotClaimDurableRegistryPlayable: true/u);
  assert.match(value, /idempotentDestroyChecksReentryBeforeFastPath: true/u);

  const operation = section(value, '  #runCoordinatorOperation<T>(', '\n  initialize():');
  assert.ok(
    operation.indexOf('onCommitted?.(result)')
      < operation.indexOf('this.#assertNoReentrySince(reentrySequence, operation)'),
    'the Coordinator watermark must be retained before parent reentry is rejected',
  );
  assert.match(value, /durableRegistryPlayable: !this\.#failed/u);
  const snapshot = section(value, '  snapshot():', '\n  }\n\n  destroy():');
  assert.match(snapshot, /this\.#assertNoOperation\(\)/u);
  const destroy = section(value, '  destroy():', '\n  }\n}');
  assert.ok(destroy.indexOf('#assertNoOperation') < destroy.indexOf('if (this.#destroyed)'));
  assert.match(destroy, /#runCoordinatorOperation\([\s\S]*'destroy'/u);
});

test('P6.255 preserves first-weapon Provisioning ownership across swallowed child reentry', () => {
  const value = firstWeaponRegistryProvisioningOwnerSource();
  assert.match(value, /#operation: ProvisioningOperation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.match(value, /#failedByReentry = false/u);
  assert.match(value, /swallowedChildReentryFailsProvisioningClosed: true/u);
  assert.match(value, /childOwnershipCommittedBeforeReentryCheck: true/u);
  assert.match(value, /postInitializationReentryUsesRuntimeBootstrapRecovery: true/u);
  assert.match(value, /snapshotRejectedDuringOperation: true/u);
  assert.match(value, /idempotentDestroyChecksReentryBeforeFastPath: true/u);
  assert.doesNotMatch(value, /#transitioning|#reentryAttempted/u);

  const childOperation = section(value, '  #runChildOperation<T>(', '\n  #requireInitializationOwner():');
  assert.ok(
    childOperation.indexOf('onCommitted?.(result)')
      < childOperation.indexOf('this.#assertNoReentrySince(reentrySequence, operation, reentryState)'),
    'child ownership must be committed before swallowed reentry is rejected',
  );

  const openBootstrap = section(value, '  #openRuntimeBootstrap(): void {', '\n  prepareRuntimeBootstrap():');
  assert.match(openBootstrap, /\(created\) => \{ bootstrap = created; \}/u);
  assert.match(openBootstrap, /Runtime Bootstrap active读取/u);
  assert.match(openBootstrap, /失败Runtime Bootstrap清理/u);
  assert.ok((openBootstrap.match(/'runtime-bootstrap-failed'/gu) ?? []).length >= 3);

  const prepareBootstrap = section(
    value,
    '  prepareRuntimeBootstrap():',
    '\n  retryRuntimeBootstrap():',
  );
  assert.match(prepareBootstrap, /this\.#runOperation\('prepare-bootstrap'/u);
  assert.match(
    prepareBootstrap,
    /已晋级初始化Owner释放[\s\S]*this\.#initializationOwner = null[\s\S]*'runtime-bootstrap-failed'/u,
  );

  const snapshot = section(value, '  snapshot():', '\n  #snapshot():');
  assert.match(snapshot, /this\.#assertNoOperation\(\)/u);
  const destroy = section(value, '  destroy():', '\n  }\n}');
  assert.ok(destroy.indexOf('#assertNoOperation') < destroy.indexOf('if (this.#destroyed)'));
  assert.match(destroy, /this\.#runOperation\('destroy'/u);
  assert.ok((destroy.match(/this\.#runChildOperation\(/gu) ?? []).length >= 2);
});

test('P6.256 closes Registry-backed local play around exact promotion recovery', () => {
  const value = registryOwnerSource();
  assert.match(value, /#operation: RegistryBackedLocalPlayableOperation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.match(value, /#failedByReentry = false/u);
  assert.match(value, /swallowedChildReentryFailsLocalOwnerClosed: true/u);
  assert.match(value, /childCallsCheckedByReentrySequence: true/u);
  assert.match(value, /promotionWatermarksCommittedBeforeReentryCheck: true/u);
  assert.match(value, /failedOwnerAllowsExactPromotionRecoveryOnly: true/u);
  assert.match(value, /snapshotAndReadsRejectedDuringOperation: true/u);
  assert.match(value, /idempotentDestroyChecksReentryBeforeFastPath: true/u);
  assert.doesNotMatch(value, /#destroying/u);

  const childOperation = section(value, '  #runChildOperation<T>(', '\n  get localPlayable():');
  assert.ok(
    childOperation.indexOf('onCommitted?.(result)')
      < childOperation.indexOf('this.#assertNoReentrySince(reentrySequence, operation)'),
    'local owner child ownership must commit before swallowed reentry is rejected',
  );
  const begin = section(
    value,
    '  #beginSingleWeaponPromotionFromConfiguration(',
    '\n  beginSingleWeaponPromotionFromAssessment(',
  );
  assert.match(begin, /单把晋级Coordinator构造/u);
  assert.ok(
    begin.indexOf('this.#promotionCoordinator = coordinator')
      < begin.indexOf('this.#pendingPromotionBase = Object.freeze'),
  );

  for (const method of ['  readRegistry() {', '  readRegistryHead() {']) {
    const body = section(value, method, '\n  }');
    assert.match(body, /this\.#runOperation\(/u);
    assert.match(body, /this\.#runChildOperation\(/u);
  }
  const publish = section(value, '  publishAndPromoteSingleWeapon():', '\n  retrySingleWeaponReferenceAfterActivation():');
  assert.match(publish, /this\.#runChildOperation\([\s\S]*this\.#captureCompletedPromotion\(\)/u);
  const close = section(value, '  closeSingleWeaponPromotion():', '\n  snapshot():');
  assert.match(close, /allowFailed: true/u);
  assert.ok(
    close.indexOf('this.#runChildOperation(')
      < close.indexOf('this.#failedByReentry = false'),
  );

  const snapshot = section(value, '  snapshot():', '\n  #snapshot():');
  assert.match(snapshot, /this\.#assertNoOperation\(\)/u);
  const destroy = section(value, '  destroy():', '\n  }\n}');
  assert.ok(destroy.indexOf('#assertNoOperation') < destroy.indexOf('if (this.#destroyed)'));
  assert.match(destroy, /allowFailed: true, allowPartial: true/u);
  assert.ok((destroy.match(/this\.#runChildOperation\(/gu) ?? []).length >= 3);
});

test('P6.257 fails the three-mode Playable Host closed after swallowed child reentry', () => {
  const value = localPlayableSource();
  const playable = section(
    value,
    'export class ArenaThreeModeAuthoritativePlayableHostCandidateV1',
    '\nexport function createArenaThreeModeAuthoritativePlayableHostCandidateV1',
  );
  assert.match(value, /playableHostSwallowedChildReentryFailsClosed: true/u);
  assert.match(value, /playableHostReentryFailureCleansOwnedResources: true/u);
  assert.match(value, /playableHostDestroyFastPathChecksOperationFirst: true/u);
  assert.match(playable, /#reentrySequence = 0/u);
  assert.match(playable, /#reentryError: Error \| null = null/u);
  assert.match(playable, /this\.#reentrySequence \+= 1/u);

  const run = section(playable, '  #runOperation<T>(', '\n  #ensureHud():');
  assert.match(run, /const reentrySequence = this\.#reentrySequence/u);
  assert.ok((run.match(/this\.#failSwallowedReentry\(/gu) ?? []).length >= 2);
  const fail = section(playable, '  #failSwallowedReentry(', '\n  #runOperation<T>(');
  assert.ok(
    fail.indexOf('this.#cleanupStarted = true')
      < fail.indexOf('this.#cleanupOwnedResources()'),
  );
  assert.match(fail, /this\.#failed = true/u);
  assert.match(fail, /this\.#destroyed = this\.#cleanupComplete\(\)/u);

  const destroy = section(playable, '  destroy(): void {', '\n  }\n}');
  assert.ok(destroy.indexOf("this.#assertNoOperation('destroy')")
    < destroy.indexOf('if (this.#destroyed && this.#hud === null) return'));
});

test('P6.258 closes the local three-mode Host while retaining cleanup ownership', () => {
  const value = localPlayableSource();
  const local = section(
    value,
    'export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
    '\nexport function createArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  );
  assert.match(value, /localPlayableHostSwallowedChildReentryFailsClosed: true/u);
  assert.match(value, /localPlayableHostReentryFailureRetainsCleanupOwnership: true/u);
  assert.match(value, /localPlayableHostPublicReadsRejectDuringOperation: true/u);
  assert.match(value, /localPlayableHostDestroyFastPathChecksOperationFirst: true/u);
  assert.match(local, /#reentrySequence = 0/u);
  assert.match(local, /#reentryError: Error \| null = null/u);
  assert.match(local, /#synchronousReentryFailure: Error \| null = null/u);
  assert.match(local, /this\.#reentrySequence \+= 1/u);

  const run = section(local, '  #runOperation<T>(', '\n  #ownedHost():');
  assert.match(run, /const reentrySequence = this\.#reentrySequence/u);
  assert.ok((run.match(/this\.#failSwallowedReentry\(/gu) ?? []).length >= 2);
  const fail = section(local, '  #failSwallowedReentry(', '\n  #runOperation<T>(');
  assert.match(fail, /this\.#synchronousReentryFailure = failure/u);
  assert.doesNotMatch(fail, /#playableHost = null|#profileOwner = null/u);

  const readHost = section(local, '  #readHost():', '\n  #failIndeterminateMatchStart(');
  assert.ok(
    readHost.indexOf("this.#assertNoOperation('Arena three-mode local playable host读取')")
      < readHost.indexOf('return this.#ownedHost()'),
  );
  assert.match(local, /startupReadOnlyRecovery[\s\S]*this\.#ownedHost\(\)\.start/u);
  assert.match(local, /outcome = this\.#ownedHost\(\)\.settleMatch\(\)/u);
  assert.match(
    local,
    /getInformationCharacterPreviewLoadoutRead[\s\S]*#assertNoOperation\('getInformationCharacterPreviewLoadoutRead'\)/u,
  );
  assert.match(
    local,
    /getInformationLoadingProjection[\s\S]*#assertNoOperation\('getInformationLoadingProjection'\)/u,
  );

  const destroy = section(local, '  destroy(): void {', '\n  }\n}');
  assert.ok(destroy.indexOf("this.#assertNoOperation('destroy')")
    < destroy.indexOf('if (this.#destroyed) return'));
  const cleanup = section(local, '  #destroyOwnedResources(): void {', '\n  destroy(): void {');
  assert.ok(cleanup.indexOf('this.#synchronousReentryFailure = null')
    > cleanup.indexOf('if (this.#destroyed)'));
});

test('P6.259 performs settlement failure cleanup without reentering public destroy', () => {
  const value = localPlayableSource();
  const local = section(
    value,
    'export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
    '\nexport function createArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  );
  assert.match(value, /localPlayableFailureCleanupUsesPrivateOwnedResourcePath: true/u);
  assert.match(value, /localPlayableFailureCleanupDoesNotReenterPublicDestroy: true/u);

  const fail = section(local, '  #failSettlementRecovery(', '\n  #handlePendingSettlementFailure(');
  assert.match(fail, /this\.#destroyOwnedResources\(\)/u);
  assert.doesNotMatch(fail, /this\.destroy\(\)/u);
  const cleanup = section(local, '  #destroyOwnedResources(): void {', '\n  destroy(): void {');
  assert.ok(cleanup.indexOf('this.#playableHost.destroy()')
    < cleanup.indexOf('this.#learningSettlementRecoveryOwner.destroy()'));
  assert.ok(cleanup.indexOf('this.#learningSettlementRecoveryOwner.destroy()')
    < cleanup.indexOf('this.#learningSettlementIntentJournal.destroy()'));
  assert.ok(cleanup.indexOf('this.#learningSettlementIntentJournal.destroy()')
    < cleanup.indexOf('this.#profileOwner.destroy()'));

  const destroy = section(local, '  destroy(): void {', '\n  }\n}');
  assert.match(destroy, /this\.#runOperation\('destroy', \(\) => this\.#destroyOwnedResources\(\)\)/u);
});

test('P6.260 rejects swallowed Information Host child reentry without losing cleanup watermarks', () => {
  const value = localPlayableSource();
  const information = section(
    value,
    'export class ArenaThreeModeAuthoritativeInformationHostCandidateV1',
    '\nexport function createArenaThreeModeAuthoritativeInformationHostCandidateV1',
  );
  assert.match(value, /swallowedChildDestroyReentryFailsCleanupCallClosed: true/u);
  assert.match(value, /destroyReentryCheckedBeforeIdempotentFastPath: true/u);
  assert.match(value, /destroyReentryDoesNotDiscardRetryOwnership: true/u);
  assert.match(information, /#destroyReentrySequence = 0/u);
  assert.match(information, /#destroyReentryError: Error \| null = null/u);
  assert.match(information, /this\.#destroyReentrySequence \+= 1/u);

  const destroy = section(information, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf('if (this.#destroying)')
      < destroy.indexOf('if (this.#destroyed) return'),
  );
  assert.ok((destroy.match(/this\.#captureSwallowedDestroyReentry\(/gu) ?? []).length >= 3);
  assert.ok(
    destroy.indexOf('this.#hostDestroyed = true')
      < destroy.indexOf('this.#captureSwallowedDestroyReentry('),
  );
  assert.match(
    destroy,
    /sessionFactory\.destroy\(\);[\s\S]*this\.#sessionFactory = null;[\s\S]*#captureSwallowedDestroyReentry/u,
  );
  assert.match(
    destroy,
    /bundleFactory\.destroy\(\);[\s\S]*this\.#bundleFactory = null;[\s\S]*#captureSwallowedDestroyReentry/u,
  );
  assert.ok(
    destroy.indexOf('this.#destroyed = this.#hostDestroyed')
      < destroy.indexOf('if (errors.length > 0)'),
  );
});

test('P6.331 makes Information Mode Session Host reentry monotonic across child owners', () => {
  const value = informationModeSessionHostSource();
  assert.match(value, /#operation: InformationModeSessionHostOperation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(value, /#transitioning|#reentryAttempted/u);
  assert.match(value, /allBusinessAndExternalReadsUseStickyOperationGuard: true/u);
  assert.match(value, /swallowedNavigationSessionOrProjectionReentryFailsClosed: true/u);
  assert.match(value, /publicStateAndSnapshotRejectOperationIntermediateState: true/u);
  assert.match(value, /destroyFastPathChecksOperationBeforeIdempotence: true/u);
  assert.match(value, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(value, /navigationSessionAndProjectionCallbacksCheckedBeforeHostCommit: true/u);
  assert.match(value, /cleanupReentryRetainsCurrentAndLaterSessionOwners: true/u);

  const runner = section(value, '  #runOperation<T>(', '\n  #destroySession():');
  assert.match(runner, /const reentrySequence = this\.#reentrySequence/u);
  assert.match(runner, /this\.#reentrySequence === reentrySequence/u);
  assert.match(runner, /this\.#state = 'failed'/u);
  assert.match(runner, /this\.#operation = null/u);

  for (const operation of [
    'start',
    'loading-ready',
    'open-declared-link',
    'open-bottom-navigation',
    'dispatch-primary-intent',
    'step-match',
    'pause-match',
    'resume-match',
    'settle-match',
    'snapshot-read',
    'input-context-read',
    'scene-frame-read',
    'destroy',
  ] as const) {
    assert.match(value, new RegExp(`this\\.#runOperation\\('${operation}'`, 'u'));
  }
  assert.match(value, /get state\(\)[\s\S]*this\.#assertNoOperation\('state-read'\)/u);
  assert.match(value, /snapshot: this\.#snapshot\(\)/u);
  assert.doesNotMatch(
    section(value, '  #informationOutcome(', '\n  start(value:'),
    /this\.getSnapshot\(\)/u,
  );

  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf("if (this.#state === 'destroyed') return"),
  );
});

test('P6.262 keeps HUD-ready lifecycle and projection reads in one sticky operation', () => {
  const value = hudReadyLearningModeSessionSource();
  assert.match(value, /#operation: HudReadyLearningModeSessionOperation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.match(value, /allLifecycleAndProjectionReadsUseStickyOperationGuard: true/u);
  assert.match(value, /swallowedChildOrProjectionReadReentryFailsClosed: true/u);
  assert.match(value, /destroyFastPathChecksOperationBeforeIdempotence: true/u);

  const runner = section(value, '  #runOperation<T>(', '\n  #failClosed(');
  assert.match(runner, /const reentrySequence = this\.#reentrySequence/u);
  assert.match(runner, /this\.#reentrySequence !== reentrySequence/u);
  assert.match(runner, /this\.#failClosed\(/u);
  assert.match(runner, /this\.#operation = null/u);
  const fail = section(value, '  #failClosed(', '\n  #failProjection(');
  assert.ok(
    fail.indexOf('this.#cleanupStarted = true')
      < fail.indexOf('this.#cleanupSession('),
  );
  assert.match(fail, /this\.#completeTerminalCleanup\(\)/u);
  assert.match(fail, /cleanupErrors\.push\(this\.#reentryError\)/u);

  for (const operation of [
    'start',
    'step',
    'pause',
    'resume',
    'settle',
    'snapshot-read',
    'projection-read',
    'destroy',
  ] as const) {
    assert.match(value, new RegExp(`this\\.#runOperation\\('${operation}'`, 'u'));
  }
  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('if (this.#destroyed && this.#session === null) return'),
  );
});

test('P6.263 closes settlement and cross-child reads in the Learning Mode Session Bridge', () => {
  const value = learningModeSessionBridgeSource();
  assert.match(value, /#operation: LearningModeSessionBridgeOperation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(value, /#transitioning/u);
  assert.match(value, /allLifecycleSettlementAndSnapshotReadsUseStickyOperationGuard: true/u);
  assert.match(value, /operationGuardPrecedesBusinessStateValidation: true/u);
  assert.match(value, /swallowedSessionHandoffOrIntentPublisherReentryFailsClosed: true/u);
  assert.match(value, /destroyFastPathChecksOperationBeforeIdempotence: true/u);

  const begin = section(value, '  #beginOperation(', '\n  #runOperation<T>(');
  assert.ok(
    begin.indexOf('this.#assertNoOperation(operation)')
      < begin.indexOf('!allowed.includes(this.#state)'),
  );
  const snapshot = section(value, '  #snapshot():', '\n  getSnapshot():');
  assert.ok(
    snapshot.indexOf("this.#session.getSnapshot")
      < snapshot.indexOf("this.#assertReentryFree('Learning Mode Session Bridge session snapshot')"),
  );
  assert.ok(
    snapshot.indexOf("session snapshot')")
      < snapshot.indexOf('this.#learningHandoff.getSnapshot'),
  );
  const step = section(value, '  step(localInput: unknown):', '\n  pause():');
  assert.ok(
    step.indexOf("this.#assertReentryFree('Learning Mode Session Bridge session step')")
      < step.indexOf('this.#learningHandoff.appendEvents'),
  );
  assert.ok(
    step.indexOf("terminal Runtime evidence V1')")
      < step.indexOf('this.#learningHandoff.bindRuntimeTerminalEvidenceV2'),
  );
  const settle = section(value, '  settle():', '\n  destroy():');
  assert.ok(
    settle.indexOf("this.#assertReentryFree('Learning Mode Session Bridge settleReward')")
      < settle.indexOf("this.#state = 'learning-pending'"),
  );
  assert.match(settle, /snapshot: this\.#snapshot\(\)/u);

  for (const operation of [
    'snapshot-read', 'start', 'step', 'pause', 'resume', 'settle', 'destroy',
  ] as const) {
    assert.match(value, new RegExp(`this\\.#runOperation\\('${operation}'`, 'u'));
  }
  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf("if (this.#state === 'destroyed') return"),
  );
});

test('P6.264 keeps Match, Assembler, and Reward commits behind one product-session gate', () => {
  const value = modeProductSessionV2Source();
  assert.match(value, /#operation: ModeProductSessionV2Operation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(value, /#transitioning|#reentryAttempted|#assertState\(/u);
  assert.match(value, /operationGuardPrecedesBusinessStateValidation: true/u);
  assert.match(value, /matchAssemblerAndRewardCallsCheckedBeforeCrossOwnerProgress: true/u);
  assert.match(value, /publicStateAndSnapshotRejectOperationIntermediateState: true/u);
  assert.match(value, /swallowedMatchAssemblerOrRewardReentryFailsClosed: true/u);
  assert.match(value, /stickyReentryUsesSequenceAndFirstError: true/u);
  assert.match(value, /cleanupCallbacksCheckedBeforeOwnershipRelease: true/u);
  assert.match(value, /swallowedCleanupReentryStopsLaterOwners: true/u);
  assert.match(value, /destroyFastPathChecksOperationBeforeIdempotence: true/u);

  const begin = section(value, '  #beginOperation(', '\n  #runOperation<T>(');
  assert.ok(
    begin.indexOf('this.#assertNoOperation(operation)')
      < begin.indexOf('!allowed.includes(this.#state)'),
  );
  assert.match(value, /get state\(\)[\s\S]*this\.#assertNoOperation\('state-read'\)/u);
  assert.match(value, /getSnapshot\(\)[\s\S]*this\.#assertNoOperation\('snapshot-read'\)/u);
  const step = section(value, '  step(localInput: unknown):', '\n  pause():');
  assert.ok(
    step.indexOf("this.#assertReentryFree('ModeProductSessionV2 match step')")
      < step.indexOf('this.#assembler?.appendEvents(events)'),
  );
  assert.ok(
    step.indexOf("this.#assertReentryFree('ModeProductSessionV2 appendEvents')")
      < step.indexOf('this.#assembler?.finalize()'),
  );
  assert.match(step, /snapshot: this\.#snapshot\(\)/u);

  for (const operation of [
    'start',
    'step',
    'pause',
    'resume',
    'prepare-reward',
    'settle-reward',
    'terminal-replay-read',
    'terminal-runtime-evidence-read',
    'destroy',
  ] as const) {
    assert.match(value, new RegExp(`this\\.#runOperation\\('${operation}'`, 'u'));
  }
  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('if (this.#state === MODE_PRODUCT_SESSION_V2_STATE.DESTROYED) return'),
  );
  const cleanup = section(value, '  #cleanup(): Error[] {', '\n  #fail(error: unknown): never {');
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#assembler = null'),
  );
  assert.match(cleanup, /if \(this\.#reentrySequence !== reentrySequence\) return errors/u);
});

test('P6.265 keeps authoritative Runtime lifecycle and terminal reads behind one gate', () => {
  const value = modeAuthoritativeLocalMatchSessionV3Source();
  assert.match(
    value,
    /#operation: ModeAuthoritativeLocalMatchSessionV3Operation \| null = null/u,
  );
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(value, /#transitioning|#reentryAttempted|#assertState\(/u);
  assert.match(value, /operationGuardPrecedesBusinessStateValidation: true/u);
  assert.match(value, /runtimeLifecycleAndAuthorityReadsUseStickyOperationGuard: true/u);
  assert.match(value, /publicStateAndReadFrameRejectOperationIntermediateState: true/u);
  assert.match(value, /swallowedRuntimeOrAuthorityReadReentryFailsClosed: true/u);
  assert.match(value, /stickyReentryUsesSequenceAndFirstError: true/u);
  assert.match(value, /runtimeCleanupCheckedBeforeOwnershipRelease: true/u);
  assert.match(value, /swallowedCleanupReentryRetainsRuntimeOwner: true/u);
  assert.match(value, /destroyFastPathChecksOperationBeforeIdempotence: true/u);

  const begin = section(value, '  #beginOperation(', '\n  #runOperation<T>(');
  assert.ok(
    begin.indexOf('this.#assertNoOperation(operation)')
      < begin.indexOf('!allowed.includes(this.#state)'),
  );
  assert.match(value, /get state\(\)[\s\S]*this\.#assertNoOperation\('state-read'\)/u);
  assert.match(value, /get readFrame\(\)[\s\S]*this\.#assertNoOperation\('read-frame-read'\)/u);

  for (const operation of [
    'start',
    'step',
    'pause',
    'resume',
    'mode-driver-content-hash-read',
    'terminal-authority-identity-read',
    'terminal-replay-read',
    'terminal-runtime-evidence-read',
    'destroy',
  ] as const) {
    assert.match(value, new RegExp(`this\\.#runOperation\\('${operation}'`, 'u'));
  }
  const step = section(value, '  step(localInput: unknown):', '\n  pause():');
  assert.ok(
    step.indexOf("this.#runtime.step(normalizedLocal)")
      < step.indexOf("this.#assertReentryFree('ModeAuthoritativeLocalMatchSessionV3 step')"),
  );
  assert.ok(
    step.indexOf("this.#assertReentryFree('ModeAuthoritativeLocalMatchSessionV3 step')")
      < step.indexOf('this.#readFrame = outcome.readFrame'),
  );
  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('this.#state === MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.DESTROYED'),
  );
  const cleanup = section(value, '  #cleanup(): readonly Error[] {', '\n  #fail(error: unknown): never {');
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#runtime = null'),
  );
});

test('P6.266 keeps Rule/Core ownership and authoritative exports behind one Runtime gate', () => {
  const value = modeMatchRuntimeV6Source();
  assert.match(value, /#operation: ModeMatchRuntimeV6Operation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(value, /#transitioning|#reentryAttempted/u);
  assert.match(value, /operationGuardPrecedesBusinessStateValidation: true/u);
  assert.match(value, /authorityAndModeDriverCallsCheckedBeforeCrossOwnerProgress: true/u);
  assert.match(
    value,
    /publicStateCheckpointAndTerminalReadsRejectOperationIntermediateState: true/u,
  );
  assert.match(value, /swallowedAuthorityOrModeDriverReentryFailsClosed: true/u);
  assert.match(value, /stickyReentryUsesSequenceAndFirstError: true/u);
  assert.match(value, /cleanupCallbacksCheckedBeforeOwnershipRelease: true/u);
  assert.match(value, /swallowedCleanupReentryStopsLaterOwners: true/u);
  assert.match(value, /destroyFastPathChecksOperationBeforeIdempotence: true/u);

  const cleanup = section(value, '  #cleanup(): readonly Error[] {', '\n  #clearCommittedRecords(): void {');
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#driver = null'),
  );
  assert.match(cleanup, /if \(this\.#reentrySequence !== reentrySequence\) return Object\.freeze\(errors\)/u);

  const begin = section(value, '  #beginOperation(', '\n  #runOperation<T>(');
  assert.ok(
    begin.indexOf('this.#assertNoOperation(operation)')
      < begin.indexOf('this.#assertState(...allowed)'),
  );
  assert.match(value, /get state\(\)[\s\S]*this\.#assertNoOperation\('state-read'\)/u);
  assert.match(value, /get readFrame\(\)[\s\S]*this\.#assertNoOperation\('read-frame-read'\)/u);

  const start = section(value, '  start(): ModeMatchRuntimeV6StartOutcome {', '\n  step(');
  assert.ok(
    start.indexOf("this.#assertReentryFree('ModeMatchRuntimeV6 authority start')")
      < start.indexOf('const initial = driver.start('),
  );
  const step = section(value, '  step(inputValue: unknown):', '\n  pause():');
  assert.ok(
    step.indexOf("this.#assertReentryFree('ModeMatchRuntimeV6 authority mode resolver入口')")
      < step.indexOf('resolution = driver.step(facts, tick)'),
  );
  assert.ok(
    step.indexOf("this.#assertReentryFree('ModeMatchRuntimeV6 authority step')")
      < step.indexOf('this.#events.push(event)'),
  );
  const pause = section(value, '  pause(): void {', '\n  resume():');
  assert.ok(
    pause.indexOf("this.#assertReentryFree('ModeMatchRuntimeV6 authority pause')")
      < pause.indexOf('driver.pause()'),
  );

  for (const operation of [
    'restore',
    'start',
    'step',
    'pause',
    'resume',
    'runtime-checkpoint-v1-read',
    'runtime-checkpoint-v2-read',
    'runtime-checkpoint-v3-read',
    'mode-checkpoint-read',
    'mode-checkpoints-read',
    'terminal-replay-read',
    'terminal-evidence-read',
    'destroy',
  ] as const) {
    assert.match(value, new RegExp(`this\\.#runOperation\\('${operation}'`, 'u'));
  }
  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('this.#state === MODE_MATCH_RUNTIME_V6_STATE.DESTROYED'),
  );
});

test('P6.267 stops Quick Match construction before the next external owner after reentry', () => {
  const value = modeAuthoritativeQuickMatchServiceV3Source();
  assert.match(value, /#operation: 'create' \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(value, /#creating/u);
  assert.match(value, /createGuardPrecedesRequestValidation: true/u);
  assert.match(value, /seedRosterContentAndRuntimePortsCheckedBeforeNextOwner: true/u);
  assert.match(value, /createdSessionRetainsCleanupOwnershipUntilSafeReturn: true/u);
  assert.match(value, /swallowedPortOrCleanupReentryRejectsCreate: true/u);

  const create = section(
    value,
    '  create(value: unknown): DeepReadonly<ModeAuthoritativeQuickMatchV3> {',
    '\n  }\n}',
  );
  assert.ok(
    create.indexOf("this.#assertNoOperation('create')")
      < create.indexOf("this.#operation = 'create'"),
  );
  assert.ok(
    create.indexOf("this.#operation = 'create'")
      < create.indexOf('const source = assertPlainRecord('),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 seedSource')")
      < create.indexOf('this.#createRoster('),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 rosterProvider')")
      < create.indexOf('this.#createContent('),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 contentProvider')")
      < create.indexOf('runtime = this.#createRuntime('),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 runtimeFactory')")
      < create.indexOf('session = new ModeAuthoritativeLocalMatchSessionV3({'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 result publication')")
      < create.indexOf('session = null'),
  );
  assert.ok(
    create.indexOf('destroyRuntime(session, cleanupErrors)')
      < create.indexOf('destroyRuntime(runtime, cleanupErrors)'),
  );
});

test('P6.268 keeps Quick Match Bundle ownership until publication and cleanup commits', () => {
  const value = quickMatchBundleFactorySource();
  assert.match(value, /#operation: QuickMatchBundleFactoryOperation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(value, /#transitioning/u);
  assert.match(value, /operationGuardPrecedesStateAndRequestValidation: true/u);
  assert.match(value, /quickMatchParticipantAndAdmissionPortsCheckedBeforeTransfer: true/u);
  assert.match(value, /sessionOwnershipRetainedUntilBundlePublicationCommits: true/u);
  assert.match(value, /successfulPendingCleanupWatermarkPrecedesReentryRejection: true/u);
  assert.match(value, /stickyReentryUsesSequenceAndFirstError: true/u);

  const create = section(
    value,
    '  createMatchBundle(value: unknown): ArenaV2ModeLearningMatchBundleCandidateV1 {',
    '\n  destroy(): void {',
  );
  assert.ok(
    create.indexOf("this.#beginOperation('create-match-bundle')")
      < create.indexOf('if (this.#destroyed)'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Quick Match Bundle Factory request validation')")
      < create.indexOf('this.#createQuickMatch'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Quick Match Bundle Factory quickMatch owner capture')")
      < create.indexOf("dataMethod(session, 'destroy'"),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Quick Match Bundle Factory publicParticipantProvider')")
      < create.indexOf('createProductPublicMatchInfoV2({'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Quick Match Bundle Factory authority admission')")
      < create.indexOf('const bundle = Object.freeze({'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Quick Match Bundle Factory bundle publication')")
      < create.indexOf('ownedSession = null'),
  );

  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('if (this.#destroyed && this.#pendingCleanup === null) return'),
  );
  assert.ok(
    destroy.indexOf('this.#pendingCleanup = null')
      < destroy.indexOf("this.#assertReentryFree('Quick Match Bundle Factory pending cleanup')"),
  );
  assert.ok(
    destroy.indexOf('this.#destroyed = true')
      < destroy.indexOf("this.#assertReentryFree('Quick Match Bundle Factory pending cleanup')"),
  );
});

test('P6.269 keeps Learning Session child ownership until each construction stage commits', () => {
  const value = modeLearningSessionFactorySource();
  assert.match(value, /#operation: ModeLearningSessionFactoryOperation \| null = null/u);
  assert.match(value, /#reentrySequence = 0/u);
  assert.match(value, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(value, /#transitioning/u);
  assert.match(value, /operationGuardPrecedesStateAndRequestValidation: true/u);
  assert.match(value, /childOwnershipTransfersCheckedBeforeNextConstructionStage: true/u);
  assert.match(value, /swallowedCleanupReentryRetainsAllUnprocessedOwners: true/u);
  assert.match(value, /successfulCleanupWatermarkPrecedesReentryRejection: true/u);

  const create = section(
    value,
    '  createSession(value: unknown): ArenaV2HudReadyLearningModeSessionCandidateV1 {',
    '\n  destroy(): void {',
  );
  assert.ok(
    create.indexOf("this.#beginOperation('create-session')")
      < create.indexOf('if (this.#destroyed)'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Mode Learning Session Factory request validation')")
      < create.indexOf('this.#createMatchBundle'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Mode Learning Session Factory match bundle owner capture')")
      < create.indexOf("method(matchSession, 'destroy'"),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Mode Learning Session Factory authority admission')")
      < create.indexOf('modeSession = createModeProductSessionCompositionV2({'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Mode Learning Session Factory mode session composition')")
      < create.indexOf('learningHandoff = new ArenaV2LearningTerminalHandoffCandidateV1({'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Mode Learning Session Factory learning handoff construction')")
      < create.indexOf('bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Mode Learning Session Factory bridge construction')")
      < create.indexOf('result = new ArenaV2HudReadyLearningModeSessionCandidateV1({'),
  );
  assert.ok(
    create.indexOf("this.#assertReentryFree('Mode Learning Session Factory session publication')")
      < create.indexOf('result = null'),
  );
  assert.match(create, /for \(const remaining of cleanupCandidates\.slice\(index \+ 1\)\)/u);
  assert.match(create, /this\.#retainCleanupResource\(remaining\.target, remaining\.name\)/u);

  const destroy = section(value, '  destroy(): void {', '\n  }\n}');
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
  assert.ok(
    value.indexOf('this.#pendingCleanupResources = [')
      < value.indexOf('if (this.#reentryAttempted)'),
  );
  assert.ok(
    destroy.indexOf('this.#destroyed = true')
      < destroy.indexOf("this.#assertReentryFree('Mode Learning Session Factory destroy publication')"),
  );
});

test('P5.3zzzvv requires explicit supply facts across Runtime, Session and HUD', () => {
  const runtime = modeMatchRuntimeV6Source();
  const localSession = modeAuthoritativeLocalMatchSessionV3Source();
  const productSession = modeProductSessionV2Source();
  const bridge = learningModeSessionBridgeSource();
  const value = hudReadyLearningModeSessionSource();
  assert.match(runtime, /explicitSupplyFactsRequiredEveryCommittedStep: true/u);
  assert.match(runtime, /const STEP_REQUIRED_KEYS = new Set\([\s\S]*?'supplyFacts'/u);
  assert.doesNotMatch(runtime, /supplyFacts: Object\.hasOwn\(source, 'supplyFacts'\)/u);
  assert.match(localSession, /const STEP_REQUIRED_KEYS = new Set\(\[\s*'events', 'supplyFacts',/u);
  assert.doesNotMatch(localSession, /const supplyFacts = Object\.hasOwn\(source, 'supplyFacts'\)/u);
  assert.match(productSession, /const REQUIRED_STEP_KEYS = new Set\(\[\s*'events', 'supplyFacts',/u);
  assert.match(bridge, /const MATCH_STEP_REQUIRED_KEYS = new Set\(\[\s*'events', 'supplyFacts',/u);
  assert.match(value, /requiresExplicitSupplyFactsEveryStep: true/u);
  assert.match(
    value,
    /const MATCH_STEP_REQUIRED_KEYS = new Set\(\[\s*'events', 'supplyFacts',/u,
  );
  assert.doesNotMatch(
    value,
    /Object\.hasOwn\(matchStep, 'supplyFacts'\)[\s\S]*?Object\.freeze\(\[\]\)/u,
  );
  const step = section(value, '  step(localInput: unknown): unknown {', '\n  pause(): void {');
  assert.ok(
    step.indexOf('MATCH_STEP_REQUIRED_KEYS')
      < step.indexOf('this.#presentationProjection = projection('),
  );
  assert.match(
    step,
    /field\(matchStep, 'supplyFacts', 'HUD-ready Learning Mode Session matchStep'\)/u,
  );
});

test('P5.3zzzvw requires audited frame and supply cadence before any formal consumer', () => {
  const localSession = modeAuthoritativeLocalMatchSessionV3Source();
  const productSession = modeProductSessionV2Source();
  const bridge = learningModeSessionBridgeSource();
  const value = hudReadyLearningModeSessionSource();
  assert.match(
    localSession,
    /const STEP_REQUIRED_KEYS = new Set\(\[[\s\S]*?'supplyCadence'[\s\S]*?'readFrameAudit'/u,
  );
  assert.match(productSession, /requiresExplicitPresentationAuditEveryStep: true/u);
  assert.match(productSession, /requiresExplicitSupplyCadenceEveryStep: true/u);
  assert.match(productSession, /requiredStepFieldsValidatedBeforeAssembler: true/u);
  assert.match(
    productSession,
    /function requireKeys\([\s\S]*?for \(const key of keys\) ownDataField\(value, key, name\);/u,
  );
  assert.match(
    productSession,
    /const REQUIRED_STEP_KEYS = new Set\(\[[\s\S]*?'supplyCadence'[\s\S]*?'readFrameAudit'/u,
  );
  assert.match(bridge, /requiresExplicitPresentationAuditEveryStep: true/u);
  assert.match(bridge, /requiresExplicitSupplyCadenceEveryStep: true/u);
  assert.match(
    bridge,
    /const MATCH_STEP_REQUIRED_KEYS = new Set\(\[[\s\S]*?'supplyCadence'[\s\S]*?'readFrameAudit'/u,
  );
  assert.match(value, /requiresExplicitAuthorityAuditEveryStep: true/u);
  assert.match(value, /requiresExplicitSupplyCadenceEveryStep: true/u);
  assert.match(
    value,
    /const MATCH_STEP_REQUIRED_KEYS = new Set\(\[[\s\S]*?'supplyCadence'[\s\S]*?'readFrameAudit'/u,
  );
  const step = section(value, '  step(localInput: unknown): unknown {', '\n  pause(): void {');
  assert.doesNotMatch(step, /Object\.hasOwn\(matchStep, 'readFrameAudit'\)/u);
  assert.match(
    step,
    /field\(matchStep, 'readFrameAudit', 'HUD-ready Learning Mode Session matchStep'\)/u,
  );
  assert.match(
    step,
    /field\(matchStep, 'supplyCadence', 'HUD-ready Learning Mode Session matchStep'\)/u,
  );
});

test('P5.3zzzvx requires explicit weapon direction facts through the formal HUD chain', () => {
  const localSession = modeAuthoritativeLocalMatchSessionV3Source();
  const productSession = modeProductSessionV2Source();
  const bridge = learningModeSessionBridgeSource();
  const value = hudReadyLearningModeSessionSource();
  for (const source of [localSession, productSession, bridge, value]) {
    assert.match(source, /requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true/u);
  }
  assert.match(
    localSession,
    /const STEP_REQUIRED_KEYS = new Set\([\s\S]*?'weaponFeedbackDirectionFactsV2'/u,
  );
  assert.doesNotMatch(
    localSession,
    /Object\.hasOwn\(source, 'weaponFeedbackDirectionFactsV2'\)[\s\S]*?Object\.freeze\(\[\]\)/u,
  );
  assert.match(
    productSession,
    /const REQUIRED_STEP_KEYS = new Set\([\s\S]*?'weaponFeedbackDirectionFactsV2'/u,
  );
  assert.match(
    bridge,
    /const MATCH_STEP_REQUIRED_KEYS = new Set\([\s\S]*?'weaponFeedbackDirectionFactsV2'/u,
  );
  assert.match(
    value,
    /const MATCH_STEP_REQUIRED_KEYS = new Set\([\s\S]*?'weaponFeedbackDirectionFactsV2'/u,
  );
  const step = section(value, '  step(localInput: unknown): unknown {', '\n  pause(): void {');
  assert.doesNotMatch(
    step,
    /Object\.hasOwn\(matchStep, 'weaponFeedbackDirectionFactsV2'\)/u,
  );
  assert.match(
    step,
    /field\([\s\S]*?matchStep,[\s\S]*?'weaponFeedbackDirectionFactsV2'/u,
  );
});

test('P5.3zzzvy requires explicit local jump availability before every formal consumer', () => {
  const runtime = modeMatchRuntimeV6Source();
  const localSession = modeAuthoritativeLocalMatchSessionV3Source();
  const productSession = modeProductSessionV2Source();
  const bridge = learningModeSessionBridgeSource();
  const value = hudReadyLearningModeSessionSource();
  assert.match(runtime, /explicitLocalJumpAvailabilityRequiredEveryStartAndStep: true/u);
  assert.match(
    runtime,
    /const START_REQUIRED_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u,
  );
  assert.match(
    runtime,
    /const STEP_REQUIRED_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u,
  );
  assert.doesNotMatch(
    runtime,
    /Object\.hasOwn\(source, 'localJumpAvailability'\)/u,
  );
  for (const source of [localSession, productSession, bridge, value]) {
    assert.match(source, /requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true/u);
  }
  assert.match(
    localSession,
    /const START_REQUIRED_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u,
  );
  assert.match(
    localSession,
    /const STEP_REQUIRED_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u,
  );
  assert.doesNotMatch(
    localSession,
    /Object\.hasOwn\(source, 'localJumpAvailability'\)/u,
  );
  assert.match(productSession, /const START_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u);
  assert.match(
    productSession,
    /const REQUIRED_STEP_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u,
  );
  assert.match(bridge, /const START_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u);
  assert.match(
    bridge,
    /const MATCH_STEP_REQUIRED_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u,
  );
  assert.match(
    value,
    /const START_REQUIRED_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u,
  );
  assert.match(
    value,
    /const MATCH_STEP_REQUIRED_KEYS = new Set\([\s\S]*?'localJumpAvailability'/u,
  );
  const start = section(value, '  start(): unknown {', '\n  step(localInput: unknown): unknown {');
  const step = section(value, '  step(localInput: unknown): unknown {', '\n  pause(): void {');
  assert.doesNotMatch(start, /Object\.hasOwn\(source, 'localJumpAvailability'\)/u);
  assert.doesNotMatch(step, /Object\.hasOwn\(matchStep, 'localJumpAvailability'\)/u);
});

test('P5.3zzc retains failed information intent unbind ownership for dispose retry', () => {
  const binding = localPlayableBindingSource();
  const syncReturnBoundary = section(binding, 'function rejectThenable(', '\n\nfunction modeKind(');
  assert.match(syncReturnBoundary, /MAX_SYNC_RETURN_PROTOTYPE_DEPTH/u);
  assert.match(syncReturnBoundary, /visited\.has\(owner\)/u);
  assert.match(syncReturnBoundary, /Object\.getOwnPropertyDescriptor\(owner, 'then'\)/u);
  assert.match(syncReturnBoundary, /Object\.getOwnPropertyDescriptor\(owner, 'constructor'\)/u);
  assert.match(syncReturnBoundary, /assertNativePromiseSpeciesIntegrity\(\)/u);
  assert.match(syncReturnBoundary, /Reflect\.apply\(NATIVE_PROMISE_THEN, value, \[NOOP, NOOP\]\)/u);
  assert.doesNotMatch(syncReturnBoundary, /instanceof Promise/u);
  assert.doesNotMatch(syncReturnBoundary, /\.then\s*\(/u);
  assert.doesNotMatch(syncReturnBoundary, /\.catch\s*\(/u);
  const unbind = section(binding, '  #unbindSurfaceIntent(): void {', '\n\n  #renderCurrent');
  assert.match(unbind, /rejectThenable\(unbind\(\), 'Arena V2 local playable surface unbindIntent'\)/u);
  assert.equal(
    unbind.indexOf('rejectThenable(unbind()')
      < unbind.indexOf('this.#unbindIntent = null'),
    true,
    'the intent cleanup handle may be released only after synchronous unbind succeeds',
  );
  const cleanup = section(binding, '  #cleanup(): readonly unknown[] {', '\n\n  #reject(');
  assert.match(cleanup, /cleanup unbindIntent/u);
  assert.match(cleanup, /if \(this\.#unbindIntent === unbind\) this\.#unbindIntent = null;/u);
  assert.match(binding, /failedIntentUnbindRetainsRetryOwnership: true/u);
  assert.match(binding, /intentUnbindMustCompleteSynchronously: true/u);
  assert.match(binding, /synchronousSurfaceReturnsUseDescriptorOnlyBoundary: true/u);
});

test('P5.3zzd retries only incomplete information binding resources after partial cleanup', () => {
  const binding = localPlayableBindingSource();
  const cleanup = section(binding, '  #cleanup(): readonly unknown[] {', '\n\n  #reject(');
  assert.match(cleanup, /if \(!this\.#surfaceDisposed\)/u);
  assert.match(cleanup, /this\.#surfaceDisposed = true/u);
  assert.match(cleanup, /if \(!this\.#hostOwnerDestroyed\)/u);
  assert.match(cleanup, /this\.#hostOwnerDestroyed = true/u);
  assert.match(cleanup, /this\.#hostOwnerDestroyed[\s\S]*!this\.#matchSurfaceDisposed/u);
  assert.match(cleanup, /this\.#matchSurfaceDisposed = true/u);
  assert.equal(
    cleanup.indexOf('this.#destroyHostOwner()')
      < cleanup.indexOf('this.#matchSurface.dispose()'),
    true,
    'the local HUD/audio/VFX consumer must release before the match producer',
  );
  assert.match(binding, /cleanupRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(
    binding,
    /cleanupRespectsInformationHostAndMatchProducerDependencyOrder: true/u,
  );
  assert.match(binding, /failedHostCleanupRetainsMatchAudioAndVfxProducer: true/u);
});

test('P5.3zzzum-A retains the complete Formal Web construction cleanup debt', () => {
  const value = source();
  assert.match(
    value,
    /class ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1/u,
  );
  assert.match(value, /get cleanupComplete\(\): boolean/u);
  assert.match(value, /retryCleanup\(\): void/u);
  const cleanup = section(
    value,
    'function cleanupFormalWebPlayableConstructionResourcesCandidateV1(',
    '\n\nexport class ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1',
  );
  assert.equal(
    cleanup.indexOf('resources.resizeCleanup()')
      < cleanup.indexOf('resources.driver.dispose()'),
    true,
  );
  assert.equal(
    cleanup.indexOf('resources.driver.dispose()')
      < cleanup.indexOf('resources.offlineRetentionObservationJournal.destroy()'),
    true,
  );
  assert.equal(
    cleanup.indexOf('resources.driver.dispose()')
      < cleanup.indexOf('resources.pointerSurface.dispose()'),
    true,
  );
  assert.match(cleanup, /const debt = resources\.downstreamConstructionDebt/u);
  assert.match(cleanup, /debt\.retryCleanup\(\)/u);
  assert.match(cleanup, /resources\.matchHost\.dispose\(\)/u);
  assert.doesNotMatch(cleanup, /untransferredRegistryBootstrap/u);
  const firstProvisionedFactory = section(
    value,
    'export function createArenaV2FirstProvisionedFormalWebPlayableCompositionCandidateV1(',
    '\n\nexport const ARENA_V2_FORMAL_WEB_PLAYABLE_COMPOSITION_CANDIDATE_V1',
  );
  assert.match(
    firstProvisionedFactory,
    /error\.ownsTransferredRegistryBootstrap/u,
  );
  assert.match(firstProvisionedFactory, /registryBootstrap\.snapshot\(\)\.destroyed/u);
});

test('P5.3zzzvb retries the isolated entry only after the previous owner is released', () => {
  const entry = readFileSync('src/entry/web-arena-v2-formal-candidate.ts', 'utf8');
  const cleanup = section(
    entry,
    'function disposeCurrentComposition(): void {',
    '\n}\n\nfunction dispose(): void {',
  );
  assert.equal(
    cleanup.indexOf('constructionCleanupDebt.retryCleanup()')
      < cleanup.indexOf('constructionCleanupDebt.cleanupComplete'),
    true,
  );
  assert.equal(
    cleanup.indexOf('constructionCleanupDebt.cleanupComplete')
      < cleanup.indexOf('composition.dispose()'),
    true,
  );
  assert.equal(
    cleanup.indexOf('composition.dispose()') < cleanup.indexOf('composition = null'),
    true,
  );
  const prepare = section(
    entry,
    'async function runPreparation(): Promise<void> {',
    '\n}\n\nfunction prepare(): Promise<void> {',
  );
  assert.equal(
    prepare.indexOf('disposeCurrentComposition()')
      < prepare.indexOf('new ArenaV2FormalWebPlayableCompositionCandidateV1'),
    true,
  );
  assert.match(prepare, /const activeGeneration = generation \+ 1/u);
  assert.match(prepare, /activeGeneration !== generation/u);
  assert.match(prepare, /const nextSeedSource = seedSource/u);
  assert.match(prepare, /seedSource = nextSeedSource/u);
  assert.match(prepare, /seedSource: nextSeedSource/u);
  assert.match(prepare, /const nextRetentionMode = selectedLocalRetentionMode/u);
  assert.match(prepare, /nextLocalRetention = localRetentionJournalOptions/u);
  assert.match(prepare, /selectedLocalRetentionMode \?\?= nextRetentionMode/u);
  assert.match(prepare, /retentionMode\(windowObject\.location\.search\)/u);
  assert.match(prepare, /ownerId: pageLease\.ownerId/u);
  assert.match(
    prepare,
    /leaseTakeoverSameOwner: pageLease\.leaseTakeoverSameOwner/u,
  );
  assert.match(
    prepare,
    /error\s+instanceof ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1/u,
  );
  assert.match(entry, /enter\.textContent = '重新准备'/u);
  assert.match(entry, /startupFailureOffersInPlaceRetry: true/u);
  assert.match(entry, /retryRequiresPriorCompositionDispose: true/u);
  assert.match(entry, /constructionCleanupDebtRetainedForRetry: true/u);
  assert.match(entry, /retryPreservesMatchSeedSequence: true/u);
  assert.match(entry, /startupQueryParsingOccursInsideRetryBoundary: true/u);
  assert.match(entry, /crossTabLeaseOwnerUsesEphemeralCryptoIdentity: true/u);
  assert.match(entry, /fixedOwnerFallbackDisablesSameOwnerTakeover: true/u);
  assert.match(
    entry,
    /export function readArenaV2FormalWebDevelopmentRetentionExportCandidateV1/u,
  );
  assert.match(entry, /activeComposition\.getOfflineRetentionObservationExportRead\(\)/u);
  assert.match(entry, /localRetentionExportReadAvailableOnlyWhenReadyOrActive: true/u);
  assert.match(entry, /localRetentionExportReadTriggersDownloadOrUpload: false/u);
  assert.match(entry, /localRetentionJournalDefaultEnabled: true/u);
  assert.match(entry, /localRetentionJournalDisableQuery: 'retention=off'/u);
  assert.match(
    entry,
    /export function readArenaV2FormalWebDevelopmentLearningPaceCalibrationCandidateV1/u,
  );
  assert.match(entry, /activeComposition\.getOfflineLearningPaceCalibrationRead\(\)/u);
  assert.match(entry, /localLearningPaceCalibrationClaimsObservedRetention: false/u);
  assert.match(
    entry,
    /export function readArenaV2FormalWebDevelopmentWeaponResearchPaceCalibrationCandidateV1/u,
  );
  assert.match(
    entry,
    /activeComposition\.getOfflineWeaponResearchPaceCalibrationRead\(\)/u,
  );
  assert.match(
    entry,
    /localWeaponResearchPaceCalibrationRequiresContiguousProfileWindow: true/u,
  );
  assert.match(entry, /let weaponResearchPacePageBaselineToken:/u);
  assert.match(prepare, /weaponResearchPacePageBaselineToken/u);
  assert.match(
    prepare,
    /getOfflineWeaponResearchPacePageBaselineTokenForEntryCandidateV1\(\)/u,
  );
  assert.match(
    entry,
    /localWeaponResearchPaceCalibrationPreservesBaselineAcrossRetry: true/u,
  );
  assert.match(
    entry,
    /localWeaponResearchPaceCalibrationPreservesBaselineAcrossBfcacheRestore: true/u,
  );
  assert.match(
    entry,
    /localWeaponResearchPaceCalibrationPersistsBaselineAcrossPageReload: true/u,
  );
  assert.match(
    entry,
    /localWeaponResearchPaceCalibrationDurableBaselineUsesLeaseAndReadBack: true/u,
  );
  assert.match(
    entry,
    /localRetentionIdentityCreationRejectsOrphanedWeaponPaceBaseline: true/u,
  );
  assert.match(
    entry,
    /localWeaponResearchPaceCalibrationClaimsObservedRetention: false/u,
  );
  assert.match(entry, /staleAsyncGenerationCannotPublishGateState: true/u);
  const pageHide = section(
    entry,
    'function handlePageHide(event: PageTransitionEvent): void {',
    '\n}\n\nfunction handlePageShow(event: PageTransitionEvent): void {',
  );
  assert.match(pageHide, /if \(!event\.persisted\)/u);
  assert.match(pageHide, /disposeCurrentComposition\(\)/u);
  const pageShow = section(
    entry,
    'function handlePageShow(event: PageTransitionEvent): void {',
    '\n}\n\nasync function runActivation(): Promise<void> {',
  );
  assert.match(pageShow, /if \(!event\.persisted \|\| disposed\) return/u);
  assert.match(pageShow, /void prepare\(\)/u);
  assert.match(entry, /backForwardCacheRestoreRepreparesCandidate: true/u);
  assert.match(entry, /retryAddsPageOrGameplayAction: false/u);
});

test('P6.203 keeps formal Web synchronous lifecycle commits mutually exclusive', () => {
  const value = source();
  for (const marker of [
    'type FormalWebSynchronousOperation =',
    '#synchronousOperation: FormalWebSynchronousOperation | null = null',
    '#runSynchronousOperation<T>(',
    "return this.#runSynchronousOperation('load'",
    "return this.#runSynchronousOperation('prepare-formal-assets'",
    "return this.#runSynchronousOperation('activate-audio'",
    "this.#runSynchronousOperation('refresh-layout'",
    "return this.#runSynchronousOperation('pause-match'",
    "return this.#runSynchronousOperation('resume-match'",
    "return this.#runSynchronousOperation('settle-match'",
    "return this.#runSynchronousOperation('retry-settlement-recovery'",
    "return this.#runSynchronousOperation('registry-maintenance'",
    "this.#runSynchronousOperation('dispose'",
    "this.#runSynchronousOperation('snapshot-read'",
  ]) {
    assert.match(value, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }
  const activation = section(
    value,
    '  activateAudioAndEnterHome(): Promise<this> {',
    '\n\n  refreshLayout(): void',
  );
  assert.match(
    activation,
    /\.then\(\(\) => \(\s*this\.#runSynchronousOperation\('activate-audio'/u,
  );
  assert.equal(
    activation.indexOf("this.#runSynchronousOperation('activate-audio'")
      < activation.indexOf('this.#binding.loadingReady()'),
    true,
  );
});

test('P6.204 routes scheduled settlement and failure shutdown through the operation lock', () => {
  const value = source();
  const settlement = section(
    value,
    '  #handleDriverStateChange(change: unknown): void {',
    '\n\n  readonly #handleResize',
  );
  assert.match(
    settlement,
    /Promise\.resolve\(\)\.then\(\(\) => this\.#runSynchronousOperation\(\s*'settle-match'/u,
  );
  assert.equal(
    settlement.indexOf("this.#runSynchronousOperation(\n      'settle-match'")
      < settlement.indexOf('this.#driver.settle()'),
    true,
  );
  const failureShutdown = section(
    value,
    '  #scheduleFailureShutdown(): void {',
    '\n\n  #cleanupOwnedRuntimeResources',
  );
  assert.match(
    failureShutdown,
    /Promise\.resolve\(\)\.then\(\(\) => this\.#runSynchronousOperation\(\s*'failure-shutdown'/u,
  );
  assert.equal(
    failureShutdown.indexOf("this.#runSynchronousOperation(\n      'failure-shutdown'")
      < failureShutdown.indexOf('this.#cleanupOwnedRuntimeResources(errors)'),
    true,
  );
  assert.match(
    value,
    /formalWebScheduledSettlementCommitReentersThroughOperationLock: true/u,
  );
  assert.match(
    value,
    /formalWebFailureShutdownCommitReentersThroughOperationLock: true/u,
  );
});

test('P6.205 keeps formal Web entry preparation single-flight within one generation', () => {
  const entry = readFileSync(entryPath, 'utf8');
  assert.match(entry, /let preparationOperation: Promise<void> \| null = null/u);
  const preparation = section(
    entry,
    'function prepare(): Promise<void> {',
    '\n\nfunction handleGateAction',
  );
  assert.match(
    preparation,
    /if \(preparationOperation !== null\) return preparationOperation/u,
  );
  assert.equal(
    preparation.indexOf('if (preparationOperation !== null) return preparationOperation')
      < preparation.indexOf('void runPreparation().then'),
    true,
  );
  assert.match(preparation, /if \(preparationOperation !== operation\) return/u);
  assert.match(preparation, /publishRetryIfOperationsSettled\(\)/u);
  const failure = section(
    entry,
    'function commitFailure(error: unknown, failedGeneration = generation): void {',
    '\n\nfunction publishRetryIfOperationsSettled',
  );
  assert.match(
    failure,
    /const failedDuringOwnedOperation = entryState === 'preparing' \|\| entryState === 'entering'/u,
  );
  assert.match(
    failure,
    /preparationOperation !== null\s*\|\| activationOperation !== null/u,
  );
  assert.match(entry, /preparationSingleFlightPerGeneration: true/u);
  assert.match(entry, /preparationFailureRetryWaitsForOperationSettlement: true/u);
  assert.match(entry, /pageLifecycleInvalidatesStalePreparationOwnership: true/u);
});

test('P6.206 keeps formal Web entry activation single-flight and retry-gated', () => {
  const entry = readFileSync(entryPath, 'utf8');
  assert.match(entry, /let activationOperation: Promise<void> \| null = null/u);
  const activation = section(
    entry,
    'function handleEnter(): Promise<void> {',
    '\n\nasync function runPreparation',
  );
  assert.match(activation, /if \(activationOperation !== null\) return activationOperation/u);
  assert.match(activation, /if \(preparationOperation !== null\) return preparationOperation/u);
  assert.equal(
    activation.indexOf('if (activationOperation !== null) return activationOperation')
      < activation.indexOf('void runActivation().then'),
    true,
  );
  assert.match(activation, /if \(activationOperation !== operation\) return/u);
  assert.match(activation, /publishRetryIfOperationsSettled\(\)/u);
  const retryPublication = section(
    entry,
    'function publishRetryIfOperationsSettled(): void {',
    '\n}\n\nfunction disposeCurrentComposition',
  );
  assert.match(
    retryPublication,
    /preparationOperation !== null \|\| activationOperation !== null/u,
  );
  assert.match(entry, /activationSingleFlightPerGeneration: true/u);
  assert.match(
    entry,
    /failureRetryWaitsForPreparationAndActivationSettlement: true/u,
  );
  assert.match(entry, /pageLifecycleInvalidatesStaleActivationOwnership: true/u);
});

test('P6.239 rejects failed entry runners and guards their owner settlements', () => {
  const entry = readFileSync(entryPath, 'utf8');
  const activation = section(
    entry,
    'function handleEnter(): Promise<void> {',
    '\n\nasync function runPreparation',
  );
  assert.equal(
    activation.indexOf('activationOperation = operation')
      < activation.indexOf('runActivation()'),
    true,
  );
  assert.equal(
    activation.indexOf('if (activationOperation !== null) return activationOperation')
      < activation.indexOf("if (entryState !== 'ready') return Promise.resolve()"),
    true,
  );
  assert.match(activation, /void operation\.then\(settle, settle\)/u);
  assert.doesNotMatch(activation, /\.finally\(/u);
  assert.match(activation, /runSynchronousOperation\('activation-owner-publication'/u);
  assert.match(activation, /runSynchronousOperation\('activation-owner-settlement'/u);
  const preparation = section(
    entry,
    'function prepare(): Promise<void> {',
    '\n\nfunction handleGateAction',
  );
  assert.equal(
    preparation.indexOf('preparationOperation = operation')
      < preparation.indexOf('runPreparation()'),
    true,
  );
  assert.equal(
    preparation.indexOf('if (preparationOperation !== null) return preparationOperation')
      < preparation.indexOf("if (entryState === 'entering') return Promise.resolve()"),
    true,
  );
  assert.match(preparation, /void operation\.then\(settle, settle\)/u);
  assert.doesNotMatch(preparation, /\.finally\(/u);
  assert.match(preparation, /runSynchronousOperation\('preparation-owner-publication'/u);
  assert.match(preparation, /runSynchronousOperation\('preparation-owner-settlement'/u);
  const activationRunner = section(
    entry,
    'async function runActivation(): Promise<void> {',
    '\n}\n\nfunction handleEnter(): Promise<void> {',
  );
  assert.match(activationRunner, /runSynchronousOperation\('activation-start'/u);
  assert.match(activationRunner, /runSynchronousOperation\('activation-success'/u);
  assert.match(activationRunner, /throw failure/u);
  assert.match(activationRunner, /激活结果所属代际已失效/u);
  const preparationRunner = section(
    entry,
    'async function runPreparation(): Promise<void> {',
    '\n}\n\nfunction prepare(): Promise<void> {',
  );
  assert.match(preparationRunner, /runSynchronousOperation\('preparation-start'/u);
  assert.match(preparationRunner, /runSynchronousOperation\('preparation-success'/u);
  assert.match(preparationRunner, /throw failure/u);
  assert.match(preparationRunner, /准备结果所属代际已失效/u);
  assert.match(entry, /let synchronousReentrySequence = 0/u);
  assert.match(entry, /let synchronousReentryError: Error \| null = null/u);
  assert.doesNotMatch(entry, /synchronousReentryAttempted/u);
  assert.match(entry, /检测到被Composition、DOM或Observer吞掉的同步重入/u);
  assert.match(entry, /function recordDetachedFailure\(error: unknown, message: string\)/u);
  assert.match(entry, /runSynchronousOperation\('pagehide'/u);
  assert.match(entry, /runSynchronousOperation\('pageshow'/u);
  assert.match(entry, /'retention-read'/u);
  assert.match(entry, /preparationOwnerPublishedBeforeRunPreparation: true/u);
  assert.match(entry, /activationOwnerPublishedBeforeRunActivation: true/u);
  assert.match(entry, /repeatedEntryRequestsReusePublishedOwnerBeforeStateGate: true/u);
  assert.match(
    entry,
    /ownerSettlementCleanupHandlesResolveAndRejectWithoutDetachedFinally: true/u,
  );
  assert.match(entry, /preparationAndActivationFailuresRejectPublishedOwners: true/u);
  assert.match(entry, /stalePreparationAndActivationGenerationsRejectPublishedOwners: true/u);
  assert.match(entry, /asyncSuccessAndOwnerSettlementCommitUnderEntryOperationGuard: true/u);
  assert.match(entry, /swallowedCompositionDomOrObserverReentryFailsClosed: true/u);
  assert.match(entry, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(
    entry,
    /compositionAndDomCallbacksCheckedBeforeStateOrOwnerCommit: true/u,
  );
  assert.match(entry, /compositionCleanupReentryRetainsCurrentOwner: true/u);
  assert.match(
    entry,
    /asyncChildOwnersCapturedBeforeGenerationCheckedSettlement: true/u,
  );
  assert.match(
    entry,
    /disposedStatePublishesAfterListenerAndCompositionCleanup: true/u,
  );
  assert.match(entry, /detachedOwnerSettlementFailureCommitIsContained: true/u);
  assert.match(entry, /pageLifecycleAndRetentionReadUseEntryOperationGuard: true/u);
});

test('P6.207 prevents WebGL context loss from being overwritten by a success commit', () => {
  const host = matchHostSource();
  assert.match(host, /#pendingContextLoss: unknown = null/u);
  const contextLoss = section(
    host,
    '  readonly #handleContextLost = (event: Event): void => {',
    '\n\n  prepareFormalAssets(): Promise<this>',
  );
  assert.match(contextLoss, /if \(this\.#operation !== null\)/u);
  assert.match(contextLoss, /this\.#pendingContextLoss \?\?= contextLostError/u);
  for (const [method, successState] of [
    ['load(value: unknown): void', "this.#state = 'match-ready'"],
    ['render(value: unknown): void', "this.#state = 'active'"],
    ['pause(): void', "this.#state = 'paused'"],
    ['resume(): void', "this.#state = 'active'"],
    ['leave(): void', "this.#state = 'left'"],
  ] as const) {
    const nextMethod = method === 'load(value: unknown): void'
      ? '  render(value: unknown): void'
      : method === 'render(value: unknown): void'
        ? '  pause(): void'
        : method === 'pause(): void'
          ? '  resume(): void'
          : method === 'resume(): void'
            ? '  leave(): void'
            : '  getSnapshot(): Readonly<Record<string, unknown>>';
    const operation = section(host, `  ${method} {`, `\n\n${nextMethod}`);
    assert.equal(
      operation.indexOf('this.#throwPendingContextLoss()')
        < operation.indexOf(successState),
      true,
      `${method} must consume context loss before success state`,
    );
  }
  const disposal = section(host, '  dispose(): void {', '\n}\n\nexport const');
  assert.match(disposal, /this\.#assertNoOperation\('Arena V2 formal Web match host dispose'\)/u);
  assert.match(
    disposal,
    /this\.#runSynchronousOperation\('Arena V2 formal Web match host dispose'/u,
  );
  assert.match(host, /terminalCleanupCommitsUnderOperationGuard: true/u);
  assert.match(
    host,
    /contextLossDuringOperationDefersFailureUntilBeforeSuccessCommit: true/u,
  );
  assert.match(host, /pendingContextLossCannotBeOverwrittenBySuccessState: true/u);
  const snapshot = section(
    host,
    '  getSnapshot(): Readonly<Record<string, unknown>> {',
    '\n\n  dispose(): void',
  );
  assert.match(snapshot, /this\.#runSynchronousOperation\('snapshot-read'/u);
  assert.match(host, /snapshotRejectedDuringOperationCommit: true/u);
});

test('P6.231 rejects swallowed Stage reentry across formal Match Surface commits', () => {
  const surface = matchSurfaceSource();
  const disposal = section(surface, '  dispose(): void {', '\n}\n\nexport const');
  assert.match(disposal, /this\.#runSynchronousOperation\('dispose'/u);
  assert.match(disposal, /this\.#disposeStage\(errors\)/u);
  const stateRead = section(
    surface,
    '  get state(): SurfaceState {',
    '\n  get lastResolution()',
  );
  assert.match(stateRead, /this\.#runSynchronousOperation\('state-read'/u);
  const resolutionRead = section(
    surface,
    '  get lastResolution(): ArenaV2FormalSceneResolutionCandidateV1 | null {',
    '\n\n  #assertNoOperation',
  );
  assert.match(resolutionRead, /this\.#runSynchronousOperation\('last-resolution-read'/u);
  for (const operation of ['load', 'render', 'pause', 'resume', 'leave', 'dispose'] as const) {
    assert.match(
      surface,
      new RegExp(`this\\.#runSynchronousOperation\\('${operation}'`, 'u'),
    );
  }
  assert.match(surface, /#reentrySequence = 0/u);
  assert.match(surface, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(surface, /#reentryAttempted/u);
  assert.match(surface, /disposeCommitsUnderOperationGuard: true/u);
  assert.match(surface, /publicReadsRejectedDuringOperationCommit: true/u);
  assert.match(surface, /synchronousLifecycleOperationReentryRejected: true/u);
  assert.match(surface, /swallowedStageReentryFailsClosed: true/u);
  assert.match(surface, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(surface, /stageCallbacksCheckedBeforeResolutionAndStateCommit: true/u);
  assert.match(surface, /stageCleanupReentryRetainsOwnershipForRetry: true/u);
  assert.match(surface, /successfulStateCommitsAfterStageOperationOnly: true/u);
});

test('P6.232 rejects swallowed child reentry across formal Three Stage commits', () => {
  const stage = threeStageSource();
  const stateRead = section(
    stage,
    '  get state(): StageState {',
    '\n\n  #assertNoOperation',
  );
  assert.match(stateRead, /this\.#runSynchronousOperation\('state-read'/u);
  const disposal = section(stage, '  dispose(): void {', '\n}\n\nexport const');
  assert.match(disposal, /this\.#runSynchronousOperation\('dispose'/u);
  assert.match(disposal, /this\.#cleanupAll\(\)/u);
  for (const operation of [
    'load',
    'render',
    'pause',
    'resume',
    'leave',
    'snapshot-read',
    'dispose',
  ] as const) {
    assert.match(
      stage,
      new RegExp(`this\\.#runSynchronousOperation\\('${operation}'`, 'u'),
    );
  }
  assert.match(stage, /#reentrySequence = 0/u);
  assert.match(stage, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(stage, /#reentryAttempted/u);
  assert.match(stage, /terminalDisposeCommitsUnderOperationGuard: true/u);
  assert.match(stage, /stateReadRejectedDuringOperationCommit: true/u);
  assert.match(stage, /allPublicLifecycleAndSnapshotCommitsGuarded: true/u);
  assert.match(stage, /swallowedChildOwnerReentryFailsClosed: true/u);
  assert.match(stage, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(stage, /childCallbacksCheckedBeforeCrossOwnerOrStateCommit: true/u);
  assert.match(stage, /cleanupReentryRetainsCurrentAndLaterOwners: true/u);
  assert.match(stage, /childSnapshotsCheckedBeforeAggregateSnapshotPublication: true/u);
  assert.match(stage, /constructorWorldRootRollbackRetainsCleanupFailure: true/u);
  assert.match(stage, /successfulStateCommitsAfterChildOperationsOnly: true/u);
});

test('P6.233 keeps formal preload single-flight and rejects swallowed Task reentry', () => {
  const preloader = threePreloaderSource();
  const load = section(preloader, '  load(): Promise<this> {', '\n\n  requireAsset');
  assert.equal(
    load.indexOf('this.#loadOperation = loadOwner.promise')
      < load.indexOf('task.load()'),
    true,
  );
  assert.match(load, /if \(this\.#loadOperation !== null\) return this\.#loadOperation/u);
  assert.match(load, /this\.#runSynchronousCommit\(/u);
  assert.match(load, /let operations: Promise<void>\[\] = \[\]/u);
  assert.match(load, /Promise\.allSettled\(operations\)/u);
  assert.match(load, /asset .* settlement/u);
  assert.match(load, /启动失败提交/u);
  assert.match(load, /加载成功提交/u);
  assert.match(load, /加载终态水位/u);
  const disposal = section(preloader, '  dispose(): void {', '\n}\n\nexport const');
  assert.match(disposal, /this\.#runSynchronousCommit/u);
  assert.match(preloader, /#reentrySequence = 0/u);
  assert.match(preloader, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(preloader, /#reentryAttempted/u);
  assert.match(preloader, /this\.#runSynchronousCommit\('state-read'/u);
  assert.match(preloader, /this\.#runSynchronousCommit\('asset-read'/u);
  assert.match(preloader, /this\.#runSynchronousCommit\('snapshot-read'/u);
  assert.match(preloader, /loadOperationPublishedBeforeLoaderInvocation: true/u);
  assert.match(preloader, /synchronousLaunchAndCleanupCommitsGuarded: true/u);
  assert.match(preloader, /publicReadsRejectedDuringSynchronousCommit: true/u);
  assert.match(preloader, /swallowedTaskOrLoaderReentryFailsClosed: true/u);
  assert.match(preloader, /eachAssetSettlementCommitsUnderOperationGuard: true/u);
  assert.match(preloader, /batchSuccessAndTerminalWatermarksCommitUnderOperationGuard: true/u);
  assert.match(preloader, /synchronousLaunchFailureCommitsFailedAfterStartedTasksSettle: true/u);
  assert.match(preloader, /publicAssetAndSnapshotReadsUseOperationGuard: true/u);
  assert.match(preloader, /taskLoadCheckedBeforeLaunchingLaterTasks: true/u);
  assert.match(preloader, /taskCleanupCheckedBeforeOwnershipRelease: true/u);
  assert.match(preloader, /cleanupReentryRetainsCurrentAndLaterTasks: true/u);
});

test('P6.234 closes swallowed formal Three camera and impact reentry', () => {
  const camera = threeCameraSource();
  for (const operation of [
    'Arena V2 formal Three camera impact present',
    'Arena V2 formal Three camera impact remove',
    'Arena V2 formal Three camera impact clear',
    'Arena V2 formal Three camera sync',
    'Arena V2 formal Three camera pause',
    'Arena V2 formal Three camera resume',
    'Arena V2 formal Three camera reset',
    'Arena V2 formal Three camera dispose',
  ] as const) {
    assert.match(
      camera,
      new RegExp(`this\\.#runSynchronousOperation\\('${operation}'`, 'u'),
    );
  }
  const disposal = section(camera, '  dispose(): void {', '\n\n  getSnapshot()');
  assert.match(disposal, /this\.#cleanupOwnedResources\(\)/u);
  assert.match(camera, /this\.#runSynchronousOperation\('state-read'/u);
  assert.match(camera, /this\.#runSynchronousOperation\('last-model-read'/u);
  assert.match(camera, /this\.#runSynchronousOperation\(\s*'impact-epoch-read'/u);
  assert.match(camera, /this\.#runSynchronousOperation\('snapshot-read'/u);
  assert.match(camera, /#reentrySequence = 0/u);
  assert.match(camera, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(camera, /#reentryAttempted/u);
  assert.match(camera, /allPublicLifecycleCommitsGuarded: true/u);
  assert.match(camera, /publicReadsRejectedDuringOperationCommit: true/u);
  assert.match(camera, /swallowedCameraOrImpactReentryFailsClosed: true/u);
  assert.match(camera, /successfulStateAndModelCommitsAfterChildOperationsOnly: true/u);
  assert.match(camera, /terminalCleanupUsesSameStickyOperationGuard: true/u);
  assert.match(camera, /cameraImpactAndViewportCallbacksCheckedBeforeStateCommit: true/u);
  assert.match(camera, /cameraWritesCheckedBeforeModelPublication: true/u);
  assert.match(camera, /cleanupReentryRetainsCurrentAndLaterCameraOwners: true/u);
});

test('P6.235 closes VFX texture settlement and swallowed callback reentry', () => {
  const vfx = threeVfxSource();
  const load = section(vfx, '  load(): Promise<this> {', '\n\n  #presentEffect');
  assert.equal(
    load.indexOf('this.#loadOperation = loadOwner.promise')
      < load.indexOf('this.#textureLoader.load('),
    true,
  );
  assert.match(load, /this\.#state === 'loading' && this\.#loadOperation !== null/u);
  assert.match(load, /let loadingOperations: Promise<void>\[\] = \[\]/u);
  assert.match(load, /texture settlement/u);
  assert.match(load, /this\.#pendingTextures\.add\(texture\)/u);
  assert.match(load, /迟到纹理清理不完整/u);
  assert.match(load, /启动失败终态水位/u);
  assert.match(load, /纹理加载成功提交/u);
  assert.match(load, /纹理加载终态水位/u);
  for (const method of [
    'present',
    'presentDirectional',
    'presentPassthroughDirectional',
    'remove',
    'clear',
    'sync',
  ] as const) {
    const marker = `this.#runSynchronousOperation('Arena V2 formal Three VFX ${method}'`;
    assert.match(vfx, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }
  const disposal = section(vfx, '  dispose(): void {', '\n}\n\nexport const');
  assert.match(disposal, /this\.#runSynchronousOperation/u);
  assert.match(vfx, /this\.#runSynchronousOperation\('state-read'/u);
  assert.match(vfx, /this\.#runSynchronousOperation\('snapshot-read'/u);
  assert.match(vfx, /检测到被Texture、Three或Impact吞掉的同步重入/u);
  assert.match(vfx, /#reentrySequence = 0/u);
  assert.match(vfx, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(vfx, /#reentryAttempted/u);
  assert.match(vfx, /loadOperationPublishedBeforeTextureLoaderInvocation: true/u);
  assert.match(vfx, /allPublicLifecycleCommitsGuarded: true/u);
  assert.match(vfx, /publicReadsRejectedDuringOperationCommit: true/u);
  assert.match(vfx, /swallowedTextureThreeOrImpactReentryFailsClosed: true/u);
  assert.match(vfx, /eachTextureSettlementCommitsUnderOperationGuard: true/u);
  assert.match(vfx, /textureBatchAndTerminalWatermarksCommitUnderOperationGuard: true/u);
  assert.match(vfx, /synchronousLaunchFailureSettlesPublishedLoadOwner: true/u);
  assert.match(vfx, /lateTexturesAreDisposedBeforeSettlementRejects: true/u);
  assert.match(vfx, /pendingTextureLoadsOwnedByPlatformTextureLoader: true/u);
  assert.match(vfx, /disposalCancelsPendingTextureLoadsBeforeTextureCleanup: true/u);
  assert.match(vfx, /synchronousLaunchFailureCancelsStartedTextureOwnersBeforeSettlementWait: true/u);
  assert.match(vfx, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(vfx, /textureThreeAndImpactCallbacksCheckedBeforeCrossOwnerOrStateCommit: true/u);
  assert.match(vfx, /terminalCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true/u);
  assert.match(vfx, /syncResolversCheckedBeforeFrameWatermarkCommit: true/u);
});

test('P6.236 closes Web Audio decode, activation, and swallowed callback commits', () => {
  const audio = webAudioSource();
  const load = section(audio, '  load(): Promise<this> {', '\n\n  activate()');
  assert.equal(
    load.indexOf('this.#loadOperation = loadOwner.promise')
      < load.indexOf('this.#window.fetch'),
    true,
  );
  assert.match(load, /this\.#state === 'loading' && this\.#loadOperation !== null/u);
  assert.match(load, /let loadingOperations: Promise<void>\[\] = \[\]/u);
  assert.match(load, /decode settlement/u);
  assert.match(load, /启动失败终态水位/u);
  assert.match(load, /加载成功提交/u);
  assert.match(load, /加载终态水位/u);
  const activation = section(audio, '  activate(): Promise<this> {', '\n\n  play(');
  assert.equal(
    activation.indexOf('this.#activationOperation = activationOwner.promise')
      < activation.indexOf('this.#context.resume()'),
    true,
  );
  assert.match(activation, /this\.#activationPending && this\.#activationOperation !== null/u);
  assert.match(activation, /激活成功提交/u);
  assert.match(activation, /激活终态水位/u);
  for (const method of ['play', 'stopAll', 'dispose'] as const) {
    assert.match(
      audio,
      new RegExp(`this\\.#runSynchronousOperation\\('Arena V2 formal Web audio ${method}`, 'u'),
    );
  }
  assert.match(audio, /#settleEndedVoiceEventually/u);
  assert.match(audio, /if \(this\.#operation !== null\)/u);
  assert.match(audio, /this\.#runSynchronousOperation\('state-read'/u);
  assert.match(audio, /this\.#runSynchronousOperation\('snapshot-read'/u);
  assert.match(audio, /检测到被Web Audio或Observer吞掉的同步重入/u);
  assert.match(audio, /#reentrySequence = 0/u);
  assert.match(audio, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(audio, /#reentryAttempted/u);
  assert.match(audio, /loadOperationPublishedBeforeFetch: true/u);
  assert.match(audio, /activationOperationPublishedBeforeContextResume: true/u);
  assert.match(audio, /endedVoiceSettlementReentersThroughOperationGuard: true/u);
  assert.match(audio, /publicReadsRejectedDuringOperationCommit: true/u);
  assert.match(audio, /swallowedWebAudioOrObserverReentryFailsClosed: true/u);
  assert.match(audio, /eachDecodeSettlementCommitsUnderOperationGuard: true/u);
  assert.match(audio, /loadAndActivationTerminalWatermarksCommitUnderOperationGuard: true/u);
  assert.match(audio, /synchronousLoadLaunchFailureSettlesPublishedOwner: true/u);
  assert.match(audio, /repeatedPendingLoadAndActivationReusePublishedOwners: true/u);
  assert.match(audio, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(audio, /fetchDecodeAndResumeCallsRetainAsyncOwnerBeforeReentryCheck: true/u);
  assert.match(audio, /voiceNodeCallbacksCheckedBeforeVoiceOrRecentIdentityCommit: true/u);
  assert.match(audio, /voiceBusAndContextCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true/u);
  assert.match(audio, /contextCloseOwnerCapturedBeforeReentryCheck: true/u);
  assert.match(audio, /contextCloseSettlementHooksCapturedBeforeReentryCheck: true/u);
});

test('P6.241 checks media-owner reentry before repeated and idempotent fast paths', () => {
  const preloader = threePreloaderSource();
  const preloaderLoad = section(preloader, '  load(): Promise<this> {', '\n\n  requireAsset(');
  assert.equal(
    preloaderLoad.indexOf("this.#assertNoOperation('Arena V2 formal Three asset preloader load')")
      < preloaderLoad.indexOf('if (this.#loadOperation !== null)'),
    true,
  );
  const preloaderDispose = section(preloader, '  dispose(): void {', '\n}\n\nexport const');
  assert.equal(
    preloaderDispose.indexOf("this.#assertNoOperation('Arena V2 formal Three asset preloader dispose')")
      < preloaderDispose.indexOf("if (this.#state === 'disposed') return"),
    true,
  );
  assert.match(
    preloader,
    /repeatedLoadAndIdempotentDisposeCheckReentryBeforeFastPath: true/u,
  );

  const vfx = threeVfxSource();
  const vfxLoad = section(vfx, '  load(): Promise<this> {', '\n\n  #presentEffect(');
  assert.equal(
    vfxLoad.indexOf("this.#assertNoOperation('Arena V2 formal Three VFX load')")
      < vfxLoad.indexOf("if (this.#state === 'loading'"),
    true,
  );
  assert.match(vfx, /repeatedLoadChecksReentryBeforeOwnerReuse: true/u);

  const audio = webAudioSource();
  const audioLoad = section(audio, '  load(): Promise<this> {', '\n\n  activate()');
  assert.equal(
    audioLoad.indexOf("this.#assertNoOperation('Arena V2 formal Web audio load')")
      < audioLoad.indexOf("if (this.#state === 'loading'"),
    true,
  );
  const audioActivation = section(audio, '  activate(): Promise<this> {', '\n\n  play(');
  assert.equal(
    audioActivation.indexOf("this.#assertNoOperation('Arena V2 formal Web audio activate')")
      < audioActivation.indexOf('if (this.#activationPending'),
    true,
  );
  assert.match(audio, /repeatedLoadAndActivationCheckReentryBeforeOwnerReuse: true/u);
});

test('P6.240 closes Match Host repeated-owner reentry after P6.237 settlement', () => {
  const host = matchHostSource();
  const preparation = section(
    host,
    '  prepareFormalAssets(): Promise<this> {',
    '\n\n  activateFormalAudio()',
  );
  assert.equal(
    preparation.indexOf('this.#prepareOperation = prepareOwner.promise')
      < preparation.indexOf('this.#preloader.load()'),
    true,
  );
  assert.match(preparation, /this\.#runSynchronousOperation\(\s*'Arena V2 formal Web match host资产准备启动'/u);
  assert.equal(
    preparation.indexOf("this.#assertNoOperation('Arena V2 formal Web match host prepareFormalAssets')")
      < preparation.indexOf("if (this.#state === 'preparing'"),
    true,
  );
  assert.match(preparation, /Promise\.allSettled\(childOperations\)/u);
  assert.match(preparation, /资产准备成功提交/u);
  assert.match(preparation, /this\.#throwPendingContextLoss\(\)/u);
  const activation = section(
    host,
    '  activateFormalAudio(): Promise<this> {',
    '\n\n  createCharacterSelectionFormalPreviewMountOwner',
  );
  assert.equal(
    activation.indexOf('this.#activationOperation = activationOwner.promise')
      < activation.indexOf('this.#audio.activate()'),
    true,
  );
  assert.match(activation, /音频激活启动/u);
  assert.equal(
    activation.indexOf("this.#assertNoOperation('Arena V2 formal Web match host activateFormalAudio')")
      < activation.indexOf("if (this.#state === 'preloaded'"),
    true,
  );
  assert.match(activation, /音频激活成功提交/u);
  assert.match(activation, /this\.#throwPendingContextLoss\(\)/u);
  for (const operation of ['load', 'render', 'pause', 'resume', 'leave', 'dispose'] as const) {
    assert.match(
      host,
      new RegExp(`this\\.#runSynchronousOperation\\('Arena V2 formal Web match host ${operation}'`, 'u'),
    );
  }
  assert.match(host, /this\.#runSynchronousOperation\('state-read'/u);
  assert.match(host, /this\.#runSynchronousOperation\('last-error-read'/u);
  assert.match(host, /this\.#runSynchronousOperation\('snapshot-read'/u);
  assert.match(host, /Arena V2 formal Web context lost提交/u);
  assert.match(host, /#reentrySequence = 0/u);
  assert.match(host, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(host, /#reentryAttempted/u);
  assert.match(host, /prepareOperationPublishedBeforeChildAssetLoad: true/u);
  assert.match(host, /activationOperationPublishedBeforeAudioResume: true/u);
  assert.match(host, /stateAndErrorReadsRejectedDuringOperationCommit: true/u);
  assert.match(host, /swallowedChildOwnerOrObserverReentryFailsClosed: true/u);
  assert.match(host, /asyncPrepareAndActivationSettlementCommitsUnderOperationGuard: true/u);
  assert.match(host, /pendingContextLossConsumedByAsyncSuccessCommits: true/u);
  assert.match(host, /synchronousPrepareLaunchFailureWaitsForStartedChildren: true/u);
  assert.match(host, /terminalContinuationUsesStickyOperationGuard: true/u);
  assert.match(host, /publicLifecycleAndSnapshotUseStickyOperationGuard: true/u);
  assert.match(host, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(host, /childCallbacksCheckedBeforeStateAndSnapshotCommit: true/u);
  assert.match(host, /preparationChildrenCapturedBeforeNextLaunch: true/u);
  assert.match(host, /cleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true/u);
  assert.match(host, /previewOwnerRollbackPrecedesHostFailureCleanup: true/u);
  assert.match(
    host,
    /repeatedPrepareAndActivationRequestsCheckReentryBeforeOwnerReuse: true/u,
  );
});

test('P6.238 makes the playable composition lifecycle sticky and owner-settled', () => {
  const composition = source();
  const preparation = section(
    composition,
    '  prepareFormalAssets(): Promise<this> {',
    '\n\n  loadAndPrepare()',
  );
  assert.equal(
    preparation.indexOf('this.#prepareOperation = prepareOwner.promise')
      < preparation.indexOf('this.#matchHost.prepareFormalAssets()'),
    true,
  );
  assert.equal(
    preparation.indexOf('this.#assertNoSynchronousOperation(')
      < preparation.indexOf('if (this.#prepareOperation !== null'),
    true,
  );
  assert.match(
    preparation,
    /if \(this\.#prepareOperation !== null[\s\S]*return this\.#prepareOperation/u,
  );
  assert.match(preparation, /launchedPrepare = execution/u);
  assert.match(preparation, /void execution\.then\(prepareOwner\.resolve, prepareOwner\.reject\)/u);
  assert.match(preparation, /if \(launchedPrepare === null\) reject\(failure\)/u);
  assert.equal(
    [...preparation.matchAll(/#runSynchronousOperation\('prepare-formal-assets'/gu)].length >= 2,
    true,
  );
  const activation = section(
    composition,
    '  activateAudioAndEnterHome(): Promise<this> {',
    '\n\n  refreshLayout()',
  );
  assert.equal(
    activation.indexOf('this.#activationOperation = activationOwner.promise')
      < activation.indexOf('this.#matchHost.activateFormalAudio()'),
    true,
  );
  assert.equal(
    activation.indexOf('this.#assertNoSynchronousOperation(')
      < activation.indexOf('if (this.#activationOperation !== null'),
    true,
  );
  assert.match(
    activation,
    /if \(this\.#activationOperation !== null[\s\S]*return this\.#activationOperation/u,
  );
  assert.match(activation, /launchedActivation = execution/u);
  assert.match(
    activation,
    /void execution\.then\(activationOwner\.resolve, activationOwner\.reject\)/u,
  );
  assert.match(activation, /if \(launchedActivation === null\) reject\(failure\)/u);
  assert.equal(
    [...activation.matchAll(/#runSynchronousOperation\('activate-audio'/gu)].length >= 2,
    true,
  );
  for (const operation of [
    'state-read',
    'active-surface-read',
    'last-error-read',
    'binding-read',
    'snapshot-read',
    'retention-export-read',
    'retention-calibration-read',
    'retention-weapon-pace-page-token-read',
    'retention-weapon-pace-read',
  ] as const) {
    assert.match(
      composition,
      new RegExp(`this\\.#runSynchronousOperation\\('${operation}'`, 'u'),
    );
  }
  assert.match(composition, /#synchronousReentrySequence = 0/u);
  assert.match(composition, /#synchronousReentryError: Error \| null = null/u);
  assert.doesNotMatch(composition, /#synchronousReentryAttempted/u);
  assert.match(composition, /检测到被子Owner、DOM或Observer吞掉的同步重入/u);
  assert.match(composition, /#recordDetachedFailure\(error: unknown, message: string\)/u);
  assert.match(composition, /getOfflineLearningPaceCalibrationRead/u);
  assert.match(composition, /sourceJournalPayloadHash: journalExport\.sourcePayloadHash/u);
  assert.match(composition, /authorityObservationWindow: journalExport\.droppedObservationCount/u);
  assert.match(composition, /'retained-tail-window'/u);
  assert.match(composition, /getOfflineWeaponResearchPaceCalibrationRead/u);
  assert.match(
    composition,
    /createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1/u,
  );
  assert.match(
    composition,
    /projectArenaV2WeaponResearchPaceCalibrationCandidateV1/u,
  );
  assert.match(
    composition,
    /'incomplete-baseline-profile-window'/u,
  );
  assert.match(
    composition,
    /ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1/u,
  );
  assert.match(
    composition,
    /offlineWeaponResearchPaceDurableBaselineUsesLeaseHashAndReadBack: true/u,
  );
  assert.match(
    composition,
    /offlineWeaponResearchPaceDurableBaselineCompactsSettlementCountsAndTicks: true/u,
  );
  assert.match(
    composition,
    /offlineWeaponResearchPaceDurableBaselineSurvivesJournalTailEviction: true/u,
  );
  assert.match(composition, /sourceJournalObservations: journalExport\.observations/u);
  assert.match(composition, /'durable-compact-window'/u);
  assert.match(composition, /'retained-journal-window'/u);
  assert.match(composition, /'catalog-completion-boundary-unavailable'/u);
  assert.match(composition, /evidenceThroughProfileRevision/u);
  assert.match(composition, /catalogCompletionProfileRevision/u);
  assert.match(
    composition,
    /offlineWeaponResearchPaceFreezesAtCatalogCompletion: true/u,
  );
  assert.match(
    composition,
    /offlineWeaponResearchPaceIgnoresPostCompletionMatches: true/u,
  );
  assert.match(
    composition,
    /offlineWeaponResearchPaceCalibrationPublishesNoEstimateForIncompleteWindow: true/u,
  );
  assert.match(
    composition,
    /class ArenaV2FormalWebWeaponResearchPacePageBaselineTokenCandidateV1/u,
  );
  assert.match(
    composition,
    /offlineWeaponResearchPaceCalibrationUsesPageLifetimeBaselineToken: true/u,
  );
  assert.match(
    composition,
    /offlineWeaponResearchPaceCalibrationTokenExposesRawProfile: false/u,
  );
  assert.match(composition, /profileDefinitionContentHash/u);
  assert.match(composition, /prepareOperationPublishedBeforeMatchHostPrepare: true/u);
  assert.match(composition, /activationOperationPublishedBeforeMatchHostActivation: true/u);
  assert.match(composition, /repeatedAsyncRequestsReusePublishedOwner: true/u);
  assert.match(composition, /swallowedChildDomOrObserverReentryFailsClosed: true/u);
  assert.match(
    composition,
    /stickyReentryUsesMonotonicSequenceAndFirstError: true/u,
  );
  assert.match(
    composition,
    /childDomAndObserverCallbacksCheckedBeforeCrossOwnerOrStateCommit: true/u,
  );
  assert.match(
    composition,
    /asyncChildOwnersAndSettlementHooksCapturedBeforeReentryCheck: true/u,
  );
  assert.match(
    composition,
    /runtimeCleanupReentryRetainsCurrentAndLaterOwners: true/u,
  );
  assert.match(
    composition,
    /childSnapshotsCheckedBeforeAggregateSnapshotPublication: true/u,
  );
  assert.match(
    composition,
    /publicStateBindingSnapshotAndRetentionReadsUseStickyGuard: true/u,
  );
  assert.match(
    composition,
    /repeatedPrepareAndActivationReadsCheckReentryBeforeOwnerReuse: true/u,
  );
  assert.match(
    composition,
    /publishedPrepareAndActivationOwnersWaitForLaunchedChildren: true/u,
  );
  assert.match(
    composition,
    /asyncPrepareAndActivationSettlementCommitsUnderOperationGuard: true/u,
  );
  assert.match(composition, /failureRecordingUsesSynchronousOperationGuard: true/u);
  assert.match(composition, /detachedSettlementAndResizeFailureCommitsAreContained: true/u);
  assert.match(composition, /terminalFailureShutdownErrorCommitUsesOperationGuard: true/u);
});
