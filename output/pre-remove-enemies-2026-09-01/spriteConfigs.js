// ============================================
// UNIT HUNTER — Sprite Configuration
// ============================================

const STANDARD_STATES = {
  idle:   { frames: 3, duration: 180, loop: true },
  attack: { frames: 4, duration: 120, loop: false },
  hit:    { frames: 2, duration: 110, loop: false },
  death:  { frames: 5, duration: 130, loop: false }
};

const STANDARD_CONFIG = { states: STANDARD_STATES };

export const SPRITE_CONFIGS = {
  glitch: STANDARD_CONFIG,
  fragment: STANDARD_CONFIG,
  corruptor: STANDARD_CONFIG,
  nullptr: STANDARD_CONFIG,
  byte_drone: STANDARD_CONFIG,
  overflow: STANDARD_CONFIG,
  signal_wraith: STANDARD_CONFIG,
  packet_mimic: STANDARD_CONFIG,
  checksum_beast: STANDARD_CONFIG,
  firewall_hound: STANDARD_CONFIG,
  quantum_sentry: STANDARD_CONFIG,
  entropy_lord: STANDARD_CONFIG,
  void_architect: STANDARD_CONFIG,
  protocol_colossus: STANDARD_CONFIG,
  singularity_core: STANDARD_CONFIG
};

export function getSpritePath(id, state, frameNum) {
  const staticPath = SPRITE_CONFIGS[id]?.staticPath;
  if (staticPath) return staticPath;
  const assetRoot = SPRITE_CONFIGS[id]?.assetRoot || `assets/sprites_generated/${id}`;
  const padded = String(frameNum).padStart(2, '0');
  return `${assetRoot}/${state}_${padded}.png`;
}
