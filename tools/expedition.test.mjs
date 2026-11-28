import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Expedition, makeMap, makeQuestion, makeQuestionFromSelection, qteGrade, RULESET, TOPICS } from '../js/systems/Expedition.js';
import { ExpeditionStore, dayKey } from '../js/systems/ExpeditionStore.js';

function battle() {
  const game = new Expedition({ seed: 'test', now: 1000 });
  game.enter('0-1');
  game.s.enemy.armor = 0;
  return game;
}
function correct(game, grade = 'GOOD') {
  assert.equal(game.answer(game.s.question.correct, 1000), true);
  assert.equal(game.s.phase, 'qte');
  game.resolve(grade);
  game.advance(10000);
}

test('500 seeds yield reachable forward maps, safe routes and three required fights', () => {
  for (let i = 0; i < 500; i++) {
    const map = makeMap(`seed-${i}`);
    assert.deepEqual(map, makeMap(`seed-${i}`));
    const reached = new Set(map.filter(n => n.row === 0).map(n => n.id));
    for (const n of map) {
      assert.ok(reached.has(n.id), `unreachable ${i}:${n.id}`);
      if ([0, 3, 5].includes(n.row)) assert.equal(n.type, 'fight');
      if (n.row === 7) assert.equal(n.type, 'rest');
      if (n.row < 8) {
        assert.ok(n.next.length);
        for (const id of n.next) {
          const next = map.find(n => n.id === id);
          assert.equal(next.row, n.row + 1);
          reached.add(id);
        }
        assert.ok(n.next.some(id => map.find(n => n.id === id).type !== 'elite'));
      }
    }
    assert.equal(map.at(-1).type, 'boss');
  }
});

test('questions have unique displayed answers and correct arithmetic across topics', () => {
  for (const topic of Object.keys(TOPICS)) {
    for (let i = 0; i < 1000; i++) {
      const q = makeQuestion(topic, String(i));
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options.map(String)).size, 4);
      assert.ok(q.correct >= 0 && q.correct <= 3);
      assert.ok(q.options.every(Number.isFinite));
      assert.ok(q.explanation.includes(String(q.options[q.correct])));
      assert.notEqual(q.pair[0], q.pair[1]);
      assert.deepEqual(q, makeQuestion(topic, String(i)));
    }
  }
});

test('derived-unit conversions and all question formats calculate answers locally', () => {
  const cases = [
    ['area', { format: 'convert', from: 'm²', to: 'cm²', value: 1 }, 10000],
    ['volume', { format: 'convert', from: 'm³', to: 'L', value: 2 }, 2000],
    ['speed', { format: 'convert', from: 'km/h', to: 'm/s', value: 36 }, 10],
    ['length', { format: 'reverse', from: 'km', to: 'm', value: 2 }, 2],
    ['length', { format: 'compare', from: 'km', to: 'm', value: 2, comparisonFrom: 'm', comparisonValue: 500 }, 1500],
    ['volume', { format: 'word-problem', from: 'L', to: 'mL', value: 2, context: 'A tank contains' }, 2000]
  ];

  for (const [topic, selection, answer] of cases) {
    const q = makeQuestionFromSelection(topic, selection);
    assert.ok(q, `${topic}/${selection.format} should generate`);
    assert.equal(q.options.length, 4);
    assert.equal(q.options[q.correct], answer);
    assert.equal(new Set(q.options.map(String)).size, 4);
    assert.ok(q.explanation.includes(String(answer)));
    assert.deepEqual(q, makeQuestionFromSelection(topic, selection));
  }
});

