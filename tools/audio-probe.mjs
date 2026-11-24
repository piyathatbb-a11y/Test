import puppeteer from 'puppeteer';

const url = 'http://127.0.0.1:5173/';
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox']
});
const page = await browser.newPage();
const consoleLog = [];
const consoleErrors = [];
page.on('console', msg => consoleLog.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => consoleErrors.push(String(err)));

await page.evaluateOnNewDocument(() => {
  window.__audioProbe = { gains: [], audios: [] };
  window.__mesCalls = [];
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const origGain = AC.prototype.createGain;
    AC.prototype.createGain = function (...args) {
      const g = origGain.apply(this, args);
      window.__audioProbe.gains.push(g);
      return g;
    };
    const orig = AC.prototype.createMediaElementSource;
    AC.prototype.createMediaElementSource = function (el) {
      window.__mesCalls.push({ src: el.currentSrc || el.src, t: Date.now() });
      return orig.call(this, el);
    };
  }
  const oldPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    if (!window.__audioProbe.audios.includes(this)) window.__audioProbe.audios.push(this);
    return oldPlay.apply(this, args);
  };
});

await page.goto(url, { waitUntil: 'networkidle0' });
await page.mouse.click(20, 20);
await new Promise(r => setTimeout(r, 700));
await page.evaluate(() => { window.__menuAudio = window.__audioProbe.audios[0] || null; });

async function sample(label) {
  return page.evaluate(async label => {
    const p = window.__audioProbe;
    const gains = p.gains;
    const ctx = gains[0]?.context || null;
    const outBus = gains[2] || null;
    let analyser = null;
    if (ctx && outBus) {
      try { analyser = ctx.createAnalyser(); analyser.fftSize = 2048; outBus.connect(analyser); } catch {}
    }
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const audio = [...p.audios].reverse().find(a => !a.paused) || p.audios.at(-1) || null;
      let rms = null;
      if (analyser) {
        const buf = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buf);
        let s = 0; for (const v of buf) s += v * v;
        rms = Number(Math.sqrt(s / buf.length).toFixed(6));
      }
      const screen = ['screen-start','screen-battle','screen-gameover'].find(id => document.getElementById(id)?.classList.contains('active')) ?? null;
      rows.push({
        t_ms: i * 500,
        ctx_state: ctx?.state ?? null,
        menuBgm_paused: window.__menuAudio?.paused ?? null,
        menuBgm_currentTime: window.__menuAudio?.currentTime ?? null,
        menuBgm_volume: window.__menuAudio?.volume ?? null,
        active_audio_paused: audio?.paused ?? null,
        active_audio_currentTime: audio?.currentTime ?? null,
        active_audio_volume: audio?.volume ?? null,
        active_audio_src: audio?.src ?? null,
        screen: screen === null ? 'MISMATCH' : (screen === ({menu1:'screen-start',battle1:'screen-battle',gameover1:'screen-gameover',menu2:'screen-start',battle2:'screen-battle',gameover2:'screen-gameover'}[label] ?? screen) ? screen : 'MISMATCH'),
        rms
      });
      await new Promise(r => setTimeout(r, 500));
    }
    const vals = rows.map(r => r.rms).filter(v => typeof v === 'number');
    return { label, rows, rms_summary: vals.length ? { min: Number(Math.min(...vals).toFixed(6)), max: Number(Math.max(...vals).toFixed(6)), mean: Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(6)) } : null };
  }, label);
}

async function waitForScreen(id, timeout = 10000) {
  return page.waitForFunction(id => document.getElementById(id)?.classList.contains('active'), { timeout }, id).then(() => true).catch(() => false);
}

async function patchTakeDamageNoop() {
  return page.evaluate(async () => {
    const { Player } = await import('./js/entities/Player.js');
    window.__damagePatch = { original: Player.prototype.takeDamage, patchAt: Date.now(), instance: null };
    const patch = window.__damagePatch;
    Player.prototype.takeDamage = function (...args) {
      patch.instance = this;
      return 0;
    };
    return { patchAt: patch.patchAt };
  });
}

async function restoreAndForceGameOver() {
  return page.evaluate(async () => {
    const { Player } = await import('./js/entities/Player.js');
    const p = window.__damagePatch;
    const restoreAt = Date.now();
    if (p) Player.prototype.takeDamage = p.original;
    const instance = p?.instance;
    if (instance) {
      instance.currentHp = 0;
      p.forcedAt = Date.now();
      p.forcedVia = 'restored original takeDamage after setting currentHp=0';
      p.original.call(instance, Number.MAX_SAFE_INTEGER);
    }
    return { restoreAt, forcedAt: p?.forcedAt ?? null, instanceCaptured: !!instance, forcedVia: p?.forcedVia ?? null };
  });
}

async function startBattle() {
  await page.click('#btn-start');
  await waitForScreen('screen-battle', 12000);
  return page.evaluate(() => document.querySelector('#screen-battle')?.classList.contains('active'));
}

async function backToMenu() {
  await waitForScreen('screen-gameover', 10000);
  await page.evaluate(() => document.querySelector('#btn-back-menu')?.click());
  await waitForScreen('screen-start', 10000);
  return page.evaluate(() => document.querySelector('#screen-start')?.classList.contains('active'));
}

const menu1 = await sample('menu1');
const timeline = [];

const battle1Started = await startBattle();
const patch1 = battle1Started ? await patchTakeDamageNoop() : null;
timeline.push({ stage: 'battle1_patch', t: patch1?.patchAt ?? null });
const battle1 = await sample('battle1');
const restore1 = await restoreAndForceGameOver();
timeline.push({ stage: 'battle1_restore', t: restore1.restoreAt, forcedAt: restore1.forcedAt });
const gameover1Active = await waitForScreen('screen-gameover', 10000);
const gameover1 = await sample('gameover1');
const menu2Active = await backToMenu();
const menu2 = await sample('menu2');

const battle2Started = await startBattle();
const patch2 = battle2Started ? await patchTakeDamageNoop() : null;
timeline.push({ stage: 'battle2_patch', t: patch2?.patchAt ?? null });
const battle2 = await sample('battle2');
const restore2 = await restoreAndForceGameOver();
timeline.push({ stage: 'battle2_restore', t: restore2.restoreAt, forcedAt: restore2.forcedAt });
const gameover2Active = await waitForScreen('screen-gameover', 10000);
const gameover2 = await sample('gameover2');

console.log(JSON.stringify({
  url,
  method: 'page.click()/page.mouse.click() for UI flow; runtime Player.prototype.takeDamage patch/restore only to control test timeline without editing js/',
  timeline,
  battle1Started,
  gameover1Active,
  menu2Active,
  battle2Started,
  gameover2Active,
  menu1,
  battle1,
  gameover1,
  menu2,
  battle2,
  gameover2,
  mesCalls: await page.evaluate(() => window.__mesCalls),
  consoleLog,
  consoleErrors
}, null, 2));
await browser.close();
