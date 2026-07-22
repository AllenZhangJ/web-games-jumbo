import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { CharacterAnimationController } from './character-animation-controller.js';
import {
  createProgrammaticEquipment,
  disposeThreeObject,
  visualFacingYaw,
} from '@number-strategy-jump/arena-presentation-three';

const EMBEDDED_EQUIPMENT_NODES = Object.freeze([
  '1H_Crossbow',
  '2H_Crossbow',
  'Knife',
  'Knife_Offhand',
  'Throwable',
]);

function latestIncomingHit(frame, participantId, afterSequence) {
  let result = null;
  for (const event of frame?.events ?? []) {
    if (
      event.type === 'HitResolved'
      && event.targetId === participantId
      && Number.isSafeInteger(event.sequence)
      && event.sequence > afterSequence
    ) result = event;
  }
  return result;
}

function incomingDirection(frame, snapshot, event) {
  if (!event) return null;
  const attacker = frame.world.participants.find(({ id }) => id === event.attackerId);
  if (!attacker) return 'front';
  const x = attacker.position.x - snapshot.position.x;
  const z = attacker.position.z - snapshot.position.z;
  const length = Math.hypot(x, z);
  if (length < 0.0001) return 'front';
  return (x / length) * snapshot.facing.x + (z / length) * snapshot.facing.z >= 0
    ? 'front'
    : 'back';
}

function prepareModel(model) {
  for (const name of EMBEDDED_EQUIPMENT_NODES) {
    const object = model.getObjectByName(name);
    if (object) object.visible = false;
  }
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const texture = material?.map;
      if (!texture) continue;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
    }
  });
}

function equipmentDefinitionId(value) {
  const definitionId = value?.definitionId ?? null;
  if (definitionId !== null && typeof definitionId !== 'string') {
    throw new TypeError('角色 equipment.definitionId 必须为字符串或 null。');
  }
  return definitionId;
}