test('AI diagram calculations convert both measurements before applying the operation', () => {
  const cases = [
    ['length', { from: 'km', to: 'm', value: 1.5, comparisonFrom: 'cm', comparisonValue: 75000, operation: 'add' }, 2250],
    ['mass', { from: 'kg', to: 'mg', value: 2, comparisonFrom: 'g', comparisonValue: 500, operation: 'difference' }, 1500000],
    ['time', { from: 'h', to: 'min', value: 2, comparisonFrom: 's', comparisonValue: 1800, operation: 'add' }, 150],
    ['area', { from: 'ha', to: 'cm²', value: 1, comparisonFrom: 'm²', comparisonValue: 5000, operation: 'add' }, 150000000],
    ['volume', { from: 'm³', to: 'mL', value: 1, comparisonFrom: 'L', comparisonValue: 250, operation: 'add' }, 1250000],
    ['speed', { from: 'km/h', to: 'cm/s', value: 36, comparisonFrom: 'km/s', comparisonValue: 0.002, operation: 'add' }, 1200]
  ];

  for (const [topic, selection, answer] of cases) {
    const question = makeQuestionFromSelection(topic, {
      ...selection,
      format: 'diagram-math',
      source: 'ai'
    });
    assert.equal(question.options[question.correct], answer);
    assert.equal(question.format, 'diagram-math');
    assert.equal(question.source, 'ai');
    assert.deepEqual(question.diagram, {
      first: { value: selection.value, unit: selection.from },
      second: { value: selection.comparisonValue, unit: selection.comparisonFrom },
      operator: selection.operation === 'add' ? '+' : '−',
      targetUnit: selection.to
    });
    assert.ok(question.explanation.includes(String(answer)));
  }

  const question = makeQuestionFromSelection('length', {
    format: 'diagram-math',
    from: 'km',
    to: 'm',
    value: 1.5,
    comparisonFrom: 'cm',
    comparisonValue: 75000,
    operation: 'add',
    source: 'ai'
  });
  assert.match(question.explanation, /1500 m.*750 m.*2250 m/);
  const localQuestion = makeQuestionFromSelection('length', {
    format: 'diagram-math',
    from: 'km',
    to: 'm',
    value: 1.5,
    comparisonFrom: 'cm',
    comparisonValue: 75000,
    operation: 'add'
  });
  assert.equal(localQuestion.format, 'convert');
  assert.equal(localQuestion.diagram, undefined);
  assert.equal(makeQuestionFromSelection('length', {
    format: 'diagram-math',
    from: 'km',
    to: 'm',
    value: 1,
    comparisonFrom: 'm',
    comparisonValue: 500,
    operation: 'multiply',
    source: 'ai'
  }), null);
});

test('AI speed trips calculate average speed across a round trip', () => {
  const question = makeQuestionFromSelection('speed', {
    format: 'motion-trip',
    distanceKm: 6,
    outboundMinutes: 10,
    returnMinutes: 20,
    source: 'ai'
  });

  assert.equal(question.options[question.correct], 24);
  assert.equal(question.format, 'motion-trip');
  assert.deepEqual(question.motionTrip, {
    distanceKm: 6,
    outboundMinutes: 10,
    returnMinutes: 20
  });
  assert.match(question.explanation, /12 km.*30 นาที.*24 km\/h/);
  assert.equal(makeQuestionFromSelection('speed', {
    format: 'motion-trip',
    distanceKm: 6,
    outboundMinutes: 10,
    returnMinutes: 20
  }), null);
  assert.equal(makeQuestionFromSelection('length', {
    format: 'motion-trip',
    distanceKm: 6,
    outboundMinutes: 10,
    returnMinutes: 20,
    source: 'ai'
  }), null);
  assert.notEqual(makeQuestion('speed', 'motion-is-ai-only').format, 'motion-trip');
});

test('seeded question formats vary and remain deterministic for ranked runs', () => {
  const questions = Array.from({ length: 100 }, (_, i) => makeQuestion('speed', `daily:${i}`));
  const formats = new Set(questions.map(question => question.format));
  assert.deepEqual(makeQuestion('speed', 'daily:42'), makeQuestion('speed', 'daily:42'));
  assert.ok(formats.size >= 4);
  assert.equal(formats.has('diagram-math'), false);
});

for (const [grade, attack, defense] of [['PERFECT', 24, 15], ['GOOD', 20, 20], ['BAD', 15, 23]]) {
  test(`${grade} applies agreed attack/defense factors once`, () => {
    const g = battle();
    g.s.bonus = 4;
    g.chooseSkill('basic');
    const hp = g.s.enemy.hp;
    g.answer(g.s.question.correct, 1000);
    g.resolve(grade);
    assert.equal(hp - g.s.enemy.hp, attack);
    assert.equal(g.resolve(grade), false);
    g.advance(10000);
    assert.equal(g.s.turn, 'enemy');
    g.s.enemy.damage = 20;
    g.answer(g.s.question.correct, 1000);
    g.resolve(grade);
    assert.equal(g.s.hp, 120 - defense);
    g.advance(10000);
    assert.equal(g.s.phase, 'skill');
  });
}

