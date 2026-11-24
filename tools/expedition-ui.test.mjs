// DOM-boundary tests without a browser. Visual verification remains a separate check.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { ExpeditionUI } from '../js/ExpeditionUI.js';
import { QTE } from '../js/systems/Expedition.js';

function mount(aiQuestionService = null) {
  const memory = new Map();
  const attributes = new Map();
  globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  globalThis.document = {
    hidden: false,
    createElement: () => ({
      innerHTML: '', className: '', classList: { add() {}, remove() {}, contains: () => true },
      getAttribute: key => attributes.get(key) ?? null,
      setAttribute: (key, value) => attributes.set(key, value),
      addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => []
    }),
    getElementById: () => ({ append() {} }), querySelectorAll: () => [], addEventListener() {}
  };
  globalThis.window = {
    addEventListener() {}, setInterval() { return 1; }, setTimeout() { return 1; }, clearTimeout() {}
  };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  return new ExpeditionUI(() => {}, aiQuestionService);
}

test('real UI controller connects setup, map, skill, question, QTE, defense, save and resume', () => {
  const ui = mount();
  ui.open();
  assert.match(ui.root.innerHTML, /เลือกความรู้ที่จะพาไปด้วย/);
  ui.act('topic:mass');
  ui.act('start');
  assert.equal(ui.game.s.topic, 'mass');
  assert.match(ui.root.innerHTML, /data-exp="node:0-1"/);
  assert.match(ui.root.innerHTML, /สัมภาระของคุณ/);
  ui.act('node:0-1');
  assert.match(ui.root.innerHTML, /data-exp="skill:heavy"/);
  ui.act('skill:basic');
  assert.match(ui.root.innerHTML, /data-exp="answer:3"/);
  ui.act(`answer:${ui.game.s.question.correct}`);
  assert.match(ui.root.innerHTML, /ถูกต้อง! จับจังหวะ/);
  ui.hitQte(true);
  assert.match(ui.root.innerHTML, /BAD/);
  assert.equal(ui.game.s.correct, 1);
  ui.act('next');
  assert.equal(ui.game.s.turn, 'enemy');
  assert.match(ui.root.innerHTML, /ตอบเพื่อป้องกัน/);
  const question = ui.game.s.question;
  ui.close();
  ui.open();
  assert.match(ui.root.innerHTML, /เล่นรอบที่บันทึกต่อ/);
  ui.act('resume');
  assert.deepEqual(ui.game.s.question, question);
  assert.match(ui.root.innerHTML, /ตอบเพื่อป้องกัน/);
});

test('setup exposes derived topics and their matching category selection', () => {
  const ui = mount({
    isEnabled: () => false,
    hasKey: () => false,
    resetQueue() {},
    getStatus: () => ({ type: 'idle', message: 'AI question generation is off.' })
  });
  ui.open();
  for (const topic of ['area', 'volume', 'speed']) {
    assert.match(ui.root.innerHTML, new RegExp(`data-exp="topic:${topic}"`));
  }
  assert.match(ui.root.innerHTML, /แผนภาพและการคำนวณหลายขั้น/);
  ui.act('topic:speed');
  ui.act('start');
  assert.equal(ui.game.s.topic, 'speed');
  ui.act('node:0-1');
  ui.act('skill:basic');
  assert.match(ui.game.s.question.text, /(km\/h|m\/s|cm\/s|km\/s)/);
});

test('ranked QTE suspension applies BAD once and preserves question accuracy', () => {
  const ui = mount();
  ui.open('ranked'); ui.start(); ui.act('node:0-1'); ui.act('skill:basic');
  ui.act(`answer:${ui.game.s.question.correct}`);
  const enemyHp = ui.game.s.enemy.hp;
  ui.suspend();
  assert.equal(ui.game.s.ranked, false);
  assert.equal(ui.game.s.phase, 'feedback');
  assert.equal(ui.game.s.correct, 1);
  assert.ok(ui.game.s.enemy.hp < enemyHp);
  const after = ui.game.s.enemy.hp;
  ui.suspend();
  assert.equal(ui.game.s.enemy.hp, after);
  assert.match(ui.root.innerHTML, /ไม่ส่งอันดับรายวัน/);
});

