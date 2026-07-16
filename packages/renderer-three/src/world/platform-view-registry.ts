import * as THREE from 'three';
import { clamp, dampFactor, easeOutBack, RENDER3D_COLORS } from '../constants.js';

export class PlatformViewRegistry {
  [key: string]: any;
  constructor(root: THREE.Object3D, factory: any) {
    this.root = root;
    this.factory = factory;
    this.views = new Map<string, any>();
    this.tempColor = new THREE.Color();
    this.activeIds = new Set<string>();
    this.synced = false;
    this.labelBuildsLastFrame = 0;
    this.totalDeferredLabelBuilds = 0;
    this.queuedLabelUpdates = 0;
  }

  sync(platforms: any, context: any = {}, deltaSeconds = 0) {
    this.activeIds.clear();
    this.labelBuildsLastFrame = 0;
    const candidates: any[] = Array.isArray(context.candidates) ? context.candidates : [];
    const renderPlatforms: any[] = Array.isArray(platforms) ? platforms : [];
    renderPlatforms.forEach((platform) => {
      if (platform?.id == null || !platform?.center) return;
      this.activeIds.add(platform.id);
      let view = this.views.get(platform.id);
      if (!view) {
        view = this.factory.create(platform);
        view.spawnProgress = context.reducedMotion ? 1 : 0;
        this.views.set(platform.id, view);
        this.root.add(view.root);
      }
      const candidateIndex = candidates.findIndex((candidate: any) => candidate.id === platform.id);
      const selected = candidateIndex >= 0 && candidateIndex === context.selectedChoice;
      const labelKey = this.factory.labelKey(platform, { selected });
      if (labelKey === view.labelKey) {
        view.pendingLabelKey = '';
        view.pendingLabel = null;
        this.factory.showLabel(view);
      } else if (!labelKey) {
        this.factory.updateLabel(view, platform, { selected, currentValue: context.currentValue });
      } else if (labelKey !== view.pendingLabelKey) {
        view.pendingLabelKey = labelKey;
        view.pendingLabel = {
          platform: {
            role: platform.role,
            operation: platform.operation ? { label: platform.operation.label } : null,
            preview: platform.preview,
          },
          selected,
        };
        this.factory.hideLabel(view);
      }
      this.updateView(view, platform, {
        ...context,
        selected,
        isSupport: context.player?.supportPlatformId === platform.id,
      }, deltaSeconds);
    });

    for (const [id, view] of this.views) {
      if (this.activeIds.has(id)) continue;
      this.factory.disposeView(view);
      this.views.delete(id);
    }

    let labelBudget = context.stepAdvanced ? 0 : this.synced ? 1 : 2;
    for (const view of this.views.values()) {
      if (labelBudget <= 0) break;
      if (!view.pendingLabel) continue;
      const request = view.pendingLabel;
      this.factory.updateLabel(view, request.platform, { selected: request.selected });
      labelBudget -= 1;
      this.labelBuildsLastFrame += 1;
      this.totalDeferredLabelBuilds += 1;
    }
    this.queuedLabelUpdates = 0;
    for (const view of this.views.values()) {
      if (view.pendingLabel) this.queuedLabelUpdates += 1;
    }
    this.synced = true;
  }

  updateView(view: any, platform: any, context: any, deltaSeconds: number) {
    const height = Number.isFinite(platform.height) ? platform.height : view.height;
    view.baseY = (Number.isFinite(platform.topY) ? platform.topY : 0) - height / 2;
    const selectedLift = context.selected ? 0.1 : 0;
    view.root.position.set(
      Number.isFinite(platform.center.x) ? platform.center.x : 0,
      view.baseY + selectedLift,
      Number.isFinite(platform.center.z) ? platform.center.z : 0,
    );
    view.spawnProgress = context.reducedMotion
      ? 1
      : clamp(view.spawnProgress + deltaSeconds * 4.8);
    const spawnScale = easeOutBack(view.spawnProgress);
    view.root.scale.setScalar(Math.max(0.01, spawnScale));

    const chargeSquash = context.isSupport ? clamp(context.chargePower) * 0.22 : 0;
    const desiredBodyY = 1 - chargeSquash;
    const bodyBlend = context.reducedMotion ? 1 : dampFactor(deltaSeconds, 15);
    const roleScale = platform.role === 'current' ? 1.36 : platform.role === 'history' ? 0.9 : 1;
    view.bodyRoot.scale.x += (roleScale - view.bodyRoot.scale.x) * bodyBlend;
    view.bodyRoot.scale.y += (desiredBodyY - view.bodyRoot.scale.y) * bodyBlend;
    view.bodyRoot.scale.z += (roleScale - view.bodyRoot.scale.z) * bodyBlend;
    view.bodyRoot.position.y = -(height * (1 - view.bodyRoot.scale.y)) / 2;

    const roleOpacity = platform.role === 'history' ? 0.56 : 1;
    view.materials.forEach((material: any) => {
      if (material === view.ringMaterial) return;
      material.opacity = roleOpacity;
      material.transparent = roleOpacity < 1;
    });
    if (view.label) {
      view.label.material.opacity = context.overlayVisible
        ? 0
        : platform.role === 'history' ? 0.45 : 1;
    }

    const desiredColor = context.selected
      ? RENDER3D_COLORS.platformSelected
      : platform.role === 'history'
        ? RENDER3D_COLORS.platformHistory
        : platform.role === 'candidate' && view.kind === 'cube'
          ? 0x16a6a1
          : RENDER3D_COLORS.platform;
    this.tempColor.set(desiredColor);
    view.bodyMaterial.color.lerp(this.tempColor, context.reducedMotion ? 1 : dampFactor(deltaSeconds, 10));
    view.ringMaterial.opacity += (((context.selected && !context.overlayVisible) ? 0.32 : 0) - view.ringMaterial.opacity)
      * (context.reducedMotion ? 1 : dampFactor(deltaSeconds, 14));
    view.selectionRing.rotation.z += context.selected && !context.reducedMotion ? deltaSeconds * 0.45 : 0;
  }

  get(id: string) {
    return this.views.get(id) ?? null;
  }

  ids() {
    return [...this.views.keys()];
  }

  diagnostics() {
    return Object.freeze({
      labelBuildsLastFrame: this.labelBuildsLastFrame,
      totalDeferredLabelBuilds: this.totalDeferredLabelBuilds,
      queuedLabelUpdates: this.queuedLabelUpdates,
    });
  }

  dispose() {
    this.views.forEach((view: any) => this.factory.disposeView(view));
    this.views.clear();
    this.factory.dispose();
  }
}