test('wrong answer resolves BAD immediately, shows explanation and enforces 3 seconds', () => {
  const g = battle();
  g.chooseSkill('basic');
  const hp = g.s.enemy.hp;
  assert.equal(g.answer((g.s.question.correct + 1) % 4, 1000), false);
  assert.equal(g.s.phase, 'feedback');
  assert.equal(g.s.enemy.hp, hp - 12);
  assert.equal(g.s.correct, 0);
  assert.equal(g.s.total, 1);
  assert.equal(g.answer(0), false);
  assert.equal(g.advance(3999), false);
  assert.equal(g.advance(4000), true);
  assert.equal(g.s.turn, 'enemy');
});

test('correct question with failed QTE still counts as correct learning', () => {
  const g = battle(); g.chooseSkill('basic'); correct(g, 'BAD');
  assert.equal(g.s.correct, 1);
  assert.equal(g.s.lastGrade, 'BAD');
});

test('QTE distinguishes near misses, severe misses and timeouts', () => {
  assert.equal(qteGrade(.65), 'PERFECT');
  assert.equal(qteGrade(.8), 'GOOD');
  assert.equal(qteGrade(.1), 'BAD');
  assert.equal(qteGrade(.65, true), 'BAD');
  assert.equal(qteGrade(NaN), 'BAD');
});

test('cooldown blocks two player turns, basic remains available', () => {
  const g = battle(); g.s.enemy.hp = 1000;
  g.chooseSkill('heavy'); correct(g); correct(g);
  assert.equal(g.s.cooldowns.heavy, 2);
  for (let i = 0; i < 2; i++) {
    assert.equal(g.chooseSkill('heavy'), false);
    assert.equal(g.chooseSkill('basic'), true);
    correct(g); correct(g);
  }
  assert.equal(g.s.cooldowns.heavy, 0);
  assert.equal(g.chooseSkill('heavy'), true);
});

test('dead enemies do not attack; reward can be claimed only once', () => {
  const g = battle(); g.s.enemy.hp = 1;
  g.chooseSkill('basic'); correct(g);
  assert.equal(g.s.phase, 'reward');
  assert.equal(g.s.hp, 120);
  g.takeReward(1);
  assert.equal(g.s.phase, 'map');
  const before = g.snapshot();
  assert.equal(g.takeReward(1), false);
  assert.deepEqual(g.snapshot(), before);
  assert.equal(g.enter('0-0'), false);
});

test('skill replacement requires explicit installed target', () => {
  const g = battle();
  g.s.phase = 'reward'; g.s.rewards = [{ kind: 'skill', id: 'drain' }];
  assert.equal(g.takeReward(0), true);
  assert.equal(g.s.phase, 'replace');
  assert.equal(g.takeReward(0, 'basic'), false);
  assert.equal(g.takeReward(0, 'heavy'), true);
  assert.equal(g.s.skills.length, 4);
  assert.ok(g.s.skills.includes('drain'));
  assert.ok(!g.s.skills.includes('heavy'));
});

test('restore preserves question/map/rewards, makes resumed rounds unranked, interrupts QTE once', () => {
  const g = battle(); g.s.ranked = true; g.chooseSkill('basic');
  const question = g.snapshot();
  const restored = Expedition.restore(question);
  assert.deepEqual(restored.s.question, g.s.question);
  assert.deepEqual(restored.s.map, g.s.map);
  assert.equal(restored.s.ranked, false);
  g.answer(g.s.question.correct, 1000);
  const hp = g.s.enemy.hp;
  const interrupted = Expedition.restore(g.snapshot());
  assert.equal(interrupted.s.phase, 'feedback');
  assert.equal(interrupted.s.enemy.hp, hp - 12);
  const again = Expedition.restore(interrupted.snapshot());
  assert.equal(again.s.enemy.hp, interrupted.s.enemy.hp);
  assert.throws(() => Expedition.restore({ version: 'old' }));
});

test('event actions and shop purchases cannot be repeated or overdraft', () => {
  const g = battle();
  g.node().type = 'event'; g.s.phase = 'event';
  g.s.event = { choices: [['trade', 'trade']] };
  g.s.hp = 12;
  assert.equal(g.eventAction('trade'), false);
  g.s.hp = 13;
  assert.equal(g.eventAction('trade'), true);
  assert.equal(g.s.hp, 1);
  assert.equal(g.eventAction('trade'), false);
  g.node().type = 'shop'; g.s.phase = 'room'; g.s.gold = 20;
  assert.equal(g.roomAction('relic'), false);
  assert.equal(g.roomAction('heal'), true);
  assert.equal(g.s.gold, 0);
  g.s.gold = 100;
  assert.equal(g.roomAction('heal'), false);
});

