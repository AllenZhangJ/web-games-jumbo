import * as THREE from 'three';
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
  root.name = 'GreyboxHammer';
  const handle = mesh(
    new THREE.CylinderGeometry(0.055, 0.07, 0.8, 8),
    material(ARENA_GREYBOX_COLOR.localDark),
  );
  handle.rotation.z = Math.PI / 2;
  const head = mesh(
    new THREE.BoxGeometry(0.42, 0.28, 0.28),
    material(ARENA_GREYBOX_COLOR.equipment, { metalness: 0.25, roughness: 0.55 }),
  );
  head.position.x = 0.4;
  root.add(handle, head);
  return root;
}

function createShield() {
  const root = new THREE.Group();
  root.name = 'GreyboxShield';
  const shield = mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.09, 12),
    material(ARENA_GREYBOX_COLOR.teal, { metalness: 0.15, roughness: 0.5 }),
  );
  shield.rotation.x = Math.PI / 2;
  const boss = mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    material(ARENA_GREYBOX_COLOR.equipment, { metalness: 0.25, roughness: 0.5 }),
  );
  boss.position.z = 0.07;
  root.add(shield, boss);
  return root;
}

function createChain() {
  const root = new THREE.Group();
  root.name = 'GreyboxChain';
  const chainMaterial = material(ARENA_GREYBOX_COLOR.equipment, {
    metalness: 0.35,
    roughness: 0.45,
  });
  for (let index = 0; index < 4; index += 1) {
    const link = mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 10), chainMaterial);
    link.position.x = index * 0.18;
    link.rotation.y = index % 2 === 0 ? 0 : Math.PI / 2;
    root.add(link);
  }
  return root;
}

export function createProgrammaticEquipment(definitionId) {
  if (definitionId === 'hammer') return createHammer();
  if (definitionId === 'shield') return createShield();
  if (definitionId === 'chain') return createChain();
  throw new RangeError(`未知程序化装备 ${String(definitionId)}。`);
}
