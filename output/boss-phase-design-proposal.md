# Boss Phase Design Proposal

สถานะ: Draft — ยังไม่แก้ไฟล์ใน `js/`

## เป้าหมาย

- แยกข้อมูลของ Phase ออกจาก `Boss.js`
- ให้การเปลี่ยน Phase เป็น state transition ที่ทดสอบได้
- ส่งสัญญาณผ่าน `EventBus` ให้ UI แสดง Phase Change / Danger
- มี telegraph pause ทุกครั้งที่เปลี่ยน Phase
- รองรับ Enemy Variety ในอนาคต โดยใช้ config เดียวกันกับบอสหลายชนิด

## โครงสร้างไฟล์ที่เสนอ

```text
js/
├─ data/
│  ├─ bosses.js                 # identity, base stats, phaseConfigId
│  └─ bossPhases.js             # config ของ Phase ทั้งหมด
├─ entities/
│  ├─ Boss.js                   # HP, damage intake, facade ของบอส
│  └─ BossState.js              # state machine และ transition rules
└─ systems/
   └─ BossAttackResolver.js     # เลือก/ประมวลผล standard หรือ special attack
```

ถ้าต้องการเปลี่ยนให้น้อยที่สุด สามารถรวม `BossState` และ `BossPhase` ไว้ในไฟล์ใหม่ชื่อ `js/entities/BossPhase.js` ได้ แต่ระยะยาวแยกเป็น `BossState.js` จะอ่านง่ายกว่า

## Interface ของ BossPhase

```js
export class BossPhase {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.hpThresholdPct = config.hpThresholdPct;
    this.damageMultiplier = config.damageMultiplier;
    this.questionTimeSeconds = config.questionTimeSeconds;
    this.attackIntervalSeconds = config.attackIntervalSeconds;
    this.restrictedCategories = [...(config.restrictedCategories || [])];
    this.attackPattern = config.attackPattern;
    this.telegraphDurationMs = config.telegraphDurationMs ?? 900;
    this.specialAttack = config.specialAttack ?? null;
  }
}
```

> `questionTimeSeconds` คือความหมายเดิมของ `Boss.timer` ส่วน `attackIntervalSeconds` เป็นช่องสำหรับระบบโจมตีตามเวลาในอนาคต ไม่ควรใช้ field เดียวกัน

## Interface ของ BossState

```js
export class BossState {
  constructor({ phases, eventBus, bossId }) {
    this.phases = phases.map(phase => new BossPhase(phase));
    this.eventBus = eventBus;
    this.bossId = bossId;
    this.currentPhaseIndex = 0;
    this.pendingPhaseIndex = null;
    this.transition = null;
  }

  get currentPhase() {
    return this.phases[this.currentPhaseIndex];
  }

  get isTelegraphing() {
    return this.transition?.status === 'telegraphing';
  }

  evaluateHp(hpPercent) {
    const nextIndex = this.findPhaseIndex(hpPercent);
    if (nextIndex <= this.currentPhaseIndex || this.isTelegraphing) return false;
    return this.beginTransition(nextIndex);
  }

  beginTransition(nextIndex) {
    const from = this.currentPhase;
    const to = this.phases[nextIndex];
    this.pendingPhaseIndex = nextIndex;
    this.transition = {
      status: 'telegraphing',
      fromPhaseId: from.id,
      toPhaseId: to.id,
      startedAt: performance.now(),
      durationMs: to.telegraphDurationMs
    };
    this.eventBus.emit('boss:phase_change', {
      bossId: this.bossId,
      from: from.id,
      to: to.id,
      phaseName: to.name,
      telegraphDurationMs: to.telegraphDurationMs
    });
    this.eventBus.emit('boss:danger', {
      bossId: this.bossId,
      phase: to.id,
      message: 'DANGER!'
    });
    return true;
  }

  update(now = performance.now()) {
    if (!this.isTelegraphing) return false;
    if (now - this.transition.startedAt < this.transition.durationMs) return false;
    this.currentPhaseIndex = this.pendingPhaseIndex;
    this.pendingPhaseIndex = null;
    this.transition = null;
    this.eventBus.emit('boss:phase_ready', {
      bossId: this.bossId,
      phase: this.currentPhase.id
    });
    return true;
  }

  canAttack() {
    return !this.isTelegraphing;
  }

  findPhaseIndex(hpPercent) {
    for (let i = this.phases.length - 1; i >= 0; i -= 1) {
      if (hpPercent <= this.phases[i].hpThresholdPct) return i;
    }
    return 0;
  }
}
```

## ตาราง Config ที่เสนอ