test('casual runs consume AI questions while ranked runs keep deterministic questions', () => {
  const selections = [
    { categoryId: 'length', from: 'km', to: 'm', value: 2 },
    { categoryId: 'length', from: 'm', to: 'cm', value: 3 }
  ];
  let requestCount = 0;
  const ai = {
    isEnabled: () => true,
    hasKey: () => true,
    getStatus: () => ({ type: 'ready', message: 'AI questions ready.' }),
    resetQueue() { selections.length = 2; },
    prefetch() { requestCount++; },
    takeQuestion() { return selections.shift() || null; }
  };
  const casual = mount(ai);
  casual.open();
  casual.start();
  assert.equal(requestCount, 1);
  casual.act('node:0-1');
  casual.act('skill:basic');
  assert.equal(casual.game.s.question.text, '2 km = ? m');
  assert.equal(casual.game.s.question.source, 'ai');

  const ranked = mount(ai);
  ranked.open('ranked');
  ranked.start();
  ranked.act('node:0-1');
  ranked.act('skill:basic');
  assert.equal(ranked.game.s.question.source, undefined);
  assert.equal(requestCount, 1);
});

test('AI diagram questions render a visual calculation in casual runs only', () => {
  const selection = {
    categoryId: 'length',
    from: 'km',
    to: 'm',
    value: 1.5,
    format: 'diagram-math',
    comparisonFrom: 'cm',
    comparisonValue: 75000,
    operation: 'add'
  };
  const ai = {
    isEnabled: () => true,
    hasKey: () => true,
    getStatus: () => ({ type: 'ready', message: 'AI questions ready.' }),
    resetQueue() {},
    prefetch() {},
    takeQuestion: () => selection
  };
  const casual = mount(ai);
  casual.open();
  casual.start();
  casual.act('node:0-1');
  casual.act('skill:basic');
  assert.equal(casual.game.s.question.options[casual.game.s.question.correct], 2250);
  assert.match(casual.root.innerHTML, /exp-question-diagram/);
  assert.match(casual.root.innerHTML, /1\.5 km/);
  assert.match(casual.root.innerHTML, /75,000 cm/);
  assert.match(casual.root.innerHTML, /\? m/);

  const ranked = mount(ai);
  ranked.open('ranked');
  ranked.start();
  ranked.act('node:0-1');
  ranked.act('skill:basic');
  assert.notEqual(ranked.game.s.question.format, 'diagram-math');
  assert.doesNotMatch(ranked.root.innerHTML, /exp-question-diagram/);
});

test('reward, replacement, rest, shop, event and summary states render usable actions', () => {
  const ui = mount(); ui.open(); ui.start(); ui.act('node:0-1');
  ui.game.offerRewards(); ui.render();
  assert.match(ui.root.innerHTML, /data-exp="reward:0"/);
  ui.game.s.rewards = [{ kind: 'skill', id: 'drain' }];
  ui.act('reward:0');
  assert.match(ui.root.innerHTML, /เลือกสกิลที่จะทดแทน/);
  ui.act('replace:heavy');
  assert.ok(ui.game.s.skills.includes('drain'));
  ui.game.node().type = 'rest'; ui.game.s.phase = 'room'; ui.render();
  assert.match(ui.root.innerHTML, /data-exp="room:rest"/);
  ui.game.node().type = 'shop'; ui.render();
  assert.match(ui.root.innerHTML, /data-exp="room:relic" disabled/);
  ui.game.s.phase = 'event'; ui.game.s.event = { title: 'ทดสอบ', text: 'ข้อความ', choices: [['leave', 'เดินต่อ']] }; ui.render();
  assert.match(ui.root.innerHTML, /data-exp="event:leave"/);
  ui.game.end(true, Date.now()); ui.store.record(ui.game, '<script>alert(1)</script>'); ui.render();
  assert.match(ui.root.innerHTML, /ผ่านเขตมาตรวัดแล้ว/);
  assert.match(ui.root.innerHTML, /เวลาจบ/);
  assert.ok(!ui.root.innerHTML.includes('<script>alert'));
});

