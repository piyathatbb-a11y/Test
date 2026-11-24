import { EventBus, EVENTS } from './core/EventBus.js';
import { SaveSystem } from './core/SaveSystem.js';
import { LeaderboardService } from './systems/LeaderboardService.js';
import { QuestionGenerator } from './systems/QuestionGenerator.js';
import { RunManager } from './systems/RunManager.js';
import { SpriteRenderer } from './systems/SpriteRenderer.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { SynergyEngine } from './systems/SynergyEngine.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { Player } from './entities/Player.js';
import { CONVERSION_CATEGORIES } from './data/conversions.js';
import { ENEMIES } from './data/enemies.js';
import { BOSSES, validateBossRestrictions } from './data/bosses.js';
import { getSpritePath } from './data/spriteConfigs.js';

const SCREEN_IDS = {
  START: 'screen-start',
  BATTLE: 'screen-battle',
  ROUTE: 'screen-route',
  UPGRADE: 'screen-upgrade',
  GAMEOVER: 'screen-gameover'
};

const ELEMENTS = {
  screenStart: document.getElementById('screen-start'),
  screenBattle: document.getElementById('screen-battle'),
  screenRoute: document.getElementById('screen-route'),
  screenUpgrade: document.getElementById('screen-upgrade'),
  screenGameOver: document.getElementById('screen-gameover'),

  btnStart: document.getElementById('btn-start'),
  btnTraining: document.getElementById('btn-training'),
  btnDaily: document.getElementById('btn-daily'),
  btnRecords: document.getElementById('btn-records'),
  btnCodex: document.getElementById('btn-codex'),
  btnHelp: document.getElementById('btn-help'),
  btnTrainingStart: document.getElementById('btn-training-start'),
  btnDailyPractice: document.getElementById('btn-daily-practice'),
  btnDailyRanked: document.getElementById('btn-daily-ranked'),
  btnRetry: document.getElementById('btn-retry'),
  btnBackMenu: document.getElementById('btn-back-menu'),
  btnSubmitScore: document.getElementById('btn-submit-score'),
  playerNameInput: document.getElementById('player-name-input'),

  pbLevel: document.getElementById('pb-level'),
  pbScore: document.getElementById('pb-score'),
  pbCombo: document.getElementById('pb-combo'),
  pbCorrect: document.getElementById('pb-correct'),
  pbRuns: document.getElementById('pb-runs'),

  startLeaderboard: document.getElementById('start-leaderboard'),
  gameoverLeaderboard: document.getElementById('gameover-leaderboard'),

  tutorialPanel: document.getElementById('hub-panel-help'),
  tutorialKicker: document.getElementById('tutorial-kicker'),
  tutorialProgress: document.getElementById('tutorial-progress'),
  tutorialContent: document.getElementById('tutorial-content'),
  btnTutorialSkip: document.getElementById('btn-tutorial-skip'),
  btnTutorialNext: document.getElementById('btn-tutorial-next'),

  hudLevel: document.getElementById('hud-level'),
  hudScore: document.getElementById('hud-score'),
  hudCombo: document.getElementById('hud-combo'),
  hudMode: document.getElementById('hud-mode'),
  battleHud: document.querySelector('.battle-hud'),
  playerHpFill: document.getElementById('player-hp-fill'),
  playerHpCurrent: document.getElementById('player-hp-current'),
  playerHpMax: document.getElementById('player-hp-max'),

  enemyName: document.getElementById('enemy-name'),
  enemyType: document.getElementById('enemy-type'),
  enemyHpLabel: document.getElementById('enemy-hp-label'),
  enemyHpFill: document.getElementById('enemy-hp-fill'),
  enemyHpCurrent: document.getElementById('enemy-hp-current'),
  enemyHpMax: document.getElementById('enemy-hp-max'),
  bossPhase: document.getElementById('boss-phase'),
  enrageIndicator: document.getElementById('enrage-indicator'),

  timerRing: document.getElementById('timer-ring'),
  timerText: document.getElementById('timer-text'),
  timerProgress: document.getElementById('timer-progress'),

  questionText: document.getElementById('question-text'),
  questionCategory: document.getElementById('question-category'),
  questionPanel: document.querySelector('.question-panel'),
  scanResult: document.getElementById('scan-result'),
  scanResultText: document.getElementById('scan-result-text'),
  hintButton: document.getElementById('btn-hint'),
  hintPanel: document.getElementById('hint-panel'),
  answersGrid: document.getElementById('answers-grid'),
  answerButtons: Array.from(document.querySelectorAll('.answer-btn')),

  upgradeCards: document.getElementById('upgrade-cards'),
  synergyBanner: document.getElementById('synergy-banner'),

  goLevel: document.getElementById('go-level'),
  goTitle: document.getElementById('gameover-title'),
  goScore: document.getElementById('go-score'),
  goCombo: document.getElementById('go-combo'),
  goCorrect: document.getElementById('go-correct'),
  nameEntry: document.getElementById('name-entry'),

  damageNumbers: document.getElementById('damage-numbers'),
  battleStage: document.querySelector('.battle-stage'),
  battleVfx: document.getElementById('battle-vfx'),
  vfxLabel: document.getElementById('vfx-label'),
  strikeSequence: document.getElementById('strike-sequence'),
  strikeSequenceLabel: document.getElementById('strike-sequence-label'),
  strikeSequencePrompt: document.getElementById('strike-sequence-prompt'),
  deathCutscene: document.getElementById('death-cutscene'),
  attackWindup: document.getElementById('attack-windup'),
  windupFill: document.getElementById('windup-fill'),

  hubLastRun: document.getElementById('hub-last-run'),
  dailyNodeMeta: document.getElementById('daily-node-meta'),
  dailyNodeState: document.getElementById('daily-node-state'),
  mapDailyState: document.getElementById('map-daily-state'),
  dailyDateLabel: document.getElementById('daily-date-label'),
  dailyBossName: document.getElementById('daily-boss-name'),
  dailyStatus: document.getElementById('daily-status'),
  codexGrid: document.getElementById('codex-grid'),
  trainingCategories: document.getElementById('training-categories'),
  routeLevel: document.getElementById('route-level'),
  routeSubtitle: document.getElementById('route-subtitle'),
  routeTrack: document.getElementById('route-track'),
  routeHistory: document.getElementById('route-history'),
  goMode: document.getElementById('go-mode'),

  tutorialKicker: document.getElementById('tutorial-kicker'),
  tutorialProgress: document.getElementById('tutorial-progress'),
  tutorialContent: document.getElementById('tutorial-content'),
  btnTutorialSkip: document.getElementById('btn-tutorial-skip'),
  btnTutorialNext: document.getElementById('btn-tutorial-next'),

  missionCutscene: document.getElementById('mission-cutscene'),
  missionCutsceneKicker: document.getElementById('mission-cutscene-kicker'),
  missionCutsceneTitle: document.getElementById('mission-cutscene-title'),
  missionCutsceneSubtitle: document.getElementById('mission-cutscene-subtitle'),
  missionCutsceneSprite: document.getElementById('mission-cutscene-sprite'),
  btnCutsceneSkip: document.getElementById('btn-cutscene-skip')
};

const CIRCLE_RADIUS = 28;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const eventBus = new EventBus();
const saveSystem = new SaveSystem();
const leaderboardService = new LeaderboardService(saveSystem);
const questionGenerator = new QuestionGenerator();
const runManager = new RunManager(eventBus);
const spriteRenderer = new SpriteRenderer(eventBus);
const audioSystem = new AudioSystem();
const synergyEngine = new SynergyEngine();
const upgradeSystem = new UpgradeSystem(eventBus, synergyEngine);
const player = new Player();

const state = {
  timerId: null,
  timerDuration: 0,
  timerRemaining: 0,
  currentQuestion: null,
  awaitingNext: false,
  enemyStunned: false,
  lastUpgradeSelected: null,
  mode: 'run',
  modeOptions: {},
  questionIndex: 0,
  trainingCategory: 'all',
  trainingDifficulty: 'guided',
  activePanel: null,
  initialSpawn: true,
  route: null,
  tutorialStep: 0,
  tutorialAnswered: false,
  pendingLaunch: null,
  cutsceneTimer: null,
  strikeQte: null
};

const TUTORIAL_STEPS = [
  {
    kicker: 'FIELD MANUAL / 01',
    title: 'READ THE PREFIX',
    body: 'SI prefixes change scale in powers of 1,000. Learn the factor before you move the decimal.',
    equation: 'k = 1,000 × base   |   m = 0.001 × base',
    note: 'One step on the ladder moves three decimal places.'
  },
  {
    kicker: 'FIELD MANUAL / 02',
    title: 'USE TWO MOVES',
    body: 'Convert to the base unit, then into the target unit. The same rule works for length, mass, time, and more.',
    equation: '2 km → 2 × 1,000 m → 2,000 m',
    note: 'Formula: value × from factor ÷ to factor.'
  },
  {
    kicker: 'FIELD MANUAL / 03',
    title: 'QUICK CHECK',
    body: 'Convert 250 cm to meters. Choose the scan result that keeps the quantity unchanged.',
    equation: '250 cm = ? m',
    note: 'centi means one hundredth of the base unit.',
    quiz: ['0.25 m', '2.5 m', '25 m', '250 m'],
    correctIndex: 0
  }
];