| Phase | HP threshold | Damage multiplier | Question time | Attack interval | Pattern | Telegraph | Special |
|---|---:|---:|---:|---:|---|---:|---|
| 1 | 100% | 1.00x | เดิม (`timer`) | 12s | `standard` | - | ไม่มี |
| 2 | 65% | 1.20x | เดิม - 2s | 10s | `standard_fast` | 900ms | ไม่มี |
| 3 | 30% | 1.50x | เดิม - 4s | 8s | `special_qte` | 1,200ms | `boss_qte` |

```js
export const BOSS_PHASE_CONFIGS = {
  standardThreePhase: [
    {
      id: 'phase_1',
      name: 'Phase 1',
      hpThresholdPct: 100,
      damageMultiplier: 1,
      questionTimeSeconds: 'base',
      attackIntervalSeconds: 12,
      attackPattern: 'standard',
      telegraphDurationMs: 0
    },
    {
      id: 'phase_2',
      name: 'Phase 2',
      hpThresholdPct: 65,
      damageMultiplier: 1.2,
      questionTimeSeconds: 'base-2',
      attackIntervalSeconds: 10,
      attackPattern: 'standard_fast',
      telegraphDurationMs: 900
    },
    {
      id: 'phase_3',
      name: 'Phase 3',
      hpThresholdPct: 30,
      damageMultiplier: 1.5,
      questionTimeSeconds: 'base-4',
      attackIntervalSeconds: 8,
      attackPattern: 'special_qte',
      telegraphDurationMs: 1200,
      specialAttack: {
        id: 'boss_qte',
        type: 'qte',
        durationMs: 1400,
        successDamageMultiplier: 0.5,
        failDamageMultiplier: 1.5,
        cooldownTurns: 3
      }
    }
  ]
};
```

## จุดเชื่อมต่อใน Boss.js ภายหลัง

`Boss.js` ควรเหลือบทบาทเป็น facade บาง ๆ:

```js
// constructor
this.state = new BossState({
  bossId: this.id,
  phases: template.phaseConfig,
  eventBus
});

// takeDamage
this.currentHp = Math.max(0, this.currentHp - amount);
this.state.evaluateHp(this.getHpPercent() * 100);
this.applyPhaseStats();

// game/update loop ก่อนเริ่ม counter attack
this.state.update();
if (!this.state.canAttack()) return;
```

การอ่านข้อมูลเดิมควรเปลี่ยนเป็น facade methods เช่น:

```js
getRestrictedCategories() { return this.state.currentPhase.restrictedCategories; }
getPhaseName() { return this.state.currentPhase.name; }
get timer() { return this.getQuestionTimeSeconds(); }
```

## EventBus contract ที่เสนอ

ควรเพิ่มชื่อคงที่ใน `EVENTS` ภายหลัง แทนการเขียน string กระจาย:

```js
BOSS_PHASE_CHANGE: 'boss:phase_change',
BOSS_DANGER: 'boss:danger',
BOSS_PHASE_READY: 'boss:phase_ready',
BOSS_SPECIAL_ATTACK: 'boss:special_attack'
```

Payload ของ `BOSS_PHASE_CHANGE` ต้องมีอย่างน้อย `bossId`, `from`, `to`, `phaseName`, `telegraphDurationMs` เพื่อให้ UI ทำ animation และ disable interaction ได้โดยไม่ต้องรู้ implementation ของบอส

## Safety rules

1. เมื่อ HP ข้าม threshold ให้เข้าสถานะ `telegraphing` ก่อนเสมอ
2. ระหว่าง `telegraphing` ห้ามเริ่ม attack และห้ามใช้ damage multiplier ของ Phase ใหม่
3. Phase ใหม่จะ active เมื่อ `BossState.update()` ครบเวลา telegraph
4. หากผู้เล่นโจมตีซ้ำระหว่าง telegraph ให้สะสม HP ได้ แต่ห้ามเริ่ม transition ซ้ำ
5. การเปลี่ยน Phase เป็นแบบเดินหน้าอย่างเดียว (`nextIndex > currentPhaseIndex`)
6. Phase 3 QTE ของบอสควรแยกจาก strike QTE ของผู้เล่น เพื่อลดการชนกันของ timer และ state

## ประเด็นที่ต้องยืนยันก่อน implement

- `attackIntervalSeconds` จะเป็นระบบโจมตีอัตโนมัติจริง หรือเป็นเพียงข้อมูลสำหรับอนาคต
- QTE ของ Phase 3 ต้องให้ผู้เล่นกดป้องกัน/หลบ หรือเป็น QTE เพื่อปรับความแรงของบอส
- ระหว่าง telegraph ผู้เล่นยังตอบคำถามและทำ damage ได้หรือควร freeze battle ทั้งหมด
- ต้องการใช้ threshold เดิม 100/65/30 กับบอสทุกตัว หรือให้แต่ละบอสอ้าง phase config คนละชุด
