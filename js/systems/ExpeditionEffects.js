import { SpriteRenderer } from './SpriteRenderer.js';

// Presentation owns its own lifetime; it never advances turns or changes damage.
export class ExpeditionEffects {
  constructor(root, { onReady = () => {}, reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    schedule = (fn, ms) => window.setTimeout(fn, ms), unschedule = id => window.clearTimeout(id),
    createSprite = elements => new SpriteRenderer(null, elements) } = {}) {
    this.root = root;
    this.onReady = onReady;
    this.reducedMotion = reducedMotion;
    this.schedule = schedule;
    this.unschedule = unschedule;
    this.createSprite = createSprite;
    this.timers = new Set();
    this.token = 0;
    this.busy = false;
    this.intro = null;
    this.sprite = null;
  }
  later(fn, ms) {
    const token = this.token;
    const id = this.schedule(() => {
      this.timers.delete(id);
      if (token === this.token) fn();
    }, ms);
    this.timers.add(id);
  }
  lock(value) {
    this.busy = value;
    this.root.setAttribute('data-animating', String(value));
    const task = this.root.querySelector('.exp-task');
    if (task) task.inert = value;
    const next = this.root.querySelector('[data-exp="next"]');
    if (next && value) next.disabled = true;
  }
  cancel() {
    this.token++;
    for (const id of this.timers) this.unschedule(id);
    this.timers.clear();
    this.sprite?.clear();
    this.sprite = null;
    if (this.intro) { this.intro.hidden = true; this.intro.setAttribute('aria-hidden', 'true'); }
    this.intro = null;
    this.root.classList.remove('exp-impact', 'exp-player-hit', 'exp-player-guard', 'exp-player-heal');
    this.lock(false);
  }
  finishIntro() {
    if (!this.intro) return;
    this.intro.hidden = true;
    this.intro.setAttribute('aria-hidden', 'true');
    this.intro = null;
    this.lock(false);
    this.onReady();
  }
  mount(state, { entry = false } = {}) {
    this.cancel();
    const image = this.root.querySelector('[data-exp-sprite]');
    const placeholder = this.root.querySelector('[data-exp-placeholder]');
    if (!state?.enemy || !image || !placeholder) return;
    const reduced = this.reducedMotion();
    const token = this.token;
    const sprite = this.createSprite({ image, placeholder, mount: image.parentElement, reducedMotion: reduced, speed: 1.5 });
    this.sprite = sprite;
    // Pending image loads belong to this render, never to the next room.
    const ready = sprite.setEnemy(state.enemy.sprite);
    Promise.resolve(ready).then(() => {
      if (token !== this.token) return;
      if (state.phase === 'feedback' && state.turn !== 'event') {
        if (state.turn === 'enemy') sprite.playState('attack', () => sprite.playState('idle'));
        else if (state.effect?.type === 'heal' || state.effect?.type === 'guard') sprite.playState('idle');
        else sprite.playState('hit', () => sprite.playState(state.enemy.hp === 0 ? 'death' : 'idle'));
      }
    }).catch(() => { /* Placeholder and CSS effects remain usable if a sprite cannot load. */ });
    if (entry) {
      this.intro = this.root.querySelector('[data-exp-intro]');
      if (this.intro) {
        this.lock(true);
        if (reduced) this.finishIntro();
        else {
          this.root.querySelector('[data-exp="skip-entry"]')?.focus();
          this.later(() => this.finishIntro(), 1200);
        }
      }
    } else if (state.phase === 'feedback' && state.turn !== 'event') {
      this.feedback(state, reduced);
    } else if (state.turn === 'enemy' && state.phase === 'question') {
      this.root.querySelector('.exp-enemy')?.classList.add('exp-windup');
    }
  }
  feedback(state, reduced) {
    const type = state.effect?.type || (state.turn === 'enemy' ? 'damage' : 'strike');
    const defeated = state.enemy.hp === 0;
    const stage = this.root.querySelector('.exp-enemy-visual');
    const float = this.root.querySelector(type === 'strike' ? '[data-exp-float]' : '[data-exp-player-float]');
    if (float && Number.isFinite(state.effect?.amount)) {
      const amount = state.effect.amount;
      float.textContent = type === 'guard' ? `GUARD ${amount}` : `${type === 'heal' ? '+' : '−'}${amount}`;
      float.classList.add(type === 'damage' ? 'player-dmg' : type === 'heal' ? 'heal' : state.lastGrade === 'PERFECT' ? 'crit-dmg' : 'enemy-dmg');
    }
    if (type === 'damage') this.root.classList.add(state.lastGrade === 'PERFECT' ? 'exp-player-guard' : 'exp-player-hit');
    else if (type === 'heal' || type === 'guard') this.root.classList.add('exp-player-heal');
    else {
      stage?.classList.add('fx-attack');
      if (defeated) {
        const death = this.root.querySelector('[data-exp-death]');
        if (death) { death.hidden = false; death.classList.add('active'); }
        if (!reduced) this.later(() => { stage?.classList.remove('fx-attack'); stage?.classList.add('fx-death'); }, 220);
      }
    }
    this.root.classList.add('exp-impact');
    if (reduced) { this.onReady(); return; }
    this.lock(true);
    this.later(() => { this.lock(false); this.onReady(); }, defeated ? 640 : 340);
  }
}
