// ============================================
// UNIT HUNTER — Enemy behavior profiles
// ============================================

const BEHAVIORS = {
  standard: {
    speed: 1,
    range: '近距離',
    telegraphMs: 3000,
    attackPattern: 'counter'
  },
  skirmisher: {
    speed: 1.25,
    range: 'กลาง',
    telegraphMs: 2400,
    attackPattern: 'fast_counter'
  },
  tank: {
    speed: 0.7,
    range: '近距離',
    telegraphMs: 3800,
    attackPattern: 'heavy_counter'
  },
  sniper: {
    speed: 0.85,
    range: 'ไกล',
    telegraphMs: 4200,
    attackPattern: 'delayed_counter'
  }
};

export function getEnemyBehavior(behaviorId = 'standard') {
  const behavior = BEHAVIORS[behaviorId] || BEHAVIORS.standard;
  return { ...behavior };
}

export const ENEMY_BEHAVIORS = Object.freeze(
  Object.fromEntries(
    Object.entries(BEHAVIORS).map(([id, behavior]) => [id, Object.freeze({ ...behavior })])
  )
);
