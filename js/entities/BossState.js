// ============================================
// UNIT HUNTER — Boss phase state machine
// ============================================

import { BossPhase } from './BossPhase.js';
import { EVENTS } from '../core/EventBus.js';

export class BossState {
  constructor({ bossId, phases, eventBus }) {
    if (!Array.isArray(phases) || phases.length === 0) {
      throw new Error(`Boss ${bossId} requires at least one phase`);
    }
    this.bossId = bossId;
    this.phases = phases.map(phase => new BossPhase(phase));
    this.eventBus = eventBus;
    this.currentPhaseIndex = 0;
    this.pendingPhaseIndex = null;
    this.transition = null;
  }

  get currentPhase() {
    return this.phases[this.currentPhaseIndex];
  }

  get isTelegraphing() {
    return this.transition?.status === 'telegraphing';
  }

  evaluateHp(hpPercent) {
    const nextIndex = this.findPhaseIndex(hpPercent);
    if (nextIndex <= this.currentPhaseIndex || this.isTelegraphing) return false;
    return this.beginTransition(nextIndex);
  }

  beginTransition(nextIndex, now = performance.now()) {
    const from = this.currentPhase;
    const to = this.phases[nextIndex];
    this.pendingPhaseIndex = nextIndex;
    this.transition = {
      status: 'telegraphing',
      fromPhaseId: from.id,
      toPhaseId: to.id,
      startedAt: now,
      durationMs: to.telegraphDurationMs
    };
    this.eventBus?.emit(EVENTS.BOSS_PHASE_CHANGE, {
      bossId: this.bossId,
      from: from.id,
      to: to.id,
      phaseName: to.name,
      telegraphDurationMs: to.telegraphDurationMs
    });
    this.eventBus?.emit(EVENTS.BOSS_DANGER, {
      bossId: this.bossId,
      phase: to.id,
      message: 'DANGER!'
    });
    return true;
  }

  update(now = performance.now()) {
    if (!this.isTelegraphing) return false;
    if (now - this.transition.startedAt < this.transition.durationMs) return false;
    this.currentPhaseIndex = this.pendingPhaseIndex;
    this.pendingPhaseIndex = null;
    this.transition = null;
    this.eventBus?.emit(EVENTS.BOSS_PHASE_READY, {
      bossId: this.bossId,
      phase: this.currentPhase.id
    });
    return true;
  }

  canAttack() {
    return !this.isTelegraphing;
  }

  findPhaseIndex(hpPercent) {
    for (let i = this.phases.length - 1; i >= 0; i -= 1) {
      if (hpPercent <= this.phases[i].hpPct) return i;
    }
    return 0;
  }
}
