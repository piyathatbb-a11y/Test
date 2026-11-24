import { Expedition, TOPICS, ROOMS, SKILLS, RELICS, RULESET, QTE, qteGrade, getQuestionUnitKeys, makeQuestionFromSelection } from './systems/Expedition.js';
import { ExpeditionStore, dayKey } from './systems/ExpeditionStore.js';
import { getSpritePath } from './data/spriteConfigs.js';
import { ExpeditionEffects } from './systems/ExpeditionEffects.js';
import { roomIcon, routePositions, routeCurve, ROUTE_SIZE } from './ui/routeMap.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const randomSeed = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
const getLanguage = () => {
  try {
    return localStorage.getItem('unitHunterLanguage') === 'en' ? 'en' : 'th';
  } catch {
    return 'th';
  }
};
const locale = (thai, english = thai) => {
  return getLanguage() === 'en' ? english : thai;
};
const localeTopic = topic => locale(TOPICS[topic], {
  length: 'Length', mass: 'Mass', time: 'Time', area: 'Area', volume: 'Volume', speed: 'Speed'
}[topic] ?? topic);
const localeRoom = roomId => locale(ROOMS[roomId], {
  fight: 'Fight', elite: 'Elite', event: 'Event', shop: 'Shop', treasure: 'Treasure', rest: 'Rest', boss: 'Boss'
}[roomId] ?? roomId);
const localeSkill = skillId => locale(SKILLS[skillId].name, {
  basic: 'Basic Strike', heavy: 'Heavy Slash', pierce: 'Piercing Shot', mend: 'Repair', focus: 'Focus', drain: 'Drain', surge: 'Surge'
}[skillId] ?? SKILLS[skillId].name);
const localeRelic = relicId => locale(RELICS[relicId].name, {
  clock: 'Time Gear', lens: 'Precision Lens', shell: 'Field Shell', battery: 'Reserve Battery'
}[relicId] ?? RELICS[relicId].name);
const localeSkillDescription = skillId => locale(SKILLS[skillId].description, {
  basic: 'Deals 16 damage · always available',
  heavy: 'Deals 27 damage · 2 turn cooldown',
  pierce: 'Deals 19 damage, ignores armor · 1 turn cooldown',
  mend: 'Restores up to 18 HP based on timing · 3 turn cooldown',
  focus: 'Reduces the next attack by 4/7/9 based on timing · 2 turn cooldown',
  drain: 'Deals 21 damage and restores half the damage as HP · 2 turn cooldown',
  surge: 'Deals 33 damage · 3 turn cooldown'
}[skillId] ?? SKILLS[skillId].description);
const localeRelicDescription = relicId => locale(RELICS[relicId].description, {
  clock: 'A Perfect on your turn reduces other skill cooldowns by 1',
  lens: 'Perfect attacks deal 3 extra damage',
  shell: 'Reduces incoming damage by 2 each time',
  battery: 'Restores 8 HP after winning a fight'
}[relicId] ?? RELICS[relicId].description);
const button = (action, title, detail = '', disabled = false, primary = false) => `<button type="button" class="exp-button${primary ? ' exp-button--primary' : ''}" data-exp="${action}" ${disabled ? 'disabled' : ''}><strong>${title}</strong>${detail ? `<small>${detail}</small>` : ''}</button>`;

