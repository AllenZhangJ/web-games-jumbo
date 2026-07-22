import * as THREE from 'three';
import {
  ARENA_ANIMATION_SEMANTIC,
  ARENA_ANIMATION_SEMANTIC_IDS,
} from '@number-strategy-jump/arena-presentation-contracts';
import { disposeThreeObject } from './dispose-three-resources.js';
import { ARENA_GREYBOX_COLOR } from './greybox-style.js';
import { createProgrammaticEquipment } from './programmatic-equipment.js';
import { toVisualPosition, visualFacingYaw } from './visual-coordinate.js';

const ACTION_STYLE = Object.freeze({
  'base-push': 'push',
  'base-air-strike': 'air-push',
  'hammer-smash': 'hammer',
  'hammer-air-smash': 'air-hammer',
  'chain-pull': 'chain',
  'chain-air-lash': 'air-chain',
  'shield-charge': 'shield',
  'shield-air-drop': 'air-shield',
});

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.76,
    metalness: options.metalness ?? 0.03,
    transparent: true,
    opacity: 1,
  });
}

function mesh(geometry, entryMaterial) {
  const value = new THREE.Mesh(geometry, entryMaterial);
  value.castShadow = true;
  value.receiveShadow = false;
  return value;
}

function limbSegment({ radius, length, entryMaterial, boxy = false }) {
  const geometry = boxy
    ? new THREE.BoxGeometry(radius * 2, length, radius * 2)
    : new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 3, 7);
  const value = mesh(geometry, entryMaterial);
  value.position.y = -length / 2;
  return value;
}

function articulatedLimb({
  parent,
  name,
  position,
  upperLength,
  lowerLength,
  radius,
  entryMaterial,
  boxy,
  foot = false,
}) {
  const upper = new THREE.Group();
  upper.name = `${name}:upper-joint`;
  upper.position.set(position.x, position.y, position.z);
  upper.add(limbSegment({ radius, length: upperLength, entryMaterial, boxy }));
  const lower = new THREE.Group();
  lower.name = `${name}:lower-joint`;
  lower.position.y = -upperLength;
  lower.add(limbSegment({
    radius: radius * 0.88,
    length: lowerLength,
    entryMaterial,
    boxy,
  }));
  const end = new THREE.Group();
  end.name = `${name}:${foot ? 'foot' : 'hand'}-joint`;
  end.position.y = -lowerLength;
  const endMesh = mesh(
    foot
      ? new THREE.BoxGeometry(radius * 2.3, radius * 1.5, radius * 3.6)
      : new THREE.SphereGeometry(radius * 1.12, 7, 5),
    entryMaterial,
  );
  if (foot) endMesh.position.z = radius * 0.75;
  end.add(endMesh);
  lower.add(end);
  upper.add(lower);
  parent.add(upper);
  return { upper, lower, end };
}

function createFace({ parent, headY, darkMaterial, tealMaterial, boxy }) {
  const eyeGeometry = boxy
    ? new THREE.BoxGeometry(0.075, 0.085, 0.035)
    : new THREE.SphereGeometry(0.03, 7, 5);
  const left = mesh(eyeGeometry, tealMaterial ?? darkMaterial);
  left.position.set(-0.13, headY + 0.03, boxy ? 0.31 : 0.35);
  const right = left.clone();
  right.position.x = 0.13;
  parent.add(left, right);
}

