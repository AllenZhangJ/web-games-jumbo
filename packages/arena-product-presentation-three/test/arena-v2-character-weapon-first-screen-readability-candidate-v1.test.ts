import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1,
  ARENA_V2_CHARACTER_WEAPON_FIRST_SCREEN_READABILITY_CANDIDATE_V1,
  ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1,
  ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1,
  ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1,
} from '../src/arena-v2-character-weapon-first-screen-readability-candidate-v1.js';

const HAMMER_EQUIPMENT = 'arena-v2.weapon.heavy-hammer.candidate.v1';
const HAMMER_ACTION = 'arena-v2.action.heavy-hammer.ground.candidate.v1';

function input(overrides: Readonly<Record<string, unknown>> = {}): unknown {
  return {
    schemaVersion: 1,
    tick: 11,
    participantId: 'p1',
    equipmentDefinitionId: HAMMER_EQUIPMENT,
    placement: 'held',
    actionDefinitionId: HAMMER_ACTION,
    actionPhase: 'windup',
    actionStartedCue: {
      sourceEventId: 'event-action-1',
      tick: 10,
      sequence: 3,
      participantId: 'p1',
      actionDefinitionId: HAMMER_ACTION,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
    },
    weaponFeedbackCue: null,
    reducedMotion: false,
    muted: false,
    assetLoadState: 'ready',
    ...overrides,
  };
}

function object(options: Readonly<{
  readonly position?: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly scale?: readonly [number, number, number];
}> = {}): THREE.Group {
  const root = new THREE.Group();
  root.position.set(...(options.position ?? [0, 0, 0]));
  root.rotation.set(...(options.rotation ?? [0, 0, 0]));
  root.scale.set(...(options.scale ?? [1, 1, 1]));
  root.add(new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  ));
  return root;
}