function init() {
  validateBossRestrictions();
  audioSystem.init();
  setupUI();
  renderCodex();
  renderTrainingCategories();
  refreshDailyPanel();
  leaderboardService.init().then(() => {
    refreshStartScreen();
    renderLeaderboard(ELEMENTS.startLeaderboard, leaderboardService.getEntries());
  });
  goToScreen(SCREEN_IDS.START);
  // First-time briefing: mandatory on first visit, but always skippable with ESC.
  if (!saveSystem.hasSeenTutorial()) {
    window.setTimeout(() => openFirstVisitTutorial(), 120);
  }
}

function openFirstVisitTutorial() {
  if (saveSystem.hasSeenTutorial() || !ELEMENTS.tutorialPanel) return;
  closeHubPanels();
  ELEMENTS.tutorialPanel.hidden = false;
  ELEMENTS.tutorialPanel.setAttribute('aria-hidden', 'false');
  state.activePanel = 'help';
  openTutorial();
  ELEMENTS.btnTutorialSkip?.focus();
}

function setupUI() {
  const unlockAudio = () => {
    audioSystem.init();
    audioSystem.playMenuBgm();
  };
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  ELEMENTS.btnStart.addEventListener('click', () => launchMission('run'));
  ELEMENTS.btnRetry.addEventListener('click', startRun);
  ELEMENTS.btnBackMenu.addEventListener('click', returnToMainMenu);
  ELEMENTS.btnSubmitScore.addEventListener('click', submitScore);
  ELEMENTS.btnTrainingStart?.addEventListener('click', startTraining);
  ELEMENTS.btnDailyPractice?.addEventListener('click', () => startDailyRun(false));
  ELEMENTS.btnDailyRanked?.addEventListener('click', () => startDailyRun(true));
  ELEMENTS.btnCutsceneSkip?.addEventListener('click', finishMissionLaunch);
  ELEMENTS.btnTutorialSkip?.addEventListener('click', skipTutorial);
  ELEMENTS.btnTutorialNext?.addEventListener('click', advanceTutorial);
  ELEMENTS.tutorialContent?.addEventListener('click', event => {
    const answer = event.target.closest('[data-tutorial-answer]');
    if (answer) answerTutorial(parseInt(answer.dataset.tutorialAnswer, 10));
  });
  document.querySelectorAll('[data-hub-panel]').forEach(button => {
    button.addEventListener('click', () => openHubPanel(button.dataset.hubPanel));
  });
  document.querySelector('.world-map-markers')?.addEventListener('click', event => {
    const marker = event.target.closest('[data-map-action]');
    if (!marker) return;
    const action = marker.dataset.mapAction;
    const matchingButton = {
      run: ELEMENTS.btnStart,
      training: ELEMENTS.btnTraining,
      daily: ELEMENTS.btnDaily,
      records: ELEMENTS.btnRecords,
      codex: ELEMENTS.btnCodex,
      help: ELEMENTS.btnHelp
    }[action];
    if (matchingButton) matchingButton.click();
  });
  document.querySelectorAll('[data-close-panel]').forEach(button => {
    button.addEventListener('click', closeHubPanels);
  });
  ELEMENTS.trainingCategories?.addEventListener('click', event => {
    const button = event.target.closest('[data-training-category]');
    if (!button) return;
    state.trainingCategory = button.dataset.trainingCategory;
    renderTrainingCategories();
  });
  document.querySelectorAll('[data-training-difficulty]').forEach(button => {
    button.addEventListener('click', () => {
      state.trainingDifficulty = button.dataset.trainingDifficulty;
      document.querySelectorAll('[data-training-difficulty]').forEach(chip => chip.classList.toggle('is-selected', chip === button));
    });
  });
  ELEMENTS.routeTrack?.addEventListener('click', event => {
    const card = event.target.closest('[data-route-id]');
    if (card && !card.disabled) selectRoute(card.dataset.routeId);
  });
  ELEMENTS.hintButton?.addEventListener('click', revealHint);
  ELEMENTS.answerButtons.forEach((button) => {
    button.addEventListener('click', () => handleAnswer(parseInt(button.dataset.index, 10)));
  });
  ELEMENTS.strikeSequence?.addEventListener('pointerdown', (event) => {
    if (state.strikeQte) {
      event.preventDefault();
      resolveStrikeQte();
    }
  });

  ELEMENTS.upgradeCards.addEventListener('click', (event) => {
    const card = event.target.closest('[data-upgrade-id]');
    if (!card) return;
    const upgradeId = card.dataset.upgradeId;
    selectUpgrade(upgradeId);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (ELEMENTS.missionCutscene?.classList.contains('active')) {
        finishMissionLaunch();
        return;
      }
      if (state.activePanel === 'help' && !saveSystem.hasSeenTutorial()) {
        event.preventDefault();
        skipTutorial();
        return;
      }
      closeHubPanels();
      return;
    }
    if (getActiveScreen() !== SCREEN_IDS.BATTLE) return;
    if (state.strikeQte && (event.code === 'Space' || event.key === 'Enter')) {
      event.preventDefault();
      resolveStrikeQte();
      return;
    }
    if (state.strikeQte) return;
    const key = parseInt(event.key, 10);
    if (key >= 1 && key <= 4) {
      const button = ELEMENTS.answerButtons[key - 1];
      if (button && !button.disabled) button.click();
    }
  });

  ELEMENTS.timerProgress.setAttribute('stroke-dasharray', String(TIMER_CIRCUMFERENCE));
  ELEMENTS.timerProgress.setAttribute('stroke-dashoffset', String(TIMER_CIRCUMFERENCE));
}

function goToScreen(screenId) {
  Object.values(SCREEN_IDS).forEach((id) => {
    const screen = document.getElementById(id);
    if (screen) screen.classList.toggle('active', id === screenId);
  });
}

function getActiveScreen() {
  return Object.values(SCREEN_IDS).find((id) => {
    const screen = document.getElementById(id);
    return screen && screen.classList.contains('active');
  });
}

function refreshStartScreen() {
  const stats = saveSystem.getStats();
  if (ELEMENTS.pbLevel) ELEMENTS.pbLevel.textContent = stats.bestLevel;
  if (ELEMENTS.pbScore) ELEMENTS.pbScore.textContent = stats.bestScore;
  if (ELEMENTS.pbCombo) ELEMENTS.pbCombo.textContent = stats.bestCombo;
  if (ELEMENTS.pbCorrect) ELEMENTS.pbCorrect.textContent = stats.totalCorrect;
  if (ELEMENTS.pbRuns) ELEMENTS.pbRuns.textContent = stats.totalRuns;
  if (ELEMENTS.hubLastRun) {
    ELEMENTS.hubLastRun.textContent = stats.totalRuns > 0
      ? `LAST RECORD / LVL ${stats.bestLevel} / SCORE ${stats.bestScore}`
      : 'NO RUN DATA';
  }
  refreshDailyPanel();
}

function returnToMainMenu() {
  stopTimer();
  clearStrikeSequence();
  audioSystem.playMenuBgm();
  closeHubPanels();
  refreshStartScreen();
  renderLeaderboard(ELEMENTS.startLeaderboard, leaderboardService.getEntries());
  goToScreen(SCREEN_IDS.START);
}

function openHubPanel(panelName) {
  closeHubPanels();
  const panel = document.getElementById(`hub-panel-${panelName}`);
  if (!panel) return;
  panel.hidden = false;
  state.activePanel = panelName;
  panel.querySelector('.panel-close')?.focus();
  if (panelName === 'daily') refreshDailyPanel();
  if (panelName === 'help') openTutorial();
}

function closeHubPanels() {
  document.querySelectorAll('.hub-panel').forEach(panel => { panel.hidden = true; });
  state.activePanel = null;
}

function openTutorial() {
  state.tutorialStep = 0;
  state.tutorialAnswered = false;
  renderTutorial();
}

function renderTutorial() {
  const step = TUTORIAL_STEPS[state.tutorialStep] || TUTORIAL_STEPS[0];
  if (ELEMENTS.tutorialKicker) ELEMENTS.tutorialKicker.textContent = step.kicker;
  if (ELEMENTS.tutorialProgress) {
    ELEMENTS.tutorialProgress.innerHTML = TUTORIAL_STEPS.map((_, index) => `
      <span class="${index === state.tutorialStep ? 'is-active' : ''}" aria-label="Step ${index + 1} of ${TUTORIAL_STEPS.length}"></span>
    `).join('');
  }
  if (!ELEMENTS.tutorialContent) return;
  const quiz = step.quiz
    ? `<div class="tutorial-quiz" role="group" aria-label="Tutorial answers">
        ${step.quiz.map((answer, index) => `<button class="tutorial-answer" type="button" data-tutorial-answer="${index}">${answer}</button>`).join('')}
      </div><p class="tutorial-feedback" id="tutorial-feedback" aria-live="polite"></p>`
    : '';
  ELEMENTS.tutorialContent.innerHTML = `
    <h3>${step.title}</h3>
    <p>${step.body}</p>
    <div class="tutorial-equation">${step.equation}</div>
    ${quiz}
    <p class="tutorial-note">${step.note}</p>
  `;
  if (ELEMENTS.btnTutorialNext) {
    const finalStep = state.tutorialStep === TUTORIAL_STEPS.length - 1;
    ELEMENTS.btnTutorialNext.textContent = finalStep ? 'START RUN' : 'NEXT';
    ELEMENTS.btnTutorialNext.disabled = finalStep && !state.tutorialAnswered;
  }
}