export class ExpeditionUI {
  constructor(onExit, aiQuestionService = null) {
    this.onExit = onExit;
    this.aiQuestionService = aiQuestionService;
    let storage;
    try { storage = localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } }; }
    this.store = new ExpeditionStore(storage);
    this.topic = 'length';
    this.mode = 'normal';
    this.game = null;
    this.frame = null;
    this.autoAdvanceTimer = null;
    this.autoAdvanceToken = 0;
    this.saved = null;
    this.root = document.createElement('section');
    this.root.id = 'screen-expedition';
    this.root.className = 'screen expedition';
    this.root.lang = getLanguage();
    this.root.setAttribute('aria-label', locale('การเดินทางฝึกแปลงหน่วย', 'Unit conversion training expedition'));
    document.getElementById('app').append(this.root);
    this.effects = new ExpeditionEffects(this.root, { onReady: () => {
      const next = this.root.querySelector('[data-exp="next"]');
      if (next && this.game) next.disabled = Date.now() < this.game.s.continueAt;
      if (this.game?.s.phase === 'skill') this.root.querySelector('main h2')?.focus({ preventScroll: true });
      this.scheduleAdvance();
    } });
    this.root.addEventListener('click', event => {
      const control = event.target.closest('[data-exp]');
      if (control && !control.disabled) this.act(control.dataset.exp);
    });
    this.root.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.game?.s.phase !== 'qte') return;
      const hit = event.target.closest('[data-exp="hit"]');
      if (hit && !hit.disabled) { event.preventDefault(); this.hitQte(); }
    });
    document.addEventListener('keydown', event => {
      if (!this.root.classList.contains('active') || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.repeat) return;
      if (this.effects.intro) {
        if (event.key === 'Escape') { event.preventDefault(); this.effects.finishIntro(); }
        if (event.key === 'Tab') { event.preventDefault(); this.root.querySelector('[data-exp="skip-entry"]')?.focus(); }
        return;
      }
      if (this.effects.busy) return;
      if (this.game?.s.phase === 'qte' && ['Space', 'Enter'].includes(event.code)) { event.preventDefault(); this.hitQte(); }
      else if (this.game?.s.phase === 'question' && /^[1-4]$/.test(event.key)) { event.preventDefault(); this.act(`answer:${Number(event.key) - 1}`); }
    });
    window.addEventListener('pagehide', () => this.suspend());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.suspend(); });
    this.ticker = window.setInterval(() => {
      if (!this.root.classList.contains('active')) return;
      const clock = this.root.querySelector('[data-clock]');
      if (clock && this.game) clock.textContent = time(this.game.s.result?.elapsed ?? Date.now() - this.game.s.startedAt);
      const next = this.root.querySelector('[data-exp="next"]');
      if (next && this.game) {
        const seconds = Math.ceil((this.game.s.continueAt - Date.now()) / 1000);
        next.disabled = seconds > 0 || this.effects.busy;
        next.textContent = seconds > 0 ? `อ่านวิธีคิด · ${seconds} วินาที` : 'ไปต่อ →';
      }
    }, 200);
  }
  open(mode = 'normal') {
    this.cancelAdvance();
    this.effects.cancel();
    this.stopQte();
    this.game = null;
    this.mode = mode;
    this.saved = this.store.load();
    document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));
    this.root.classList.add('active');
    this.render();
  }
  close() {
    this.cancelAdvance();
    this.suspend();
    this.aiQuestionService?.resetQueue();
    this.stopQte();
    this.effects.cancel();
    this.root.classList.remove('active');
    this.onExit();
  }
  suspend() {
    this.cancelAdvance();
    this.effects.cancel();
    if (!this.game || this.game.s.phase === 'ended') return;
    if (this.game.s.ranked) {
      this.game.s.ranked = false;
      this.game.s.rankNotice = 'ออกจากรอบหรือสลับหน้าต่างแล้ว รอบนี้เปลี่ยนเป็นฝึกและไม่ส่งอันดับรายวัน';
    }
    // A QTE interrupted by navigation/visibility is resolved once, never reset.
    if (this.game.s.phase === 'qte') { this.stopQte(); this.game.resolve('BAD'); }
    this.persist();
    if (this.root.classList.contains('active')) this.render({ animate: false });
  }
  persist() { if (this.game) this.store.save(this.game); }
  start() {
    const date = dayKey();
    const ranked = this.mode === 'ranked';
    if (ranked && !this.store.startRanked(this.topic, date)) { this.render(); return; }
    this.aiQuestionService?.resetQueue();
    if (!ranked && this.aiQuestionService?.isEnabled() && this.aiQuestionService.hasKey()) {
      void this.aiQuestionService.prefetch({
        categories: [this.topic],
        unitSets: { [this.topic]: getQuestionUnitKeys(this.topic) }
      });
    }
    const daily = this.mode !== 'normal';
    const seed = daily ? `${RULESET}:${QTE.version}:${date}:${this.topic}` : `${Date.now()}:${randomSeed()}`;
    this.game = new Expedition({ seed, topic: this.topic, ranked, dateKey: daily ? date : '' });
    this.game.s.daily = daily;
    const learning = this.store.archive().learning[this.topic];
    if (Array.isArray(learning?.mistakes)) this.game.s.priorMistakes = learning.mistakes.filter(p => Array.isArray(p) && p.length === 2);
    this.persist();
    this.render();
  }
  act(command) {
    const [action, arg] = command.split(':');
    if (action === 'menu') { this.close(); return; }
    if (action === 'skip-entry') { this.effects.finishIntro(); return; }
    if (this.effects.busy) return;
    if (action === 'topic') { this.topic = arg; this.render(); return; }
    if (action === 'mode') { this.mode = arg; this.render(); return; }
    if (action === 'ai-toggle' && this.aiQuestionService) {
      this.aiQuestionService.setEnabled(this.root.querySelector('[data-ai-enabled]')?.checked === true);
      this.render(); return;
    }
    if (action === 'ai-save' && this.aiQuestionService) {
      this.aiQuestionService.saveKey(this.root.querySelector('[data-ai-key]')?.value || '');
      this.render(); return;
    }
    if (action === 'ai-clear' && this.aiQuestionService) {
      this.aiQuestionService.clearKey();
      this.render(); return;
    }
    if (action === 'start') { this.start(); return; }
    if (action === 'resume') {
      try { this.game = Expedition.restore(this.saved); }
      catch { this.saved = null; this.notice = 'ข้อมูลรอบเก่าใช้ไม่ได้ กรุณาเริ่มรอบใหม่'; }
      this.persist(); this.render(); return;
    }
    if (action === 'new') { this.game = null; this.saved = this.store.load(); this.render(); return; }
    if (!this.game) return;
    const s = this.game.s;
    if (action === 'hit') { this.hitQte(); return; }
    const entry = action === 'node' && this.game.enter(arg) && s.phase === 'skill';
    if (action === 'skill') this.game.chooseSkill(arg);
    if (action === 'answer') this.game.answer(Number(arg));
    if (action === 'next') this.game.advance();
    if (action === 'reward') this.game.takeReward(Number(arg));
    if (action === 'replace') this.game.takeReward(s.pendingReward, arg);
    if (action === 'cancel-replace' && s.phase === 'replace') s.phase = 'reward';
    if (action === 'room') this.game.roomAction(arg);
    if (action === 'event') this.game.eventAction(arg);
    if (action === 'kit') this.game.useKit();
    if (action === 'name') {
      const input = this.root.querySelector('#exp-callsign');
      this.store.rename(this.game, input.value);
      s.nameSaved = input.value.trim().slice(0, 16) || 'HUNTER';
    }
    this.useAIQuestion();
    if (s.phase === 'ended') this.store.record(this.game, s.nameSaved);
    this.persist();
    this.render({ entry });
  }
  stopQte() { if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null; }
  cancelAdvance() {
    this.autoAdvanceToken++;
    if (this.autoAdvanceTimer !== null) window.clearTimeout?.(this.autoAdvanceTimer);
    this.autoAdvanceTimer = null;
  }
  scheduleAdvance() {
    this.cancelAdvance();
    const game = this.game, s = game?.s;
    if (!s || s.phase !== 'feedback' || s.turn === 'event' || !s.answerCorrect || this.effects.busy || document.hidden || typeof window.setTimeout !== 'function') return;
    const questionNumber = s.questionNumber;
    const token = this.autoAdvanceToken;
    this.autoAdvanceTimer = window.setTimeout(() => {
      this.autoAdvanceTimer = null;
      if (token === this.autoAdvanceToken && this.game === game && game.s.phase === 'feedback' && game.s.questionNumber === questionNumber && !this.effects.busy && !document.hidden) this.act('next');
    }, 160);
  }
  runQte() {
    this.qteStart = performance.now();
    const tick = now => {
      if (this.game?.s.phase !== 'qte' || !this.root.classList.contains('active')) return;
      const progress = Math.min(1, (now - this.qteStart) / QTE.duration);
      const cursor = this.root.querySelector('.exp-qte-cursor');
      if (cursor) cursor.style.transform = `translate3d(${progress * 100}%,0,0)`;
      if (progress === 1) this.hitQte(true);
      else this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  hitQte(timedOut = false) {
    if (this.game?.s.phase !== 'qte') return;
    this.stopQte();
    this.game.resolve(qteGrade((performance.now() - this.qteStart) / QTE.duration, timedOut));
    this.persist(); this.render();
  }
  render({ entry = false, animate = true } = {}) {
    this.cancelAdvance();
    this.stopQte();
    this.effects.cancel();
    const s = this.game?.s;
    const previousPhase = this.root.getAttribute('data-phase');
    this.root.setAttribute('data-phase', s?.phase || 'setup');
    this.root.lang = getLanguage();
    this.root.innerHTML = `<div class="exp-shell">
      <header class="exp-header"><div><span class="exp-kicker">UNIT HUNTER / EXPEDITION</span><h1>${s ? localeTopic(s.topic) : locale('เส้นทางแห่งมาตรวัด', 'Measurement route')}</h1></div>${button('menu', s && s.phase !== 'ended' ? locale('บันทึก / กลับเมนู', 'Save / Back to menu') : locale('กลับเมนู', 'Back to menu'))}</header>
      ${this.store.error || this.notice ? `<p class="exp-warning" role="alert">${escape(this.store.error || this.notice)}</p>` : ''}
      ${s?.rankNotice ? `<p class="exp-warning">${escape(s.rankNotice)}</p>` : ''}
      ${s ? this.hud() : ''}
      <main class="exp-content">${!s ? this.setup() : this.content()}</main>
      ${entry && s?.enemy ? this.entryScene() : ''}
      <footer class="exp-footer"><span>${locale('ความรู้ → จังหวะ → ผลลัพธ์', 'Knowledge → timing → outcome')}</span><span>PERFECT 120% · GOOD 100% · BAD 75%</span></footer>
    </div>`;
    const enteringMap = s?.phase === 'map' && previousPhase !== 'map';
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    if (!reducedMotion && enteringMap) {
      const route = this.root.querySelector('.exp-route');
      const map = route?.querySelector('.exp-map');
      if (route && map) {
        map.classList.add('is-opening');
        route.querySelectorAll?.('[data-exp^="node:"]:not([disabled])').forEach(control => {
          control.disabled = true;
          control.dataset.mapOpeningDisabled = 'true';
        });
        let openingFinished = false;
        let openingTimeout;
        const finishOpening = event => {
          if (event && (event.target !== map || event.animationName !== 'exp-map-unfold')) return;
          if (openingFinished) return;
          openingFinished = true;
          window.clearTimeout(openingTimeout);
          route.querySelectorAll?.('[data-map-opening-disabled]').forEach(node => {
            node.disabled = false;
            delete node.dataset.mapOpeningDisabled;
          });
          map.classList.remove('is-opening');
          map.removeEventListener('animationend', finishOpening);
          map.removeEventListener('animationcancel', finishOpening);
        };
        map.addEventListener('animationend', finishOpening);
        map.addEventListener('animationcancel', finishOpening);
        openingTimeout = window.setTimeout(() => finishOpening(), 650);
      }
    }
    // Move focus to the new task after replacing controls; never to the timed QTE button.
    const heading = this.root.querySelector('main h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    if (animate && !document.hidden) {
      this.effects.mount(s, { entry });
      if (!this.effects.busy) this.scheduleAdvance();
    }
    if (s?.phase === 'map') {
      const nextNode = this.game.available()[0];
      if (nextNode) this.root.querySelector(`[data-exp="node:${nextNode.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
    }
    if (s?.phase === 'qte') {
      // Put the timed control in view before starting, including on narrow screens.
      this.root.querySelector('[data-exp="hit"]')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      this.runQte();
    }
  }
  setup() {
    const daily = this.mode !== 'normal';
    const attempted = this.store.attempted(this.topic, dayKey());
    const learning = this.store.archive().learning[this.topic];
    return `<div class="exp-setup"><div class="exp-kicker">${locale('01 / เตรียมออกเดินทาง', '01 / Prepare to depart')}</div><h2>${locale('เลือกความรู้ที่จะพาไปด้วย', 'Choose the knowledge to carry')}</h2>
      <p class="exp-lede">${locale('เดินผ่านแมพสุ่ม สร้างชุดสกิล แล้วใช้คำถามแปลงหน่วยเพื่อโจมตีและป้องกัน เป้าหมายหนึ่งเขต ประมาณ 10–15 นาที', 'Travel through a random map, build a skill set, and use unit-conversion questions to attack and defend. One target zone, roughly 10–15 minutes.')}</p>
      <fieldset><legend>${locale('หัวข้อแปลงหน่วย', 'Conversion topics')}</legend><div class="exp-options">${Object.keys(TOPICS).map(id => `<button class="exp-button ${id === this.topic ? 'is-selected' : ''}" data-exp="topic:${id}" aria-pressed="${id === this.topic}">${localeTopic(id)}</button>`).join('')}</div></fieldset>
      <fieldset><legend>${locale('รูปแบบรอบ', 'Run format')}</legend><div class="exp-options">${[['normal', locale('เดินทางทั่วไป', 'Casual route'), locale('แมพใหม่ · พักแล้วเล่นต่อได้', 'New map · pause and resume anytime')], ['practice', locale('ฝึกรายวัน', 'Daily practice'), locale('แมพเดียวกับจัดอันดับ · ฝึกซ้ำได้', 'Same map as ranked · practice repeatedly')], ['ranked', locale('จัดอันดับรายวัน', 'Daily ranked'), locale('ครั้งเดียวต่อหัวข้อต่อวัน · ออกจากรอบหมดสิทธิ์อันดับ', 'One attempt per topic per day · leaving the run cancels ranked eligibility')]].map(([id, name, detail]) => `<button class="exp-button ${id === this.mode ? 'is-selected' : ''}" data-exp="mode:${id}" aria-pressed="${id === this.mode}"><strong>${name}</strong><small>${detail}</small></button>`).join('')}</div></fieldset>
      ${this.aiQuestionService ? this.aiSettings() : ''}
      ${daily ? `<p class="exp-note">${locale('วันที่', 'Date')} ${dayKey()} · ${locale('เวลาไทย', 'Thailand time')} · ${locale('อันดับเฉพาะเครื่องนี้', 'This device only')} ${attempted ? locale('· ใช้สิทธิ์หัวข้อนี้แล้ว', '· this topic is already used') : ''}</p>` : ''}
      ${learning?.total ? `<p class="exp-note">${locale('ประวัติหัวข้อนี้:', 'This topic history:')} ${locale('ตอบถูก', 'Correct')} ${Number(learning.correct) || 0}/${Number(learning.total) || 0} ${locale('ข้อ', 'questions')}</p>` : ''}
      <div class="exp-actions">${button('start', locale('เริ่มเดินทาง →', 'Begin route →'), this.saved?.phase !== 'ended' && this.saved ? locale('เริ่มใหม่จะทับรอบที่บันทึกไว้', 'Starting a new run overwrites the saved round') : '', this.mode === 'ranked' && attempted, true)}${this.saved && this.saved.phase !== 'ended' ? button('resume', locale('เล่นรอบที่บันทึกต่อ', 'Resume saved run'), locale('รอบที่กลับมาเล่นต่อเป็นรอบทั่วไป', 'The resumed round continues as a casual run')) : ''}</div>
      <aside class="exp-manual"><h3>${locale('หนึ่งรอบการต่อสู้', 'One combat round')}</h3><p>${locale('เลือกสกิล → ตอบคำถาม → QTE → ศัตรูโจมตี → ตอบเพื่อป้องกัน', 'Choose a skill → answer a question → QTE → enemy attacks → defend with a response')}</p><p>${locale('ตอบผิดเป็น Bad ทันที พร้อมวิธีคิด ตอบถูกแล้วกดจังหวะเพื่อรับ Perfect / Good / Bad', 'Wrong answer is an instant Bad, with the explanation shown. Correct answers lead to a timing input to earn Perfect / Good / Bad')}</p><p>${locale('ป้องกัน Perfect รับ 75% · Good รับ 100% · Bad รับ 115% ของดาเมจศัตรู', 'Perfect defense gives 75% · Good gives 100% · Bad gives 115% of the enemy damage')}</p></aside>
      ${this.leaderboard(this.topic, this.mode === 'ranked', daily ? dayKey() : '')}</div>`;
  }
  aiSettings() {
    const status = this.aiQuestionService.getStatus();
    return `<section class="exp-ai-settings" aria-label="${locale('คำถามจาก AI', 'AI-generated questions')}">
      <label><input type="checkbox" data-ai-enabled data-exp="ai-toggle" ${this.aiQuestionService.isEnabled() ? 'checked' : ''}> ${locale('สร้างคำถามด้วย AI', 'Generate questions with AI')}</label>
      <p>${locale('ต้องบันทึก API key และเปิดตัวเลือกนี้ จึงจะได้โจทย์ AI รวมแผนภาพและการคำนวณหลายขั้น ในรอบทั่วไป/ฝึกรายวัน; จัดอันดับไม่ใช้ AI', 'Save an API key and enable this option for AI questions, including diagrams and multi-step calculations, in casual/practice runs. Ranked never uses AI.')}</p>
      <label class="sr-only" for="exp-ai-key">${locale('OpenAI API key', 'OpenAI API key')}</label>
      <input id="exp-ai-key" type="password" data-ai-key autocomplete="off" placeholder="OpenAI API key">
      <div class="exp-actions">${button('ai-save', locale('บันทึกคีย์', 'Save key'))}${button('ai-clear', locale('ลบคีย์', 'Remove key'))}</div>
      <p>${locale('คีย์เก็บในเบราว์เซอร์นี้และไม่ปลอดภัย ผู้ที่เข้าถึงเบราว์เซอร์อาจตรวจดูได้', 'Key is stored in this browser and is not secure. Anyone with browser access may inspect it.')}</p>
      <p class="exp-ai-status" data-ai-status data-state="${escape(status.type)}" role="status" aria-live="polite">${escape(status.message)}</p>
    </section>`;
  }
  useAIQuestion() {
    const s = this.game?.s;
    if (!s || s.ranked || s.phase !== 'question' || !this.aiQuestionService?.isEnabled() || !this.aiQuestionService.hasKey()) return;
    const unitSets = { [s.topic]: getQuestionUnitKeys(s.topic) };
    const selection = this.aiQuestionService.takeQuestion({ categories: [s.topic], unitSets });
    if (!selection) return;
    const question = makeQuestionFromSelection(s.topic, { ...selection, source: 'ai' });
    if (question) s.question = question;
  }
  hud() {
    const s = this.game.s;
    return `<div class="exp-hud"><div class="exp-player-vitals"><span>${locale('พลังชีวิต', 'HP')}</span><strong>${s.hp} / ${s.maxHp}</strong><meter min="0" max="${s.maxHp}" value="${s.hp}" aria-label="${locale('พลังชีวิต', 'HP')}"></meter><span class="dmg-number exp-vitals-float" data-exp-player-float aria-hidden="true"></span></div><div><span>${locale('เงิน', 'Gold')}</span><strong>${s.gold}</strong></div><div><span>${locale('คำตอบถูก', 'Correct')}</span><strong>${s.correct} / ${s.total}</strong></div><div><span>${s.ranked ? locale('จัดอันดับรายวัน', 'Daily ranked') : s.daily ? locale('ฝึกรายวัน', 'Daily practice') : locale('รอบทั่วไป', 'Casual run')}</span><strong data-clock>${time(s.result?.elapsed ?? Date.now() - s.startedAt)}</strong></div>${button('kit', `${locale('ชุดซ่อม', 'Repair kit')} ${s.kits}`, '+30 HP', !['map', 'skill'].includes(s.phase) || !s.kits || s.hp === s.maxHp)}</div>`;
  }
  content() {
    const s = this.game.s;
    if (s.phase === 'map') return this.map();
    if (s.phase === 'ended') return this.summary();
    if (s.phase === 'reward' || s.phase === 'replace') return this.rewards();
    if (s.phase === 'room') return this.room();
    if (s.phase === 'event') return `<div class="exp-task"><span class="exp-kicker">เหตุการณ์ / ${s.history.length}</span><h2>${s.event.title}</h2><p class="exp-lede">${s.event.text}</p><div class="exp-choices">${s.event.choices.map(([action, label]) => button(`event:${action}`, label, '', (action === 'trade' && s.hp <= 12) || (action === 'repair' && s.gold < 20) || (action === 'help' && s.kits < 1))).join('')}</div></div>`;
    return `<div class="exp-combat">${s.enemy ? this.enemy() : ''}<div class="exp-task">${this.task()}</div></div>`;
  }
  map() {
    const s = this.game.s;
    const available = this.game.available().map(n => n.id);
    const positions = routePositions(s.map, s.seed);
    const reachable = new Set(s.current ? [s.current] : s.map.filter(n => n.row === 0).map(n => n.id));
    for (const n of s.map) if (reachable.has(n.id)) n.next.forEach(id => reachable.add(id));
    const paths = s.map.flatMap(n => n.next.map(id => {
      const traveled = s.history.includes(n.id) && s.history.includes(id);
      const active = n.id === s.current && available.includes(id);
      return `<path class="${traveled ? 'is-traveled' : active ? 'is-next' : !reachable.has(n.id) ? 'is-unreachable' : ''}" d="${routeCurve(positions.get(n.id), positions.get(id))}"/>`;
    })).join('');
    const startPaths = s.map.filter(n => n.row === 0).map(n => `<path class="${s.history[0] === n.id ? 'is-traveled' : !s.current ? 'is-next' : 'is-unreachable'}" d="${routeCurve({ x: 30, y: 230 }, positions.get(n.id))}"/>`).join('');
    const descriptions = { fight: locale('เงิน + เลือกรางวัล', 'Gold + choose a reward'), elite: locale('เสี่ยงสูง · รางวัลสร้างบิลด์', 'High risk · build reward'), event: locale('พบเหตุการณ์และทางเลือก', 'Encounter and branching choice'), shop: locale(`เสบียง · มี ${s.gold} เหรียญ`, `Supplies · ${s.gold} gold`), treasure: locale('รับไอเทมหรืออัปเกรด', 'Gain a relic or upgrade'), rest: locale('ฟื้น HP หรืออัปเกรด', 'Recover HP or upgrade'), boss: locale('ชนะเพื่อจบเขตนี้', 'Defeat it to clear this sector') };
    return `<section class="exp-route"><div class="exp-route-heading"><div><span class="exp-kicker">SECTOR 01 / THE MEASURELANDS</span><h2>${locale('เลือกเส้นทางของคุณ', 'Choose your route')}</h2></div><div class="exp-route-progress"><strong>${s.history.length}<small> / 9</small></strong><span>${locale('ห้องที่เดินทางถึง', 'Rooms reached')}</span></div></div>
      <div class="exp-atlas"><div class="exp-atlas-heading"><span>${locale('จุดเริ่มต้น', 'Starting point')}</span><span>${locale('เดินทางจากซ้าย → ขวา', 'Travel left → right')}</span><span>${locale('ผู้พิทักษ์มาตรวัด', 'Measure guardian')}</span></div>
      <div class="exp-map-scroll" tabindex="0" role="region" aria-label="${locale('แผนที่เส้นทางแนวนอน เลื่อนซ้ายขวาเพื่อดูบอส', 'Horizontal route map; drag left and right to view the boss')}"><div class="exp-map">
        <svg class="exp-route-lines" viewBox="0 0 ${ROUTE_SIZE.width} ${ROUTE_SIZE.height}" preserveAspectRatio="none" aria-hidden="true">${startPaths}${paths}</svg>
        <span class="exp-route-origin" aria-hidden="true">→</span>
        ${s.map.map(n => {
          const p = positions.get(n.id), next = available.includes(n.id), current = s.current === n.id;
          return `<button class="exp-node ${next ? 'is-available' : ''} ${n.cleared ? 'is-cleared' : ''} ${current ? 'is-current' : ''} ${!reachable.has(n.id) && !n.cleared ? 'is-unreachable' : ''} ${n.type === 'boss' ? 'is-boss' : ''}" style="--node-x:${p.x / ROUTE_SIZE.width * 100}%;--node-y:${p.y / ROUTE_SIZE.height * 100}%" data-exp="node:${n.id}" ${next ? '' : 'disabled'} ${current ? 'aria-current="location"' : ''} aria-label="${locale('ชั้น', 'Floor')} ${n.row + 1} ${localeRoom(n.type)}${current ? locale(' คุณอยู่ที่นี่', ' You are here') : n.cleared ? locale(' ผ่านแล้ว', ' Cleared') : next ? locale(' เดินไปได้', ' Available') : ''}" title="${localeRoom(n.type)} · ${locale('ชั้น', 'Floor')} ${n.row + 1}">${roomIcon(n.type)}<span class="exp-node-label">${current ? locale('คุณอยู่ที่นี่', 'You are here') : localeRoom(n.type)}</span></button>`;
        }).join('')}</div></div>
      <div class="exp-map-legend">${Object.entries(ROOMS).map(([id, name]) => `<span>${roomIcon(id)}${locale(name, { fight: 'Fight', elite: 'Elite', event: 'Event', shop: 'Shop', treasure: 'Treasure', rest: 'Rest', boss: 'Boss' }[id] ?? name)}</span>`).join('')}</div></div>
      <div class="exp-next-heading"><div><span class="exp-kicker">${s.current ? 'NEXT STEP' : 'BEGIN YOUR JOURNEY'}</span><h3>${s.current ? locale('ห้องที่เดินไปต่อได้', 'Available next room') : locale('เลือกจุดเริ่มต้น', 'Choose the starting point')}</h3></div><span class="exp-pan-hint">${locale('เลื่อนแผนที่ซ้าย–ขวาได้', 'Scroll the map left and right')}</span></div>
      <div class="exp-route-choices">${this.game.available().map(n => `<button type="button" class="exp-route-choice" data-exp="node:${n.id}">${roomIcon(n.type)}<span><strong>${localeRoom(n.type)}</strong><small>${descriptions[n.type]}</small></span><span class="exp-choice-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
      <p class="exp-route-log" role="status">${escape(s.log)} · ${locale('วงเขียว = ทางเลือกถัดไป · หมุดทึบ = ผ่านแล้ว', 'green ring = next choice · filled node = cleared')}</p>
      <details class="exp-pack"><summary>${locale('สัมภาระของคุณ', 'Your gear')} <span>${s.skills.length}/4 ${locale('สกิล', 'skills')} · ${s.relics.length} ${locale('ไอเทม', 'relics')}</span></summary><div class="exp-pack-content"><div><h3>${locale('สกิลที่ติดตั้ง', 'Equipped skills')}</h3>${s.skills.map(id => `<p><strong>${localeSkill(id)} +${s.levels[id] || 0}</strong><small>${localeSkillDescription(id)}</small></p>`).join('')}</div><div><h3>${locale('ไอเทมติดตัว', 'Relics')}</h3>${s.relics.length ? s.relics.map(id => `<p><strong>${localeRelic(id)}</strong><small>${localeRelicDescription(id)}</small></p>`).join('') : `<p>${locale('ยังไม่มีไอเทมติดตัว', 'No relic equipped yet')}</p>`}</div></div></details></section>`;
  }
  enemy() {
    const s = this.game.s, e = s.enemy;
    return `<aside class="exp-enemy"><span class="exp-kicker">${e.boss ? `BOSS / ${e.hp <= e.maxHp / 2 ? 'PHASE 02' : 'PHASE 01'}` : e.elite ? 'ELITE SIGNAL' : 'TARGET ACQUIRED'}</span><h3>${e.name}</h3>
      <div class="exp-enemy-visual battle-stage">
        <div class="exp-sprite-placeholder" data-exp-placeholder aria-hidden="true" style="display:none">SIGNAL</div>
        <img data-exp-sprite src="${getSpritePath(e.sprite, 'idle', 1)}" alt="${e.name}">
        <div class="exp-crosshair" aria-hidden="true"></div>
        <div class="battle-vfx" aria-hidden="true"><span class="vfx-ring"></span><span class="vfx-slash"></span><span class="vfx-sparks"></span></div>
        <span class="dmg-number exp-damage-float" data-exp-float aria-hidden="true"></span>
        <div class="death-cutscene exp-death" data-exp-death hidden aria-hidden="true"><div class="death-cutscene__reticle"></div><div class="death-cutscene__copy">TARGET PURGED</div><div class="death-cutscene__sub">${locale('กำจัดศัตรูแล้ว', 'Enemy eliminated')}</div></div>
      </div><strong>HP ${e.hp} / ${e.maxHp}</strong><meter min="0" max="${e.maxHp}" value="${e.hp}" aria-label="${locale('พลังชีวิตศัตรู', 'Enemy HP')}"></meter><p class="exp-intent">${locale('ท่าถัดไป:', 'Next move:')} ${locale(e.attacks % 3 === 2 ? 'โจมตีหนัก' : 'โจมตี', e.attacks % 3 === 2 ? 'Heavy attack' : 'Attack')} ${this.game.intentDamage()}<small>${locale('เกราะ', 'Armor')} ${e.armor}${s.ward ? ` · ${locale('เกราะรับของเรา', 'Our guard')} ${s.ward}` : ''}</small></p></aside>`;
  }
  entryScene() {
    const e = this.game.s.enemy;
    return `<div class="mission-cutscene exp-entry active" data-exp-intro role="dialog" aria-modal="true" aria-labelledby="exp-entry-title">
      <div class="mission-cutscene__map" aria-hidden="true"><div class="mission-cutscene__crosshair"></div><div class="mission-cutscene__scanline"></div></div>
      <div class="mission-cutscene__copy"><span class="mission-cutscene__kicker">${e.boss ? 'BOSS SIGNAL' : e.elite ? 'ELITE SIGNAL' : 'ROOM LINK / ACQUIRING'}</span><strong id="exp-entry-title">${e.name}</strong><small>${locale('เข้าสู่ห้อง', 'Entering room')} ${this.game.s.history.length} · ${locale('กำลังจับสัญญาณเป้าหมาย', 'Locking onto target signal')}</small></div>
      <div class="mission-cutscene__target" aria-hidden="true"><div class="mission-cutscene__target-ring"></div><img src="${getSpritePath(e.sprite, 'idle', 1)}" alt=""><span>TARGET REVEALED</span></div>
      <button type="button" class="mission-cutscene__skip" data-exp="skip-entry">${locale('ข้ามฉาก', 'Skip scene')} <span>ESC</span></button>
    </div>`;
  }
  questionDiagram(diagram) {
    const firstValue = Number(diagram.first.value).toLocaleString('en-US', { maximumFractionDigits: 6 });
    const secondValue = Number(diagram.second.value).toLocaleString('en-US', { maximumFractionDigits: 6 });
    const first = `${firstValue} ${diagram.first.unit}`;
    const second = `${secondValue} ${diagram.second.unit}`;
    const targetUnit = escape(diagram.targetUnit);
    const label = locale(
      `แผนภาพ: A ${first} ${diagram.operator} B ${second} แล้วแปลงเป็น ${diagram.targetUnit}`,
      `Diagram: A ${first} ${diagram.operator} B ${second}, converted to ${diagram.targetUnit}`
    );
    return `<figure class="exp-question-diagram"><svg viewBox="0 0 720 150" role="img" aria-label="${escape(label)}">
      <rect class="exp-diagram-card" x="8" y="18" width="230" height="114" rx="12"></rect>
      <text class="exp-diagram-label" x="28" y="52">A</text>
      <text class="exp-diagram-value" x="28" y="98">${escape(first)}</text>
      <text class="exp-diagram-operator" x="250" y="94">${escape(diagram.operator)}</text>
      <rect class="exp-diagram-card" x="276" y="18" width="230" height="114" rx="12"></rect>
      <text class="exp-diagram-label" x="296" y="52">B</text>
      <text class="exp-diagram-value" x="296" y="98">${escape(second)}</text>
      <text class="exp-diagram-operator" x="512" y="94">→</text>
      <rect class="exp-diagram-result" x="542" y="18" width="170" height="114" rx="12"></rect>
      <text class="exp-diagram-label" x="562" y="52">${locale('คำตอบ', 'RESULT')}</text>
      <text class="exp-diagram-value" x="562" y="98">? ${targetUnit}</text>
    </svg></figure>`;
  }
  task() {
    const s = this.game.s;
    if (s.phase === 'skill') return `<span class="exp-kicker">${locale('YOUR TURN / เลือกสกิล', 'YOUR TURN / Choose a skill')}</span><h2>${locale('จะรับมืออย่างไร?', 'How will you handle it?')}</h2><p class="exp-note">${locale('สกิลพิเศษ 4 ช่อง · โจมตีพื้นฐานพร้อมใช้เสมอ · พลังโจมตีเพิ่ม', '4 skill slots · basic strike always available · attack power bonus')} ${s.bonus}</p><div class="exp-skills">${['basic', ...s.skills].map(id => button(`skill:${id}`, `${localeSkill(id)}${s.levels[id] ? ` +${s.levels[id]}` : ''}`, (s.cooldowns[id] || 0) > 0 ? `${locale('พร้อมใช้อีก', 'Ready again in')} ${s.cooldowns[id]} ${locale('ตา', 'turns')}` : localeSkillDescription(id), (s.cooldowns[id] || 0) > 0, id === 'basic')).join('')}</div>`;
    if (s.phase === 'question') return `<span class="exp-kicker">${s.turn === 'enemy' ? locale('DEFEND / ตอบเพื่อป้องกัน', 'DEFEND / Answer to guard') : s.turn === 'event' ? locale('LEARNING / โจทย์เสริม', 'LEARNING / Extra drill') : `ATTACK / ${localeSkill(s.selected)}`} · ${s.question.format?.toUpperCase() || 'CONVERT'}${s.question.source === 'ai' ? ' · AI' : ''}${!s.ranked && this.aiQuestionService?.isEnabled() && this.aiQuestionService.hasKey() && s.question.source !== 'ai' ? ' · LOCAL' : ''}</span>${s.question.diagram ? this.questionDiagram(s.question.diagram) : ''}<h2>${escape(s.question.text)}</h2><p class="exp-note">${s.turn === 'event' ? locale('เลือกคำตอบเพื่อรับรางวัลและดูวิธีคิด', 'Choose an answer to earn a reward and review the reasoning') : s.turn === 'enemy' ? locale('Perfect รับ 75% · Good รับ 100% · Bad รับ 115%', 'Perfect gives 75% · Good gives 100% · Bad gives 115%') : locale('Perfect ทำผล 120% · Good 100% · Bad 75%', 'Perfect hits 120% · Good 100% · Bad 75%')} · ${locale('ไม่มีเวลาบังคับตอบ', 'No hard timer on the answer')}</p><div class="exp-answers">${s.question.options.map((n, i) => button(`answer:${i}`, `<span class="exp-key">${i + 1}</span> ${escape(n)}`)).join('')}</div>`;
    if (s.phase === 'qte') {
      const defense = s.turn === 'enemy';
      return `<div class="exp-timing ${defense ? 'is-defense' : ''}"><span class="exp-kicker">${defense ? locale('COUNTERMEASURE / DEFEND', 'COUNTERMEASURE / DEFEND') : `SKILL EXECUTION / ${localeSkill(s.selected)}`}</span><h2>${locale('ถูกต้อง! จับจังหวะ', 'Correct! Catch the rhythm')}</h2><div class="exp-timing-title">${defense ? 'PERFECT GUARD' : 'PRECISION STRIKE'}</div><p class="exp-note">${locale('กดให้ตรงแถบสีทอง', 'Press the cursor onto the golden band')}</p>
        <div class="exp-qte" aria-hidden="true" style="--good-start:${(QTE.center - QTE.good) * 100}%;--good-width:${QTE.good * 200}%;--perfect-start:${(QTE.center - QTE.perfect) * 100}%;--perfect-width:${QTE.perfect * 200}%"><div class="exp-qte-ticks"></div><span class="exp-qte-good"></span><span class="exp-qte-perfect"></span><i class="exp-qte-cursor"></i></div>
        <div class="exp-qte-labels"><span>BAD</span><span>GOOD</span><strong>PERFECT</strong><span>GOOD</span><span>BAD</span></div>
        <button type="button" class="exp-hit-button" data-exp="hit"><span>${defense ? locale('ปัดป้อง', 'Defend') : locale('โจมตี', 'Attack')}</span><kbd>SPACE</kbd><small>Enter / Tap</small></button>
        <div class="exp-timing-rewards"><span>PERFECT <strong>${defense ? locale('รับ 75%', 'takes 75%') : '120%'}</strong></span><span>GOOD <strong>100%</strong></span><span>BAD <strong>${defense ? locale('รับ 115%', 'takes 115%') : '75%'}</strong></span></div></div>`;
    }
    if (s.phase === 'feedback') {
      const wait = Date.now() < s.continueAt;
      const auto = s.answerCorrect && s.turn !== 'event';
      return `<span class="exp-kicker">${s.turn === 'event' ? 'LEARNING RESULT' : s.turn === 'enemy' ? 'DEFENSE RESULT' : 'SKILL RESULT'}</span><div class="exp-result-stamp exp-grade--${s.lastGrade || 'GOOD'}" aria-hidden="true">${s.lastGrade || (s.answerCorrect ? 'GOOD' : 'BAD')}</div><h2 class="exp-grade exp-grade--${s.lastGrade || 'GOOD'}">${s.feedback}</h2><p>${s.answerCorrect ? locale('คำตอบถูกต้อง', 'Correct answer') : locale('คำตอบยังไม่ถูก ลองดูวิธีคิดด้วยกัน', 'Incorrect answer — review the logic')}</p>${auto ? `<p class="exp-auto-note">${locale('กำลังไปตาถัดไป…', 'Advancing to the next turn…')}</p>` : ''}<div class="exp-explanation">${escape(s.question.explanation)}</div>${button('next', wait ? locale('อ่านวิธีคิด · 3 วินาที', 'Review logic · 3 seconds') : locale('ไปต่อ →', 'Next →'), '', wait, true)}`;
    }
    return '';
  }
  rewards() {
    const s = this.game.s;
    if (s.phase === 'replace') return `<div class="exp-task"><h2>${locale('เลือกสกิลที่จะทดแทน', 'Choose the skill to replace')}</h2><p>${locale('รับ', 'Get')} ${localeSkill(s.rewards[s.pendingReward].id)} ${locale('เข้าช่องเดิม ระดับอัปเกรดของสกิลเดิมไม่ย้ายตาม', 'into the same slot; the old skill rank does not carry over')}</p><div class="exp-choices">${s.skills.map(id => button(`replace:${id}`, localeSkill(id))).join('')}${button('cancel-replace', locale('กลับไปเลือกรางวัล', 'Return to reward selection'))}</div></div>`;
    return `<div class="exp-task"><span class="exp-kicker">BUILD / ${locale('เลือกหนึ่งรางวัล', 'Choose a reward')}</span><h2>${locale('เติบโตในแบบของคุณ', 'Grow in your own way')}</h2><div class="exp-choices">${s.rewards.map((r, i) => {
      const title = r.kind === 'skill' ? `${locale('สกิลใหม่', 'New skill')} · ${localeSkill(r.id)}` : r.kind === 'upgrade' ? `${locale('อัปเกรด', 'Upgrade')} · ${localeSkill(r.id)}` : r.kind === 'relic' ? localeRelic(r.id) : r.kind === 'heal' ? `${locale('ฟื้น HP', 'Restore HP')} ${r.amount}` : `${locale('รับเงิน', 'Earn gold')} ${r.amount}`;
      const detail = r.kind === 'skill' ? localeSkillDescription(r.id) : r.kind === 'relic' ? localeRelicDescription(r.id) : r.kind === 'upgrade' ? (r.id === 'focus' ? locale('เพิ่มเกราะจากสกิล 2', 'Gain 2 guard from the skill') : locale('เพิ่มพลังพื้นฐานของสกิล 4', 'Add 4 base skill power')) : '';
      return button(`reward:${i}`, title, detail);
    }).join('')}</div>${button('reward:-1', locale('ข้ามรางวัล →', 'Skip reward →'))}</div>`;
  }
  room() {
    const s = this.game.s;
    const rest = this.game.node().type === 'rest';
    const bought = action => s.purchases?.includes(`${s.current}:${action}`);
    return `<div class="exp-task"><span class="exp-kicker">${locale('RECOVERY / เตรียมตัวก่อนเดินต่อ', 'RECOVERY / Prepare before moving on')}</span><h2>${rest ? locale('พักฟื้น หรือพัฒนาสกิล?', 'Rest and recover or improve a skill?') : locale('ร้านเสบียงสนาม', 'Field supply shop')}</h2><p class="exp-lede">${rest ? locale('เลือกได้หนึ่งอย่าง แล้วเดินทางต่อ', 'Choose one option, then continue') : locale('แต่ละรายการซื้อได้ครั้งเดียวในร้านนี้', 'Each item can be bought once in this shop')}</p><div class="exp-choices">${rest ? button('room:rest', locale('ฟื้น HP 36', 'Restore HP 36')) + s.skills.map(id => button(`room:${id}`, `${locale('อัปเกรด', 'Upgrade')} ${localeSkill(id)}`, id === 'focus' ? locale('เพิ่มเกราะ 2', 'Gain 2 shield') : locale('เพิ่มพลังสกิล 4', 'Increase skill power by 4'))).join('') : [button('room:heal', locale('ฟื้น HP 35', 'Restore HP 35'), locale('20 เหรียญ', '20 gold'), s.gold < 20 || s.hp === s.maxHp || bought('heal')), button('room:kit', locale('ชุดซ่อม +1', 'Repair kit +1'), locale('25 เหรียญ', '25 gold'), s.gold < 25 || bought('kit')), button('room:relic', locale('ไอเทมติดตัว', 'Equipped relic'), `${locale('45 เหรียญ', '45 gold')} · ${localeRelic(Object.keys(RELICS).find(id => !s.relics.includes(id)) || 'clock') || locale('ครบแล้ว', 'Full')}`, s.gold < 45 || s.relics.length === Object.keys(RELICS).length || bought('relic'))].join('')}</div>${button('room:leave', locale('เดินทางต่อ →', 'Continue →'))}</div>`;
  }
  summary() {
    const s = this.game.s;
    const accuracy = s.total ? Math.round(s.correct / s.total * 100) : 0;
    return `<div class="exp-task"><span class="exp-kicker">EXPEDITION COMPLETE</span><h2>${s.result.won ? locale('ผ่านเขตมาตรวัดแล้ว', 'Cleared the measurement sector') : locale('การเดินทางครั้งนี้จบลง', 'This route has ended')}</h2><p class="exp-lede">${s.result.won ? `${locale('จบใน', 'Finished in')} ${time(s.result.elapsed)}` : `${locale('ไปถึงห้องที่', 'Reached room')} ${s.history.length} · ${locale('ใช้เวลา', 'Time used')} ${time(s.result.elapsed)}`} · ${locale('ตอบถูก', 'Correct')} ${s.correct}/${s.total} (${accuracy}%)</p><p>${locale('บิลด์เริ่มใหม่ในรอบหน้า ประวัติการเรียนยังเก็บไว้', 'Builds reset next run, but learning history is kept')}</p>${s.mistakes.length ? `<div class="exp-explanation"><h3>${locale('หัวข้อที่ควรทบทวน', 'Topics to revisit')}</h3><p>${[...new Set(s.mistakes.map(pair => pair.join(' → ')))].map(escape).join(' · ')}</p></div>` : `<p class="exp-note">${locale('ไม่มีคำตอบผิดในรอบนี้', 'No incorrect answers in this run')}</p>`}<label for="exp-callsign">${locale('ชื่อเล่นในบันทึกเครื่องนี้', 'Nickname in this device record')}</label><div class="exp-name"><input id="exp-callsign" maxlength="16" placeholder="HUNTER" value="${escape(s.nameSaved || '')}">${button('name', locale('บันทึกชื่อ', 'Save name'))}</div>${s.nameSaved ? `<p role="status">${locale('บันทึกชื่อแล้ว', 'Name saved')}</p>` : ''}${this.leaderboard(s.topic, s.ranked, s.dateKey)}<div class="exp-actions">${button('new', locale('เตรียมรอบใหม่ →', 'Prepare new round →'), '', false, true)}${button('menu', locale('กลับเมนู', 'Back to menu'))}</div></div>`;
  }
  leaderboard(topic, ranked, date) {
    const rows = this.store.leaders(topic, ranked, date);
    return `<section class="exp-records"><h3>${locale('อันดับ', 'Rank')} ${ranked ? locale('รายวัน', 'daily') : locale('รอบทั่วไป', 'casual')} · ${localeTopic(topic)} · ${locale('เฉพาะเครื่องนี้', 'this device only')}</h3><p class="exp-note">${locale('เฉพาะรอบที่ชนะ เรียงเวลาน้อยที่สุด', 'Only completed runs, sorted by shortest time')}${ranked ? ` · ${date}` : ''} · ${locale('ยังไม่มีการตรวจผลจากเซิร์ฟเวอร์', 'No server validation yet')}</p>${rows.length ? `<div class="exp-table-scroll"><table><thead><tr><th>${locale('อันดับ', 'Rank')}</th><th>${locale('ชื่อ', 'Name')}</th><th>${locale('เวลาจบ', 'Finish time')}</th><th>${locale('ตอบถูก', 'Correct')}</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escape(r.name)}</td><td>${time(r.elapsed)}</td><td>${r.accuracy}%</td></tr>`).join('')}</tbody></table></div>` : `<p>${locale('ยังไม่มีรอบที่จบในหมวดนี้', 'No completed runs in this category yet')}</p>`}</section>`;
  }
}