function disposeGeometry(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function expectEulerEqual(actual: THREE.Euler, expected: THREE.Euler): void {
  expect({ x: actual.x, y: actual.y, z: actual.z, order: actual.order }).toEqual({
    x: expected.x,
    y: expected.y,
    z: expected.z,
    order: expected.order,
  });
}

describe('Arena V2 A4/A5 first-screen readability candidate', () => {
  it('closes six shared-rig identities and twenty bounded weapon profiles', () => {
    expect(ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1).toHaveLength(6);
    expect(new Set(ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.map(
      ({ sharedRigProfileId }) => sharedRigProfileId,
    ))).toEqual(new Set(['arena.rig.kaykit-humanoid.v1']));
    expect(ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1).toHaveLength(20);
    expect(ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.filter(
      ({ status }) => status === 'implementation-candidate-not-run',
    )).toHaveLength(20);
    expect(ARENA_V2_CHARACTER_WEAPON_FIRST_SCREEN_READABILITY_CANDIDATE_V1.hardGate).toBe(false);
    expect(ARENA_V2_CHARACTER_WEAPON_FIRST_SCREEN_READABILITY_CANDIDATE_V1.implementationStatus)
      .toBe('code-written-not-run');
    expect(ARENA_V2_CHARACTER_WEAPON_FIRST_SCREEN_READABILITY_CANDIDATE_V1.validationStatus)
      .toBe('not-run');
  });

  it('binds six handling identities to unique poses and complete non-color value patterns', () => {
    const identities = ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1;
    const playableMaterials = ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1
      .filter(({ id }) => id.includes('kaykit-runner'));
    const meshNames = [
      'Rogue_ArmLeft',
      'Rogue_ArmRight',
      'Rogue_Body',
      'Rogue_Head',
      'Rogue_LegLeft',
      'Rogue_LegRight',
      'Rogue_Cape',
    ];
    expect(playableMaterials).toHaveLength(6);
    expect(new Set(identities.map(({ valuePattern }) => valuePattern.id)).size).toBe(6);
    expect(new Set(identities.map(({ selectionPose }) => (
      `${selectionPose.semantic}:${selectionPose.sampleRatio}`
    ))).size).toBe(6);
    expect(new Set(playableMaterials.map(({ valuePattern }) => JSON.stringify(
      valuePattern.meshValueMultipliers.map(({ multiplier }) => multiplier),
    ))).size).toBe(6);
    for (const identity of identities) {
      const material = playableMaterials.find(({ id }) => id === identity.materialProfileId);
      expect(material).toBeDefined();
      expect(material!.valuePattern.id).toBe(identity.valuePattern.id);
      expect(material!.valuePattern.meshValueMultipliers.map(({ meshName }) => meshName))
        .toEqual(meshNames);
      expect(material!.valuePattern.colorIsNeverSoleSignal).toBe(true);
      expect(material!.valuePattern.addsGeometry).toBe(false);
      expect(material!.valuePattern.addsDrawCalls).toBe(false);
      expect(identity.nonColorParticipantIdentitySource)
        .toBe('PublicMatchInfoV2.identityGlyphKey+identityPatternKey');
      expect(identity.nonColorCharacterIdentitySource)
        .toBe('character-material-profile.valuePattern');
      expect(identity.handlingShapeAxis.length).toBeGreaterThan(0);
      expect(identity.selectionPose.intent.length).toBeGreaterThan(0);
    }
  });

  it('binds every weapon to unique bytes, SHA-256, shape and non-color pattern evidence', () => {
    const profiles = ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1;
    expect(new Set(profiles.map(({ asset }) => asset.artifactPath)).size).toBe(20);
    expect(new Set(profiles.map(({ asset }) => asset.sha256)).size).toBe(20);
    for (const profile of profiles) {
      expect(profile.asset.licenseId).toBe('CC0-1.0');
      expect(profile.asset.sourceRevision).toMatch(/^[0-9a-f]{40}$/);
      expect(profile.asset.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(profile.asset.byteLength).toBeLessThanOrEqual(profile.asset.byteBudgetBytes);
      expect(profile.asset.withinCandidateByteBudget).toBe(true);
      expect(profile.asset.geometryMaterialTextureBudgetStatus).toBe('not-run');
      expect(profile.asset.productionAssetApproved).toBe(false);
      expect(profile.silhouette.shapeCue.length).toBeGreaterThan(0);
      expect(profile.silhouette.patternCue.length).toBeGreaterThan(0);
      expect(profile.silhouette.identityScaleSource)
        .toBe('shared-held-and-ground-local-silhouette-profile');
      expect(profile.silhouette.addsGeometry).toBe(false);
      expect(profile.silhouette.modifiesCollision).toBe(false);
      expect(profile.silhouette.evidenceStatus).toBe('code-written-not-run');
      expect(Object.isFrozen(profile.silhouette.identityScaleAxes)).toBe(true);
      expect(profile.silhouette.identityScaleAxes).toHaveLength(3);
      for (const axis of profile.silhouette.identityScaleAxes) {
        expect(axis).toBeGreaterThanOrEqual(0.84);
        expect(axis).toBeLessThanOrEqual(1.25);
      }
      expect(profile.cameraBands.map(({ distanceMeters }) => distanceMeters)).toEqual([0, 5, 12]);
    }
    expect(new Set(profiles.map(({ silhouette }) => (
      silhouette.identityScaleAxes.join(',')
    ))).size).toBe(20);
  });

  it('accepts all twenty implementation candidates and authoritative action identity', () => {
    const root = object();
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    const snapshot = view.consume(input());
    expect(snapshot.weaponId).toBe('heavy-hammer');
    expect(snapshot.actionPhase).toBe('windup');
    expect(snapshot.actionStartedSourceEventId).toBe('event-action-1');
    expect(snapshot.actionStartedDuplicateSuppressed).toBe(false);
    expect(snapshot.visualDependsOnAudioPlayback).toBe(false);
    expect(() => view.consume(input({ actionDefinitionId: 'arena-v2.action.other' }))).toThrow();
    view.destroy();
    disposeGeometry(root);
    const routeBow = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: null,
      equipmentDefinitionId: 'arena-v2.weapon.route-bow.candidate.v1',
      placement: 'held',
    });
    routeBow.destroy();
  });

  it('shares one bounded non-color silhouette proportion across held and world pickup poses', () => {
    for (const profile of ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1) {
      const heldRoot = object({ scale: [2, 3, 4] });
      const groundRoot = object({ scale: [2, 3, 4] });
      const held = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
        object: heldRoot,
        equipmentDefinitionId: profile.equipmentDefinitionId,
        placement: 'held',
      });
      const ground = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
        object: groundRoot,
        equipmentDefinitionId: profile.equipmentDefinitionId,
        placement: 'ground',
      });
      const heldInput = {
        schemaVersion: 1,
        tick: 1,
        participantId: 'p1',
        equipmentDefinitionId: profile.equipmentDefinitionId,
        placement: 'held',
        actionDefinitionId: null,
        actionPhase: 'idle',
        actionStartedCue: null,
        weaponFeedbackCue: null,
        reducedMotion: false,
        muted: false,
        assetLoadState: 'ready',
      };
      const groundInput = {
        ...heldInput,
        participantId: null,
        placement: 'ground',
      };
      const heldSnapshot = held.consume(heldInput);
      ground.consume(groundInput);
      profile.silhouette.identityScaleAxes.forEach((axis, index) => {
        expect(heldRoot.scale.getComponent(index) / (
          [2, 3, 4][index]! * profile.grip.heldScale
        )).toBeCloseTo(axis);
        expect(groundRoot.scale.getComponent(index) / (
          [2, 3, 4][index]! * profile.groundPickup.scale
        )).toBeCloseTo(axis);
      });
      const heldScaleAfterFirstSync = heldRoot.scale.clone();
      expect(held.consume(heldInput)).toBe(heldSnapshot);
      expect(heldRoot.scale).toEqual(heldScaleAfterFirstSync);
      held.destroy();
      ground.destroy();
      expect(heldRoot.scale.toArray()).toEqual([2, 3, 4]);
      expect(groundRoot.scale.toArray()).toEqual([2, 3, 4]);
      disposeGeometry(heldRoot);
      disposeGeometry(groundRoot);
    }
  });

  it('keeps twenty distinct authority-phase poses without adding animation or hit authority', () => {
    const profiles = ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1;
    const signatures = profiles.map(({ actionReadability }) => JSON.stringify(
      actionReadability.phasePose,
    ));
    expect(new Set(signatures).size).toBe(20);
    for (const profile of profiles) {
      expect(profile.actionReadability.timingSource)
        .toBe('ActionDefinition.timing+MatchReadFrameV3.participant.action.phase');
      expect(profile.actionReadability.noHitInference).toBe(true);
      expect(profile.actionReadability.phasePose.windup.scale).toBeGreaterThanOrEqual(1);
      expect(profile.actionReadability.phasePose.active.scale)
        .toBeGreaterThan(profile.actionReadability.phasePose.recovery.scale);
    }
  });

  it('applies the selected weapon phase pose over its authored held transform', () => {
    const root = object({ rotation: [0.1, 0.2, 0.3], scale: [2, 3, 4] });
    const baselineRotation = root.rotation.clone();
    const baselineScale = root.scale.clone();
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    view.consume(input({ actionPhase: 'active' }));
    const profile = view.profile;
    const pose = profile.actionReadability.phasePose.active;
    expect(root.rotation.x).toBe(
      baselineRotation.x + profile.grip.heldEulerRadians[0] + pose.rotationX,
    );
    expect(root.rotation.z).toBe(
      baselineRotation.z + profile.grip.heldEulerRadians[2] + pose.rotationZ,
    );
    expect(root.scale.toArray()).toEqual([
      baselineScale.x * profile.silhouette.identityScaleAxes[0]
        * profile.grip.heldScale * pose.scale,
      baselineScale.y * profile.silhouette.identityScaleAxes[1]
        * profile.grip.heldScale * pose.scale,
      baselineScale.z * profile.silhouette.identityScaleAxes[2]
        * profile.grip.heldScale * pose.scale,
    ]);
    view.destroy();
    disposeGeometry(root);
  });

  it('rejects another attacker using the same weapon/action before any visible or queue mutation', () => {
    const root = object({ position: [2, 3, 4], rotation: [0.2, 0.3, 0.4], scale: [2, 3, 4] });
    const beforePosition = root.position.clone();
    const beforeRotation = root.rotation.clone();
    const beforeScale = root.scale.clone();
    const mesh = root.children[0] as THREE.Mesh;
    const beforeMaterial = mesh.material;
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    const weaponFeedbackCue = {
      sourceEventId: 'feedback-other-player', tick: 10, sequence: 4,
      attackerId: 'p2', actionDefinitionId: HAMMER_ACTION,
      visualCue: 'impact-confirm', emphasis: 'normal',
    };
    expect(() => view.consume(input({ weaponFeedbackCue }))).toThrow(/攻击者/);
    expect(() => view.consume(input({
      weaponFeedbackCue: {
        sourceEventId: 'movement-fall-without-attacker',
        tick: 10,
        sequence: 4,
        visualCue: 'ring-out',
        emphasis: 'strong',
      },
    }))).toThrow(/attackerId/);
    expect(() => view.consume(input({
      weaponFeedbackCue: {
        ...weaponFeedbackCue,
        attackerId: 'p1',
        visualCue: 'movement-fall-warning',
      },
    }))).toThrow(/枚举/);
    expect(root.position).toEqual(beforePosition);
    expectEulerEqual(root.rotation, beforeRotation);
    expect(root.scale).toEqual(beforeScale);
    expect(mesh.material).not.toBe(beforeMaterial);
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xffffff);
    expect(view.getSnapshot()).toBeNull();
    expect(view.consume(input({
      weaponFeedbackCue: { ...weaponFeedbackCue, attackerId: 'p1' },
    })).feedbackDuplicateSuppressed).toBe(false);
    view.destroy();
    expect(mesh.material).toBe(beforeMaterial);
    disposeGeometry(root);
  });

  it('keeps reduced-motion and muted presentation independent from authority and audio duration', () => {
    const root = object({
      position: [3, 4, 5],
      rotation: [0.1, 0.2, 0.3],
      scale: [2, 3, 4],
    });
    const originalPosition = root.position.clone();
    const originalRotation = root.rotation.clone();
    const originalScale = root.scale.clone();
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    view.consume(input({ reducedMotion: true, muted: true }));
    const profile = view.profile;
    const reducedMotionShape = ARENA_V2_CHARACTER_WEAPON_FIRST_SCREEN_READABILITY_CANDIDATE_V1
      .reducedMotionStaticPhaseScaleAxes.windup;
    expect(root.position).toEqual(originalPosition);
    expect(root.rotation.x).toBe(originalRotation.x + profile.grip.heldEulerRadians[0]);
    expect(root.rotation.y).toBe(originalRotation.y + profile.grip.heldEulerRadians[1]);
    expect(root.rotation.z).toBe(originalRotation.z + profile.grip.heldEulerRadians[2]);
    expect(root.scale.toArray()).toEqual([
      originalScale.x * profile.silhouette.identityScaleAxes[0]
        * profile.grip.heldScale * reducedMotionShape[0],
      originalScale.y * profile.silhouette.identityScaleAxes[1]
        * profile.grip.heldScale * reducedMotionShape[1],
      originalScale.z * profile.silhouette.identityScaleAxes[2]
        * profile.grip.heldScale * reducedMotionShape[2],
    ]);
    expect(view.getSnapshot()?.visualDependsOnAudioPlayback).toBe(false);
    view.destroy();
    expect(root.position).toEqual(originalPosition);
    expectEulerEqual(root.rotation, originalRotation);
    expect(root.scale).toEqual(originalScale);
    disposeGeometry(root);
  });

  it('keeps three non-color static action-phase shapes for all twenty weapons in reduced motion', () => {
    const contract = ARENA_V2_CHARACTER_WEAPON_FIRST_SCREEN_READABILITY_CANDIDATE_V1;
    const phaseEntries = Object.entries(contract.reducedMotionStaticPhaseScaleAxes);
    expect(phaseEntries.map(([phase]) => phase)).toEqual(['windup', 'active', 'recovery']);
    expect(new Set(phaseEntries.map(([, axes]) => axes.join(','))).size).toBe(3);
    expect(Object.isFrozen(contract.reducedMotionStaticPhaseScaleAxes)).toBe(true);
    expect(contract.reducedMotionPhaseShapeUsesAuthorityPhaseOnly).toBe(true);
    expect(contract.reducedMotionPhaseShapeCreatesResourcesOrDrawCalls).toBe(false);

    for (const profile of ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1) {
      const relativeSignatures: string[] = [];
      for (const [phase, axes] of phaseEntries) {
        const root = object({ scale: [2, 3, 4] });
        const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
          object: root,
          equipmentDefinitionId: profile.equipmentDefinitionId,
          placement: 'held',
        });
        view.consume({
          schemaVersion: 1,
          tick: 1,
          participantId: 'p1',
          equipmentDefinitionId: profile.equipmentDefinitionId,
          placement: 'held',
          actionDefinitionId: profile.groundActionDefinitionId,
          actionPhase: phase,
          actionStartedCue: null,
          weaponFeedbackCue: null,
          reducedMotion: true,
          muted: true,
          assetLoadState: 'ready',
        });
        relativeSignatures.push(root.scale.toArray().map((value, axis) => (
          value / (
            [2, 3, 4][axis]!
            * profile.silhouette.identityScaleAxes[axis]!
            * profile.grip.heldScale
          )
        )).join(','));
        expect(root.scale.toArray()).toEqual([
          2 * profile.silhouette.identityScaleAxes[0] * profile.grip.heldScale * axes[0],
          3 * profile.silhouette.identityScaleAxes[1] * profile.grip.heldScale * axes[1],
          4 * profile.silhouette.identityScaleAxes[2] * profile.grip.heldScale * axes[2],
        ]);
        view.destroy();
        disposeGeometry(root);
      }
      expect(new Set(relativeSignatures).size).toBe(3);
    }
  });

  it('composes ground pickup offset over non-zero host local placement and restores it exactly', () => {
    const root = object({
      position: [-7, 1.5, 9],
      rotation: [-0.2, 0.35, 0.7],
      scale: [0.5, 1.5, 2.5],
    });
    const baseline = {
      position: root.position.clone(),
      rotation: root.rotation.clone(),
      scale: root.scale.clone(),
    };
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'ground',
    });
    view.consume(input({
      participantId: null,
      placement: 'ground',
      actionDefinitionId: null,
      actionPhase: 'idle',
      actionStartedCue: null,
    }));
    const profile = view.profile;
    expect(root.position.toArray()).toEqual([
      baseline.position.x,
      baseline.position.y + profile.groundPickup.heightOffset,
      baseline.position.z,
    ]);
    expect(root.rotation.x).toBe(baseline.rotation.x + profile.groundPickup.eulerRadians[0]);
    expect(root.rotation.y).toBe(baseline.rotation.y + profile.groundPickup.eulerRadians[1]);
    expect(root.rotation.z).toBe(baseline.rotation.z + profile.groundPickup.eulerRadians[2]);
    expect(root.scale.toArray()).toEqual([
      baseline.scale.x * profile.silhouette.identityScaleAxes[0] * profile.groundPickup.scale,
      baseline.scale.y * profile.silhouette.identityScaleAxes[1] * profile.groundPickup.scale,
      baseline.scale.z * profile.silhouette.identityScaleAxes[2] * profile.groundPickup.scale,
    ]);
    view.destroy();
    expect(root.position).toEqual(baseline.position);
    expectEulerEqual(root.rotation, baseline.rotation);
    expect(root.scale).toEqual(baseline.scale);
    disposeGeometry(root);
  });

  it('restores the exact borrowed multi-material array identity on destroy', () => {
    const root = new THREE.Group();
    const borrowedMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      new THREE.MeshStandardMaterial({ color: 0x000000 }),
    ];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), borrowedMaterials);
    root.add(mesh);
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    expect(mesh.material).not.toBe(borrowedMaterials);
    view.destroy();
    expect(mesh.material).toBe(borrowedMaterials);
    disposeGeometry(root);
  });

  it('suppresses duplicate feedback in a bounded ring and clears it on epoch reset', () => {
    const root = object();
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    const weaponFeedbackCue = {
      sourceEventId: 'feedback-1', tick: 10, sequence: 4,
      attackerId: 'p1',
      actionDefinitionId: HAMMER_ACTION,
      visualCue: 'impact-confirm', emphasis: 'normal',
    };
    expect(view.consume(input({ weaponFeedbackCue })).feedbackDuplicateSuppressed).toBe(false);
    expect(view.consume(input({ tick: 12, weaponFeedbackCue }))).toMatchObject({
      actionStartedSourceEventId: null,
      actionStartedDuplicateSuppressed: true,
      feedbackSourceEventId: 'feedback-1',
      feedbackVisualCue: null,
      feedbackDuplicateSuppressed: true,
    });
    const beforeConflict = {
      position: root.position.clone(),
      rotation: root.rotation.clone(),
      scale: root.scale.clone(),
      material: (root.children[0] as THREE.Mesh).material,
      snapshot: view.getSnapshot(),
    };
    expect(() => view.consume(input({
      tick: 13,
      weaponFeedbackCue: { ...weaponFeedbackCue, visualCue: 'ring-out' },
    }))).toThrow(/冲突事实/);
    expect(root.position).toEqual(beforeConflict.position);
    expectEulerEqual(root.rotation, beforeConflict.rotation);
    expect(root.scale).toEqual(beforeConflict.scale);
    expect((root.children[0] as THREE.Mesh).material).toBe(beforeConflict.material);
    expect(view.getSnapshot()).toBe(beforeConflict.snapshot);
    view.resetPresentationEpoch();
    expect(view.consume(input({ weaponFeedbackCue })).feedbackDuplicateSuppressed).toBe(false);
    view.destroy();
    disposeGeometry(root);
  });

  it('fails closed when a host mutates the decorator-owned attachment local transform', () => {
    const root = object({ position: [6, 7, 8], rotation: [0.2, 0.4, 0.6], scale: [2, 3, 4] });
    const baseline = {
      position: root.position.clone(), rotation: root.rotation.clone(), scale: root.scale.clone(),
    };
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    view.consume(input());
    root.position.x += 1;
    expect(() => view.consume(input({ tick: 12, actionStartedCue: null }))).toThrow(/唯一所有权/);
    expect(view.state).toBe(ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.FAILED);
    expect(root.position).toEqual(baseline.position);
    expectEulerEqual(root.rotation, baseline.rotation);
    expect(root.scale).toEqual(baseline.scale);
    view.destroy();
    disposeGeometry(root);
  });

  it('uses a 64-event watermark, rejects stale replay/tick rollback, and permits only exact same-tick idempotence', () => {
    const root = object();
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    let firstFeedback: Readonly<Record<string, unknown>> | null = null;
    for (let index = 0; index < 65; index += 1) {
      const tick = 20 + index;
      const weaponFeedbackCue = {
        sourceEventId: `feedback-${index}`,
        tick: tick - 1,
        sequence: index + 1,
        attackerId: 'p1',
        actionDefinitionId: HAMMER_ACTION,
        visualCue: 'impact-confirm',
        emphasis: 'normal',
      };
      firstFeedback ??= weaponFeedbackCue;
      const snapshot = view.consume(input({ tick, actionStartedCue: null, weaponFeedbackCue }));
      expect(snapshot.eventWindowCapacity).toBe(64);
    }
    expect(() => view.consume(input({
      tick: 90,
      actionStartedCue: null,
      weaponFeedbackCue: firstFeedback!,
    }))).toThrow(/窗口水位/);
    expect(() => view.consume(input({ tick: 83, actionStartedCue: null }))).toThrow(/tick回退/);
    const exact = view.consume(input({ tick: 85, actionStartedCue: null, weaponFeedbackCue: null }));
    expect(view.consume(input({
      tick: 85,
      actionStartedCue: null,
      weaponFeedbackCue: null,
    }))).toBe(exact);
    expect(() => view.consume(input({
      tick: 85,
      actionStartedCue: null,
      weaponFeedbackCue: null,
      muted: true,
    }))).toThrow(/同tick/);
    view.resetPresentationEpoch();
    expect(view.consume(input({ tick: 2, actionStartedCue: null }))).toMatchObject({ tick: 2 });
    view.destroy();
    disposeGeometry(root);
  });

  it('rolls back every earlier material replacement when constructor cloning fails', () => {
    const root = new THREE.Group();
    const firstOriginal = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const secondOriginal = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const firstOwned = new THREE.MeshStandardMaterial({ color: 0xffffff });
    let firstOwnedDisposed = false;
    Object.defineProperty(firstOriginal, 'clone', {
      configurable: true,
      value: () => firstOwned,
    });
    Object.defineProperty(firstOwned, 'dispose', {
      configurable: true,
      value: () => { firstOwnedDisposed = true; },
    });
    Object.defineProperty(secondOriginal, 'clone', {
      configurable: true,
      value: () => { throw new Error('hostile clone failure'); },
    });
    const firstMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), firstOriginal);
    const secondMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), secondOriginal);
    root.add(firstMesh, secondMesh);
    expect(() => new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    })).toThrow(/hostile clone failure/);
    expect(firstMesh.material).toBe(firstOriginal);
    expect(secondMesh.material).toBe(secondOriginal);
    expect(firstOwnedDisposed).toBe(true);
    disposeGeometry(root);
  });

  it('rolls back exact material references and disposes every clone when assignment fails', () => {
    const root = new THREE.Group();
    const firstOriginal = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const secondOriginal = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const firstOwned = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const secondOwned = new THREE.MeshStandardMaterial({ color: 0xffffff });
    let firstOwnedDisposed = false;
    let secondOwnedDisposed = false;
    Object.defineProperty(firstOriginal, 'clone', {
      configurable: true,
      value: () => firstOwned,
    });
    Object.defineProperty(secondOriginal, 'clone', {
      configurable: true,
      value: () => secondOwned,
    });
    Object.defineProperty(firstOwned, 'dispose', {
      configurable: true,
      value: () => { firstOwnedDisposed = true; },
    });
    Object.defineProperty(secondOwned, 'dispose', {
      configurable: true,
      value: () => { secondOwnedDisposed = true; },
    });
    const firstMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), firstOriginal);
    const secondMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), secondOriginal);
    let secondMaterial: THREE.Material | THREE.Material[] = secondOriginal;
    let secondAssignmentCount = 0;
    Object.defineProperty(secondMesh, 'material', {
      configurable: true,
      get: () => secondMaterial,
      set: (value: THREE.Material | THREE.Material[]) => {
        secondAssignmentCount += 1;
        if (secondAssignmentCount === 1) throw new Error('hostile assignment failure');
        secondMaterial = value;
      },
    });
    root.add(firstMesh, secondMesh);
    expect(() => new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    })).toThrow(/hostile assignment failure/);
    expect(firstMesh.material).toBe(firstOriginal);
    expect(secondMesh.material).toBe(secondOriginal);
    expect(secondAssignmentCount).toBe(2);
    expect(firstOwnedDisposed).toBe(true);
    expect(secondOwnedDisposed).toBe(true);
    disposeGeometry(root);
  });

  it('rejects borrowed, duplicate and non-Material clone identities without disposing borrowed assets', () => {
    const scenarios: readonly Readonly<{
      name: string;
      configure: (
        first: THREE.Material,
        second: THREE.Material,
      ) => Readonly<{
        expectedOwnedDisposeCalls: number;
        getOwnedDisposeCalls: () => number;
      }>;
    }>[] = [
      {
        name: 'same borrowed material',
        configure: (first: THREE.Material, _second: THREE.Material) => {
          Object.defineProperty(first, 'clone', { configurable: true, value: () => first });
          return { expectedOwnedDisposeCalls: 0, getOwnedDisposeCalls: () => 0 };
        },
      },
      {
        name: 'another borrowed material',
        configure: (first: THREE.Material, second: THREE.Material) => {
          Object.defineProperty(first, 'clone', { configurable: true, value: () => second });
          return { expectedOwnedDisposeCalls: 0, getOwnedDisposeCalls: () => 0 };
        },
      },
      {
        name: 'same clone for two slots',
        configure: (first: THREE.Material, second: THREE.Material) => {
          const sharedOwned = new THREE.MeshStandardMaterial({ color: 0xff00ff });
          let ownedDisposeCalls = 0;
          Object.defineProperty(sharedOwned, 'dispose', {
            configurable: true,
            value: () => { ownedDisposeCalls += 1; },
          });
          Object.defineProperty(first, 'clone', { configurable: true, value: () => sharedOwned });
          Object.defineProperty(second, 'clone', { configurable: true, value: () => sharedOwned });
          return { expectedOwnedDisposeCalls: 1, getOwnedDisposeCalls: () => ownedDisposeCalls };
        },
      },
      {
        name: 'non-Material clone value',
        configure: (first: THREE.Material, _second: THREE.Material) => {
          Object.defineProperty(first, 'clone', {
            configurable: true,
            value: () => ({ dispose: () => undefined }),
          });
          return { expectedOwnedDisposeCalls: 0, getOwnedDisposeCalls: () => 0 };
        },
      },
    ];
    for (const scenario of scenarios) {
      const root = new THREE.Group();
      const first = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const second = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const originalFirstDispose = first.dispose.bind(first);
      const originalSecondDispose = second.dispose.bind(second);
      let borrowedDisposeCalls = 0;
      Object.defineProperty(first, 'dispose', {
        configurable: true,
        value: () => { borrowedDisposeCalls += 1; },
      });
      Object.defineProperty(second, 'dispose', {
        configurable: true,
        value: () => { borrowedDisposeCalls += 1; },
      });
      const originalMaterials = [first, second];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), originalMaterials);
      root.add(mesh);
      const ownership = scenario.configure(first, second);
      expect(() => new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
        object: root,
        equipmentDefinitionId: HAMMER_EQUIPMENT,
        placement: 'held',
      }), scenario.name).toThrow();
      expect(mesh.material, scenario.name).toBe(originalMaterials);
      expect(borrowedDisposeCalls, scenario.name).toBe(0);
      expect(ownership.getOwnedDisposeCalls(), scenario.name)
        .toBe(ownership.expectedOwnedDisposeCalls);
      mesh.geometry.dispose();
      originalFirstDispose();
      originalSecondDispose();
    }
  });

  it('restores baseline and becomes terminal if a visual write fails after transform mutation', () => {
    const root = object({ position: [4, 5, 6], rotation: [0.1, 0.2, 0.3], scale: [2, 3, 4] });
    root.visible = false;
    const baseline = {
      position: root.position.clone(), rotation: root.rotation.clone(), scale: root.scale.clone(),
      visible: root.visible,
    };
    const mesh = root.children[0] as THREE.Mesh;
    const originalMaterial = mesh.material;
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    const ownedMaterial = mesh.material as THREE.MeshStandardMaterial;
    Object.defineProperty(ownedMaterial.color, 'copy', {
      configurable: true,
      value: () => { throw new Error('hostile color write'); },
    });
    expect(() => view.consume(input())).toThrow(/hostile color write/);
    expect(root.position).toEqual(baseline.position);
    expectEulerEqual(root.rotation, baseline.rotation);
    expect(root.scale).toEqual(baseline.scale);
    expect(root.visible).toBe(baseline.visible);
    expect(mesh.material).toBe(originalMaterial);
    expect(view.state).toBe(ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.FAILED);
    expect(() => view.consume(input({ tick: 12 }))).toThrow(/拒绝状态/);
    view.destroy();
    expect(view.state).toBe(ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.DESTROYED);
    disposeGeometry(root);
  });

  it('keeps incomplete material release retryable and reports destroyed only after success', () => {
    const root = object();
    const mesh = root.children[0] as THREE.Mesh;
    const originalMaterial = mesh.material;
    const view = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: root,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    const ownedMaterial = mesh.material as THREE.Material;
    const originalDispose = ownedMaterial.dispose.bind(ownedMaterial);
    let disposeCalls = 0;
    Object.defineProperty(ownedMaterial, 'dispose', {
      configurable: true,
      value: () => {
        disposeCalls += 1;
        if (disposeCalls === 1) throw new Error('transient dispose failure');
        originalDispose();
      },
    });
    expect(() => view.destroy()).toThrow(/可重试/);
    expect(view.state).toBe(
      ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.DISPOSE_INCOMPLETE,
    );
    expect(mesh.material).toBe(originalMaterial);
    view.destroy();
    expect(view.state).toBe(ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.DESTROYED);
    expect(disposeCalls).toBe(2);
    disposeGeometry(root);
  });

  it('fails closed on future fields and exposes a non-spatial missing-asset fallback', () => {
    const fallback = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
      object: null,
      equipmentDefinitionId: HAMMER_EQUIPMENT,
      placement: 'held',
    });
    expect(fallback.consume(input({ assetLoadState: 'missing' }))).toMatchObject({
      fallbackRequested: true,
      fallbackKind: 'non-spatial-status-cue',
      productionAssetApproved: false,
      validationStatus: 'not-run',
    });
    expect(() => fallback.consume(input({ futureField: true }))).toThrow();
    expect(() => fallback.consume(input({ assetLoadState: 'ready' }))).toThrow(/缺少已加载Object3D/);
    fallback.destroy();
    fallback.destroy();
  });
});
