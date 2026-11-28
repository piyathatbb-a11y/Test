// Import the actual browser entry point against a minimal DOM boundary.
// This verifies module startup and menu wiring, not layout or browser rendering.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('actual main entry point initializes and hub buttons open the new expedition', async () => {
  const elements = [];
  class Element {
    constructor(tag = 'div', attributes = {}) {
      this.tagName = tag.toUpperCase(); this.attributes = attributes; this.id = attributes.id || '';
      this.className = attributes.class || ''; this.dataset = {}; this.style = {}; this.listeners = {};
      this.innerHTML = ''; this.textContent = ''; this.value = ''; this.hidden = false;
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name),
        add: name => { if (!this.classList.contains(name)) this.className += ` ${name}`; },
        remove: name => { this.className = this.className.split(/\s+/).filter(c => c !== name).join(' '); },
        toggle: (name, force) => { (force ?? !this.classList.contains(name)) ? this.classList.add(name) : this.classList.remove(name); }
      };
      for (const [key, value] of Object.entries(attributes)) if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      elements.push(this);
    }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k]; }
    addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
    click() { for (const fn of this.listeners.click || []) fn({ target: this, preventDefault() {} }); }
    append() {} appendChild() {} focus() {} scrollIntoView() {}
    querySelector() { return null; } querySelectorAll() { return []; }
  }
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const tag of html.matchAll(/<([a-z][a-z\d-]*)\b([^>]*)>/gi)) {
    const attrs = Object.fromEntries([...tag[2].matchAll(/([a-z\d-]+)="([^"]*)"/gi)].map(m => [m[1], m[2]]));
    new Element(tag[1], attrs);
  }
  const match = (element, selector) => selector.startsWith('.') ? selector.slice(1).split('.').every(c => element.classList.contains(c)) : selector.startsWith('[') ? selector.slice(1, -1) in element.attributes : false;
  const memory = new Map();
  globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  globalThis.document = {
    createElement: tag => new Element(tag),
    getElementById: id => elements.find(e => e.id === id),
    querySelector: selector => elements.find(e => match(e, selector)) || null,
    querySelectorAll: selector => elements.filter(e => match(e, selector)),
    addEventListener() {}, createTreeWalker: () => ({ nextNode: () => false }),
    body: new Element('body'), documentElement: new Element('html')
  };
  globalThis.window = { addEventListener() {}, setInterval() { return 1; }, setTimeout() { return 1; }, clearTimeout() {} };
  globalThis.NodeFilter = { SHOW_TEXT: 4 };
  globalThis.MutationObserver = class { observe() {} };
  await import('../js/main.js');
  await Promise.resolve();
  const root = document.getElementById('screen-expedition');
  assert.ok(root);
  assert.equal(document.getElementById('screen-start').classList.contains('active'), true);
  document.getElementById('btn-start').click();
  assert.equal(root.classList.contains('active'), true);
  assert.equal(document.getElementById('screen-start').classList.contains('active'), false);
  assert.match(root.innerHTML, /Choose the knowledge to carry/);
  document.getElementById('btn-daily-ranked').click();
  assert.match(root.innerHTML, /data-exp="mode:ranked" aria-pressed="true"/);
  assert.match(root.innerHTML, /Thailand time/);
  document.getElementById('btn-records').click();
  assert.match(root.innerHTML, /Rank casual · Length · this device only/);
});