test('broken stored snapshots fail with recovery UI instead of breaking the menu', () => {
  const ui = mount(); ui.open(); ui.saved = { version: 'bad' };
  ui.act('resume');
  assert.equal(ui.game, null);
  assert.match(ui.root.innerHTML, /ข้อมูลรอบเก่าใช้ไม่ได้/);
  assert.match(ui.root.innerHTML, /เริ่มเดินทาง/);
});

test('entry points and all expedition sprites/styles exist', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(main, /expeditionUI\.open\('normal'\)/);
  assert.match(main, /expeditionUI\.open\('ranked'\)/);
  assert.match(html, /css\/expedition.css/);
  for (const id of ['glitch', 'fragment', 'corruptor', 'byte_drone', 'quantum_sentry']) {
    assert.ok(existsSync(new URL(`../assets/sprites_generated/${id}/idle_01.png`, import.meta.url)));
  }
});

test('correct combat feedback advances automatically, wrong feedback stays for learning', () => {
  const ui = mount();
  const timers = new Map(); let timerId = 0;
  window.setTimeout = (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; };
  window.clearTimeout = id => timers.delete(id);
  ui.open(); ui.start(); ui.act('node:0-1'); ui.act('skill:basic');
  ui.act(`answer:${ui.game.s.question.correct}`);
  ui.qteStart = performance.now() - QTE.center * QTE.duration;
  ui.hitQte();
  assert.equal(ui.game.s.lastGrade, 'PERFECT');
  assert.equal(ui.game.s.phase, 'feedback');
  assert.equal(timers.size, 1);
  const scheduled = [...timers.values()][0];
  assert.equal(scheduled.ms, 160);
  scheduled.fn();
  assert.equal(ui.game.s.phase, 'question');
  assert.equal(ui.game.s.turn, 'enemy');
  timers.clear();
  ui.act(`answer:${(ui.game.s.question.correct + 1) % 4}`);
  assert.equal(ui.game.s.phase, 'feedback');
  assert.equal(ui.game.s.lastGrade, 'BAD');
  assert.equal(timers.size, 0);
  assert.equal(ui.game.advance(ui.game.s.continueAt - 1), false);
});

test('leaving a result cancels automatic progression even if an old timer was queued', () => {
  const ui = mount();
  const timers = new Map(); let timerId = 0;
  window.setTimeout = fn => { timers.set(++timerId, fn); return timerId; };
  window.clearTimeout = id => timers.delete(id);
  ui.open(); ui.start(); ui.act('node:0-1'); ui.act('skill:basic');
  ui.act(`answer:${ui.game.s.question.correct}`); ui.hitQte(true);
  const callback = [...timers.values()][0];
  assert.ok(callback);
  ui.close();
  const snapshot = ui.game.snapshot();
  assert.equal(timers.size, 0);
  callback();
  assert.deepEqual(ui.game.snapshot(), snapshot);
});

