import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ARENA_GREYBOX_COLOR } from './greybox-style.js';

interface ProgrammaticEquipmentBuildUnit {
  readonly dispose: () => unknown;
  disposed: boolean;
}

interface ProgrammaticEquipmentBuildResources {
  root: THREE.Group | null;
  readonly units: ProgrammaticEquipmentBuildUnit[];
  rootCleared: boolean;
}

export const PROGRAMMATIC_EQUIPMENT_BUILD_CONSTRUCTION_LIFECYCLE_V1 = Object.freeze({
  id: 'programmatic-equipment-build-construction-lifecycle-v1',
  resourcesTrackedFromFirstGpuAllocation: true,
  partialRootCleanupIsRetryable: true,
});

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function track<T extends { dispose(): unknown }>(
  resources: ProgrammaticEquipmentBuildResources,
  resource: T,
): T {
  resources.units.push({ dispose: () => resource.dispose(), disposed: false });
  return resource;
}

function material(
  resources: ProgrammaticEquipmentBuildResources,
  color: number,
  { metalness = 0.08, roughness = 0.72 } = {},
): THREE.MeshStandardMaterial {
  return track(resources, new THREE.MeshStandardMaterial({ color, metalness, roughness }));
}

function mesh(
  geometry: THREE.BufferGeometry,
  entryMaterial: THREE.Material,
  { castShadow = true } = {},
): THREE.Mesh {
  const value = new THREE.Mesh(geometry, entryMaterial);
  value.castShadow = castShadow;
  value.receiveShadow = false;
  return value;
}

function createHammer(resources: ProgrammaticEquipmentBuildResources): THREE.Group {
  const root = new THREE.Group();
  resources.root = root;
  root.name = 'ArenaWeapon:Hammer';
  const steel = material(resources, 0x65727b, { metalness: 0.58, roughness: 0.32 });
  const darkSteel = material(resources, 0x263138, { metalness: 0.48, roughness: 0.38 });
  const brass = material(resources, 0xf0b64c, { metalness: 0.52, roughness: 0.3 });
  const grip = material(resources, 0x3c2320, { metalness: 0.02, roughness: 0.86 });
  const handle = mesh(track(resources, new THREE.CylinderGeometry(0.055, 0.078, 1.08, 12)), grip);
  handle.position.y = -0.5;
  const head = mesh(track(resources, new RoundedBoxGeometry(0.62, 0.38, 0.42, 4, 0.055)), darkSteel);
  head.position.y = -1.02;
  const leftFace = mesh(track(resources, new THREE.CylinderGeometry(0.265, 0.23, 0.23, 12)), steel);
  leftFace.position.set(-0.39, -1.02, 0);
  leftFace.rotation.z = Math.PI / 2;
  const rightFace = leftFace.clone();
  rightFace.position.x = 0.39;
  const collar = mesh(track(resources, new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12)), brass);
  collar.position.y = -0.88;
  const pommel = mesh(track(resources, new THREE.SphereGeometry(0.095, 12, 8)), brass);
  pommel.position.y = 0.08;
  const rune = mesh(track(resources, new THREE.BoxGeometry(0.32, 0.055, 0.435)), brass);
  rune.position.set(0, -1.02, 0);
  root.add(handle, head, leftFace, rightFace, collar, pommel, rune);
  return root;
}

function createShield(resources: ProgrammaticEquipmentBuildResources): THREE.Group {
  const root = new THREE.Group();
  resources.root = root;
  root.name = 'ArenaWeapon:Shield';
  const shield = mesh(track(resources, new THREE.CylinderGeometry(0.43, 0.43, 0.105, 16)), material(
    resources,
    ARENA_GREYBOX_COLOR.teal, { metalness: 0.15, roughness: 0.5 },
  ));
  shield.rotation.x = Math.PI / 2;
  const boss = mesh(track(resources, new THREE.SphereGeometry(0.1, 8, 6)), material(
    resources,
    ARENA_GREYBOX_COLOR.equipment, { metalness: 0.25, roughness: 0.5 },
  ));
  boss.position.z = 0.09;
  const warningBar = mesh(track(resources, new THREE.BoxGeometry(0.56, 0.11, 0.045)), material(
    resources,
    ARENA_GREYBOX_COLOR.warning, { metalness: 0.1, roughness: 0.54 },
  ));
  warningBar.position.z = 0.1;
  root.add(shield, boss, warningBar);
  return root;
}

