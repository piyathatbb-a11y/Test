  // ============================================
// UNIT HUNTER â€” AudioSystem (Web Audio API)
// ============================================

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.menuBgm = null;
    this.bgmTracks = { battle: [], boss: [], gameover: [] };
    this.activeBgm = null;
    this.activeBgmType = null;
    this.nextTrackIndex = { battle: 0, boss: 0, gameover: 0 };
    this.bgmToken = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -6;
        this.limiter.knee.value = 0;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.25;
        this.bgmBus = this.ctx.createGain();
        this.bgmBus.gain.value = 0.9;
        this.outBus = this.ctx.createGain();
        this.outBus.gain.value = 1.0;
        this.master.connect(this.limiter);
        this.limiter.connect(this.outBus);
        this.bgmBus.connect(this.outBus);
        this.outBus.connect(this.ctx.destination);
      }
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  }

  get _out() { return this.master || this.ctx.destination; }
  get _bgmOut() { return this.bgmBus || this.ctx.destination; }

  _routeBgm(audio) {
    if (!audio || !this.ctx) return;
    this.resume();
    if (this.ctx.state === 'suspended') return;
    this._bgmSources = this._bgmSources || new WeakMap();
    if (this._bgmSources.has(audio)) return;
    try {
      const source = this.ctx.createMediaElementSource(audio);
      source.connect(this._bgmOut);
      this._bgmSources.set(audio, source);
    } catch (e) {
      console.warn('[audio] routeBgm skipped:', e.name);
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  playMenuBgm() {
    this.stopCombatBgm();
    if (!this.menuBgm) {
      this.menuBgm = new Audio('assets/audio/Neon Static.mp3');
      this.menuBgm.loop = true;
      this.menuBgm.volume = 0.28;
      this.menuBgm.preload = 'auto';
    }
    this._routeBgm(this.menuBgm);
    this.resume();
    this.menuBgm.play().catch(() => {});
  }

  stopMenuBgm() {
    if (!this.menuBgm) return;
    this.menuBgm.pause();
    this.menuBgm.currentTime = 0;
  }

  playCombatBgm(type = 'battle') {
    const tracks = {
      battle: ['assets/audio/battle2.mp3'],
      boss: ['assets/audio/boss battle1.mp3', 'assets/audio/boss battle2.mp3'],
      gameover: ['assets/audio/Gameover1.mp3', 'assets/audio/Gameover2.mp3']
    };
    if (!tracks[type]) type = 'battle';
    this.stopCombatBgm();
    const list = tracks[type];
    const index = this.nextTrackIndex[type] % list.length;
    this.nextTrackIndex[type] = (index + 1) % list.length;
    const audio = new Audio(list[index]);
    audio.volume = type === 'gameover' ? 0.32 : 0.28;
    audio.preload = 'auto';
    const token = ++this.bgmToken;
    audio.addEventListener('ended', () => {
      if (token !== this.bgmToken || this.activeBgm !== audio) return;
      this.playCombatBgm(type);
    }, { once: true });
    this.activeBgm = audio;
    this.activeBgmType = type;
    this.stopMenuBgm();
    this._routeBgm(audio);
    this.resume();
    audio.play().catch(() => {});
  }

  stopCombatBgm() {
    this.bgmToken += 1;
    if (!this.activeBgm) return;
    const previous = this.activeBgm;
    previous.pause();
    previous.currentTime = 0;
    const source = this._bgmSources?.get?.(previous);
    source?.disconnect();
    this.activeBgm = null;
    this.activeBgmType = null;
  }

  playBattleBgm() { this.playCombatBgm('battle'); }
  playBossBgm() { this.playCombatBgm('boss'); }
  playGameOverBgm() { this.playCombatBgm('gameover'); }

  playTone(freq, duration, type = 'sine', volume = 0.15) {
    if (!this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this._out);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _canPlay(key, ms = 60) {
    this._last = this._last || {};
    const t = performance.now();
    if (this._last[key] !== undefined && t - this._last[key] < ms) return false;
    this._last[key] = t; return true;
  }

  _noiseBuffer(duration = 0.2) {
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  swordSlash() {
    if (!this.ctx) return;
    this.resume();
    if (!this._canPlay('swordSlash', 60)) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this._noiseBuffer(0.2);
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.2, now);
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    source.connect(filter); filter.connect(gain); gain.connect(this._out);
    source.start(now); source.stop(now + 0.2);
    this.playTone(2400, 0.06, 'triangle', 0.05);
  }

  playerHurt() {
    if (!this.ctx) return;
    this.resume();
    if (!this._canPlay('playerHurt', 60)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(filter); filter.connect(gain); gain.connect(this._out);
    osc.start(now); osc.stop(now + 0.28);
    const noise = this.ctx.createBufferSource(), nf = this.ctx.createBiquadFilter(), ng = this.ctx.createGain();
    noise.buffer = this._noiseBuffer(0.05); nf.type = 'lowpass'; nf.frequency.setValueAtTime(400, now);
    ng.gain.setValueAtTime(0.12, now); ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    noise.connect(nf); nf.connect(ng); ng.connect(this._out); noise.start(now); noise.stop(now + 0.05);
  }

  monsterVoice(isBoss = false) {
    if (!this.ctx) return;
    this.resume();
    if (!this._canPlay('monsterVoice', 300)) return;
    const now = this.ctx.currentTime, base = isBoss ? 70 : 150, duration = isBoss ? 0.70 : 0.35, volume = isBoss ? 0.22 : 0.16;
    const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    const osc2 = this.ctx.createOscillator(), gainLFO = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * 1.25, now);
    osc.frequency.linearRampToValueAtTime(base * 0.7, now + duration);
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(1000, now);
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(isBoss ? 9 : 18, now); gainLFO.gain.setValueAtTime(25, now);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.linearRampToValueAtTime(volume, now + 0.05);
    gain.gain.setValueAtTime(volume, now + Math.max(0.05, duration - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc2.connect(gainLFO); gainLFO.connect(osc.frequency); osc.connect(filter); filter.connect(gain); gain.connect(this._out);
    osc2.start(now); osc.start(now); osc2.stop(now + duration); osc.stop(now + duration);
  }

  correct() {
    this.playTone(880, 0.15, 'sine', 0.1);
    setTimeout(() => this.playTone(1100, 0.2, 'sine', 0.1), 80);
  }

  wrong() {
    this.playTone(200, 0.4, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.08), 100);
  }

  crit() {
    this.playTone(660, 0.1, 'square', 0.08);
    setTimeout(() => this.playTone(990, 0.1, 'square', 0.08), 50);
    setTimeout(() => this.playTone(1320, 0.3, 'square', 0.1), 100);
  }

  kill() {
    this.playTone(440, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(554, 0.1, 'sine', 0.1), 100);
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.1), 200);
    setTimeout(() => this.playTone(880, 0.4, 'sine', 0.12), 300);
  }

  levelup() {
    this.playTone(523, 0.15, 'sine', 0.1);
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.1), 150);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.1), 300);
    setTimeout(() => this.playTone(1047, 0.4, 'sine', 0.12), 450);
  }

  gameover() {
    this.playTone(440, 0.3, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(330, 0.3, 'sawtooth', 0.08), 250);
    setTimeout(() => this.playTone(220, 0.6, 'sawtooth', 0.1), 500);
  }

  bossAttack() {
    this.playTone(100, 0.5, 'sawtooth', 0.1);
    setTimeout(() => this.playTone(80, 0.5, 'sawtooth', 0.12), 200);
  }

  tick() {
    this.playTone(2000, 0.05, 'sine', 0.03);
  }
}