function answerTutorial(index) {
  const step = TUTORIAL_STEPS[state.tutorialStep];
  if (!step?.quiz || state.tutorialAnswered) return;
  const answers = Array.from(ELEMENTS.tutorialContent.querySelectorAll('[data-tutorial-answer]'));
  const feedback = ELEMENTS.tutorialContent.querySelector('#tutorial-feedback');
  const correct = index === step.correctIndex;
  answers.forEach((button, answerIndex) => {
    button.disabled = true;
    button.classList.toggle('is-correct', answerIndex === step.correctIndex);
    button.classList.toggle('is-wrong', answerIndex === index && !correct);
  });
  if (feedback) {
    feedback.textContent = correct
      ? 'CORRECT — centi means one hundredth.'
      : 'TRY AGAIN — cm is 0.01 m.';
    feedback.style.color = correct ? 'var(--hp-healthy)' : 'var(--hp-critical)';
  }
  if (correct) {
    state.tutorialAnswered = true;
    if (ELEMENTS.btnTutorialNext) ELEMENTS.btnTutorialNext.disabled = false;
  } else {
    answers.forEach(button => { button.disabled = false; });
  }
}

function advanceTutorial() {
  if (state.tutorialStep < TUTORIAL_STEPS.length - 1) {
    state.tutorialStep += 1;
    state.tutorialAnswered = false;
    renderTutorial();
    return;
  }
  saveSystem.markTutorialSeen();
  closeHubPanels();
}

function skipTutorial() {
  saveSystem.markTutorialSeen();
  closeHubPanels();
}

function renderCodex() {
  if (!ELEMENTS.codexGrid) return;
  ELEMENTS.codexGrid.innerHTML = Object.values(CONVERSION_CATEGORIES).map(category => `
    <div class="codex-item"><strong>${category.name.split(' (')[0]}</strong><small>BASE UNIT / ${category.baseUnit}</small></div>
  `).join('');
}

function renderTrainingCategories() {
  if (!ELEMENTS.trainingCategories) return;
  const categories = [{ id: 'all', name: 'ALL SI' }, ...Object.values(CONVERSION_CATEGORIES).map(category => ({ id: category.id, name: category.id.toUpperCase() }))];
  ELEMENTS.trainingCategories.innerHTML = categories.map(category => `
    <button class="choice-chip${state.trainingCategory === category.id ? ' is-selected' : ''}" data-training-category="${category.id}">${category.name}</button>
  `).join('');
}

function getDailyDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = hashSeed(seed) || 1;
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function getDailyBoss(dateKey = getDailyDateKey()) {
  return BOSSES[hashSeed(`${dateKey}:boss`) % BOSSES.length];
}

function refreshDailyPanel() {
  const dateKey = getDailyDateKey();
  const boss = getDailyBoss(dateKey);
  const status = saveSystem.getDailyStatus(dateKey);
  if (ELEMENTS.dailyDateLabel) ELEMENTS.dailyDateLabel.textContent = `UTC ${dateKey} // One ranked attempt per day.`;
  if (ELEMENTS.dailyBossName) ELEMENTS.dailyBossName.textContent = boss.name;
  if (ELEMENTS.dailyStatus) ELEMENTS.dailyStatus.textContent = status.rankedSubmitted
    ? `RANKED COMPLETE / SCORE ${status.bestScore}`
    : 'RANKED ATTEMPT AVAILABLE';
  if (ELEMENTS.dailyNodeMeta) ELEMENTS.dailyNodeMeta.textContent = `BOSS // ${boss.name.toUpperCase()}`;
  if (ELEMENTS.dailyNodeState) ELEMENTS.dailyNodeState.textContent = status.rankedSubmitted ? 'DONE' : 'OPEN';
  if (ELEMENTS.mapDailyState) ELEMENTS.mapDailyState.textContent = status.rankedSubmitted ? 'DONE' : 'OPEN';
  if (ELEMENTS.btnDailyRanked) ELEMENTS.btnDailyRanked.disabled = status.rankedSubmitted;
}

function renderLeaderboard(container, entries) {
  leaderboardService.renderTable(container.id, entries);
}

function startRun(mode = 'run', options = {}) {
  if (typeof mode !== 'string') mode = 'run';
  stopTimer();
  closeHubPanels();
  state.currentQuestion = null;
  state.awaitingNext = false;
  state.enemyStunned = false;
  state.mode = mode;
  state.modeOptions = { ...options };
  state.questionIndex = 0;
  state.initialSpawn = true;
  state.route = null;
  player.resetUpgrades();
  player.resetForNewRun();
  synergyEngine.recalculate(player.upgrades);
  player.setSynergyBonus(synergyEngine.getCombinedBonus());
  runManager.startRun(mode, options);
  ELEMENTS.playerNameInput.value = '';
  ELEMENTS.nameEntry.style.display = 'none';
  ELEMENTS.btnSubmitScore.disabled = false;
  setHudMode(mode);
  goToScreen(SCREEN_IDS.BATTLE);
  spawnEnemy();
  window.setTimeout(() => triggerBattleFx('attack', 'TARGET LOCKED'), 120);
}

function getLaunchTargetId(mode, requestedId) {
  if (requestedId) return requestedId;
  if (mode === 'training') return 'packet_mimic';
  if (mode === 'daily') return getDailyBoss().id;
  return ENEMIES[Math.floor(Math.random() * ENEMIES.length)]?.id || 'glitch';
}

function launchMission(mode, options = {}, previewId = null) {
  const targetId = getLaunchTargetId(mode, previewId);
  if (!ELEMENTS.missionCutscene) {
    startRun(mode, { ...options, initialEnemyId: targetId });
    return;
  }
  if (state.cutsceneTimer) window.clearTimeout(state.cutsceneTimer);
  closeHubPanels();
  state.pendingLaunch = { mode, options: { ...options, initialEnemyId: targetId } };
  const copy = {
    run: ['MISSION LINK / ACQUIRING', 'GLOBAL HUNT', 'Scanning the next combat theater...'],
    training: ['SIMULATION LINK / GUIDED', 'DRILL TARGET', 'Safety systems active. No hull damage.'],
    daily: ['UTC SEED / BOSS SIGNAL', 'DAILY TARGET', 'Locking the shared challenge signature...']
  }[mode] || ['MISSION LINK / ACQUIRING', 'TARGET SIGNATURE', 'Zooming to combat theater...'];
  ELEMENTS.missionCutsceneKicker.textContent = copy[0];
  ELEMENTS.missionCutsceneTitle.textContent = copy[1];
  ELEMENTS.missionCutsceneSubtitle.textContent = copy[2];
  ELEMENTS.missionCutsceneSprite.src = getSpritePath(targetId, 'idle', 1);
  ELEMENTS.missionCutsceneSprite.alt = `${copy[1]} preview`;
  ELEMENTS.missionCutscene.hidden = false;
  ELEMENTS.missionCutscene.setAttribute('aria-hidden', 'false');
  ELEMENTS.missionCutscene.classList.remove('active');
  void ELEMENTS.missionCutscene.offsetWidth;
  ELEMENTS.missionCutscene.classList.add('active');
  ELEMENTS.btnCutsceneSkip?.focus();
  state.cutsceneTimer = window.setTimeout(finishMissionLaunch, 1700);
}

function finishMissionLaunch() {
  if (!state.pendingLaunch) return;
  if (state.cutsceneTimer) window.clearTimeout(state.cutsceneTimer);
  state.cutsceneTimer = null;
  const launch = state.pendingLaunch;
  state.pendingLaunch = null;
  ELEMENTS.missionCutscene?.classList.remove('active');
  if (ELEMENTS.missionCutscene) {
    ELEMENTS.missionCutscene.hidden = true;
    ELEMENTS.missionCutscene.setAttribute('aria-hidden', 'true');
  }
  startRun(launch.mode, launch.options);
}

function startTraining() {
  const categoryIds = state.trainingCategory === 'all' ? [] : [state.trainingCategory];
  const difficulty = state.trainingDifficulty;
  launchMission('training', { categories: categoryIds, difficulty }, 'packet_mimic');
}

