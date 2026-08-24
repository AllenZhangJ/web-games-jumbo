import {
  composeArenaV2InformationScreenViewModelV1,
  type ArenaV2InformationFieldCompositionInputV1,
} from './arena-v2-information-field-composition-v1.js';
import {
  createArenaV2InformationScreenLayoutV1,
  type ArenaV2InformationScreenLayoutV1,
} from './arena-v2-information-screen-layout-v1.js';
import {
  resolveArenaV2InformationScreenRenderModelV1,
  type ArenaV2InformationScreenRenderModelV1,
} from './arena-v2-information-screen-render-model-v1.js';
import {
  ArenaV2InformationScreenRegistryV1,
} from './arena-v2-information-screen-registry-v1.js';
import type {
  ArenaV2InformationScreenViewModelV1,
} from './arena-v2-information-screen-view-model-v1.js';
import {
  createArenaV2InformationScreenRenderPlanV1,
  type ArenaV2UiRenderPlanV1,
} from './arena-v2-ui-render-plan-v1.js';
import { ProductMessageCatalog } from './product-message-catalog.js';

export interface ArenaV2InformationScreenPipelineResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'surface-pipeline-candidate';
  readonly productionReady: false;
  readonly viewModel: ArenaV2InformationScreenViewModelV1;
  readonly renderModel: ArenaV2InformationScreenRenderModelV1;
  readonly layout: ArenaV2InformationScreenLayoutV1;
  readonly renderPlan: ArenaV2UiRenderPlanV1;
}

/**
 * Executes the complete host-agnostic path for any of the eleven screens.
 * Field owners remain explicit inputs; the pipeline cannot fetch Profile,
 * content, result or match authority by itself.
 */
export function createArenaV2InformationScreenPipelineV1(
  registry: ArenaV2InformationScreenRegistryV1,
  messages: ProductMessageCatalog,
  composition: ArenaV2InformationFieldCompositionInputV1,
  viewport: unknown,
): ArenaV2InformationScreenPipelineResultV1 {
  if (!(registry instanceof ArenaV2InformationScreenRegistryV1)) {
    throw new TypeError('Arena V2页面Pipeline需要受支持的ScreenRegistry。');
  }
  if (!(messages instanceof ProductMessageCatalog)) {
    throw new TypeError('Arena V2页面Pipeline需要受支持的MessageCatalog。');
  }
  const viewModel = composeArenaV2InformationScreenViewModelV1(registry, composition);
  const renderModel = resolveArenaV2InformationScreenRenderModelV1(viewModel, messages);
  const layout = createArenaV2InformationScreenLayoutV1(renderModel, viewport);
  const renderPlan = createArenaV2InformationScreenRenderPlanV1(renderModel, layout);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'surface-pipeline-candidate' as const,
    productionReady: false as const,
    viewModel,
    renderModel,
    layout,
    renderPlan,
  });
}

export const ARENA_V2_INFORMATION_SCREEN_PIPELINE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  pageCount: 11 as const,
  fieldOwnershipRequired: true as const,
});
