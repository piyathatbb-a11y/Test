import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMap, QTE, qteGrade } from '../js/systems/Expedition.js';
import { routePositions, ROUTE_SIZE, roomIcon } from '../js/ui/routeMap.js';
import { ExpeditionStore } from '../js/systems/ExpeditionStore.js';

test('horizontal map geometry stays in bounds and forward-facing for 500 seeds', () => {
  for (let seed = 0; seed < 500; seed++) {
    const map = makeMap(seed), positions = routePositions(map, seed);
    assert.deepEqual(positions, routePositions(map, seed));
    for (const n of map) {
      const p = positions.get(n.id);
      assert.ok(p.x > 40 && p.x < ROUTE_SIZE.width - 40);
      assert.ok(p.y > 40 && p.y < ROUTE_SIZE.height - 40);
      for (const id of n.next) assert.ok(positions.get(id).x > p.x);
    }
    assert.equal(positions.get('8-0').y, ROUTE_SIZE.height / 2);
    // At the narrowest canvas width, 48px touch targets must not overlap.
    for (let i = 0; i < map.length; i++) for (let j = i + 1; j < map.length; j++) {
      const a = positions.get(map[i].id), b = positions.get(map[j].id);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) * 960 / ROUTE_SIZE.width > 56);
    }
  }
});

test('visible QTE zone boundaries match grade classification', () => {
  for (const sign of [-1, 1]) {
    assert.equal(qteGrade(QTE.center + sign * (QTE.perfect - .001)), 'PERFECT');
    assert.equal(qteGrade(QTE.center + sign * (QTE.perfect + .001)), 'GOOD');
    assert.equal(qteGrade(QTE.center + sign * (QTE.good + .001)), 'BAD');
  }
  for (const type of ['fight', 'elite', 'event', 'shop', 'rest', 'treasure', 'boss']) assert.match(roomIcon(type), /<svg/);
});

test('new faster timing rankings do not mix old slower finish times', () => {
  const data = { rows: [{ id: 'old', version: 'turns-v1', topic: 'length', name: 'OLD', elapsed: 100, accuracy: 100, won: true, ranked: false }] };
  const store = new ExpeditionStore({ getItem: () => JSON.stringify(data), setItem() {} });
  assert.equal(store.archive().rows.length, 1);
  assert.equal(store.leaders('length', false).length, 0);
});