function startDailyRun(ranked) {
  const dateKey = getDailyDateKey();
  const status = saveSystem.getDailyStatus(dateKey);
  if (ranked && status.rankedSubmitted) {
    refreshDailyPanel();
    return;
  }
  const boss = getDailyBoss(dateKey);
  launchMission('daily', {
    dateKey,
    ranked,
    bossIndex: BOSSES.findIndex(item => item.id === boss.id)
  }, boss.id);
}

function setHudMode(mode) {
  if (!ELEMENTS.hudMode) return;
  const labels = { run: 'RUN', training: 'TRAINING', daily: 'DAILY BOSS' };
  ELEMENTS.hudMode.textContent = labels[mode] || 'RUN';
  ELEMENTS.battleHud?.setAttribute('data-mode', mode);
  ELEMENTS.questionPanel?.classList.toggle('training-mode', mode === 'training');
}

function spawnEnemy() {
  const enemy = runManager.spawnEnemy();
  const routeType = runManager.getRouteState().selected;
  if (state.initialSpawn || state.mode === 'training') {
    player.currentHp = player.getMaxHp();
  } else if (routeType === 'repair') {
    const healed = player.heal(Math.ceil(player.getMaxHp() * 0.25));
    if (healed > 0) showFloatingText(`+${healed} HP / REPAIRED`, '#6df07a');
  }
  state.initialSpawn = false;
  state.route = runManager.getRouteState();
  player.timeoutGraceUsed = 0;
  player.bankTime = 0;
  state.enemyStunned = false;
  state.lastUpgradeSelected = null;
  renderEnemy(enemy);
  renderPlayer();
  updateHud();
  ELEMENTS.attackWindup.style.display = 'none';
  ELEMENTS.windupFill.style.width = '0%';
  clearBattleFx();
  clearStrikeSequence();
  hideDeathCutscene();
  setHudMode(state.mode);
  spriteRenderer.setEnemy(enemy.id);
  const bgmType = enemy.isBoss ? 'boss' : 'battle';
  if (audioSystem.activeBgmType !== bgmType) audioSystem.playCombatBgm(bgmType);
  queueNextQuestion();
}

function renderEnemy(enemy) {
  ELEMENTS.enemyName.textContent = enemy.name;
  ELEMENTS.enemyType.textContent = enemy.isBoss ? 'BOSS' : enemy.routeType === 'elite' ? 'ELITE' : 'NORMAL';
  ELEMENTS.enemyHpMax.textContent = enemy.maxHp;
  ELEMENTS.enemyHpCurrent.textContent = enemy.currentHp;
  ELEMENTS.enemyHpFill.style.width = `${enemy.getHpPercent() * 100}%`;
  ELEMENTS.enemyHpLabel.textContent = enemy.isBoss ? 'BOSS HP' : 'ENEMY HP';

  if (enemy.isBoss) {
    ELEMENTS.bossPhase.style.display = 'block';
    ELEMENTS.bossPhase.textContent = enemy.getPhaseName();
    ELEMENTS.enrageIndicator.style.display = enemy.enraged ? 'block' : 'none';
  } else {
    ELEMENTS.bossPhase.style.display = 'none';
    ELEMENTS.enrageIndicator.style.display = 'none';
  }
}

function renderPlayer() {
  ELEMENTS.hudLevel.textContent = runManager.getLevel();
  ELEMENTS.hudScore.textContent = player.score;
  ELEMENTS.hudCombo.textContent = `x${player.combo || 1}`;
  ELEMENTS.playerHpCurrent.textContent = player.currentHp;
  ELEMENTS.playerHpMax.textContent = player.getMaxHp();
  ELEMENTS.playerHpFill.style.width = `${player.getHpPercent() * 100}%`;
}

function queueNextQuestion() {
  const enemy = runManager.getEnemy();
  if (!enemy || !enemy.isAlive()) return;

  const restricted = enemy.isBoss ? enemy.getRestrictedCategories() : [];
  const options = state.mode === 'training'
    ? {
        categories: state.modeOptions.categories,
        difficulty: state.modeOptions.difficulty
      }
    : {};
  const rng = state.mode === 'daily'
    ? seededRandom(`${state.modeOptions.dateKey}:question:${state.questionIndex}`)
    : Math.random;
  state.currentQuestion = questionGenerator.generate(runManager.getLevel(), restricted, rng, options);
  state.questionIndex += 1;
  renderQuestion(state.currentQuestion);
  startTimer(getQuestionDuration(enemy.timer, state.mode === 'training' ? state.modeOptions.difficulty : null));
}

function getQuestionDuration(baseTimer, difficulty = null) {
  const bonus = player.bankTime || 0;
  const stunBonus = state.enemyStunned ? 2 : 0;
  const difficultyBonus = difficulty === 'guided' ? 6 : difficulty === 'challenge' ? -2 : 0;
  const duration = Math.max(5, baseTimer + bonus + stunBonus + difficultyBonus);
  player.bankTime = 0;
  return duration;
}

function renderQuestion(question) {
  ELEMENTS.questionText.textContent = `${question.question} ${question.unit}`;
  ELEMENTS.questionCategory.textContent = question.category;
  if (ELEMENTS.scanResult) ELEMENTS.scanResult.hidden = true;
  if (ELEMENTS.scanResultText) ELEMENTS.scanResultText.textContent = '';
  if (ELEMENTS.hintPanel) {
    ELEMENTS.hintPanel.hidden = true;
    ELEMENTS.hintPanel.textContent = '';
  }
  if (ELEMENTS.hintButton) {
    const showHint = state.mode === 'training' && state.modeOptions.difficulty === 'guided';
    ELEMENTS.hintButton.hidden = !showHint;
    ELEMENTS.hintButton.textContent = 'REVEAL HINT';
  }
  ELEMENTS.answerButtons.forEach((button) => {
    const index = parseInt(button.dataset.index, 10);
    button.querySelector('.ans-text').textContent = question.options[index];
    button.setAttribute('aria-label', `Answer ${index + 1}: ${question.options[index]} ${question.unit}`);
    button.disabled = false;
    button.classList.remove('correct', 'wrong');
  });
}

function startTimer(duration) {
  stopTimer();
  state.timerDuration = duration;
  state.timerRemaining = duration;
  updateTimerUI();

  state.timerId = window.setInterval(() => {
    state.timerRemaining -= 0.05;
    if (state.timerRemaining <= 0) {
      state.timerRemaining = 0;
      updateTimerUI();
      stopTimer();
      handleTimeout();
      return;
    }
    updateTimerUI();
  }, 50);
}

