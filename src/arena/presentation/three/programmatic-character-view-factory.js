import {
  PRESENTATION_ASSET_KIND,
  assertPresentationAssetRegistry,
} from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import { ProgrammaticCharacterView } from './programmatic-character-view.js';

export class ProgrammaticCharacterViewFactory {
  #assetRegistry;
  #actionPresentations;

  constructor({ assetRegistry, actionPresentations }) {
    this.#assetRegistry = assertPresentationAssetRegistry(assetRegistry);
    if (!actionPresentations || typeof actionPresentations !== 'object') {
      throw new TypeError('ProgrammaticCharacterViewFactory 需要 action presentations。');
    }
    this.#actionPresentations = actionPresentations;
    Object.freeze(this);
  }

  create({ participantId, presentationDefinition }) {
    if (!presentationDefinition?.modelAssetId) {
      throw new TypeError('ProgrammaticCharacterViewFactory 需要 presentation Definition。');
    }
    const asset = this.#assetRegistry.require(presentationDefinition.modelAssetId);
    if (
      asset.kind !== PRESENTATION_ASSET_KIND.CHARACTER_MODEL
      || asset.providerId !== ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1
    ) {
      throw new RangeError(`asset ${asset.id} 不能由程序化角色 Factory 创建。`);
    }
    return new ProgrammaticCharacterView({
      participantId,
      presentationDefinition,
      assetDefinition: asset,
      actionPresentations: this.#actionPresentations,
    });
  }
}
