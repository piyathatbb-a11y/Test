// Run with: node --test tools/regression.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { SaveSystem } from '../js/core/SaveSystem.js';
import { Player } from '../js/entities/Player.js';
import { LeaderboardService } from '../js/systems/LeaderboardService.js';

const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
// Exercise the actual orchestration functions without starting browser/audio UI.
function loadFunctions(names, bindings) {
  const context = vm.createContext(bindings);
  for (const name of names) {
    const start = main.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `Missing function: ${name}`);
    const source = main.slice(start).match(/^function [\s\S]*?^}/m)[0];
    vm.runInContext(source, context);
  }
  return context;
}

function freshSave(data = null) {
  let stored = data === null ? null : JSON.stringify(data);
  globalThis.localStorage = {
    getItem: () => stored,
    setItem: (_key, value) => { stored = value; }
  };
  return new SaveSystem();
}

test('Retry keeps the mission mode; daily retries use practice', () => {
  const launches = [];
  const state = { mode: 'daily' };
  const context = loadFunctions(['retryMission'], {
    state,
    startDailyRun: ranked => launches.push(['daily', ranked]),
    startTraining: () => launches.push(['training']),
    launchMission: mode => launches.push([mode])
  });
  context.retryMission({ type: 'click' });
  state.mode = 'training';
  context.retryMission();
  state.mode = 'run';
  context.retryMission();
  assert.deepEqual(launches, [['daily', false], ['training'], ['run']]);
  assert.match(main, /btnRetry\.addEventListener\('click', retryMission\)/);
});

for (const isBoss of [false, true]) {
  test(`Timeout grace survives the full damage path (${isBoss ? 'boss' : 'enemy'})`, () => {
    const player = new Player();
    player.addUpgrade('timerBonus');
    player.combo = 7;
    const enemy = {
      id: 'test', damage: 10, isBoss,
      isAlive: () => true, canAttack: () => true, incrementTurn: () => null
    };
    const noop = () => {};
    const context = loadFunctions(['processWrongAnswer', 'applyEnemyDamage'], {
      player, state: { mode: 'run', enemyStunned: false },
      runManager: { getEnemy: () => enemy },
      startBossWindup: callback => callback(),
      spriteRenderer: { playState: noop },
      eventBus: { emit: noop }, EVENTS: { PLAYER_HIT: 'player:hit' },
      audioSystem: { wrong: noop, bossAttack: noop },
      window: { setTimeout: noop },
      showFloatingText: noop, triggerBattleFx: noop, renderPlayer: noop,
      syncRunState: noop, spawnDamageNumber: noop, triggerPlayerHitFeedback: noop,
      checkPlayerDeath: noop, renderEnemy: noop
    });
    context.processWrongAnswer(true);
    assert.equal(player.combo, 7);
    assert.equal(player.currentHp, 90);
    assert.equal(player.timeoutGraceUsed, 1);
    context.processWrongAnswer(true);
    assert.equal(player.combo, 0);
    assert.equal(player.currentHp, 80);
    player.combo = 5;
    player.timeoutGraceUsed = 0;
    context.processWrongAnswer(false);
    assert.equal(player.combo, 0);
    assert.equal(player.timeoutGraceUsed, 0);
  });
}

test('Timeout reduction is applied once while preserving a protected combo', () => {
  const player = new Player();
  player.setSynergyBonus({ timeoutExtraReduction: 0.2 });
  player.combo = 7;
  assert.equal(player.takeDamage(10, true, true), 8);
  assert.equal(player.currentHp, 92);
  assert.equal(player.combo, 7);
  player.takeDamage(10);
  assert.equal(player.combo, 0);
});

test('Corrupt leaderboard rows are discarded and valid scores still render and submit', async () => {
  const valid = { name: 'HUNTER', score: 123, level: 2, date: 1 };
  const save = freshSave({ version: 2, bestScore: 999, localLeaderboard: [
    null, [], {}, { name: 'BAD', score: '100', level: 1 },
    { name: 'BAD', score: -1, level: 1 },
    { name: 'BAD', score: 100, level: 0 }, valid
  ] });
  assert.deepEqual(save.getLocalLeaderboard(), [valid]);
  assert.equal(save.getStats().bestScore, 999);
  const children = [];
  globalThis.document = {
    getElementById: () => ({ querySelector: () => null, appendChild: row => children.push(row) }),
    createElement: () => ({ textContent: '', get innerHTML() { return this.textContent; }, set innerHTML(value) { this.textContent = value; } })
  };
  const leaderboard = new LeaderboardService(save);
  await leaderboard.init();
  leaderboard.renderTable('scores', leaderboard.getEntries());
  assert.equal(children.length, 1);
  assert.match(children[0].innerHTML, /123/);
  await leaderboard.submit('new', 456, 3);
  assert.equal(leaderboard.getEntries()[0].name, 'NEW');
});

test('Boss Hunter requires a daily victory, and remains unlocked afterward', () => {
  const save = freshSave();
  save.addProgression({ mode: 'daily', outcome: 'defeat' });
  assert.equal(save.data.achievements.bossHunter, undefined);
  save.addProgression({ mode: 'run', outcome: 'victory' });
  assert.equal(save.data.achievements.bossHunter, undefined);
  save.addProgression({ mode: 'daily', outcome: 'victory' });
  assert.equal(save.data.achievements.bossHunter, true);
  save.addProgression({ mode: 'daily', outcome: 'defeat' });
  assert.equal(save.data.achievements.bossHunter, true);
});

test('Game over forwards the actual battle outcome to progression', () => {
  const save = freshSave();
  let playerAlive = false;
  let enemyAlive = true;
  const noop = () => {};
  const context = loadFunctions(['showGameOver'], {
    stopTimer: noop, clearStrikeSequence: noop, endCombatBattle: noop,
    player: { isAlive: () => playerAlive },
    runManager: { getLevel: () => 1, getEnemy: () => ({ isAlive: () => enemyAlive }) },
    audioSystem: { playGameOverBgm: noop },
    combatMetrics: { getRunSnapshot: () => ({}) },
    rankCalculator: { calculate: () => ({ grade: 'D', score: 0 }) },
    runState: { recordRank: noop, endRun: noop },
    updateGameOverStats: noop, eventBus: { emit: noop }, EVENTS: {},
    state: { mode: 'daily', modeOptions: { ranked: false } }, saveSystem: save,
    showFloatingText: noop, refreshStartScreen: noop, goToScreen: noop,
    SCREEN_IDS: { GAMEOVER: 'gameover' }
  });
  context.showGameOver();
  assert.equal(save.data.achievements.bossHunter, undefined);
  playerAlive = true;
  context.showGameOver();
  assert.equal(save.data.achievements.bossHunter, undefined);
  enemyAlive = false;
  context.showGameOver();
  assert.equal(save.data.achievements.bossHunter, true);
});