function stopTimer() {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerUI() {
  const ratio = Math.max(0, Math.min(1, state.timerRemaining / state.timerDuration));
  ELEMENTS.timerText.textContent = String(Math.ceil(state.timerRemaining));
  ELEMENTS.timerProgress.setAttribute('stroke-dashoffset', String(TIMER_CIRCUMFERENCE * (1 - ratio)));
  ELEMENTS.timerProgress.classList.toggle('warning', ratio <= 0.5 && ratio > 0.2);
  ELEMENTS.timerProgress.classList.toggle('danger', ratio <= 0.2);
}

function disableAnswerButtons(value) {
  ELEMENTS.answerButtons.forEach((button) => {
    button.disabled = value;
  });
}

function handleAnswer(index) {
  if (!state.currentQuestion || state.awaitingNext) return;
  disableAnswerButtons(true);
  stopTimer();

  const correct = index === state.currentQuestion.correctIndex;
  const button = ELEMENTS.answerButtons[index];
  showScanResult(state.currentQuestion);
  if (correct) {
    button.classList.add('correct');
    processCorrectAnswer();
  } else {
    button.classList.add('wrong');
    processWrongAnswer(false);
  }
}

function handleTimeout() {
  disableAnswerButtons(true);
  showScanResult(state.currentQuestion);
  processWrongAnswer(true);
}

function showScanResult(question) {
  if (!question || !ELEMENTS.scanResult || !ELEMENTS.scanResultText) return;
  ELEMENTS.scanResultText.textContent = question.explanation;
  ELEMENTS.scanResult.hidden = false;
  window.setTimeout(() => {
    if (ELEMENTS.scanResult) ELEMENTS.scanResult.hidden = true;
  }, state.mode === 'training' ? 1200 : 600);
}

function revealHint() {
  if (!state.currentQuestion || !ELEMENTS.hintPanel || !ELEMENTS.hintButton) return;
  ELEMENTS.hintPanel.textContent = state.currentQuestion.hint || 'Compare the prefix scale before calculating.';
  ELEMENTS.hintPanel.hidden = false;
  ELEMENTS.hintButton.hidden = true;
}

function processCorrectAnswer() {
  const enemy = runManager.getEnemy();
  if (!enemy || !enemy.isAlive()) return;
  state.enemyStunned = false;
  const critRoll = Math.random() < player.getCritChance();
  const critBonus = synergyEngine.getCombinedBonus().critMultiplierBonus || 0;
  let baseDamage = critRoll
    ? Math.floor(player.getBaseDamage() * player.getCritMultiplier(critBonus))
    : player.getBaseDamage();

  player.incrementCombo();
  const comboPower = getComboPower(player.combo);
  baseDamage = Math.max(1, Math.floor(baseDamage * comboPower.damageMultiplier));
  if (comboPower.announcement) showComboAnnouncement(comboPower);
  player.correctAnswers += 1;
  if (player.getTimerBonus().perCorrect > 0) player.bankTime += player.getTimerBonus().perCorrect;
  if (player.getTimeWarpChance() > 0 && Math.random() < player.getTimeWarpChance()) {
    player.bankTime += Math.max(1, Math.floor(enemy.timer * 0.35));
    showFloatingText('TIME WARP', '#72d4ff');
  }
  if (player.getStunChance() > 0 && Math.random() < player.getStunChance()) {
    state.enemyStunned = true;
    showFloatingText('STUN', '#ffd166');
  }

  audioSystem.correct();
  state.awaitingNext = true;
  beginStrikeQte({ enemy, critRoll, baseDamage });
}

function beginStrikeQte(payload) {
  clearStrikeSequence();
  state.strikeQte = {
    ...payload,
    startedAt: performance.now(),
    duration: 950,
    resolved: false,
    autoTimer: window.setTimeout(() => resolveStrikeQte(true), 950)
  };
  if (ELEMENTS.strikeSequenceLabel) ELEMENTS.strikeSequenceLabel.textContent = payload.critRoll ? 'CRITICAL VECTOR' : 'DIRECT HIT';
  if (ELEMENTS.strikeSequencePrompt) ELEMENTS.strikeSequencePrompt.textContent = 'PRESS SPACE / CLICK WHEN CURSOR ENTERS THE ZONE';
  ELEMENTS.strikeSequence?.setAttribute('aria-hidden', 'false');
  ELEMENTS.strikeSequence?.classList.toggle('is-critical', payload.critRoll);
  ELEMENTS.strikeSequence?.classList.remove('active');
  void ELEMENTS.strikeSequence?.offsetWidth;
  ELEMENTS.strikeSequence?.classList.add('active');
}

function resolveStrikeQte(auto = false) {
  const qte = state.strikeQte;
  if (!qte || qte.resolved) return;
  qte.resolved = true;
  if (qte.autoTimer) window.clearTimeout(qte.autoTimer);
  const elapsed = Math.min(qte.duration, performance.now() - qte.startedAt);
  const progress = elapsed / qte.duration;
  const distance = Math.abs(progress - 0.68);
  const result = distance <= 0.07 ? 'PERFECT' : distance <= 0.16 ? 'GOOD' : 'MISS';
  const multiplier = result === 'PERFECT' ? 1.25 : result === 'GOOD' ? 1.10 : 1;
  const damage = Math.max(1, Math.floor(qte.baseDamage * multiplier));
  if (ELEMENTS.strikeSequenceLabel) ELEMENTS.strikeSequenceLabel.textContent = result;
  if (ELEMENTS.strikeSequencePrompt) ELEMENTS.strikeSequencePrompt.textContent = auto ? 'WINDOW CLOSED — ATTACK RESOLVED' : `TIMING ${Math.round(progress * 100)}% // ${result}`;
  showFloatingText(`QTE ${result}${result === 'PERFECT' ? ' +25%' : result === 'GOOD' ? ' +10%' : ''}`, result === 'PERFECT' ? '#ffd166' : result === 'GOOD' ? '#6df07a' : '#ff9b9b');
  state.strikeQte = null;
  clearStrikeSequence();
  finishStrikeAttack(qte, damage, result);
}

function finishStrikeAttack(qte, damage, result) {
  state.strikeQte = null;
  clearStrikeSequence();
  const enemy = qte.enemy;
  if (!enemy || !enemy.isAlive()) return;
  if (state.mode !== 'training') {
    const rewardMultiplier = enemy.rewardMultiplier || 1;
    player.addScore(Math.floor((20 + runManager.getLevel() * 10 + damage * 2) * rewardMultiplier));
  }
  spawnDamageNumber(`-${damage}`, enemy.isBoss ? '#ff7f7f' : '#ffcccc');
  const enemyDefeated = enemy.takeDamage(damage);
  renderEnemy(enemy);
  renderPlayer();
  triggerBattleFx('attack', qte.critRoll ? 'CRITICAL STRIKE' : 'DIRECT HIT');
  spriteRenderer.playState('attack', () => {
    if (enemyDefeated) {
      triggerBattleFx('death', 'TARGET PURGED');
      showDeathCutscene();
      spriteRenderer.playState('death');
    } else {
      triggerBattleFx('hit', 'IMPACT CONFIRMED');
      spriteRenderer.playState('hit', () => spriteRenderer.playState('idle'));
    }
  });

  if (enemyDefeated) {
    audioSystem.kill();
    if (state.mode === 'training') {
      showFloatingText('DRILL TARGET CLEARED', '#6df07a');
      window.setTimeout(() => { state.awaitingNext = false; spawnEnemy(); }, 900);
      return;
    }
    if (state.mode === 'daily') {
      showFloatingText('DAILY TARGET PURGED', '#d9b4ff');
      window.setTimeout(() => showGameOver(), 1550);
      return;
    }
    const healPct = player.getLifestealPercent();
    if (healPct > 0) {
      const healed = player.healPercentOfMax(healPct);
      if (healed > 0) showFloatingText(`+${healed} HP`, '#6df07a');
    }
    window.setTimeout(() => showUpgradeScreen(), 1550);
    return;
  }
  window.setTimeout(() => { state.awaitingNext = false; queueNextQuestion(); }, 760);
}

function processWrongAnswer(isTimeout) {
  const enemy = runManager.getEnemy();
  const grace = player.getTimerBonus().gracePerFight || 0;
  const shouldKeepCombo = isTimeout && player.timeoutGraceUsed < grace;

  if (isTimeout && shouldKeepCombo) {
    player.timeoutGraceUsed += 1;
    showFloatingText('TIMEOUT GRACE', '#f7d06d');
  } else {
    player.resetCombo();
  }

  if (state.enemyStunned) {
    state.enemyStunned = false;
    showFloatingText('STUNNED', '#ffd166');
    audioSystem.wrong();
    state.awaitingNext = true;
    window.setTimeout(() => {
      state.awaitingNext = false;
      queueNextQuestion();
    }, 700);
    return;
  }

  if (state.mode === 'training') {
    showFloatingText('PRACTICE SAFE', '#ffd166');
    audioSystem.wrong();
    state.awaitingNext = true;
    window.setTimeout(() => {
      state.awaitingNext = false;
      queueNextQuestion();
    }, 520);
    return;
  }

  if (enemy.isBoss) {
    startBossWindup(() => applyEnemyDamage(enemy, isTimeout));
  } else {
    applyEnemyDamage(enemy, isTimeout);
  }
}

function applyEnemyDamage(enemy, isTimeout = false) {
  if (!enemy.isAlive()) return;
  spriteRenderer.playState('attack', () => spriteRenderer.playState('idle'));
  triggerBattleFx('attack', enemy.isBoss ? 'BOSS COUNTERMEASURE' : 'COUNTER HIT');
  const damageDealt = player.takeDamage(enemy.damage, isTimeout);
  renderPlayer();
  spawnDamageNumber(`-${damageDealt}`, '#ff5959');
  audioSystem.wrong();
  triggerPlayerHitFeedback(damageDealt, enemy.isBoss);
  checkPlayerDeath();
  if (!player.isAlive()) return;

  if (enemy.isBoss) {
    const result = enemy.incrementTurn();
    renderEnemy(enemy);
    if (result === 'enrage') {
      ELEMENTS.enrageIndicator.style.display = 'block';
      audioSystem.bossAttack();
      showFloatingText('ENRAGED', '#ff3864');
    }
  }

  state.awaitingNext = true;
  window.setTimeout(() => {
    state.awaitingNext = false;
    queueNextQuestion();
  }, 500);
}

function startBossWindup(onComplete) {
  if (!runManager.getEnemy()?.isBoss) {
    onComplete();
    return;
  }

  const boss = runManager.getEnemy();
  boss.startAttackWindup();
  ELEMENTS.attackWindup.style.display = 'flex';
  const update = () => {
    if (!boss.attackWindupActive) return;
    ELEMENTS.windupFill.style.width = `${boss.getWindupProgress() * 100}%`;
    if (boss.isAttackWindupComplete()) {
      ELEMENTS.attackWindup.style.display = 'none';
      boss.cancelAttack();
      onComplete();
      return;
    }
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function checkPlayerDeath() {
  if (!player.isAlive()) {
    audioSystem.gameover();
    showGameOver();
  }
}

function showUpgradeScreen() {
  goToScreen(SCREEN_IDS.UPGRADE);
  renderUpgradeOptions();
}

function renderUpgradeOptions() {
  const upgradeCount = runManager.getRouteState().selected === 'elite' ? 4 : 3;
  const choices = upgradeSystem.getUpgradeChoices(player, upgradeCount);
  if (choices.length === 0) {
    window.setTimeout(() => showRouteScreen(), 250);
    ELEMENTS.upgradeCards.innerHTML = '<div class="upgrade-empty">All upgrades maxed. Continue to next fight.</div>';
    if (getLanguage() === 'th') translateNodeTree(ELEMENTS.upgradeCards, 'th');
    return;
  }

  ELEMENTS.upgradeCards.innerHTML = choices.map((choice) => {
    const synergyHtml = choice.hasSynergy
      ? `<div class="upgrade-synergy">Potential synergy: ${choice.synergyNames.join(', ')}</div>`
      : '';

    return `
      <button class="upgrade-card${choice.hasSynergy ? ' has-synergy' : ''}" data-upgrade-id="${choice.id}">
        <div class="upgrade-card__title">${choice.name}</div>
        <div class="upgrade-card__level">Level ${choice.level} / ${choice.maxLevel}</div>
        <div class="upgrade-card__desc">${choice.description}</div>
        <div class="upgrade-card__tags">${choice.tags.map((tag) => `<span class="tag ${tag}">${tag}</span>`).join('')}</div>
        ${synergyHtml}
      </button>
    `;
  }).join('');

  const activeSynergies = synergyEngine.getActiveSynergies();
  if (activeSynergies.length > 0) {
    ELEMENTS.synergyBanner.style.display = 'block';
    ELEMENTS.synergyBanner.textContent = `ACTIVE SYNERGIES: ${activeSynergies.map((syn) => syn.name).join(', ')}`;
  } else {
    ELEMENTS.synergyBanner.style.display = 'none';
  }

  if (getLanguage() === 'th') {
    translateNodeTree(ELEMENTS.upgradeCards, 'th');
    translateNodeTree(ELEMENTS.synergyBanner, 'th');
  }
}

function selectUpgrade(upgradeId) {
  const success = upgradeSystem.applyUpgrade(player, upgradeId);
  if (!success) return;
  state.lastUpgradeSelected = upgradeId;
  audioSystem.levelup();
  renderPlayer();
  showRouteScreen();
}

function showRouteScreen() {
  if (state.mode === 'training' || state.mode === 'daily') {
    goToScreen(SCREEN_IDS.BATTLE);
    spawnEnemy();
    return;
  }
  state.route = runManager.getRouteState();
  renderRouteMap(state.route);
  goToScreen(SCREEN_IDS.ROUTE);
}

function renderRouteMap(route) {
  if (!ELEMENTS.routeTrack) return;
  const nextLevel = String(route.nextLevel).padStart(2, '0');
  if (ELEMENTS.routeLevel) ELEMENTS.routeLevel.textContent = `LEVEL ${nextLevel}`;
  if (ELEMENTS.routeSubtitle) {
    ELEMENTS.routeSubtitle.textContent = route.choices.length === 1
      ? 'The boss gate is locked in. Confirm the next engagement.'
      : 'Every path leads forward. The cost is yours to choose.';
  }
  ELEMENTS.routeTrack.innerHTML = route.choices.map((choice, index) => `
    <button class="route-card route-card--${choice.type}${choice.locked ? ' is-locked' : ''}" data-route-id="${choice.id}" aria-label="Select ${choice.label}">
      <span class="route-card__top"><span class="route-card__index">VECTOR ${String(index + 1).padStart(2, '0')}</span><span class="route-card__label">${choice.label}</span></span>
      <span><h3>${choice.title}</h3><p>${choice.description}</p></span>
      <span class="route-card__action">${choice.locked ? 'CONFIRM GATE →' : 'SELECT VECTOR →'}</span>
    </button>
  `).join('');
  if (ELEMENTS.routeHistory) {
    const history = route.history.slice(-4).map(item => `L${item.level} ${item.label}`).join('  /  ');
    ELEMENTS.routeHistory.textContent = history ? `ROUTE HISTORY // ${history}` : 'ROUTE HISTORY // INITIAL VECTOR';
  }
}

function selectRoute(routeId) {
  const choice = runManager.chooseRoute(routeId);
  if (!choice) return;
  state.route = runManager.getRouteState();
  state.awaitingNext = false;
  goToScreen(SCREEN_IDS.BATTLE);
  spawnEnemy();
}

function continueAfterUpgrade() {
  player.timeoutGraceUsed = 0;
  player.bankTime = 0;
  showRouteScreen();
}

function showGameOver() {
  stopTimer();
  clearStrikeSequence();
  audioSystem.playGameOverBgm();
  updateGameOverStats();
  const result = {
    level: runManager.getLevel(),
    score: player.score,
    maxCombo: player.maxCombo,
    correctAnswers: player.correctAnswers
  };
  if (state.mode === 'run') {
    saveSystem.updateRunStats(result);
  } else if (state.mode === 'daily' && state.modeOptions.ranked) {
    saveSystem.recordDailyAttempt(state.modeOptions.dateKey, result);
  }
  saveSystem.save();
  const progression = saveSystem.addProgression({ ...result, mode: state.mode });
  showFloatingText('+' + progression.earned + ' XP // RANK ' + progression.rank, '#ffd166');
  refreshStartScreen();
  if (state.mode === 'run') {
    leaderboardService.fetchLeaderboard().then(() => {
      renderLeaderboard(ELEMENTS.gameoverLeaderboard, leaderboardService.getEntries());
      renderLeaderboard(ELEMENTS.startLeaderboard, leaderboardService.getEntries());
    });
  }
  goToScreen(SCREEN_IDS.GAMEOVER);
}

function updateGameOverStats() {
  if (ELEMENTS.goTitle) ELEMENTS.goTitle.textContent = state.mode === 'daily' && player.isAlive() ? 'TARGET PURGED' : 'RUN TERMINATED';
  ELEMENTS.goLevel.textContent = runManager.getLevel();
  ELEMENTS.goScore.textContent = player.score;
  ELEMENTS.goCombo.textContent = player.maxCombo;
  ELEMENTS.goCorrect.textContent = player.correctAnswers;
  if (ELEMENTS.goMode) {
    const labels = { run: 'SURVIVAL RUN', training: 'TRAINING DRILL', daily: state.modeOptions.ranked ? 'DAILY BOSS / RANKED' : 'DAILY BOSS / PRACTICE' };
    ELEMENTS.goMode.textContent = labels[state.mode] || 'RUN COMPLETE';
  }
  ELEMENTS.nameEntry.style.display = state.mode === 'run' ? 'block' : 'none';
}

function submitScore() {
  const name = ELEMENTS.playerNameInput.value.trim() || 'HUNTER';
  ELEMENTS.btnSubmitScore.disabled = true;
  leaderboardService.submit(name, player.score, runManager.getLevel()).then(() => {
    renderLeaderboard(ELEMENTS.gameoverLeaderboard, leaderboardService.getEntries());
    renderLeaderboard(ELEMENTS.startLeaderboard, leaderboardService.getEntries());
  });
}

function updateHud() {
  renderPlayer();
}

function spawnDamageNumber(text, color) {
  const number = document.createElement('div');
  number.className = 'dmg-number';
  number.textContent = text;
  number.style.color = color;
  ELEMENTS.damageNumbers.appendChild(number);
  // Animation and movement are owned by the shared .dmg-number CSS class.
  window.setTimeout(() => number.remove(), 1000);
}

function showFloatingText(text, color) {
  const label = document.createElement('div');
  label.className = 'floating-text';
  label.textContent = text;
  label.style.color = color;
  ELEMENTS.damageNumbers.appendChild(label);
  // Animation is owned by the .floating-text CSS class.
  window.setTimeout(() => label.remove(), 1200);
}

const BATTLE_FX_CLASSES = ['fx-attack', 'fx-hit', 'fx-death'];
let battleFxTimer = null;
let deathCutsceneTimer = null;
let strikeSequenceTimer = null;

function triggerBattleFx(type, label = '') {
  if (!ELEMENTS.battleStage) return;
  clearBattleFx();
  if (ELEMENTS.vfxLabel) ELEMENTS.vfxLabel.textContent = label;
  // Force a clean animation cycle when two answers arrive close together.
  void ELEMENTS.battleStage.offsetWidth;
  ELEMENTS.battleStage.classList.add(`fx-${type}`);
  const duration = type === 'death' ? 820 : 650;
  battleFxTimer = window.setTimeout(clearBattleFx, duration);
}

function clearBattleFx() {
  if (battleFxTimer) {
    window.clearTimeout(battleFxTimer);
    battleFxTimer = null;
  }
  ELEMENTS.battleStage?.classList.remove(...BATTLE_FX_CLASSES);
}

function triggerStrikeSequence(label = 'DIRECT HIT') {
  if (!ELEMENTS.strikeSequence) return;
  clearStrikeSequence();
  if (ELEMENTS.strikeSequenceLabel) ELEMENTS.strikeSequenceLabel.textContent = label;
  ELEMENTS.strikeSequence.setAttribute('aria-hidden', 'false');
  ELEMENTS.strikeSequence.classList.toggle('is-critical', label.includes('CRITICAL'));
  ELEMENTS.strikeSequence.classList.remove('active');
  void ELEMENTS.strikeSequence.offsetWidth;
  ELEMENTS.strikeSequence.classList.add('active');
  // Give the hit sequence more readable reaction time before the next question.
  strikeSequenceTimer = window.setTimeout(clearStrikeSequence, 1200);
}

function clearStrikeSequence() {
  if (strikeSequenceTimer) {
    window.clearTimeout(strikeSequenceTimer);
    strikeSequenceTimer = null;
  }
  if (state.strikeQte?.autoTimer) window.clearTimeout(state.strikeQte.autoTimer);
  state.strikeQte = null;
  ELEMENTS.strikeSequence?.classList.remove('active');
  ELEMENTS.strikeSequence?.classList.remove('is-critical');
  ELEMENTS.strikeSequence?.setAttribute('aria-hidden', 'true');
}

function showDeathCutscene() {
  if (!ELEMENTS.deathCutscene) return;
  hideDeathCutscene();
  ELEMENTS.deathCutscene.setAttribute('aria-hidden', 'false');
  ELEMENTS.deathCutscene.classList.add('active');
  deathCutsceneTimer = window.setTimeout(hideDeathCutscene, 1450);
}

function hideDeathCutscene() {
  if (deathCutsceneTimer) {
    window.clearTimeout(deathCutsceneTimer);
    deathCutsceneTimer = null;
  }
  if (!ELEMENTS.deathCutscene) return;
  ELEMENTS.deathCutscene.classList.remove('active');
  ELEMENTS.deathCutscene.setAttribute('aria-hidden', 'true');
}

 init();




// ============================================================
// LANGUAGE SYSTEM — SINGLE SOURCE OF TRUTH (TH / EN)
// ============================================================
const LANGUAGE_KEY = 'unitHunterLanguage';

const TRANSLATIONS = {
  'SYSTEM ONLINE':'ระบบพร้อมใช้งาน',
  'COMMAND DECK / SI CORE':'ศูนย์บัญชาการ / แกน SI',
  'Convert. Survive. Ascend.':'แปลงหน่วย • เอาตัวรอด • ก้าวสู่ระดับต่อไป',
  'Select a mission node. Every correct conversion keeps the rig alive.':'เลือกภารกิจของคุณ ทุกคำตอบที่ถูกต้องคือพลังที่พาคุณไปต่อ',
  'MEASUREMENT OPERATIONS // READY':'ศูนย์ปฏิบัติการวัดหน่วย // พร้อม',
  'SURVIVAL OPERATIONS':'โหมดเอาตัวรอด',
  'GUIDED CONVERSIONS':'ฝึกแปลงหน่วยแบบมีตัวช่วย',
  'RANKED // UTC SEED':'จัดอันดับ // ภารกิจประจำวัน',
  'BESTS // LEADERBOARD':'สถิติ // อันดับ',
  '7 BASE QUANTITIES':'7 ปริมาณฐาน SI',
  'FIELD MANUAL / SKIP ANYTIME':'คู่มือภาคสนาม // ข้ามได้ทุกเมื่อ',
  'START':'เริ่ม',
  'RUN':'ลุยต่อ',
  'READY':'พร้อม',
  'OPEN':'พร้อมเล่น',
  'DONE':'เสร็จแล้ว',
  'RECORDS':'สถิติ',
  'SI CODEX':'คู่มือ SI',
  'TRAINING':'ฝึกซ้อม',
  'DAILY BOSS':'บอสประจำวัน',
  'HELP':'วิธีเล่น',
  'NEW RUN':'เริ่มรอบใหม่',
  'BACK TO MENU':'กลับหน้าหลัก',
  'SYSTEM UPGRADE':'เลือกอัปเกรด',
  'Choose one enhancement':'เลือกความสามารถ 1 อย่างสำหรับการต่อสู้ครั้งถัดไป',
  'Damage Boost':'เพิ่มพลังโจมตี',
  '+1 base damage per level':'เพิ่มพลังโจมตีพื้นฐาน 1 หน่วยต่อเลเวล',
  'Critical Strike':'โจมตีคริติคอล',
  '+6% crit chance per level. Crits deal 1.5x base damage.':'เพิ่มโอกาสคริติคอล 6% ต่อเลเวล คริทำความเสียหาย 1.5 เท่าของพลังโจมตีพื้นฐาน',
  'Combo Master':'ผู้เชี่ยวชาญคอมโบ',
  'Increases score multiplier per combo stack and raises max combo cap.':'เพิ่มตัวคูณคะแนนต่อจำนวนคอมโบ และเพิ่มขีดจำกัดคอมโบสูงสุด',
  'Life Drain':'ดูดพลังชีวิต',
  'Heal 10% of max HP on enemy kill, per level.':'ฟื้นฟู 10% ของพลังชีวิตสูงสุดเมื่อกำจัดศัตรู ต่อเลเวล',
  'Time Dilation':'การยืดเวลา',
  '+1s answer time banked per correct answer per level. First timeout per fight does not break combo.':'สะสมเวลาเพิ่ม 1 วินาทีต่อคำตอบที่ถูกและต่อเลเวล การหมดเวลาครั้งแรกของการต่อสู้ไม่รีเซ็ตคอมโบ',
  'Vitality':'พลังชีวิต',
  '+15 max HP per level.':'เพิ่มพลังชีวิตสูงสุด 15 หน่วยต่อเลเวล',
  'Armor Plating':'เกราะเสริม',
  '-8% damage taken from wrong answers/timeouts per level.':'ลดความเสียหายจากคำตอบผิดหรือหมดเวลา 8% ต่อเลเวล',
  'Shield Bash':'กระแทกด้วยโล่',
  '15% chance per level to stun the enemy for 1 question (extra time, no counter-attack).':'มีโอกาส 15% ต่อเลเวลที่จะทำให้ศัตรูติดสตัน 1 คำถาม (ได้เวลาเพิ่มและไม่โดนสวนกลับ)',
  'Time Warp':'บิดเวลา',
  'On correct answer, 10% chance per level to bank 35% of the enemy timer for your next question.':'เมื่อตอบถูก มีโอกาส 10% ต่อเลเวลที่จะสะสม 35% ของเวลาศัตรูไว้ใช้กับคำถามถัดไป',
  'Devastating Blows':'การโจมตีทำลายล้าง',
  'Eternal Hunger':'ความหิวชั่วนิรันดร์',
  'Iron Patience':'ความอดทนดุจเหล็ก',
  'Flow State':'สภาวะลื่นไหล',
  'Fortress':'ป้อมปราการ',
  'damage':'โจมตี',
  'crit':'คริติคอล',
  'score':'คะแนน',
  'sustain':'ฟื้นฟู',
  'timer':'เวลา',
  'defense':'ป้องกัน',
  'Potential synergy:':'ศักยภาพการทำงานร่วมกัน:',
  'ACTIVE SYNERGIES:':'การทำงานร่วมกันที่ใช้งานอยู่:',
  'All upgrades maxed. Continue to next fight.':'อัปเกรดครบทั้งหมดแล้ว ไปต่อสู้ครั้งถัดไป',
  'RUN TERMINATED':'ภารกิจล้มเหลว',
  'ENTER CALLSIGN':'ตั้งชื่อผู้เล่น',
  'SUBMIT':'บันทึกคะแนน',
  'GLOBAL LEADERBOARD':'ตารางอันดับรวม',
  'PERSONAL BESTS':'สถิติส่วนตัว',
  'LEADERBOARD':'ตารางอันดับ',
  'BEST LEVEL':'เลเวลสูงสุด',
  'BEST SCORE':'คะแนนสูงสุด',
  'BEST COMBO':'คอมโบสูงสุด',
  'TOTAL CORRECT':'ตอบถูกทั้งหมด',
  'TOTAL RUNS':'จำนวนรอบที่เล่น',
  'RANK':'อันดับ',
  'NAME':'ชื่อ',
  'SCORE':'คะแนน',
  'LVL':'เลเวล',
  'REFERENCE / SI CORE':'ข้อมูลอ้างอิง / ระบบ SI',
  'SIMULATION / NO DAMAGE':'โหมดจำลอง / ไม่เสียพลังชีวิต',
  'The seven base quantities used by every hunter.':'7 ปริมาณฐานของระบบ SI ที่นักล่าทุกคนต้องรู้',
  'Tune the drill before entering the arena.':'ตั้งค่าการฝึกก่อนเข้าสู่สนามจำลอง',
  'QUANTITY':'ประเภทหน่วย',
  'INTENSITY':'ระดับความท้าทาย',
  'GUIDED':'มีคำแนะนำ',
  'STANDARD':'มาตรฐาน',
  'CHALLENGE':'ท้าทาย',
  'START DRILL':'เริ่มฝึก',
  'LIVE SEED / UTC DAY':'ภารกิจประจำวัน / UTC',
  'A deterministic target for every hunter today.':'เป้าหมายเดียวกันสำหรับนักล่าทุกคนในวันนี้',
  'TARGET':'เป้าหมาย',
  'RANKED ATTEMPT AVAILABLE':'พร้อมให้ท้าชิงคะแนน',
  'PRACTICE':'ฝึกก่อน',
  'START RANKED':'เริ่มจัดอันดับ',
  'FIELD MANUAL / 01':'คู่มือภาคสนาม / 01',
  'HELP // SI BASICS':'วิธีเล่น // พื้นฐาน SI',
  'SKIP TUTORIAL':'ข้ามบทสอน',
  'NEXT':'ต่อไป',
  'MISSION LINK / ACQUIRING':'กำลังเชื่อมต่อภารกิจ',
  'TARGET SIGNATURE':'กำลังระบุเป้าหมาย',
  'Zooming to combat theater...':'กำลังเข้าสู่สนามต่อสู้...',
  'TARGET REVEALED':'พบเป้าหมายแล้ว',
  'SKIP':'ข้าม',
  'PLAYER HP':'พลังชีวิตผู้เล่น',
  'ENEMY HP':'พลังชีวิตศัตรู',
  'BOSS HP':'พลังชีวิตบอส',
  'FOE':'ศัตรู',
  'TYPE':'ประเภท',
  'NORMAL':'ปกติ',
  'ELITE':'ระดับสูง',
  'BOSS':'บอส',
  'COMBO':'คอมโบ',
  'QUESTION':'คำถาม',
  'REVEAL HINT':'ดูคำใบ้',
  'ATTACK VECTOR / LOCKED':'ล็อกเป้าหมายโจมตีแล้ว',
  'DIRECT HIT':'โจมตีตรงเป้า',
  'PRESS SPACE / CLICK WHEN THE CURSOR ENTERS THE ZONE':'กด SPACE หรือคลิก เมื่อเคอร์เซอร์เข้าสู่โซน',
  'PERFECT':'สมบูรณ์แบบ!',
  'GOOD':'ดี!',
  'MISS':'พลาด',
  'WINDOW CLOSED — ATTACK RESOLVED':'จังหวะหมดแล้ว — ระบบโจมตีทำงานต่อ',
  'CRITICAL VECTOR':'โจมตีคริติคอล',
  'CRITICAL STRIKE':'คริติคอล!',
  'IMPACT CONFIRMED':'โจมตีเข้าเป้า',
  'TARGET PURGED':'กำจัดเป้าหมายแล้ว',
  'TARGET LOCKED':'ล็อกเป้าหมายแล้ว',
  'COUNTER HIT!':'โดนสวนกลับ!',
  'COUNTER HIT':'โดนสวนกลับ!',
  'BOSS COUNTER!':'บอสโต้กลับ!',
  'BOSS COUNTERMEASURE':'บอสโต้กลับ!',
  'ENRAGED':'คลั่ง!',
  'PHASE 1':'เฟส 1',
  'PHASE 2':'เฟส 2',
  'PHASE 3':'เฟส 3',
  'TIME WARP':'บิดเวลา',
  'STUN':'สตัน',
  'STUNNED':'ศัตรูติดสตัน',
  'PRACTICE SAFE':'โหมดฝึก: ไม่เสียพลังชีวิต',
  'DRILL TARGET CLEARED':'ผ่านเป้าหมายการฝึกแล้ว',
  'DAILY TARGET PURGED':'กำจัดบอสประจำวันแล้ว',
  'RANKED COMPLETE':'เล่นโหมดจัดอันดับแล้ว',
  'TIMEOUT GRACE':'ได้รับโอกาสพิเศษ',
  'GAME OVER':'เกมจบ',
  'UPGRADE':'อัปเกรด',
  'RUN COMPLETE':'ภารกิจสำเร็จ',
  'VICTORY':'ชนะ!'
};

const REVERSE_TRANSLATIONS = Object.fromEntries(
  Object.entries(TRANSLATIONS).map(([en, th]) => [th, en])
);

function getLanguage() {
  return localStorage.getItem(LANGUAGE_KEY) === 'th' ? 'th' : 'en';
}

function translateValue(value, language) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const dictionary = language === 'th' ? TRANSLATIONS : REVERSE_TRANSLATIONS;
  const translated = dictionary[trimmed];
  if (translated) return value.replace(trimmed, translated);

  if (language === 'th') {
    const dynamicPrefixes = [
      ['Potential synergy: ', 'ศักยภาพการทำงานร่วมกัน: '],
      ['ACTIVE SYNERGIES: ', 'การทำงานร่วมกันที่ใช้งานอยู่: '],
      ['Level ', 'เลเวล ']
    ];
    for (const [prefix, translatedPrefix] of dynamicPrefixes) {
      if (trimmed.startsWith(prefix)) {
        const suffix = trimmed.slice(prefix.length)
          .split(', ')
          .map(item => TRANSLATIONS[item] || item)
          .join(', ');
        return value.replace(trimmed, translatedPrefix + suffix);
      }
    }
  }

  return value;
}

function translateNodeTree(root, language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement?.closest('script,style')) continue;
    const next = translateValue(node.nodeValue, language);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

function translateAttributes(root, language) {
  root.querySelectorAll?.('[aria-label],[placeholder],[title]').forEach(el => {
    for (const attr of ['aria-label','placeholder','title']) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      const next = translateValue(value, language);
      if (next !== value) el.setAttribute(attr, next);
    }
  });
}

function applyLanguage(language = getLanguage()) {
  const target = language === 'th' ? 'th' : 'en';
  localStorage.setItem(LANGUAGE_KEY, target);
  document.documentElement.lang = target;
  translateNodeTree(document.body, target);
  translateAttributes(document.body, target);
  const button = document.getElementById('btn-language');
  if (button) button.textContent = target === 'th' ? 'ไทย / English' : 'TH / English';
}

// One observer only. It translates newly-created game UI while Thai is active.
let languageObserver = new MutationObserver(mutations => {
  if (getLanguage() !== 'th') return;
  for (const mutation of mutations) {
    if (mutation.type === 'characterData') {
      const next = translateValue(mutation.target.nodeValue, 'th');
      if (next !== mutation.target.nodeValue) mutation.target.nodeValue = next;
    }
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const next = translateValue(node.nodeValue, 'th');
        if (next !== node.nodeValue) node.nodeValue = next;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        translateNodeTree(node, 'th');
        translateAttributes(node, 'th');
      }
    }
  }
});

