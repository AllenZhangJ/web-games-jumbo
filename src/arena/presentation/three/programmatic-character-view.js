import * as THREE from 'three';
import { disposeThreeObject } from './dispose-three-resources.js';
import { ARENA_GREYBOX_COLOR } from './greybox-style.js';
import { createProgrammaticEquipment } from './programmatic-equipment.js';
import { toVisualPosition, visualFacingYaw } from './visual-coordinate.js';

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

function pivotedLimb({ color, x, y, length = 0.52, radius = 0.09 }) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const limb = mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 3, 6),
    material(color),
  );
  limb.position.y = -length / 2;
  pivot.add(limb);
  return pivot;
}

function buildChibi() {
  const root = new THREE.Group();
  const bodyMaterial = material(ARENA_GREYBOX_COLOR.localPrimary);
  const darkMaterial = material(ARENA_GREYBOX_COLOR.localDark);
  const creamMaterial = material(ARENA_GREYBOX_COLOR.localCream);
  const tealMaterial = material(ARENA_GREYBOX_COLOR.teal);
  const torso = mesh(new THREE.CapsuleGeometry(0.3, 0.35, 4, 8), bodyMaterial);
  torso.position.y = 0.05;
  const head = mesh(new THREE.SphereGeometry(0.38, 10, 8), creamMaterial);
  head.scale.set(1, 0.95, 0.95);
  head.position.y = 0.67;
  const hair = mesh(new THREE.SphereGeometry(0.39, 8, 5, 0, Math.PI * 2, 0, 1.5), darkMaterial);
  hair.position.y = 0.75;
  const scarf = mesh(new THREE.TorusGeometry(0.27, 0.05, 6, 12), tealMaterial);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.39;
  const eyeLeft = mesh(new THREE.SphereGeometry(0.026, 6, 4), darkMaterial);
  eyeLeft.position.set(-0.12, 0.7, 0.35);
  const eyeRight = eyeLeft.clone();
  eyeRight.position.x = 0.12;
  const armLeft = pivotedLimb({ color: ARENA_GREYBOX_COLOR.localDark, x: -0.32, y: 0.24 });
  const armRight = pivotedLimb({ color: ARENA_GREYBOX_COLOR.localDark, x: 0.32, y: 0.24 });
  const legLeft = pivotedLimb({ color: ARENA_GREYBOX_COLOR.localDark, x: -0.16, y: -0.25 });
  const legRight = pivotedLimb({ color: ARENA_GREYBOX_COLOR.localDark, x: 0.16, y: -0.25 });
  root.add(
    torso,
    head,
    hair,
    scarf,
    eyeLeft,
    eyeRight,
    armLeft,
    armRight,
    legLeft,
    legRight,
  );
  return { root, armLeft, armRight, legLeft, legRight, attachment: armRight };
}

function buildRobot() {
  const root = new THREE.Group();
  const creamMaterial = material(ARENA_GREYBOX_COLOR.opponentPrimary, {
    roughness: 0.64,
    metalness: 0.08,
  });
  const darkMaterial = material(ARENA_GREYBOX_COLOR.opponentDark, {
    roughness: 0.58,
    metalness: 0.18,
  });
  const redMaterial = material(ARENA_GREYBOX_COLOR.localPrimary);
  const tealMaterial = material(ARENA_GREYBOX_COLOR.teal);
  const body = mesh(new THREE.BoxGeometry(0.66, 0.62, 0.54), creamMaterial);
  body.position.y = 0.06;
  const head = mesh(new THREE.BoxGeometry(0.72, 0.55, 0.6), creamMaterial);
  head.position.y = 0.62;
  const face = mesh(new THREE.BoxGeometry(0.48, 0.25, 0.025), darkMaterial);
  face.position.set(0, 0.63, 0.31);
  const eyeLeft = mesh(new THREE.BoxGeometry(0.07, 0.08, 0.035), tealMaterial);
  eyeLeft.position.set(-0.13, 0.64, 0.34);
  const eyeRight = eyeLeft.clone();
  eyeRight.position.x = 0.13;
  const chest = mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), redMaterial);
  chest.rotation.z = Math.PI / 4;
  chest.position.set(0, 0.08, 0.29);
  const keyStem = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6), darkMaterial);
  keyStem.rotation.z = Math.PI / 2;
  keyStem.position.set(0.49, 0.1, 0);
  const keyLoop = mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 10), darkMaterial);
  keyLoop.rotation.y = Math.PI / 2;
  keyLoop.position.set(0.68, 0.1, 0);
  const armLeft = pivotedLimb({ color: ARENA_GREYBOX_COLOR.opponentDark, x: -0.4, y: 0.25, length: 0.45 });
  const armRight = pivotedLimb({ color: ARENA_GREYBOX_COLOR.opponentDark, x: 0.4, y: 0.25, length: 0.45 });
  const legLeft = pivotedLimb({ color: ARENA_GREYBOX_COLOR.opponentDark, x: -0.18, y: -0.25, length: 0.4 });
  const legRight = pivotedLimb({ color: ARENA_GREYBOX_COLOR.opponentDark, x: 0.18, y: -0.25, length: 0.4 });
  root.add(
    body,
    head,
    face,
    eyeLeft,
    eyeRight,
    chest,
    keyStem,
    keyLoop,
    armLeft,
    armRight,
    legLeft,
    legRight,
  );
  return { root, armLeft, armRight, legLeft, legRight, attachment: armRight };
}

