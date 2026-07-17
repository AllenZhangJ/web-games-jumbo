export const MAP_EVENT_KIND = Object.freeze({
  WIND_ZONE: 'wind-zone',
  COLLAPSE_SURFACES: 'collapse-surfaces',
  EQUIPMENT_WAVE: 'equipment-wave',
});

export const MAP_RULE_COMMAND = Object.freeze({
  APPLY_IMPULSE: 'map-apply-impulse',
  SET_SURFACE_ENABLED: 'map-set-surface-enabled',
  SPAWN_EQUIPMENT: 'map-spawn-equipment',
});

export const MAP_DOMAIN_EVENT = Object.freeze({
  SURFACE_COLLAPSED: 'MapSurfaceCollapsed',
  EQUIPMENT_WAVE_RELEASED: 'MapEquipmentWaveReleased',
});
