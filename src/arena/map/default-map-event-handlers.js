import { MapEventStrategyRegistry } from './map-event-strategy-registry.js';
import { createCollapseSurfacesStrategy } from './events/collapse-surfaces-strategy.js';
import { createEquipmentWaveStrategy } from './events/equipment-wave-strategy.js';
import { createWindZoneStrategy } from './events/wind-zone-strategy.js';

export { MAP_DOMAIN_EVENT, MAP_EVENT_KIND, MAP_RULE_COMMAND } from './map-event-types.js';
export { validateDefaultMapSafety } from './map-safety-validator.js';

export function createDefaultMapEventStrategyRegistry() {
  return new MapEventStrategyRegistry([
    createWindZoneStrategy(),
    createCollapseSurfacesStrategy(),
    createEquipmentWaveStrategy(),
  ]);
}