test('QTE traverses the new duration using transforms and times out exactly once', () => {
  const ui = mount(); ui.open(); ui.start(); ui.act('node:0-1'); ui.act('skill:basic');
  const frames = new Map(); let frameId = 0;
  globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const cursor = { style: {} };
  ui.root.querySelector = selector => selector === '.exp-qte-cursor' ? cursor : null;
  ui.act(`answer:${ui.game.s.question.correct}`);
  assert.equal(QTE.duration, 850);
  const first = [...frames.values()][0]; frames.clear();
  first(ui.qteStart + QTE.duration / 2);
  const percent = Number(cursor.style.transform.match(/translate3d\(([\d.]+)%/)[1]);
  assert.ok(Math.abs(percent - 50) < .0001);
  const second = [...frames.values()][0];
  second(ui.qteStart + QTE.duration + 1);
  assert.equal(ui.game.s.phase, 'feedback');
  assert.equal(ui.game.s.lastGrade, 'BAD');
  const hp = ui.game.s.enemy.hp;
  second(ui.qteStart + QTE.duration * 2);
  assert.equal(ui.game.s.enemy.hp, hp);
});

test('map exposes next choices and a current location while preserving the saved graph', () => {
  const ui = mount(); ui.open(); ui.start();
  const before = ui.game.snapshot().map;
  const html = ui.map();
  assert.match(html, /exp-atlas/);
  assert.match(html, /exp-route-lines/);
  assert.match(html, /exp-map-legend/);
  assert.equal((html.match(/class="exp-route-choice"/g) || []).length, 3);
  assert.deepEqual(ui.game.s.map, before);
  ui.act('node:0-1'); ui.game.clear('test');
  const next = ui.map();
  assert.match(next, /aria-current="location"/);
  assert.match(next, /is-unreachable/);
  assert.equal((next.match(/class="exp-route-choice"/g) || []).length, 2);
});

test('map entrance animates once per phase entry and unlocks route nodes when complete', () => {
  const ui = mount();
  const node = { disabled: false, dataset: {} };
  const choice = { disabled: false, dataset: {} };
  const classes = new Set();
  let openingCount = 0;
  const listeners = new Map();
  const map = {
    classList: {
      add(name) { classes.add(name); openingCount++; },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); }
    },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); }
  };
  const route = {
    querySelector: selector => selector === '.exp-map' ? map : null,
    querySelectorAll(selector) {
      if (selector === '[data-exp^="node:"]:not([disabled])') return [node, choice].filter(control => !control.disabled);
      return selector === '[data-map-opening-disabled]'
        ? [node, choice].filter(control => control.dataset.mapOpeningDisabled)
        : [];
    },
  };
  ui.root.querySelector = selector => selector === '.exp-route' ? route : null;
  ui.open();
  ui.start();

  assert.equal(openingCount, 1);
  assert.equal(node.disabled, true);
  assert.equal(choice.disabled, true);
  assert.equal(map.classList.contains('is-opening'), true);

  ui.render();
  assert.equal(openingCount, 1);

  listeners.get('animationend')({ target: map, animationName: 'exp-map-unfold' });
  assert.equal(node.disabled, false);
  assert.equal(choice.disabled, false);
  assert.equal('mapOpeningDisabled' in node.dataset, false);
  assert.equal('mapOpeningDisabled' in choice.dataset, false);
  assert.equal(map.classList.contains('is-opening'), false);
});

test('reduced-motion preference skips the map entrance and route-node lock', () => {
  const ui = mount();
  window.matchMedia = () => ({ matches: true });
  const node = { disabled: false, dataset: {} };
  let openingCount = 0;
  const route = {
    querySelector: () => ({ classList: { add() { openingCount++; }, remove() {} }, addEventListener() {} }),
    querySelectorAll: selector => selector === '[data-exp^="node:"]:not([disabled])' ? [node] : [],
  };
  ui.root.querySelector = selector => selector === '.exp-route' ? route : null;
  ui.open();
  ui.start();

  assert.equal(openingCount, 0);
  assert.equal(node.disabled, false);
});

test('map entrance timeout unlocks route controls if the animation event is missed', () => {
  const ui = mount();
  let finishOpening;
  window.setTimeout = callback => { finishOpening = callback; return 1; };
  const node = { disabled: false, dataset: {} };
  const route = {
    querySelector: () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, removeEventListener() {} }),
    querySelectorAll(selector) {
      if (selector === '[data-exp^="node:"]:not([disabled])') return [node].filter(control => !control.disabled);
      return selector === '[data-map-opening-disabled]' && node.dataset.mapOpeningDisabled ? [node] : [];
    },
  };
  ui.root.querySelector = selector => selector === '.exp-route' ? route : null;
  ui.open();
  ui.start();

  assert.equal(node.disabled, true);
  finishOpening();
  assert.equal(node.disabled, false);
});
