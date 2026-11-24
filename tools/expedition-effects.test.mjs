import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { ExpeditionEffects } from '../js/systems/ExpeditionEffects.js';
import { SpriteRenderer } from '../js/systems/SpriteRenderer.js';
import { SPRITE_CONFIGS, getSpritePath } from '../js/data/spriteConfigs.js';

function element() {
  const classes = new Set();
  return { style: {}, hidden: false, disabled: false, inert: false, textContent: '', attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; }, focus() { this.focused = true; },
    classList: { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)), contains: n => classes.has(n) }
  };
}
function harness(reduced = false, deferred = false) {
  const nodes = new Map(['[data-exp-sprite]', '[data-exp-placeholder]', '.exp-task', '[data-exp="next"]', '[data-exp-intro]', '[data-exp="skip-entry"]', '.exp-enemy-visual', '[data-exp-float]', '[data-exp-player-float]', '[data-exp-death]', '.exp-enemy'].map(k => [k, element()]));
  const root = element(); root.querySelector = key => nodes.get(key) || null;
  let nextId = 0, readyCount = 0, finishLoad;
  const scheduled = new Map(), sprites = [];
  const effects = new ExpeditionEffects(root, {
    reducedMotion: () => reduced, onReady: () => readyCount++,
    schedule: (fn, ms) => { const id = ++nextId; scheduled.set(id, { fn, ms }); return id; },
    unschedule: id => scheduled.delete(id),
    createSprite: options => {
      const sprite = { options, states: [], clearCount: 0,
        setEnemy(id) { this.enemy = id; return deferred ? new Promise(resolve => { finishLoad = resolve; }) : Promise.resolve(); },
        playState(state, callback) { this.states.push(state); this.callback = callback; },
        clear() { this.clearCount++; }
      };
      sprites.push(sprite); return sprite;
    }
  });
  return { root, nodes, effects, scheduled, sprites, readyCount: () => readyCount, finishLoad: () => finishLoad(),
    runTimers() { for (const [id, { fn }] of [...scheduled]) { scheduled.delete(id); fn(); } } };
}
const state = (extra = {}) => ({ phase: 'skill', turn: 'player', enemy: { sprite: 'glitch', hp: 30 }, ...extra });

test('entry reuses the intro, locks actions, supports skip and releases exactly once', async () => {
  const h = harness(); h.effects.mount(state(), { entry: true });
  assert.equal(h.effects.busy, true);
  assert.equal(h.nodes.get('.exp-task').inert, true);
  assert.equal(h.nodes.get('[data-exp="skip-entry"]').focused, true);
  assert.equal([...h.scheduled.values()][0].ms, 1200);
  h.effects.finishIntro();
  assert.equal(h.nodes.get('[data-exp-intro]').hidden, true);
  assert.equal(h.effects.busy, false);
  assert.equal(h.readyCount(), 1);
  h.runTimers();
  assert.equal(h.readyCount(), 1);
  h.effects.cancel();
  assert.equal(h.sprites[0].clearCount, 1);
});

test('lethal strike chains existing hit/death frames and never changes game state', async () => {
  const h = harness();
  const s = state({ phase: 'feedback', enemy: { sprite: 'glitch', hp: 0 }, lastGrade: 'PERFECT', effect: { type: 'strike', amount: 24 } });
  const before = JSON.stringify(s);
  h.effects.mount(s); await Promise.resolve();
  assert.deepEqual(h.sprites[0].states, ['hit']);
  h.sprites[0].callback();
  assert.deepEqual(h.sprites[0].states, ['hit', 'death']);
  assert.equal(h.nodes.get('[data-exp-float]').textContent, '−24');
  assert.ok(h.nodes.get('[data-exp-death]').classList.contains('active'));
  assert.equal(h.effects.busy, true);
  h.runTimers();
  assert.equal(h.effects.busy, false);
  assert.ok(h.nodes.get('.exp-enemy-visual').classList.contains('fx-death'));
  assert.equal(JSON.stringify(s), before);
});

test('enemy attack animates its sprite but floats incoming damage over player HP', async () => {
  const h = harness();
  h.effects.mount(state({ phase: 'feedback', turn: 'enemy', lastGrade: 'BAD', effect: { type: 'damage', amount: 23 } }));
  await Promise.resolve();
  assert.equal(h.sprites[0].states[0], 'attack');
  assert.equal(h.nodes.get('[data-exp-player-float]').textContent, '−23');
  assert.equal(h.nodes.get('[data-exp-float]').textContent, '');
  assert.ok(h.root.classList.contains('exp-player-hit'));
  h.sprites[0].callback();
  assert.equal(h.sprites[0].states[1], 'idle');
});

test('cancel clears timers and makes pending sprite loads inert after navigation', async () => {
  const h = harness(false, true);
  h.effects.mount(state({ phase: 'feedback', lastGrade: 'GOOD', effect: { type: 'strike', amount: 16 } }));
  const staleCallbacks = [...h.scheduled.values()].map(v => v.fn);
  h.effects.cancel();
  assert.equal(h.scheduled.size, 0);
  assert.equal(h.effects.busy, false);
  h.finishLoad(); await Promise.resolve();
  assert.deepEqual(h.sprites[0].states, []);
  for (const callback of staleCallbacks) callback();
  assert.equal(h.readyCount(), 0);
});

test('reduced motion skips entry, uses still sprite poses, and adds no artificial delay', async () => {
  const h = harness(true);
  h.effects.mount(state(), { entry: true });
  assert.equal(h.sprites[0].options.reducedMotion, true);
  assert.equal(h.effects.busy, false);
  assert.equal(h.nodes.get('[data-exp-intro]').hidden, true);
  assert.equal(h.scheduled.size, 0);
  h.effects.mount(state({ phase: 'feedback', turn: 'enemy', lastGrade: 'PERFECT', effect: { type: 'damage', amount: 15 } }));
  assert.equal(h.effects.busy, false);
  assert.ok(h.root.classList.contains('exp-player-guard'));
  assert.equal(h.scheduled.size, 0);
});

test('missing DOM targets never lock the game or start sprite timers', () => {
  const h = harness(); h.nodes.delete('[data-exp-sprite]');
  h.effects.mount(state(), { entry: true });
  assert.equal(h.effects.busy, false);
  assert.equal(h.sprites.length, 0);
});

test('sprite renderer accepts independent mounts and reduced motion uses valid final frames', () => {
  const image = element(), placeholder = element(), mount = element();
  const renderer = new SpriteRenderer(null, { image, placeholder, mount, reducedMotion: true });
  renderer.currentId = renderer.displayId = 'glitch'; renderer.hasSprites = true;
  let callback = 0;
  renderer.playState('death', () => callback++);
  assert.equal(renderer.img, image);
  assert.equal(image.src, getSpritePath('glitch', 'death', 5));
  assert.equal(callback, 1);
  renderer.playState('idle');
  assert.equal(image.src, getSpritePath('glitch', 'idle', 1));
  assert.equal(renderer.animationId, null);
});

test('all animation frames for expedition enemies exist on disk', () => {
  for (const id of ['glitch', 'fragment', 'corruptor', 'byte_drone', 'quantum_sentry']) {
    for (const [name, config] of Object.entries(SPRITE_CONFIGS[id].states)) {
      for (let frame = 1; frame <= config.frames; frame++) {
        assert.ok(existsSync(new URL(`../${getSpritePath(id, name, frame)}`, import.meta.url)), `${id}/${name}/${frame}`);
      }
    }
  }
});
