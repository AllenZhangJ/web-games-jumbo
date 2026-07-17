import {
  PRESENTATION_ASSET_KIND,
} from '../assets/presentation-asset-definition.js';
import { assertPresentationAssetRegistry } from '../assets/presentation-asset-registry.js';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '../assets/presentation-asset-provider-ids.js';
import { ProgrammaticCharacterView } from './programmatic-character-view.js';

export class ProgrammaticCharacterViewFactory {
  #assetRegistry;

  constructor({ assetRegistry }) {
    this.#assetRegistry = assertPresentationAssetRegistry(assetRegistry);
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
    });
  }
}
