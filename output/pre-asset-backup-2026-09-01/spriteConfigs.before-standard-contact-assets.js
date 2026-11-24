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
  quantum_sentry: {
    ...STANDARD_CONFIG,
    staticPath: 'assets/source-art/contact-sheet/quantum_sentry.png'
  },
  entropy_lord: {
    ...STANDARD_CONFIG,
    staticPath: 'assets/source-art/contact-sheet/entropy_lord.png'
  },
  void_architect: {
    ...STANDARD_CONFIG,
    staticPath: 'assets/source-art/contact-sheet/void_architect.png'
  },
  protocol_colossus: {
    ...STANDARD_CONFIG,
    staticPath: 'assets/source-art/contact-sheet/protocol_colossus.png'
  },
  singularity_core: {
    ...STANDARD_CONFIG,
    staticPath: 'assets/source-art/contact-sheet/singularity_core.png'
  }
};

export function getSpritePath(id, state, frameNum) {
  const staticPath = SPRITE_CONFIGS[id]?.staticPath;
  if (staticPath) return staticPath;
  const assetRoot = SPRITE_CONFIGS[id]?.assetRoot || `assets/sprites_generated/${id}`;
  const padded = String(frameNum).padStart(2, '0');
  return `${assetRoot}/${state}_${padded}.png`;
}
