import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ARENA_GREYBOX_COLOR } from './greybox-style.js';

function material(color, { metalness = 0.08, roughness = 0.72 } = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function mesh(geometry, entryMaterial, { castShadow = true } = {}) {
  const value = new THREE.Mesh(geometry, entryMaterial);
  value.castShadow = castShadow;
  value.receiveShadow = false;
  return value;
}

function createHammer() {
  const root = new THREE.Group();
  root.name = 'ArenaWeapon:Hammer';
  const steel = material(0x65727b, { metalness: 0.58, roughness: 0.32 });
  const darkSteel = material(0x263138, { metalness: 0.48, roughness: 0.38 });
  const brass = material(0xf0b64c, { metalness: 0.52, roughness: 0.3 });
  const grip = material(0x3c2320, { metalness: 0.02, roughness: 0.86 });
  const handle = mesh(
    new THREE.CylinderGeometry(0.055, 0.078, 1.08, 12),
    grip,
  );
  handle.position.y = -0.5;
  const head = mesh(
    new RoundedBoxGeometry(0.62, 0.38, 0.42, 4, 0.055),
    darkSteel,
  );
  head.position.y = -1.02;
  const leftFace = mesh(
    new THREE.CylinderGeometry(0.265, 0.23, 0.23, 12),
    steel,
  );
  leftFace.position.set(-0.39, -1.02, 0);
  leftFace.rotation.z = Math.PI / 2;
  const rightFace = leftFace.clone();
  rightFace.position.x = 0.39;
  const collar = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), brass);
  collar.position.y = -0.88;
  const pommel = mesh(new THREE.SphereGeometry(0.095, 12, 8), brass);
  pommel.position.y = 0.08;
  const rune = mesh(new THREE.BoxGeometry(0.32, 0.055, 0.435), brass);
  rune.position.set(0, -1.02, 0);
  root.add(handle, head, leftFace, rightFace, collar, pommel, rune);
  return root;
}

function createShield() {
  const root = new THREE.Group();
  root.name = 'ArenaWeapon:Shield';
  const shield = mesh(
    new THREE.CylinderGeometry(0.43, 0.43, 0.105, 16),
    material(ARENA_GREYBOX_COLOR.teal, { metalness: 0.15, roughness: 0.5 }),
  );
  shield.rotation.x = Math.PI / 2;
  const boss = mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    material(ARENA_GREYBOX_COLOR.equipment, { metalness: 0.25, roughness: 0.5 }),
  );
  boss.position.z = 0.09;
  const warningBar = mesh(
    new THREE.BoxGeometry(0.56, 0.11, 0.045),
    material(ARENA_GREYBOX_COLOR.warning, { metalness: 0.1, roughness: 0.54 }),
  );
  warningBar.position.z = 0.1;
  root.add(shield, boss, warningBar);
  return root;
}

function createChain() {
  const root = new THREE.Group();
  root.name = 'ArenaWeapon:Chain';
  const chainMaterial = material(ARENA_GREYBOX_COLOR.equipment, {
    metalness: 0.35,
    roughness: 0.45,
  });
  for (let index = 0; index < 7; index += 1) {
    const link = mesh(new THREE.TorusGeometry(0.115, 0.032, 6, 10), chainMaterial);
    link.position.y = -index * 0.17;
    link.rotation.x = index % 2 === 0 ? Math.PI / 2 : 0;
    root.add(link);
  }
  const hook = mesh(
    new THREE.TorusGeometry(0.18, 0.055, 7, 12, Math.PI * 1.45),
    material(ARENA_GREYBOX_COLOR.danger, { metalness: 0.26, roughness: 0.46 }),
  );
  hook.position.y = -1.2;
  hook.rotation.z = Math.PI * 0.3;
  root.add(hook);
  return root;
}

export function createProgrammaticEquipment(definitionId) {
  if (definitionId === 'hammer') return createHammer();
  if (definitionId === 'shield') return createShield();
  if (definitionId === 'chain') return createChain();
  throw new RangeError(`未知程序化装备 ${String(definitionId)}。`);
}