function buildArticulatedCharacter({ robot }) {
  const root = new THREE.Group();
  const primaryMaterial = material(
    robot ? ARENA_GREYBOX_COLOR.opponentPrimary : ARENA_GREYBOX_COLOR.localPrimary,
    robot ? { roughness: 0.62, metalness: 0.12 } : {},
  );
  const darkMaterial = material(
    robot ? ARENA_GREYBOX_COLOR.opponentDark : ARENA_GREYBOX_COLOR.localDark,
    robot ? { roughness: 0.56, metalness: 0.2 } : {},
  );
  const faceMaterial = material(
    robot ? ARENA_GREYBOX_COLOR.opponentPrimary : ARENA_GREYBOX_COLOR.localCream,
  );
  const tealMaterial = material(ARENA_GREYBOX_COLOR.teal, { metalness: 0.08 });

  const pelvis = new THREE.Group();
  pelvis.name = 'rig:pelvis';
  pelvis.position.y = -0.18;
  const pelvisMesh = mesh(
    robot ? new THREE.BoxGeometry(0.52, 0.24, 0.42) : new THREE.CapsuleGeometry(0.23, 0.16, 3, 7),
    darkMaterial,
  );
  pelvisMesh.position.y = 0.04;
  pelvis.add(pelvisMesh);

  const spine = new THREE.Group();
  spine.name = 'rig:spine';
  spine.position.y = 0.16;
  const torso = mesh(
    robot ? new THREE.BoxGeometry(0.66, 0.58, 0.54) : new THREE.CapsuleGeometry(0.31, 0.34, 4, 9),
    primaryMaterial,
  );
  torso.position.y = 0.28;
  spine.add(torso);

  const neck = new THREE.Group();
  neck.name = 'rig:neck';
  neck.position.y = 0.64;
  const head = mesh(
    robot ? new THREE.BoxGeometry(0.7, 0.52, 0.6) : new THREE.SphereGeometry(0.38, 11, 8),
    faceMaterial,
  );
  head.position.y = 0.25;
  if (!robot) head.scale.set(1, 0.95, 0.95);
  neck.add(head);
  createFace({ parent: neck, headY: 0.25, darkMaterial, tealMaterial: robot ? tealMaterial : null, boxy: robot });

  if (robot) {
    const face = mesh(new THREE.BoxGeometry(0.48, 0.24, 0.025), darkMaterial);
    face.position.set(0, 0.25, 0.31);
    face.renderOrder = -1;
    const chest = mesh(new THREE.BoxGeometry(0.17, 0.17, 0.045), tealMaterial);
    chest.rotation.z = Math.PI / 4;
    chest.position.set(0, 0.28, 0.29);
    neck.add(face);
    spine.add(chest);
  } else {
    const hair = mesh(
      new THREE.SphereGeometry(0.39, 9, 6, 0, Math.PI * 2, 0, 1.5),
      darkMaterial,
    );
    hair.position.y = 0.32;
    const scarf = mesh(new THREE.TorusGeometry(0.27, 0.052, 6, 14), tealMaterial);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.62;
    neck.add(hair);
    spine.add(scarf);
  }

  const armLeft = articulatedLimb({
    parent: spine,
    name: 'rig:arm-left',
    position: { x: -0.38, y: 0.52, z: 0 },
    upperLength: 0.31,
    lowerLength: 0.29,
    radius: 0.085,
    entryMaterial: darkMaterial,
    boxy: robot,
  });
  const armRight = articulatedLimb({
    parent: spine,
    name: 'rig:arm-right',
    position: { x: 0.38, y: 0.52, z: 0 },
    upperLength: 0.31,
    lowerLength: 0.29,
    radius: 0.085,
    entryMaterial: darkMaterial,
    boxy: robot,
  });
  const legLeft = articulatedLimb({
    parent: pelvis,
    name: 'rig:leg-left',
    position: { x: -0.17, y: -0.04, z: 0 },
    upperLength: 0.34,
    lowerLength: 0.34,
    radius: 0.095,
    entryMaterial: darkMaterial,
    boxy: robot,
    foot: true,
  });
  const legRight = articulatedLimb({
    parent: pelvis,
    name: 'rig:leg-right',
    position: { x: 0.17, y: -0.04, z: 0 },
    upperLength: 0.34,
    lowerLength: 0.34,
    radius: 0.095,
    entryMaterial: darkMaterial,
    boxy: robot,
    foot: true,
  });
  pelvis.add(spine);
  spine.add(neck);
  root.add(pelvis);
  return {
    root,
    joints: {
      pelvis,
      spine,
      neck,
      armLeftUpper: armLeft.upper,
      armLeftLower: armLeft.lower,
      armLeftHand: armLeft.end,
      armRightUpper: armRight.upper,
      armRightLower: armRight.lower,
      armRightHand: armRight.end,
      legLeftUpper: legLeft.upper,
      legLeftLower: legLeft.lower,
      legRightUpper: legRight.upper,
      legRightLower: legRight.lower,
    },
    attachment: armRight.end,
  };
}

