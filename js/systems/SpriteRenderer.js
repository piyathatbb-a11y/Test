// ============================================
// UNIT HUNTER — SpriteRenderer (DOM-based)
// ============================================

import { SPRITE_CONFIGS, getSpritePath } from '../data/spriteConfigs.js';

const DEFAULT_SPRITE_ID = 'byte_drone';

export class SpriteRenderer {
  constructor(eventBus, elements = {}) {
    this.eventBus = eventBus;
    this.mount = elements.mount ?? document.getElementById('sprite-mount');
    this.img = elements.image ?? document.getElementById('sprite-img');
    this.placeholder = elements.placeholder ?? document.getElementById('sprite-placeholder');
    this.reducedMotion = elements.reducedMotion ?? false;
    this.speed = elements.speed ?? 1;
    
    this.currentId = null;
    this.displayId = null;
    this.currentState = null;
    this.frameIndex = 0;
    this.animationId = null;
    this.lastFrameTime = 0;
    this.hasSprites = false;
    this.requestToken = 0;
  }

  async setEnemy(id) {
    const requestToken = ++this.requestToken;
    this.stop();
    this.onComplete = null;
    this.currentId = id;
    this.displayId = null;
    this.hasSprites = false;
    this.img.style.display = 'none';
    this.placeholder.style.display = 'flex';
    const resolvedId = await this.resolveSpriteId(id);
    if (requestToken !== this.requestToken || this.currentId !== id) return;
    this.displayId = resolvedId;
    this.hasSprites = Boolean(this.displayId);

    this.img.onerror = () => {
      if (requestToken !== this.requestToken) return;
      console.warn(`SpriteRenderer: image load failed for ${this.displayId || id}`);
      this.hasSprites = false;
      this.img.style.display = 'none';
      this.placeholder.style.display = 'flex';
    };
    
    if (this.hasSprites) {
      this.img.src = getSpritePath(this.displayId, 'idle', 1);
      this.img.style.display = 'block';
      this.placeholder.style.display = 'none';
    } else {
      this.img.style.display = 'none';
      this.placeholder.style.display = 'flex';
      // Deterministic color from enemy id
      const hue = this.hashStringToHue(id);
      this.placeholder.style.background = `hsl(${hue}, 60%, 20%)`;
      this.placeholder.style.borderColor = `hsl(${hue}, 80%, 45%)`;
      this.placeholder.style.color = `hsl(${hue}, 80%, 45%)`;
    }
    
    this.playState('idle');
  }

  async resolveSpriteId(id) {
    const validSprite = async (spriteId) => {
      if (!SPRITE_CONFIGS[spriteId]) return false;
      return await this.checkSpritesExist(spriteId);
    };

    if (await validSprite(id)) {
      return id;
    }

    if (await validSprite(DEFAULT_SPRITE_ID)) {
      return DEFAULT_SPRITE_ID;
    }

    return null;
  }

  async checkSpritesExist(id) {
    const config = SPRITE_CONFIGS[id];
    if (!config) return false;
    const firstFrame = getSpritePath(id, 'idle', 1);
    try {
      return await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => {
          console.warn(`SpriteRenderer: failed to load sprite frame ${firstFrame}`);
          resolve(false);
        };
        img.src = firstFrame;
      });
    } catch (err) {
      console.warn('SpriteRenderer: checkSpritesExist error', err);
      return false;
    }
  }

  hashStringToHue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 360;
  }

  playState(state, onComplete) {
    if (!this.currentId) return;
    const spriteId = this.displayId || this.currentId;
    const config = SPRITE_CONFIGS[spriteId];
    if (!config?.states?.[state]) return;
    
    this.currentState = state;
    this.frameIndex = 0;
    this.onComplete = onComplete;
    
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.reducedMotion) {
      this.animationId = null;
      this.frameIndex = config.states[state].loop ? 0 : config.states[state].frames - 1;
      this.updateFrame();
      this.onComplete = null;
      onComplete?.();
      return;
    }
    this.lastFrameTime = performance.now();
    this.animate();
  }

  animate() {
    const config = SPRITE_CONFIGS[this.displayId || this.currentId];
    const stateConfig = config?.states?.[this.currentState];
    if (!stateConfig) {
      this.stop();
      return;
    }
    
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= stateConfig.duration / this.speed) {
      this.frameIndex++;
      this.lastFrameTime = now;
      
      if (this.frameIndex >= stateConfig.frames) {
        if (stateConfig.loop) {
          this.frameIndex = 0;
        } else {
          // Set the final frame before invoking callbacks. A callback may
          // immediately start another state; writing the old frame after that
          // callback would request an invalid path such as hit_04.png.
          this.frameIndex = stateConfig.frames - 1;
          this.updateFrame();
          this.animationId = null;
          if (this.onComplete) {
            const cb = this.onComplete;
            this.onComplete = null;
            cb();
          }
          return;
        }
      }
    }
    
    this.updateFrame();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  updateFrame() {
    if (!this.hasSprites) return;
    const path = getSpritePath(this.displayId || this.currentId, this.currentState, this.frameIndex + 1);
    this.img.src = path;
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  clear() {
    this.requestToken++;
    this.stop();
    this.onComplete = null;
    this.currentId = null;
    this.displayId = null;
    this.hasSprites = false;
    this.img.style.display = 'none';
    this.placeholder.style.display = 'none';
  }
}