function requireNamedObject(root, names, label) {
  for (const name of names) {
    const object = root.getObjectByName(name);
    if (object) return object;
  }
  const available = [];
  root.traverse((object) => {
    if (object.name && available.length < 24) available.push(object.name);
  });
  throw new RangeError(`KayKit角色缺少 ${label} 插槽；可用节点：${available.join(', ')}。`);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function mix(from, to, progress) {
  return from + (to - from) * clamp01(progress);
}

function actionVisualState(action, presentation) {
  const timing = presentation?.timing;
  const duration = timing?.[`${action.phase}Ticks`] ?? 1;
  const progress = clamp01(1 - action.ticksRemaining / Math.max(1, duration));
  if (action.phase === 'windup') {
    const anticipationEnd = presentation?.visualPhases?.anticipationEnd ?? 0.72;
    return { stage: 'raise', progress: clamp01(progress / anticipationEnd) };
  }
  if (action.phase === 'active') return { stage: 'swing', progress };
  const boundary = presentation?.visualPhases?.followThroughEnd ?? 0.45;
  if (progress < boundary) {
    return { stage: 'follow-through', progress: progress / boundary };
  }
  return {
    stage: 'retract',
    progress: (progress - boundary) / Math.max(0.01, 1 - boundary),
  };
}

export class GltfCharacterView {
  #participantId;
  #presentationId;
  #presentationHash;
  #model;
  #controller;
  #rightHandSlot;
  #leftHandSlot;
  #equipmentTemplates;
  #heldEquipment;
  #heldEquipmentDefinitionId;
  #heldEquipmentOwnsResources;
  #snapshot;
  #animation;
  #elapsed;
  #hitDirection;
  #lastHitSequence;
  #spine;
  #head;
  #lastSpineBreathZ;
  #lastHeadBreathX;
  #lastHorizontalSpeed;
  #stopSettleRemaining;
  #targetPosition;
  #hips;
  #upperLegLeft;
  #upperLegRight;
  #lowerLegLeft;
  #lowerLegRight;
  #upperArmLeft;
  #upperArmRight;
  #lowerArmLeft;
  #lowerArmRight;
  #handLeft;
  #handRight;
  #actionPresentations;
  #actionVisualStage;
  #jointOffsets;
  #jointOffsetCount;
  #lastBaseSemantic;
  #semanticElapsed;
  #disposed;

  constructor({
    participantId,
    presentationDefinition,
    characterTemplate,
    equipmentTemplates,
    actionPresentations,
  }) {
    if (!characterTemplate?.scene?.isObject3D || !Array.isArray(characterTemplate.animations)) {
      throw new TypeError('GltfCharacterView 需要已加载的 character template。');
    }
    this.#participantId = participantId;
    this.#presentationId = presentationDefinition.id;
    this.#presentationHash = presentationDefinition.getContentHash();
    this.root = new THREE.Group();
    this.root.name = `ArenaCharacter:${participantId}:GLTF`;
    this.#model = cloneSkeleton(characterTemplate.scene);
    this.#model.name = `ArenaCharacterModel:${participantId}`;
    this.#model.scale.setScalar(0.8);
    this.#model.position.y = -1;
    prepareModel(this.#model);
    this.root.add(this.#model);
    this.#rightHandSlot = requireNamedObject(
      this.#model,
      ['handslot.r', 'handslot_r', 'handslotr'],
      'handslot.r',
    );
    this.#leftHandSlot = requireNamedObject(
      this.#model,
      ['handslot.l', 'handslot_l', 'handslotl'],
      'handslot.l',
    );
    this.#equipmentTemplates = equipmentTemplates;
    this.#heldEquipment = null;
    this.#heldEquipmentDefinitionId = null;
    this.#heldEquipmentOwnsResources = false;
    this.#controller = new CharacterAnimationController({
      root: this.#model,
      clips: characterTemplate.animations,
      actionPresentations,
    });
    this.#snapshot = null;
    this.#animation = null;
    this.#elapsed = 0;
    this.#hitDirection = null;
    this.#lastHitSequence = -1;
    this.#spine = this.#model.getObjectByName('spine');
    this.#head = this.#model.getObjectByName('head');
    this.#lastSpineBreathZ = 0;
    this.#lastHeadBreathX = 0;
    this.#lastHorizontalSpeed = 0;
    this.#stopSettleRemaining = 0;
    this.#targetPosition = new THREE.Vector3();
    this.#hips = this.#model.getObjectByName('hips');
    this.#upperLegLeft = this.#model.getObjectByName('upperleg.l');
    this.#upperLegRight = this.#model.getObjectByName('upperleg.r');
    this.#lowerLegLeft = this.#model.getObjectByName('lowerleg.l');
    this.#lowerLegRight = this.#model.getObjectByName('lowerleg.r');
    this.#upperArmLeft = this.#model.getObjectByName('upperarm.l');
    this.#upperArmRight = this.#model.getObjectByName('upperarm.r');
    this.#lowerArmLeft = this.#model.getObjectByName('lowerarm.l');
    this.#lowerArmRight = this.#model.getObjectByName('lowerarm.r');
    this.#handLeft = this.#model.getObjectByName('hand.l');
    this.#handRight = this.#model.getObjectByName('hand.r');
    this.#actionPresentations = actionPresentations;
    this.#actionVisualStage = null;
    this.#jointOffsets = [];
    this.#jointOffsetCount = 0;
    this.#lastBaseSemantic = null;
    this.#semanticElapsed = 0;
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('GltfCharacterView 已销毁。');
  }

  getAnimationCapabilities() {
    this.#assertUsable();
    return Object.freeze({
      proceduralKeys: Object.freeze([]),
      clipKeys: this.#controller.listClipNames(),
    });
  }

  #removeEquipment() {
    if (!this.#heldEquipment) return;
    this.#heldEquipment.removeFromParent();
    if (this.#heldEquipmentOwnsResources) disposeThreeObject(this.#heldEquipment);
    this.#heldEquipment = null;
    this.#heldEquipmentDefinitionId = null;
    this.#heldEquipmentOwnsResources = false;
  }

  #createEquipment(definitionId) {
    const template = this.#equipmentTemplates.get(definitionId) ?? null;
    if (template?.scene?.isObject3D) {
      return { object: template.scene.clone(true), ownsResources: false };
    }
    return { object: createProgrammaticEquipment(definitionId), ownsResources: true };
  }

  #syncEquipment(equipment) {
    const definitionId = equipmentDefinitionId(equipment);
    if (definitionId === this.#heldEquipmentDefinitionId) return;
    this.#removeEquipment();
    if (definitionId === null) return;
    const { object, ownsResources } = this.#createEquipment(definitionId);
    object.name = `ArenaHeldEquipment:${this.#participantId}:${definitionId}`;
    object.userData.definitionId = definitionId;
    const slot = definitionId === 'shield' ? this.#leftHandSlot : this.#rightHandSlot;
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.userData.baseScale = definitionId === 'chain' ? 0.72 : 1;
    object.scale.setScalar(object.userData.baseScale);
    slot.add(object);
    this.#heldEquipment = object;
    this.#heldEquipmentDefinitionId = definitionId;
    this.#heldEquipmentOwnsResources = ownsResources;
  }

  sync(snapshot, { snap = false, animation, direction, frame } = {}) {
    this.#assertUsable();
    if (snapshot?.id !== this.#participantId) throw new RangeError('GLTF角色快照身份不一致。');
    if (
      snapshot.appearance?.presentationId !== this.#presentationId
      || snapshot.appearance?.definitionHash !== this.#presentationHash
    ) throw new RangeError('GLTF角色 presentation Definition 不一致。');
    if (!animation?.semantics || !animation?.baseBinding) {
      throw new TypeError('GLTF角色缺少 animation resolution。');
    }
    if (!direction?.worldFacing || !Number.isFinite(direction.modelFrontYawRadians)) {
      throw new TypeError('GLTF角色缺少 six-sector direction resolution。');
    }
    const positionX = -snapshot.position.x;
    const positionY = snapshot.position.y;
    const positionZ = snapshot.position.z;
    if (snap || this.#snapshot === null) this.root.position.set(positionX, positionY, positionZ);
    this.#targetPosition.set(positionX, positionY, positionZ);
    this.root.rotation.y = visualFacingYaw(direction.worldFacing)
      - direction.modelFrontYawRadians;
    this.#syncEquipment(snapshot.equipment);
    const hit = latestIncomingHit(frame, snapshot.id, this.#lastHitSequence);
    if (hit) {
      this.#hitDirection = incomingDirection(frame, snapshot, hit);
      this.#lastHitSequence = hit.sequence;
    }
    this.#snapshot = snapshot;
    this.#animation = animation;
    this.#controller.sync({
      snapshot,
      animation,
      hitDirection: this.#hitDirection,
    });
  }

  update(deltaSeconds) {
    this.#assertUsable();
    if (!this.#snapshot) return;
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    this.#elapsed += delta;
    const blend = 1 - Math.exp(-20 * delta);
    this.root.position.lerp(this.#targetPosition, blend);
    if (this.#spine) this.#spine.rotation.z -= this.#lastSpineBreathZ;
    if (this.#head) this.#head.rotation.x -= this.#lastHeadBreathX;
    for (let index = 0; index < this.#jointOffsetCount; index += 1) {
      const offset = this.#jointOffsets[index];
      offset.joint.rotation[offset.axis] -= offset.amount;
    }
    this.#jointOffsetCount = 0;
    this.#lastSpineBreathZ = 0;
    this.#lastHeadBreathX = 0;
    this.#controller.update(delta);
    if (this.#heldEquipment) {
      this.#heldEquipment.scale.setScalar(this.#heldEquipment.userData.baseScale);
    }
    this.#actionVisualStage = null;
    const baseSemantic = this.#animation.semantics.baseSemantic;
    if (baseSemantic !== this.#lastBaseSemantic) {
      this.#lastBaseSemantic = baseSemantic;
      this.#semanticElapsed = 0;
    } else {
      this.#semanticElapsed += delta;
    }
    const horizontalSpeed = Math.hypot(this.#snapshot.velocity.x, this.#snapshot.velocity.z);
    if (
      this.#snapshot.grounded
      && this.#lastHorizontalSpeed >= 1.2
      && horizontalSpeed < 0.15
    ) this.#stopSettleRemaining = 0.16;
    this.#lastHorizontalSpeed = horizontalSpeed;
    this.#stopSettleRemaining = Math.max(0, this.#stopSettleRemaining - delta);
    this.#model.position.y = -1;
    this.#model.rotation.x = 0;
    this.#model.rotation.y = 0;
    this.#model.rotation.z = 0;
    if (baseSemantic === 'idle') {
      const breath = Math.sin(this.#elapsed * 2.35);
      this.#lastSpineBreathZ = breath * 0.012;
      this.#lastHeadBreathX = Math.sin(this.#elapsed * 1.17) * 0.008;
      if (this.#spine) this.#spine.rotation.z += this.#lastSpineBreathZ;
      if (this.#head) this.#head.rotation.x += this.#lastHeadBreathX;
      this.#model.position.y = -1 + breath * 0.006;
      if (this.#stopSettleRemaining > 0) {
        const settle = this.#stopSettleRemaining / 0.16;
        this.#model.rotation.x = -0.065 * settle;
        this.#model.position.y -= 0.018 * settle;
      }
    } else if (
      this.#snapshot.grounded
      && (
        baseSemantic === 'walk'
        || baseSemantic === 'run'
      )
    ) {
      const running = baseSemantic === 'run';
      const cadence = running ? 12.5 : 7.5;
      const stride = Math.sin(this.#elapsed * cadence);
      this.#model.position.y += Math.abs(stride) * (running ? 0.014 : 0.008);
      this.#model.rotation.x = running ? -0.055 : -0.02;
      this.#model.rotation.z = stride * (running ? 0.009 : 0.004);
    } else if (
      baseSemantic === 'jump'
      || baseSemantic === 'crouch-jump'
    ) {
      const anticipation = 1 - Math.min(1, this.#semanticElapsed / 0.14);
      const rising = this.#snapshot.velocity.y > 0;
      const airborneTuck = rising ? 0.24 : 0.08;
      const compression = Math.max(anticipation, airborneTuck);
      this.#model.position.y -= anticipation * 0.07;
      this.#model.rotation.x = rising ? -0.065 : 0.035;
      this.#applyJointOffset(this.#hips, 'x', -0.09 * compression);
      this.#applyJointOffset(this.#upperLegLeft, 'x', 0.22 * compression);
      this.#applyJointOffset(this.#upperLegRight, 'x', 0.16 * compression);
      this.#applyJointOffset(this.#lowerLegLeft, 'x', -0.26 * compression);
      this.#applyJointOffset(this.#lowerLegRight, 'x', -0.2 * compression);
      this.#applyJointOffset(this.#upperArmLeft, 'z', rising ? 0.055 : 0.11);
      this.#applyJointOffset(this.#upperArmRight, 'z', rising ? -0.055 : -0.11);
    } else if (baseSemantic === 'double-jump') {
      const progress = Math.min(1, this.#semanticElapsed / 0.44);
      const tuck = Math.sin(progress * Math.PI);
      this.#model.position.y -= tuck * 0.045;
      this.#model.rotation.x = -0.18 * tuck;
      this.#model.rotation.y = progress * Math.PI * 2;
      this.#model.rotation.z = Math.sin(progress * Math.PI * 2) * 0.12;
      this.#applyJointOffset(this.#hips, 'x', -0.2 * tuck);
      this.#applyJointOffset(this.#upperLegLeft, 'x', 0.42 * tuck);
      this.#applyJointOffset(this.#upperLegRight, 'x', 0.42 * tuck);
      this.#applyJointOffset(this.#lowerLegLeft, 'x', -0.48 * tuck);
      this.#applyJointOffset(this.#lowerLegRight, 'x', -0.48 * tuck);
      this.#applyJointOffset(this.#upperArmLeft, 'z', 0.18 * tuck);
      this.#applyJointOffset(this.#upperArmRight, 'z', -0.18 * tuck);
    }
    this.#applyWeaponActionAccent();
    this.root.visible = this.#snapshot.status === 'active'
      && (
        this.#snapshot.invulnerableTicks === 0
        || Math.floor(this.#elapsed * 12) % 2 === 0
      );
  }

  #applyJointOffset(joint, axis, amount) {
    if (!joint || !Number.isFinite(amount) || amount === 0) return;
    joint.rotation[axis] += amount;
    let offset = this.#jointOffsets[this.#jointOffsetCount];
    if (!offset) {
      offset = { joint: null, axis: 'x', amount: 0 };
      this.#jointOffsets.push(offset);
    }
    offset.joint = joint;
    offset.axis = axis;
    offset.amount = amount;
    this.#jointOffsetCount += 1;
  }

  #applyWeaponActionAccent() {
    const action = this.#snapshot.action;
    if (!action || action.definitionId === null || action.phase === 'idle') return;
    const presentation = this.#actionPresentations[action.definitionId];
    if (!presentation?.timing) return;
    const visual = actionVisualState(action, presentation);
    this.#actionVisualStage = visual.stage;
    const raise = visual.stage === 'raise' ? visual.progress : 1;
    const swing = visual.stage === 'swing' ? visual.progress : visual.stage === 'raise' ? 0 : 1;
    const follow = visual.stage === 'follow-through' ? visual.progress : 0;
    const retract = visual.stage === 'retract' ? visual.progress : 0;
    const weight = (visual.stage === 'raise' ? 0.35 + raise * 0.45 : 1) * (1 - retract);
    const aerial = action.definitionId.includes('-air-');
    if (this.#heldEquipment && presentation.weaponScale) {
      const scale = presentation.weaponScale;
      const multiplier = visual.stage === 'raise'
        ? mix(scale.idle, scale.windupPeak, raise)
        : visual.stage === 'swing'
          ? mix(scale.windupPeak, scale.activePeak, swing)
          : visual.stage === 'follow-through'
            ? mix(scale.activePeak, scale.followThroughPeak, follow)
            : mix(scale.followThroughPeak, scale.idle, retract);
      this.#heldEquipment.scale.setScalar(this.#heldEquipment.userData.baseScale * multiplier);
    }
    if (action.definitionId === 'hammer-smash' || action.definitionId === 'hammer-air-smash') {
      this.#model.rotation.x += (aerial ? 0.34 : -0.11) * weight;
      this.#applyJointOffset(this.#upperArmLeft, 'x', -0.28 * weight);
      this.#applyJointOffset(this.#upperArmRight, 'x', -0.34 * weight);
      this.#applyJointOffset(this.#lowerArmLeft, 'x', mix(-0.18, 0.2, swing) * weight);
      this.#applyJointOffset(this.#lowerArmRight, 'x', mix(-0.22, 0.26, swing) * weight);
      this.#applyJointOffset(this.#handLeft, 'z', 0.16 * follow);
      this.#applyJointOffset(this.#handRight, 'z', -0.18 * follow);
      this.#applyJointOffset(this.#spine, 'x', (aerial ? 0.18 : -0.09) * weight);
    } else if (
      action.definitionId === 'chain-pull'
      || action.definitionId === 'chain-air-lash'
    ) {
      this.#model.rotation.z += 0.07 * weight;
      if (aerial) this.#model.rotation.x += 0.28 * weight;
      this.#applyJointOffset(this.#upperArmRight, 'z', -0.38 * weight);
      this.#applyJointOffset(this.#lowerArmRight, 'x', mix(0.34, -0.16, swing) * weight);
      this.#applyJointOffset(this.#handRight, 'x', -0.28 * swing + 0.24 * follow);
      this.#applyJointOffset(this.#upperArmLeft, 'z', 0.16 * weight);
      this.#applyJointOffset(this.#spine, 'y', -0.18 * weight);
    } else if (
      action.definitionId === 'shield-charge'
      || action.definitionId === 'shield-air-drop'
    ) {
      this.#model.rotation.x += (aerial ? 0.46 : -0.16) * weight;
      this.#applyJointOffset(this.#upperArmLeft, 'x', -0.34 * weight);
      this.#applyJointOffset(this.#lowerArmLeft, 'x', 0.28 * weight);
      this.#applyJointOffset(this.#handLeft, 'z', -0.2 * follow);
      this.#applyJointOffset(this.#upperArmRight, 'x', -0.16 * weight);
      this.#applyJointOffset(this.#spine, 'x', (aerial ? 0.2 : -0.14) * weight);
    } else if (
      action.definitionId === 'base-push'
      || action.definitionId === 'base-air-strike'
    ) {
      if (aerial) this.#model.rotation.x += 0.3 * weight;
      this.#applyJointOffset(this.#upperArmRight, 'z', -0.26 * weight);
      this.#applyJointOffset(this.#lowerArmRight, 'x', mix(0.38, -0.12, swing) * weight);
      this.#applyJointOffset(this.#handRight, 'x', -0.18 * swing + 0.12 * follow);
      this.#applyJointOffset(this.#spine, 'y', -0.12 * weight);
    }
  }

  getDebugSnapshot() {
    this.#assertUsable();
    let objectCount = 0;
    this.root.traverse(() => { objectCount += 1; });
    return Object.freeze({
      kind: 'gltf-character',
      participantId: this.#participantId,
      presentationId: this.#presentationId,
      hasSnapshot: this.#snapshot !== null,
      heldEquipmentDefinitionId: this.#heldEquipmentDefinitionId,
      hitDirection: this.#hitDirection,
      stopSettleRemaining: this.#stopSettleRemaining,
      proceduralPose: this.#lastBaseSemantic,
      semanticElapsed: this.#semanticElapsed,
      actionVisualStage: this.#actionVisualStage,
      heldEquipmentScale: this.#heldEquipment?.scale.x ?? null,
      objectCount,
      animation: this.#controller.getDebugSnapshot(),
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#removeEquipment();
    this.#controller.dispose();
    this.root.removeFromParent();
    this.root.clear();
  }
}