function buildCharacter(geometry) {
  if (geometry === 'chibi-runner') return buildArticulatedCharacter({ robot: false });
  if (geometry === 'wind-up-robot') return buildArticulatedCharacter({ robot: true });
  throw new RangeError(`未知程序化角色 geometry ${String(geometry)}。`);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function mix(from, to, progress) {
  return from + (to - from) * clamp01(progress);
}

function actionVisualState(action, timing, presentation) {
  const duration = timing?.[`${action.phase}Ticks`] ?? 1;
  const progress = smoothstep(1 - action.ticksRemaining / Math.max(1, duration));
  if (action.phase === 'windup') {
    const anticipationEnd = presentation?.visualPhases?.anticipationEnd ?? 0.72;
    return { stage: 'raise', progress: smoothstep(progress / anticipationEnd) };
  }
  if (action.phase === 'active') return { stage: 'swing', progress };
  const followThroughEnd = presentation?.visualPhases?.followThroughEnd ?? 0.45;
  if (progress < followThroughEnd) {
    return { stage: 'follow-through', progress: progress / followThroughEnd };
  }
  return {
    stage: 'retract',
    progress: (progress - followThroughEnd) / Math.max(0.01, 1 - followThroughEnd),
  };
}

function resetJoint(joint) {
  joint.rotation.set(0, 0, 0);
}

function latestIncomingHit(frame, participantId) {
  let result = null;
  for (const event of frame?.events ?? []) {
    if (event.type === 'HitResolved' && event.targetId === participantId) result = event;
  }
  return result;
}

function hitDirection(frame, snapshot, event) {
  if (!event) return null;
  const attacker = frame.world.participants.find(({ id }) => id === event.attackerId);
  if (!attacker) return 'front';
  const toAttacker = {
    x: attacker.position.x - snapshot.position.x,
    z: attacker.position.z - snapshot.position.z,
  };
  const length = Math.hypot(toAttacker.x, toAttacker.z);
  if (length < 0.0001) return 'front';
  const dot = (toAttacker.x / length) * snapshot.facing.x
    + (toAttacker.z / length) * snapshot.facing.z;
  return dot >= 0 ? 'front' : 'back';
}

export class ProgrammaticCharacterView {
  #participantId;
  #presentationId;
  #presentationHash;
  #geometry;
  #visualRoot;
  #joints;
  #attachment;
  #heldEquipment;
  #snapshot;
  #animation;
  #elapsed;
  #stoppingTime;
  #wasMoving;
  #reactionDirection;
  #reactionTime;
  #takeoffPoseTime;
  #poseState;
  #animationCapabilities;
  #actionPresentations;
  #actionVisualStage;
  #targetPosition;
  #disposed;

  constructor({
    participantId,
    presentationDefinition,
    assetDefinition,
    actionPresentations,
    animationCapabilities = null,
  }) {
    if (typeof participantId !== 'string' || participantId.length === 0) {
      throw new TypeError('ProgrammaticCharacterView.participantId 必须是非空字符串。');
    }
    if (!presentationDefinition?.id || typeof presentationDefinition.getContentHash !== 'function') {
      throw new TypeError('ProgrammaticCharacterView 需要 presentation Definition。');
    }
    if (!assetDefinition?.sourceKey) {
      throw new TypeError('ProgrammaticCharacterView 需要 asset Definition。');
    }
    if (!actionPresentations || typeof actionPresentations !== 'object') {
      throw new TypeError('ProgrammaticCharacterView 需要 action presentations。');
    }
    const built = buildCharacter(assetDefinition.sourceKey);
    this.#participantId = participantId;
    this.#presentationId = presentationDefinition.id;
    this.#presentationHash = presentationDefinition.getContentHash();
    this.#geometry = assetDefinition.sourceKey;
    this.root = new THREE.Group();
    this.root.name = `ArenaCharacter:${participantId}`;
    this.#visualRoot = built.root;
    this.#visualRoot.position.y = -0.06;
    this.root.add(this.#visualRoot);
    this.#joints = built.joints;
    this.#attachment = built.attachment;
    this.#heldEquipment = null;
    this.#snapshot = null;
    this.#animation = null;
    this.#elapsed = 0;
    this.#stoppingTime = 0;
    this.#wasMoving = false;
    this.#reactionDirection = null;
    this.#reactionTime = 0;
    this.#takeoffPoseTime = 0;
    this.#poseState = 'idle';
    this.#animationCapabilities = animationCapabilities ?? Object.freeze({
      proceduralKeys: ARENA_ANIMATION_SEMANTIC_IDS,
      clipKeys: Object.freeze([]),
    });
    this.#actionPresentations = actionPresentations;
    this.#actionVisualStage = null;
    this.#targetPosition = new THREE.Vector3();
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('ProgrammaticCharacterView 已销毁。');
  }

  get geometry() {
    this.#assertUsable();
    return this.#geometry;
  }

  getAnimationCapabilities() {
    this.#assertUsable();
    return this.#animationCapabilities;
  }

  #syncEquipment(equipment) {
    const definitionId = equipment?.definitionId ?? null;
    if (this.#heldEquipment?.userData.definitionId === definitionId) return;
    if (this.#heldEquipment) {
      disposeThreeObject(this.#heldEquipment);
      this.#heldEquipment = null;
    }
    if (definitionId === null) return;
    const held = createProgrammaticEquipment(definitionId);
    held.userData.definitionId = definitionId;
    held.userData.baseScale = definitionId === 'hammer' ? 1.02 : 0.94;
    held.scale.setScalar(held.userData.baseScale);
    held.position.set(0, -0.03, definitionId === 'shield' ? 0.12 : 0.02);
    held.rotation.set(0, 0, 0);
    this.#attachment.add(held);
    this.#heldEquipment = held;
  }

  sync(snapshot, { snap = false, animation, direction, frame } = {}) {
    this.#assertUsable();
    if (snapshot.id !== this.#participantId) throw new RangeError('角色快照身份不一致。');
    if (
      snapshot.appearance?.presentationId !== this.#presentationId
      || snapshot.appearance?.definitionHash !== this.#presentationHash
    ) throw new RangeError('程序化角色 presentation Definition 不一致。');
    if (!animation?.semantics || !animation?.baseBinding) {
      throw new TypeError('程序化角色缺少 animation resolution。');
    }
    if (!direction?.worldFacing || !Number.isFinite(direction.modelFrontYawRadians)) {
      throw new TypeError('程序化角色缺少 six-sector direction resolution。');
    }
    const position = toVisualPosition(snapshot.position);
    if (snap || this.#snapshot === null) this.root.position.set(position.x, position.y, position.z);
    this.root.userData.targetPosition = position;
    this.root.rotation.y = visualFacingYaw(direction.worldFacing)
      - direction.modelFrontYawRadians;
    this.#syncEquipment(snapshot.equipment);
    const hit = latestIncomingHit(frame, snapshot.id);
    if (hit) {
      this.#reactionDirection = hitDirection(frame, snapshot, hit);
      this.#reactionTime = 0.22;
    }
    if ((frame?.events ?? []).some((event) => (
      event.type === 'ActionStarted'
      && event.participantId === snapshot.id
      && (
        event.action === 'movement.explicit-ground-jump'
        || event.action === 'movement.context-ground-jump'
      )
    ))) this.#takeoffPoseTime = 0.075;
    this.#snapshot = snapshot;
    this.#animation = Object.freeze({ ...animation, direction });
  }

  #resetPose() {
    for (const joint of Object.values(this.#joints)) resetJoint(joint);
    this.#visualRoot.rotation.set(0, 0, 0);
    this.#visualRoot.scale.set(1, 1, 1);
    this.#visualRoot.position.set(0, -0.06, 0);
    if (this.#heldEquipment) {
      this.#heldEquipment.rotation.set(0, 0, 0);
      const equipmentScale = this.#heldEquipment.userData.baseScale;
      this.#heldEquipment.scale.setScalar(equipmentScale);
    }
    this.#actionVisualStage = null;
  }

  #applyLocomotion(baseSemantic, speed) {
    const joints = this.#joints;
    const run = baseSemantic === ARENA_ANIMATION_SEMANTIC.RUN;
    const walk = baseSemantic === ARENA_ANIMATION_SEMANTIC.WALK;
    const locomotion = run ? Math.min(1, speed / 6) : walk ? Math.min(0.68, speed / 6) : 0;
    const cycle = this.#elapsed * (run ? 13 : 8);
    const swing = Math.sin(cycle) * (run ? 0.82 : 0.52) * locomotion;
    if (locomotion > 0) {
      joints.armLeftUpper.rotation.x = swing;
      joints.armRightUpper.rotation.x = -swing;
      joints.armLeftLower.rotation.x = Math.max(0, -swing) * 0.65;
      joints.armRightLower.rotation.x = Math.max(0, swing) * 0.65;
      joints.legLeftUpper.rotation.x = -swing;
      joints.legRightUpper.rotation.x = swing;
      joints.legLeftLower.rotation.x = Math.max(0, swing) * 0.9;
      joints.legRightLower.rotation.x = Math.max(0, -swing) * 0.9;
      joints.spine.rotation.x = run ? -0.12 : -0.04;
      joints.spine.rotation.y = Math.sin(cycle) * 0.07;
      this.#visualRoot.position.y += Math.abs(Math.sin(cycle)) * (run ? 0.055 : 0.03);
      this.#poseState = run ? 'moving-run' : 'moving-walk';
      return;
    }
    if (this.#stoppingTime > 0) {
      const settle = smoothstep(this.#stoppingTime / 0.16);
      joints.spine.rotation.x = 0.16 * settle;
      joints.legLeftUpper.rotation.x = -0.28 * settle;
      joints.legRightUpper.rotation.x = 0.2 * settle;
      joints.legLeftLower.rotation.x = 0.35 * settle;
      this.#poseState = 'stop-moving';
      return;
    }
    const breathe = Math.sin(this.#elapsed * 2.8);
    joints.spine.rotation.z = breathe * 0.015;
    joints.armLeftUpper.rotation.z = -0.07;
    joints.armRightUpper.rotation.z = 0.07;
    this.#visualRoot.position.y += breathe * 0.008;
    this.#poseState = 'idle';
  }

  #applyAirPose(baseSemantic) {
    const joints = this.#joints;
    if (
      this.#takeoffPoseTime > 0
      && baseSemantic === ARENA_ANIMATION_SEMANTIC.JUMP
    ) {
      joints.pelvis.rotation.x = 0.12;
      joints.spine.rotation.x = 0.18;
      joints.armLeftUpper.rotation.x = 0.38;
      joints.armRightUpper.rotation.x = 0.38;
      joints.legLeftUpper.rotation.x = -0.46;
      joints.legRightUpper.rotation.x = -0.46;
      joints.legLeftLower.rotation.x = 0.82;
      joints.legRightLower.rotation.x = 0.82;
      this.#visualRoot.position.y -= 0.08;
      this.#visualRoot.scale.set(1.05, 0.92, 1.05);
      this.#poseState = 'jump-prepare';
      return true;
    }
    if (baseSemantic === ARENA_ANIMATION_SEMANTIC.CROUCH_CHARGE) {
      joints.pelvis.rotation.x = 0.18;
      joints.spine.rotation.x = 0.22;
      joints.legLeftUpper.rotation.x = -0.68;
      joints.legRightUpper.rotation.x = -0.68;
      joints.legLeftLower.rotation.x = 1.15;
      joints.legRightLower.rotation.x = 1.15;
      this.#visualRoot.position.y -= 0.15;
      this.#visualRoot.scale.set(1.08, 0.86, 1.08);
      this.#poseState = 'jump-prepare';
      return true;
    }
    if (baseSemantic === ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP) {
      const phase = this.#animation.semantics.tick - this.#animation.semantics.baseEnteredAtTick;
      const startup = phase <= 2;
      joints.armLeftUpper.rotation.z = -1.05;
      joints.armRightUpper.rotation.z = 1.05;
      joints.legLeftUpper.rotation.x = -0.76;
      joints.legRightUpper.rotation.x = 0.76;
      joints.legLeftLower.rotation.x = 1.05;
      joints.legRightLower.rotation.x = 1.05;
      this.#visualRoot.rotation.y = startup ? phase * 1.3 : Math.sin(this.#elapsed * 6) * 0.18;
      this.#visualRoot.scale.set(1.12, 0.9, 1.12);
      this.#poseState = startup ? 'double-jump-start' : 'double-jump-air';
      return true;
    }
    if (!this.#snapshot.grounded) {
      const ascending = this.#snapshot.velocity.y > 0.35;
      joints.armLeftUpper.rotation.x = ascending ? -0.72 : -0.28;
      joints.armRightUpper.rotation.x = ascending ? -0.72 : -0.28;
      joints.armLeftUpper.rotation.z = -0.32;
      joints.armRightUpper.rotation.z = 0.32;
      joints.legLeftUpper.rotation.x = ascending ? -0.45 : 0.2;
      joints.legRightUpper.rotation.x = ascending ? 0.2 : -0.45;
      joints.legLeftLower.rotation.x = 0.75;
      joints.legRightLower.rotation.x = 0.75;
      this.#visualRoot.rotation.x = clamp01(-this.#snapshot.velocity.y / 12) * 0.22;
      this.#poseState = ascending ? 'jump-air-rise' : 'jump-air-fall';
      return true;
    }
    if (baseSemantic === ARENA_ANIMATION_SEMANTIC.LAND) {
      joints.spine.rotation.x = 0.25;
      joints.legLeftUpper.rotation.x = -0.42;
      joints.legRightUpper.rotation.x = -0.42;
      joints.legLeftLower.rotation.x = 0.8;
      joints.legRightLower.rotation.x = 0.8;
      this.#visualRoot.position.y -= 0.09;
      this.#poseState = 'land';
      return true;
    }
    return false;
  }

  #applyActionPose() {
    const action = this.#snapshot.action;
    const style = ACTION_STYLE[action.definitionId];
    const presentation = this.#actionPresentations[action.definitionId];
    const timing = presentation?.timing;
    if (!style || !timing || action.phase === 'idle') return;
    const joints = this.#joints;
    const visual = actionVisualState(action, timing, presentation);
    this.#actionVisualStage = visual.stage;
    const raise = visual.stage === 'raise' ? visual.progress : 1;
    const swing = visual.stage === 'swing' ? visual.progress : (
      visual.stage === 'raise' ? 0 : 1
    );
    const follow = visual.stage === 'follow-through' ? visual.progress : 0;
    const retract = visual.stage === 'retract' ? visual.progress : 0;
    const extension = visual.stage === 'raise' ? raise * 0.18 : 1 - retract;
    if (this.#heldEquipment) {
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
    if (style === 'push' || style === 'air-push') {
      const aerial = style === 'air-push';
      joints.spine.rotation.y = -0.34 * (1 - retract);
      joints.spine.rotation.x = (aerial ? 0.46 : -0.16) * swing;
      joints.armRightUpper.rotation.x = mix(0.6 * raise, -1.78, swing) * (1 - retract);
      joints.armRightUpper.rotation.z = 0.2;
      joints.armRightLower.rotation.x = mix(1.25, 0.08, extension);
      joints.armRightHand.rotation.z = -0.28 * swing + 0.12 * follow;
      joints.armLeftUpper.rotation.x = -0.4;
      if (aerial) {
        joints.legRightUpper.rotation.x = -1.05 * swing;
        joints.legRightLower.rotation.x = 0.28 + 0.55 * retract;
        this.#visualRoot.rotation.x = 0.32 + 0.26 * swing;
      }
      this.#poseState = `attack-${style}-${visual.stage}`;
    } else if (style === 'hammer') {
      const overhead = mix(0.45, 2.2, raise);
      const chop = mix(overhead, -1.42, swing) * (1 - retract);
      joints.spine.rotation.x = mix(-0.14, 0.52, swing) * (1 - retract);
      joints.armRightUpper.rotation.x = chop;
      joints.armRightLower.rotation.x = mix(0.72, 0.22, swing);
      joints.armRightHand.rotation.x = -0.2 + 0.34 * follow;
      joints.armLeftUpper.rotation.x = chop * 0.84;
      joints.armLeftUpper.rotation.z = 0.38 * (1 - retract);
      joints.armLeftLower.rotation.x = mix(0.78, 0.3, swing);
      joints.armLeftHand.rotation.z = 0.2 * follow;
      joints.legLeftUpper.rotation.x = -0.24;
      joints.legRightUpper.rotation.x = 0.24;
      this.#poseState = `attack-hammer-${visual.stage}`;
    } else if (style === 'air-hammer') {
      const overhead = mix(0.7, 2.35, raise);
      const chop = mix(overhead, -1.65, swing) * (1 - retract);
      joints.spine.rotation.x = 0.25 + 0.58 * swing;
      joints.armRightUpper.rotation.x = chop;
      joints.armLeftUpper.rotation.x = chop * 0.92;
      joints.armRightLower.rotation.x = mix(0.9, 0.18, swing);
      joints.armLeftLower.rotation.x = mix(0.82, 0.22, swing);
      joints.armRightHand.rotation.x = 0.3 * follow;
      joints.armLeftHand.rotation.x = 0.24 * follow;
      joints.legLeftUpper.rotation.x = -0.62;
      joints.legRightUpper.rotation.x = -0.38;
      joints.legLeftLower.rotation.x = 0.95;
      joints.legRightLower.rotation.x = 0.78;
      this.#visualRoot.rotation.x = 0.42 + 0.38 * swing;
      this.#poseState = `attack-air-hammer-${visual.stage}`;
    } else if (style === 'chain' || style === 'air-chain') {
      const aerial = style === 'air-chain';
      const cast = mix(0.18 * raise, 1, swing) * (1 - retract);
      joints.spine.rotation.y = -0.58 * (1 - retract);
      joints.spine.rotation.x = aerial ? 0.48 * swing : 0;
      joints.armRightUpper.rotation.x = -1.35 * cast;
      joints.armRightUpper.rotation.z = 0.72 - cast * 0.6;
      joints.armRightLower.rotation.x = 1.05 * (1 - cast);
      joints.armRightHand.rotation.x = -0.5 * swing + 0.42 * follow;
      joints.armLeftUpper.rotation.z = -0.72;
      joints.armLeftLower.rotation.x = 0.42 + 0.28 * follow;
      if (this.#heldEquipment) this.#heldEquipment.rotation.x = this.#elapsed * 12 * (1 - cast);
      if (aerial) this.#visualRoot.rotation.x = 0.34 + 0.3 * swing;
      this.#poseState = `attack-${style}-${visual.stage}`;
    } else if (style === 'shield' || style === 'air-shield') {
      const aerial = style === 'air-shield';
      const brace = (raise + swing) * (1 - retract);
      joints.spine.rotation.x = -0.34 * brace;
      joints.armRightUpper.rotation.x = -1.42 * brace;
      joints.armRightLower.rotation.x = 0.48 - 0.2 * swing;
      joints.armRightHand.rotation.z = 0.18 * follow;
      joints.armLeftUpper.rotation.x = -1.15 * brace;
      joints.armLeftLower.rotation.x = 0.78 - 0.18 * swing;
      joints.armLeftHand.rotation.z = -0.22 * follow;
      joints.legLeftUpper.rotation.x = -0.34;
      joints.legRightUpper.rotation.x = 0.34;
      this.#visualRoot.position.z += swing * 0.1;
      if (aerial) this.#visualRoot.rotation.x = 0.62 + 0.25 * swing;
      this.#poseState = `attack-${style}-${visual.stage}`;
    }
  }

  #applyEquipmentStance() {
    const definitionId = this.#snapshot.equipment?.definitionId;
    if (!definitionId || this.#snapshot.action.definitionId !== null) return;
    const joints = this.#joints;
    if (definitionId === 'hammer') {
      joints.armRightUpper.rotation.x = 0.42;
      joints.armRightUpper.rotation.z = 0.22;
      joints.armRightLower.rotation.x = 0.64;
      joints.spine.rotation.y = -0.08;
      this.#poseState = `${this.#poseState}+hammer-ready`;
    } else if (definitionId === 'chain') {
      joints.armRightUpper.rotation.z = 0.32;
      joints.armRightLower.rotation.x = 0.42;
      this.#poseState = `${this.#poseState}+chain-ready`;
    } else if (definitionId === 'shield') {
      joints.armRightUpper.rotation.x = -0.75;
      joints.armRightLower.rotation.x = 0.5;
      this.#poseState = `${this.#poseState}+shield-ready`;
    }
  }

  #applyHitReaction() {
    if (this.#snapshot.hitstunTicks <= 0 && this.#reactionTime <= 0) return false;
    const front = this.#reactionDirection !== 'back';
    const force = clamp01(Math.max(this.#reactionTime / 0.22, this.#snapshot.hitstunTicks / 18));
    const joints = this.#joints;
    joints.spine.rotation.x = (front ? 0.72 : -0.62) * force;
    joints.neck.rotation.x = (front ? -0.5 : 0.48) * force;
    joints.armLeftUpper.rotation.x = front ? 0.7 : -0.8;
    joints.armRightUpper.rotation.x = front ? 0.55 : -0.65;
    joints.armLeftUpper.rotation.z = -0.62;
    joints.armRightUpper.rotation.z = 0.62;
    joints.legLeftUpper.rotation.x = front ? -0.35 : 0.35;
    joints.legRightUpper.rotation.x = front ? 0.25 : -0.25;
    this.#visualRoot.rotation.x = (front ? 0.18 : -0.16) * force;
    this.#poseState = front ? 'hit-front' : 'hit-back';
    return true;
  }

  update(deltaSeconds) {
    this.#assertUsable();
    if (!this.#snapshot) return;
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    this.#elapsed += delta;
    this.#reactionTime = Math.max(0, this.#reactionTime - delta);
    this.#takeoffPoseTime = Math.max(0, this.#takeoffPoseTime - delta);
    const target = this.root.userData.targetPosition;
    const blend = 1 - Math.exp(-20 * delta);
    this.#targetPosition.set(target.x, target.y, target.z);
    this.root.position.lerp(this.#targetPosition, blend);
    const baseSemantic = this.#animation.semantics.baseSemantic;
    const speed = Math.hypot(this.#snapshot.velocity.x, this.#snapshot.velocity.z);
    const moving = this.#snapshot.grounded && speed >= 0.15;
    if (this.#wasMoving && !moving) this.#stoppingTime = 0.16;
    this.#stoppingTime = Math.max(0, this.#stoppingTime - delta);
    this.#wasMoving = moving;
    this.#resetPose();
    if (!this.#applyHitReaction()) {
      if (!this.#applyAirPose(baseSemantic)) this.#applyLocomotion(baseSemantic, speed);
      this.#applyEquipmentStance();
      this.#applyActionPose();
    }
    const visible = this.#snapshot.status === 'active'
      && (this.#snapshot.invulnerableTicks === 0 || Math.floor(this.#elapsed * 12) % 2 === 0);
    this.root.visible = visible;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      participantId: this.#participantId,
      presentationId: this.#presentationId,
      presentationHash: this.#presentationHash,
      geometry: this.#geometry,
      hasSnapshot: this.#snapshot !== null,
      baseSemantic: this.#animation?.semantics.baseSemantic ?? null,
      overlaySemantic: this.#animation?.semantics.overlaySemantic ?? null,
      directionId: this.#animation?.direction.id ?? null,
      heldEquipmentDefinitionId: this.#heldEquipment?.userData.definitionId ?? null,
      reactionDirection: this.#reactionDirection,
      poseState: this.#poseState,
      actionVisualStage: this.#actionVisualStage,
      heldEquipmentScale: this.#heldEquipment?.scale.x ?? null,
      jointCount: Object.keys(this.#joints).length,
      objectCount: (() => {
        let count = 0;
        this.root.traverse(() => { count += 1; });
        return count;
      })(),
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#heldEquipment = null;
    disposeThreeObject(this.root);
  }
}