function buildCharacter(geometry) {
  if (geometry === 'chibi-runner') return buildChibi();
  if (geometry === 'wind-up-robot') return buildRobot();
  throw new RangeError(`未知程序化角色 geometry ${String(geometry)}。`);
}

export class ProgrammaticCharacterView {
  #participantId;
  #geometry;
  #visualRoot;
  #armLeft;
  #armRight;
  #legLeft;
  #legRight;
  #attachment;
  #heldEquipment;
  #snapshot;
  #elapsed;
  #disposed;

  constructor({ participantId, appearance }) {
    if (typeof participantId !== 'string' || participantId.length === 0) {
      throw new TypeError('ProgrammaticCharacterView.participantId 必须是非空字符串。');
    }
    const built = buildCharacter(appearance?.geometry);
    this.#participantId = participantId;
    this.#geometry = appearance.geometry;
    this.root = new THREE.Group();
    this.root.name = `ArenaCharacter:${participantId}`;
    this.#visualRoot = built.root;
    this.#visualRoot.position.y = -0.05;
    this.root.add(this.#visualRoot);
    this.#armLeft = built.armLeft;
    this.#armRight = built.armRight;
    this.#legLeft = built.legLeft;
    this.#legRight = built.legRight;
    this.#attachment = built.attachment;
    this.#heldEquipment = null;
    this.#snapshot = null;
    this.#elapsed = 0;
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('ProgrammaticCharacterView 已销毁。');
  }

  get geometry() {
    this.#assertUsable();
    return this.#geometry;
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
    held.scale.setScalar(0.72);
    held.position.set(0, -0.44, 0.08);
    held.rotation.y = Math.PI / 2;
    this.#attachment.add(held);
    this.#heldEquipment = held;
  }

  sync(snapshot, { snap = false } = {}) {
    this.#assertUsable();
    if (snapshot.id !== this.#participantId) throw new RangeError('角色快照身份不一致。');
    const position = toVisualPosition(snapshot.position);
    if (snap || this.#snapshot === null) this.root.position.set(position.x, position.y, position.z);
    this.root.userData.targetPosition = position;
    this.root.rotation.y = visualFacingYaw(snapshot.facing);
    this.#syncEquipment(snapshot.equipment);
    this.#snapshot = snapshot;
  }

  update(deltaSeconds) {
    this.#assertUsable();
    if (!this.#snapshot) return;
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    this.#elapsed += delta;
    const target = this.root.userData.targetPosition;
    const blend = 1 - Math.exp(-20 * delta);
    this.root.position.lerp(new THREE.Vector3(target.x, target.y, target.z), blend);
    const speed = Math.hypot(this.#snapshot.velocity.x, this.#snapshot.velocity.z);
    const locomotion = Math.min(1, speed / 6);
    const cycle = this.#elapsed * (5 + locomotion * 8);
    const swing = Math.sin(cycle) * 0.65 * locomotion;
    this.#armLeft.rotation.x = swing;
    this.#armRight.rotation.x = -swing;
    this.#legLeft.rotation.x = -swing;
    this.#legRight.rotation.x = swing;
    const airborne = !this.#snapshot.grounded;
    const actionPulse = this.#snapshot.action?.phase === 'active' ? 1 : 0;
    this.#visualRoot.position.y = -0.05
      + (airborne ? 0.06 : Math.abs(Math.sin(cycle)) * 0.035 * locomotion);
    this.#visualRoot.rotation.z = airborne
      ? Math.max(-0.22, Math.min(0.22, -this.#snapshot.velocity.y * 0.018))
      : 0;
    this.#visualRoot.scale.setScalar(1 + actionPulse * 0.08);
    const visible = this.#snapshot.status === 'active'
      && (this.#snapshot.invulnerableTicks === 0 || Math.floor(this.#elapsed * 12) % 2 === 0);
    this.root.visible = visible;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      participantId: this.#participantId,
      geometry: this.#geometry,
      hasSnapshot: this.#snapshot !== null,
      heldEquipmentDefinitionId: this.#heldEquipment?.userData.definitionId ?? null,
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
