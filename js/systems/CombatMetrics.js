// ============================================
// UNIT HUNTER — Combat metrics accumulator
// ============================================

import { EVENTS } from '../core/EventBus.js';

export class CombatMetrics {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.resetRun();
    this.bindEvents();
  }

  bindEvents() {
    if (!this.eventBus) return;
    this.eventBus.on(EVENTS.COMBAT_BATTLE_START, payload => this.startBattle(payload));
    this.eventBus.on(EVENTS.ANSWER_CORRECT, () => this.recordAnswer('correct'));
    this.eventBus.on(EVENTS.ANSWER_WRONG, () => this.recordAnswer('wrong'));
    this.eventBus.on(EVENTS.ANSWER_TIMEOUT, () => this.recordAnswer('timeout'));
    this.eventBus.on(EVENTS.QTE_RESULT, ({ result }) => this.recordQte(result));
    this.eventBus.on(EVENTS.PLAYER_HIT, ({ amount, dodged = false }) => {
      this.recordDamage(amount, { dodged });
    });
    this.eventBus.on(EVENTS.COMBAT_BATTLE_END, payload => this.finishBattle(payload));
  }

  resetRun() {
    this.run = {
      battles: 0,
      answersCorrect: 0,
      answersWrong: 0,
      answersTimedOut: 0,
      qteSuccesses: 0,
      qteGoods: 0,
      qteMisses: 0,
      damageTaken: 0,
      dodges: 0,
      startedAt: null,
      finishedAt: null
    };
    this.currentBattle = null;
  }

  startBattle({ enemyId, level, isBoss = false, now = performance.now() }) {
    this.currentBattle = {
      enemyId,
      level,
      isBoss,
      startedAt: now,
      answersCorrect: 0,
      answersWrong: 0,
      answersTimedOut: 0,
      qteSuccesses: 0,
      qteGoods: 0,
      qteMisses: 0,
      damageTaken: 0,
      dodges: 0
    };
    this.run.battles += 1;
    this.run.startedAt ??= now;
  }

  recordAnswer(result) {
    if (!this.currentBattle) return;
    const key = result === 'correct' ? 'answersCorrect'
      : result === 'timeout' ? 'answersTimedOut'
        : 'answersWrong';
    this.currentBattle[key] += 1;
    this.run[key] += 1;
  }

  recordQte(result) {
    if (!this.currentBattle) return;
    const key = result === 'PERFECT' || result === 'GOOD'
      ? result === 'PERFECT' ? 'qteSuccesses' : 'qteGoods'
      : 'qteMisses';
    this.currentBattle[key] += 1;
    this.run[key] += 1;
  }

  recordDamage(amount, { dodged = false } = {}) {
    if (!this.currentBattle) return;
    if (dodged) {
      this.currentBattle.dodges += 1;
      this.run.dodges += 1;
      return;
    }
    const safeAmount = Math.max(0, Number(amount) || 0);
    this.currentBattle.damageTaken += safeAmount;
    this.run.damageTaken += safeAmount;
  }

  finishBattle({ outcome, now = performance.now() }) {
    if (!this.currentBattle) return null;
    const battle = {
      ...this.currentBattle,
      outcome,
      durationMs: Math.max(0, now - this.currentBattle.startedAt)
    };
    this.currentBattle = null;
    this.run.finishedAt = now;
    return Object.freeze(battle);
  }

  getRunSnapshot() {
    return Object.freeze({ ...this.run });
  }

  getCurrentBattleSnapshot() {
    return this.currentBattle ? Object.freeze({ ...this.currentBattle }) : null;
  }
}
