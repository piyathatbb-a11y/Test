import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Expedition, makeQuestion, qteGrade, TOPICS } from '../js/systems/Expedition.js';
import { ExpeditionUI } from '../js/ExpeditionUI.js';

function createMinimalDom() {
  const elements = new Map();
  const make = (id = '') => {
    const el = {
      id,
      className: '',
      dataset: {},
      style: {},
      attributes: {},
      listeners: {},
      hidden: false,
      innerHTML: '',
      textContent: '',
      value: '',
      disabled: false,
      classList: {
        contains: name => el.className.split(/\s+/).filter(Boolean).includes(name),
        add: name => {
          const parts = new Set(el.className.split(/\s+/).filter(Boolean));
          parts.add(name);
          el.className = [...parts].join(' ');
        },
        remove: name => {
          el.className = el.className.split(/\s+/).filter(part => part && part !== name).join(' ');
        },
        toggle: (name, force) => {
          const has = el.classList.contains(name);
          if (force === undefined ? !has : force) el.classList.add(name);
          else el.classList.remove(name);
        }
      },
      setAttribute: (key, value) => { el.attributes[key] = value; },
      getAttribute: key => el.attributes[key],
      addEventListener: (type, fn) => { (el.listeners[type] ||= []).push(fn); },
      append: () => {},
      appendChild: () => {},
      focus: () => {},
      scrollIntoView: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      closest: () => null,
      set disabled(next) { el._disabled = next; },
      get disabled() { return !!el._disabled; }
    };
    return el;
  };
  const document = {
    body: make('body'),
    documentElement: make('html'),
    addEventListener: () => {},
    createElement: tag => make(tag),
    getElementById: id => elements.get(id) ?? null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };
  const app = make('app');
  elements.set('app', app);
  return { document, app, elements };
}

test('expedition questions are valid and graded', () => {
  const q = makeQuestion('length', 'seed-1');
  assert.equal(q.options.length, 4);
  assert.ok(q.correct >= 0 && q.correct < q.options.length);
  assert.equal(q.pair.length, 2);
  assert.ok(TOPICS.length === 'ความยาว');
  assert.equal(qteGrade(0.62), 'PERFECT');
  assert.equal(qteGrade(0.5), 'GOOD');
  assert.equal(qteGrade(0.9), 'BAD');
});

test('expedition UI can open without crypto.randomUUID', async () => {
  const { document, app } = createMinimalDom();
  const memory = new Map();
  globalThis.localStorage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value)
  };
  const previousCrypto = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
  globalThis.document = document;
  globalThis.window = {
    addEventListener: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    clearTimeout: () => {},
    setTimeout: () => 1
  };
  try {
    const ui = new ExpeditionUI(() => {});
    assert.doesNotThrow(() => ui.open('normal'));
    assert.equal(ui.root.id, 'screen-expedition');
    assert.ok(app || true);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: previousCrypto, configurable: true, writable: true });
  }
});
