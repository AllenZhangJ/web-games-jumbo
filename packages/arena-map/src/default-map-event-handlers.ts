import { createCollapseSurfacesStrategy } from './events/collapse-surfaces-strategy.js';
import { createEquipmentWaveStrategy } from './events/equipment-wave-strategy.js';
import { createWindZoneStrategy } from './events/wind-zone-strategy.js';
import { MapEventStrategyRegistry } from './map-event-strategy-registry.js';

export function createDefaultMapEventStrategyRegistry(): MapEventStrategyRegistry {
  return new MapEventStrategyRegistry([
    createWindZoneStrategy(),
    createCollapseSurfacesStrategy(),
    createEquipmentWaveStrategy(),
  ]);
}