languageObserver.observe(document.body, {
  subtree: true,
  childList: true,
  characterData: true
});

const languageButton = document.getElementById('btn-language');
if (languageButton) {
  languageButton.addEventListener('click', () => {
    applyLanguage(getLanguage() === 'th' ? 'en' : 'th');
  });
}

applyLanguage(getLanguage());

// ============================================================
// GAME FEEL — PLAYER DAMAGE FEEDBACK
// ============================================================
function triggerPlayerHitFeedback(damage, isBoss = false) {
  let overlay = document.getElementById('player-hit-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'player-hit-overlay';
    document.body.appendChild(overlay);
  }

  let banner = document.querySelector('.player-hit-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'player-hit-banner';
    document.body.appendChild(banner);
  }

  const battle = document.getElementById('screen-battle');
  banner.textContent = isBoss ? 'BOSS COUNTER!' : 'COUNTER HIT!';
  banner.classList.remove('active');
  overlay.classList.remove('active');
  battle?.classList.remove('player-hit-shake');
  ELEMENTS.playerHp?.classList.remove('damage-alert');

  void banner.offsetWidth;
  banner.classList.add('active');
  overlay.classList.add('active');
  battle?.classList.add('player-hit-shake');
  ELEMENTS.playerHp?.classList.add('damage-alert');

  if (getLanguage() === 'th') {
    banner.textContent = translateValue(banner.textContent, 'th');
  }

  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(isBoss ? [45, 35, 75] : 35);
  }

  window.setTimeout(() => {
    overlay.classList.remove('active');
    battle?.classList.remove('player-hit-shake');
    ELEMENTS.playerHp?.classList.remove('damage-alert');
  }, isBoss ? 700 : 500);
}


// === PROGRESSION: COMBO POWER ===
function getComboPower(combo) {
  if (combo >= 10) return { damageMultiplier: 1.50, announcement: combo === 10 ? 'OVERDRIVE x1.50' : '' };
  if (combo >= 7) return { damageMultiplier: 1.35, announcement: combo === 7 ? 'FURY CHAIN x1.35' : '' };
  if (combo >= 5) return { damageMultiplier: 1.25, announcement: combo === 5 ? 'COMBO BOOST x1.25' : '' };
  if (combo >= 3) return { damageMultiplier: 1.10, announcement: combo === 3 ? 'CHAIN START x1.10' : '' };
  return { damageMultiplier: 1, announcement: '' };
}

function showComboAnnouncement(power) {
  if (!power?.announcement) return;
  showFloatingText(power.announcement, '#ffd166');
  const comboEl = ELEMENTS.hudCombo;
  comboEl?.classList.remove('combo-power-up');
  void comboEl?.offsetWidth;
  comboEl?.classList.add('combo-power-up');
}