function createChain(resources: ProgrammaticEquipmentBuildResources): THREE.Group {
  const root = new THREE.Group();
  resources.root = root;
  root.name = 'ArenaWeapon:Chain';
  const chainMaterial = material(resources, ARENA_GREYBOX_COLOR.equipment, { metalness: 0.35, roughness: 0.45 });
  for (let index = 0; index < 7; index += 1) {
    const link = mesh(track(resources, new THREE.TorusGeometry(0.115, 0.032, 6, 10)), chainMaterial);
    link.position.y = -index * 0.17;
    link.rotation.x = index % 2 === 0 ? Math.PI / 2 : 0;
    root.add(link);
  }
  const hook = mesh(track(resources, new THREE.TorusGeometry(0.18, 0.055, 7, 12, Math.PI * 1.45)), material(
    resources,
    ARENA_GREYBOX_COLOR.danger, { metalness: 0.26, roughness: 0.46 },
  ));
  hook.position.y = -1.2;
  hook.rotation.z = Math.PI * 0.3;
  root.add(hook);
  return root;
}

function buildCleanupComplete(resources: ProgrammaticEquipmentBuildResources): boolean {
  return (resources.root === null || resources.rootCleared)
    && resources.units.every(({ disposed }) => disposed);
}

function cleanupBuildResources(resources: ProgrammaticEquipmentBuildResources): void {
  const errors: unknown[] = [];
  if (resources.root !== null && !resources.rootCleared) {
    try {
      rejectThenable(resources.root.clear(), 'Programmatic equipment root.clear()');
      resources.rootCleared = true;
    } catch (error) { errors.push(error); }
  }
  if (resources.root === null || resources.rootCleared) {
    for (const unit of resources.units) {
      if (unit.disposed) continue;
      try {
        rejectThenable(unit.dispose(), 'Programmatic equipment resource.dispose()');
        unit.disposed = true;
      } catch (error) { errors.push(error); }
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, '程序化装备构造资源清理未完整完成。');
  }
  if (!buildCleanupComplete(resources)) {
    throw new Error('程序化装备构造资源清理依赖尚未收敛。');
  }
}

export class ProgrammaticEquipmentBuildConstructionCleanupError extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ProgrammaticEquipmentBuildResources;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ProgrammaticEquipmentBuildResources,
  ) {
    super([originalError, cleanupError], '程序化装备构造失败且清理未完整完成。');
    this.name = 'ProgrammaticEquipmentBuildConstructionCleanupError';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean { return buildCleanupComplete(this.#resources); }
  retryCleanup(): void { cleanupBuildResources(this.#resources); }
}

export function createProgrammaticEquipment(definitionId: unknown): THREE.Group {
  const build = definitionId === 'hammer'
    ? createHammer
    : definitionId === 'shield'
      ? createShield
      : definitionId === 'chain'
        ? createChain
        : null;
  if (build === null) throw new RangeError(`未知程序化装备 ${String(definitionId)}。`);
  const resources: ProgrammaticEquipmentBuildResources = {
    root: null,
    units: [],
    rootCleared: false,
  };
  try {
    return build(resources);
  } catch (error) {
    try { cleanupBuildResources(resources); }
    catch (cleanupError) {
      throw new ProgrammaticEquipmentBuildConstructionCleanupError(error, cleanupError, resources);
    }
    throw error;
  }
}
