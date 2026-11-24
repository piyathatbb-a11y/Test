// ============================================
// UNIT HUNTER — EventBus (Pub/Sub)
// ============================================

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit(event, data) {
    const list = this.listeners.get(event);
    if (!list) return;
    for (const cb of [...list]) {
      try { cb(data); } catch (e) { console.error(`EventBus error on ${event}:`, e); }
    }
  }

  once(event, callback) {
    const wrapper = (data) => { this.off(event, wrapper); callback(data); };
    return this.on(event, wrapper);
  }
}

export const EVENTS = {
  GAME_START: 'game:start',
  GAME_OVER: 'game:over',
  LEVEL_UP: 'level:up',
  ENEMY_SPAWN: 'enemy:spawn',
  ENEMY_HIT: 'enemy:hit',
  ENEMY_DEFEAT: 'enemy:defeat',
  PLAYER_HIT: 'player:hit',
  PLAYER_HEAL: 'player:heal',
  QUESTION_SHOW: 'question:show',
  ANSWER_CORRECT: 'answer:correct',
  ANSWER_WRONG: 'answer:wrong',
  ANSWER_TIMEOUT: 'answer:timeout',
  QTE_RESULT: 'qte:result',
  COMBAT_BATTLE_START: 'combat:battle_start',
  COMBAT_BATTLE_END: 'combat:battle_end',
  COMBAT_METRIC: 'combat:metric',
  COMBAT_RANK: 'combat:rank',
  RANDOM_EVENT: 'random:event',
  UPGRADE_OFFER: 'upgrade:offer',
  UPGRADE_SELECT: 'upgrade:select',
  COMBO_CHANGE: 'combo:change',
  SCORE_CHANGE: 'score:change',
  TIMER_TICK: 'timer:tick',
  TIMER_EXPIRE: 'timer:expire',
  BOSS_PHASE_CHANGE: 'boss:phase',
  BOSS_DANGER: 'boss:danger',
  BOSS_PHASE_READY: 'boss:phase_ready',
  BOSS_SPECIAL_ATTACK: 'boss:special_attack',
  BOSS_ENRAGE: 'boss:enrage',
  BOSS_ATTACK_START: 'boss:attack_start',
  BOSS_ATTACK_HIT: 'boss:attack_hit',
  BOSS_ATTACK_BLOCKED: 'boss:attack_blocked',
  SPRITE_STATE_CHANGE: 'sprite:state',
  DAMAGE_NUMBER: 'damage:number',
  SCREEN_FLASH: 'screen:flash',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  SFX_PLAY: 'sfx:play'
};