test('complete seeded expeditions can reach boss victory through normal play', () => {
  for (let seed = 0; seed < 15; seed++) {
    const g = new Expedition({ seed: `play-${seed}`, now: 1000 });
    let steps = 0;
    while (g.s.phase !== 'ended' && steps++ < 1000) {
      const s = g.s;
      if (s.phase === 'map') g.enter(g.available().find(n => n.col === 1)?.id || g.available()[0].id);
      else if (s.phase === 'skill') {
        if (s.hp < 80 && !s.cooldowns.mend) g.chooseSkill('mend');
        else g.chooseSkill(!s.cooldowns.heavy ? 'heavy' : 'basic');
      } else if (s.phase === 'question') correct(g, 'PERFECT');
      else if (s.phase === 'feedback') g.advance(10000);
      else if (s.phase === 'reward') g.takeReward(s.hp < 80 && s.rewards.some(r => r.kind === 'heal') ? 2 : 1);
      else if (s.phase === 'room') g.roomAction(g.node().type === 'rest' ? 'rest' : 'leave');
      else if (s.phase === 'event') g.eventAction('leave') || g.eventAction('coins');
      else throw new Error(`Unexpected phase ${s.phase}`);
    }
    assert.ok(steps < 1000);
    assert.equal(g.s.result.won, true, `seed ${seed}`);
  }
});

test('archive separates topics/daily/practice, sorts finish times, and records learning once', () => {
  const map = new Map();
  const store = new ExpeditionStore({ getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) });
  assert.equal(dayKey(new Date('2026-10-22T18:00:00Z')), '2026-10-23');
  assert.equal(store.startRanked('length', '2026-10-23'), true);
  assert.equal(store.startRanked('length', '2026-10-23'), false);
  assert.equal(store.startRanked('mass', '2026-10-23'), true);
  assert.equal(store.startRanked('area', '2026-10-23'), true);
  for (const [seed, elapsed, ranked, won] of [['a', 3000, true, true], ['b', 2000, true, true], ['c', 1000, false, true], ['d', 100, true, false]]) {
    const g = battle(); Object.assign(g.s, { seed, ranked, dateKey: '2026-10-23', correct: 3, total: 4 });
    g.end(won, elapsed + 1000);
    store.record(g, '<script>'); store.record(g);
  }
  assert.deepEqual(store.leaders('length', true, '2026-10-23').map(r => r.elapsed), [2000, 3000]);
  assert.equal(store.leaders('length', false).length, 1);
  assert.equal(store.leaders('mass', true).length, 0);
  const areaRun = battle();
  Object.assign(areaRun.s, { topic: 'area', seed: 'area', ranked: true, dateKey: '2026-10-23' });
  areaRun.end(true, 4000);
  store.record(areaRun, 'AREA');
  assert.equal(store.archive().rows.some(row => row.topic === 'area' && row.questionVersion === 'variety-v2'), true);
  assert.equal(store.leaders('area', true, '2026-10-23').length, 1);
  assert.equal(store.archive().learning.length.total, 16);
  assert.equal(store.archive().rows.length, 5);
  map.set('unit-hunter-expedition-v1', 'broken-json');
  assert.equal(store.load(), null);
  assert.ok(store.error);
  const failing = new ExpeditionStore({ getItem: () => null, setItem: () => { throw Error('quota'); } });
  assert.equal(failing.save(battle()), false);
  assert.equal(failing.startRanked('length', '2026-10-23'), false);
});

test('ranked leaderboard excludes scores generated under an older question ruleset', () => {
  const data = new Map();
  const store = new ExpeditionStore({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) });
  const game = battle();
  Object.assign(game.s, { seed: 'older-questions', ranked: true, dateKey: '2026-10-23' });
  game.end(true, 2000);
  store.record(game, 'HUNTER');

  const archive = JSON.parse(data.get('unit-hunter-expedition-archive-v1'));
  archive.rows[0].questionVersion = 'legacy';
  data.set('unit-hunter-expedition-archive-v1', JSON.stringify(archive));
  assert.deepEqual(store.leaders('length', true, '2026-10-23'), []);
});
