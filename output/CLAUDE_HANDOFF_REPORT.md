# UNIT HUNTER — รายงานส่งต่อให้ Head Full Stack / Claude

วันที่ตรวจ: 24 สิงหาคม 2569
สถานะรวม: **โค้ดมีระบบหลักหลายส่วน แต่ยังไม่ผ่าน runtime verification**

> ข้อจำกัดของรายงาน: ตรวจจาก source code และโครงสร้างไฟล์จริงเป็นหลัก
> ยังไม่ได้เปิด Browser เล่นเกมเต็ม run หรือเก็บ console log แบบ verbatim

## 1. ภาพรวมโปรเจกต์

UNIT HUNTER คือเกมเว็บแนว educational roguelike สำหรับฝึกแปลงหน่วย
ผู้เล่นตอบคำถามเพื่อโจมตีศัตรู ถ้าตอบผิดหรือหมดเวลา ศัตรูโจมตีกลับ
เมื่อชนะจะเลือก upgrade แล้วไปด่านถัดไป ทุกด่านที่ 5 เป็น boss

เทคโนโลยี:
- HTML5: โครงหน้าและหน้าจอเกม
- CSS3: visual design, responsive layout และ battle UI
- JavaScript ES Modules: game logic โดยไม่มี framework/build tool
- Web Audio API: เสียงที่สร้างด้วย oscillator
- localStorage: save stats และ local leaderboard

การรันตาม README ต้องใช้ HTTP server เพราะมี ES Modules:

```bash
python -m http.server 8000
# เปิด http://localhost:8000
```

## 2. โครงสร้างไฟล์และหน้าที่

| ไฟล์/โฟลเดอร์ | หน้าที่ |
|---|---|
| `index.html` | มี 4 หน้าจอ: start, battle, upgrade, game over |
| `css/base.css` | สไตล์พื้นฐาน/ตัวแปร/โครงหน้า |
| `css/battle.css` | HUD, arena, HP bar, timer, sprite และเอฟเฟกต์ต่อสู้ |
| `css/ui.css` | ปุ่ม การ์ด upgrade leaderboard และ responsive UI |
| `js/main.js` | จุดเริ่มต้นและตัวควบคุม flow ของเกมทั้งหมด |
| `js/core/EventBus.js` | ระบบ pub/sub event |
| `js/core/SaveSystem.js` | อ่าน/เขียนสถิติลง localStorage |
| `js/data/conversions.js` | หมวดหน่วย factor และสูตรแปลง |
| `js/data/enemies.js` | template ศัตรูและการสุ่มศัตรู |
| `js/data/bosses.js` | template boss, phase และการสุ่ม boss |
| `js/data/upgrades.js` | upgrade ทั้งหมดและ synergy rules |
| `js/data/spriteConfigs.js` | จำนวน frame/ความเร็ว animation และ path รูป |
| `js/entities/Player.js` | HP, damage, combo, score และ upgrade effect |
| `js/entities/Enemy.js` | entity ศัตรูปกติและการ scale stats |
| `js/entities/Boss.js` | phase, enrage, windup และ boss damage |
| `js/systems/RunManager.js` | level และ spawn enemy/boss |
| `js/systems/QuestionGenerator.js` | สร้างโจทย์และตัวเลือก 4 คำตอบ |
| `js/systems/UpgradeSystem.js` | สุ่มและ apply upgrade |
| `js/systems/SynergyEngine.js` | ตรวจ synergy ที่ active |
| `js/systems/SpriteRenderer.js` | โหลด sprite หรือ placeholder fallback |
| `js/systems/AudioSystem.js` | สร้างเสียง correct/wrong/kill/boss ฯลฯ |
| `js/systems/LeaderboardService.js` | leaderboard local และ backend stub |
| `scripts/generate_byte_drone.py` | สร้าง PNG sprite ของ byte_drone |
| `notebooks/generate_enemy_sprite.ipynb` | notebook ต้นแบบสร้าง sprite |

## 3. สิ่งที่มีอยู่แล้วตาม source code

### UI และ game flow
- Start screen มีปุ่มเริ่มเกม สถิติส่วนตัว และ leaderboard
- Battle screen มี level, score, combo, HP ผู้เล่น, HP ศัตรู และ timer
- มีคำถามพร้อม answer button 4 ปุ่ม
- Upgrade screen แสดงตัวเลือก 3 รายการ
- Game over screen แสดงผล run และส่ง score
- รองรับ mouse/touch ผ่านปุ่ม และ keyboard `1` ถึง `4`
- ใช้ `setInterval` ลด timer ทุก 50ms
- ชนะศัตรูแล้วไป upgrade; เลือกแล้วเพิ่ม level
- ทุก level ที่หารด้วย 5 ลงตัวจะสร้าง Boss

### ระบบผู้เล่น
- Base HP 100 และ base damage 10
- combo เพิ่มเมื่อถูก; combo reset เมื่อผิด/โดน damage
- score คำนวณจาก base score และ combo multiplier
- มี crit, lifesteal, damage reduction, timer bonus, stun และ time warp
- HP upgrade heal ผู้เล่นเต็มตาม max HP ใหม่

### ศัตรูและ Boss
- ศัตรูปกติ 6 แบบ: glitch, fragment, corruptor, nullptr, byte_drone, overflow
- Boss 3 แบบ: quantum_sentry, entropy_lord, void_architect
- ศัตรู scale HP/damage ตาม level
- Boss มี phase ตามเปอร์เซ็นต์ HP, timer modifier และ damage modifier
- Boss มี enrage ตามจำนวน turn และมี attack windup 3 วินาที

### Conversion
- หมวดที่ประกาศไว้: `length`, `mass`, `time`, `current`, `temperature`, `amount`, `luminous`
- หน่วยเชิงเส้นใช้ factor เทียบ base unit
- temperature แปลงผ่าน Celsius
- generator จำกัดความต่าง scale ของคู่หน่วยเพื่อให้โจทย์ไม่ยากเกินไป
- สุ่ม wrong answers 3 ตัวเลือกใกล้เคียงกับคำตอบจริง

### Save และ leaderboard
- localStorage key คือ `unit_hunter_save`
- เก็บ bestLevel, bestScore, bestCombo, totalCorrect, totalRuns
- เก็บ local leaderboard สูงสุด 50 รายการ และแสดง 10 รายการ
- ชื่อถูก trim, uppercase และจำกัด 12 ตัวอักษร
- backend Firebase/Supabase ยังเป็นเพียง config/stub ไม่มี SDK call จริง

### Visual/audio
- มี sprite config ครบตามชื่อศัตรูและ boss
- มี PNG จริงในชุด `byte_drone` ตามโครงสร้างที่ตรวจพบ
- sprite อื่นจะพยายาม fallback ไป `byte_drone` หรือ placeholder สี deterministic
- เสียงใช้ Web Audio API ไม่พึ่งไฟล์เสียงภายนอก

## 4. โค้ดแกนสำคัญ พร้อมคำอธิบาย

### 4.1 จุดเริ่มต้นและ dependency wiring — `js/main.js`

```javascript
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
```

ความหมาย: `main.js` เป็น composition root สร้างระบบทั้งหมด แล้วเชื่อมระบบเข้าด้วยกัน
ท้ายไฟล์เรียก `init()` เพื่อผูก event ของ UI และแสดงหน้าเริ่มต้น

### 4.2 วงจรหนึ่ง run — `main.js` + `RunManager.js`

```javascript
function startRun() {
  stopTimer();
  player.resetUpgrades();
  player.resetForNewRun();
  runManager.startRun();
  goToScreen(SCREEN_IDS.BATTLE);
  spawnEnemy();
}
```

```javascript
spawnEnemy() {
  const isBossLevel = this.level % 5 === 0;
  if (isBossLevel) {
    this.currentEnemy = new Boss(pickBoss(this.level), this.level);
  } else {
    this.currentEnemy = new Enemy(pickEnemy(this.level), this.level);
  }
  return this.currentEnemy;
}
```

ลำดับคือ reset player → เริ่ม level 1 → spawn entity → generate question → start timer
ชนะแล้ว `advanceLevel()` เพิ่ม level และ spawn entity ใหม่

### 4.3 การแปลงหน่วย — `conversions.js`

```javascript
export function convertLinear(value, fromFactor, toFactor) {
  return value * fromFactor / toFactor;
}
```

factor คือค่าของหน่วยเมื่อเทียบกับ base unit เช่น km=1000 และ m=1
ดังนั้น `1 km` ไป `m` คือ `1 * 1000 / 1 = 1000`

```javascript
export function convertTemperature(value, from, to) {
  let celsius;
  switch (from) {
    case 'C': celsius = value; break;
    case 'F': celsius = (value - 32) * 5 / 9; break;
    case 'K': celsius = value - 273.15; break;
  }
  switch (to) {
    case 'F': return celsius * 9 / 5 + 32;
    case 'K': return celsius + 273.15;
    default: return celsius;
  }
}
```

แนวคิดคือแปลง source เป็น Celsius ก่อน แล้วค่อยแปลง Celsius ไป target
คู่ตรวจพื้นฐานที่ควรผ่าน: `0 C=32 F`, `0 C=273.15 K`, `32 F=0 C`

### 4.4 การสร้างคำถาม — `QuestionGenerator.js`

```javascript
const unlocked = getUnlockedCategories(level)
  .filter(category => !restrictedCats.includes(category));
const category = CONVERSION_CATEGORIES[catId];
const correctAnswer = category.id === 'temperature'
  ? convertTemperature(inputValue, from, to)
  : convertLinear(inputValue, fromUnit.factor, toUnit.factor);
```

ระบบเลือกหมวดที่ unlock และไม่ถูก Boss restrict จากนั้นเลือกหน่วยต้นทาง/ปลายทาง
สร้างคำตอบจริง ปัดด้วย `roundForDisplay()` แล้วสร้าง wrong answers 3 ตัว

### 4.5 การตอบคำถาม — `main.js`

```javascript
const correct = index === state.currentQuestion.correctIndex;
if (correct) {
  processCorrectAnswer();
} else {
  processWrongAnswer(false);
}
```

ตอบถูก: เพิ่ม combo, score, damage ศัตรู และอาจ trigger crit/stun/time warp
ตอบผิดหรือ timeout: reset combo ตามเงื่อนไข แล้วศัตรูทำ damage
ถ้าเป็น Boss จะผ่าน windup ก่อนโจมตีจริง

### 4.6 Upgrade และ synergy

```javascript
applyUpgrade(player, upgradeId) {
  const success = player.addUpgrade(upgradeId);
  if (success) {
    this.synergyEngine.recalculate(player.upgrades);
    this.eventBus.emit('upgrade:select', { upgradeId });
  }
  return success;
}
```

`UpgradeSystem` สุ่ม upgrade ที่ยังไม่เต็มสูงสุด 3 รายการ
`SynergyEngine` ตรวจ requirement ของแต่ละ rule แล้วคำนวณ bonus ใหม่

### 4.7 Save

```javascript
save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
}
```

`SaveSystem` โหลดข้อมูลตอนสร้าง object และบันทึกหลัง update run หรือเพิ่ม leaderboard
ปัจจุบันยังไม่มี `version` ใน schema และยังไม่มี migration

### 4.8 Sprite fallback

```javascript
this.displayId = await this.resolveSpriteId(id);
this.hasSprites = Boolean(this.displayId);
if (!this.hasSprites) {
  this.img.style.display = 'none';
  this.placeholder.style.display = 'flex';
}
```

จะตรวจรูป idle frame ก่อน ถ้ามีใช้รูปจริง ถ้าไม่มีลอง `byte_drone`
ถ้ายังไม่มีจะแสดง placeholder สีจาก hash ของ enemy id

## 5. ประเด็นที่พบจากการตรวจ source code

### Confirmed: Boss damage scale ซ้ำเมื่อ cycle มากกว่า 0

`pickBoss(level)` scale `damage` แล้วส่ง object เข้า `new Boss()`
แต่ constructor ของ `Boss` scale `template.damage` ซ้ำอีกครั้ง
ที่ level 5 cycle=0 จึงยังไม่เห็นผลซ้ำ; ตั้งแต่ level 10 เป็นต้นไป damage สูงเกิน design
ควร scale ที่จุดเดียวเท่านั้น

### Confirmed: `void_architect` restrict หมวดที่ไม่มี

`bosses.js` อ้าง `volume` และ `digital` แต่ `conversions.js` ไม่มี category สองชื่อนี้
phase restriction จึงไม่สามารถห้ามโจทย์หมวดดังกล่าวได้จริง
ต้องเลือกว่าจะเพิ่ม conversion categories หรือเปลี่ยนชื่อ restriction ให้ตรงข้อมูลที่มี

### Confirmed: Save schema ไม่มี version

ข้อมูล localStorage ไม่มี field `version` และไม่มี migration strategy
การเปลี่ยนโครงสร้างในอนาคตอาจอ่าน save เก่าไม่ปลอดภัย

### Potential issue: Question fallback ไม่เคารพ restriction

ถ้าหมวดที่ unlock ถูก restrict หมด ระบบเติม `length` และ `mass` กลับเข้าไปทันที
จึงอาจสร้างโจทย์หมวดที่ Boss ห้ามไว้ หาก design ในอนาคต restrict สองหมวดนี้พร้อมกัน
ปัจจุบันยังไม่ trigger เพราะมี 7 หมวด และ Boss จำกัดสูงสุด 2 หมวดที่มีจริง

### Confirmed: Damage/status feedback ใช้ CSS class ไม่ตรงกับ JavaScript

`main.js` สร้าง `damage-number` แต่ `battle.css` นิยาม `.dmg-number`
`main.js` สร้าง `floating-text` แต่ไม่พบ CSS rule สำหรับ class นี้
ผลคือ damage/status text ไม่มีตำแหน่งและ animation ตามที่ออกแบบไว้

นอกจากนี้ `main.js` ยังส่งเพียง `(text, color)` ให้ `spawnDamageNumber()`
จึงยังไม่ได้แยก modifier เช่น `player-dmg`, `enemy-dmg`, `crit-dmg`, `heal`
ถ้าจะแก้ให้ครบ ต้องเปลี่ยนทั้ง function signature และทุก call site

### Confirmed: EventBus.once ไม่คืน unsubscribe

`on()` คืนฟังก์ชันยกเลิก listener แต่ `once()` ไม่คืนค่า
ยังไม่พบหลักฐาน memory leak โดยตรง แต่ API ไม่สม่ำเสมอและควรแก้เป็น `return this.on(event, wrapper)`

## 6. สิ่งที่ยังไม่ได้ยืนยัน

- เปิดผ่าน browser จริงและโหลด module ครบหรือไม่
- มี error/warning ใน console อะไรบ้าง
- เล่นครบอย่างน้อย 10 คำถามจนถึง boss ได้หรือไม่
- ใช้ upgrade ทั้ง `Shield Bash` และ `Time Warp` แล้ว effect ทำงานจริงหรือไม่
- boss phase และ windup ทำงานตามที่แสดงหรือไม่
- conversion ที่สุ่มได้ 15–20 คู่ถูกต้องทุกคู่หรือไม่
- sprite path ทุกตัวและ fallback ทำงานโดยไม่มี error ที่ไม่จำเป็นหรือไม่
- save/load เมื่อมี corrupted JSON หรือ schema เก่า
- การ deploy บนระบบ case-sensitive
- visual feedback ของ damage/status หลังแก้ class mismatch

## 7. คำสั่งตรวจสอบรอบถัดไป

1. รัน HTTP server และเปิด DevTools Console
2. เล่นหนึ่ง run ให้ได้อย่างน้อย 10 คำถามและ boss 1 ตัว
3. บันทึก console error/warning แบบข้อความตรง ๆ
4. บันทึกโจทย์ที่สุ่มเจอ, หมวด, from/to และ correct answer
5. ทดสอบตอบถูก, ผิด, timeout, stun, Time Warp และ Boss windup
6. ตรวจ localStorage ก่อน/หลัง run และหลัง submit score
7. ทำ automated conversion checks อย่างน้อย 15–20 คู่
8. แก้ defects ที่ยืนยันแล้วก่อนส่งให้ลูกค้า

## สรุปส่งต่อ

คำอธิบายที่ถูกต้องที่สุดในตอนนี้คือ:

> **UNIT HUNTER มีโครงสร้างเกมและระบบหลักถูกเขียนไว้แล้ว แต่ยังไม่ใช่สถานะ production หรือ feature-complete เพราะยังไม่ผ่าน runtime verification และพบ logic defects ใน Boss scaling กับหมวด restriction ที่ไม่ตรงกับ conversion data**

ห้ามรายงานว่า “เสร็จสมบูรณ์” จาก README หรือ static review เพียงอย่างเดียว


## 8. งานแก้ไขล่าสุดตาม Senior Code Review

ดำเนินการแก้ใน source code แล้ว:

- **Boss scaling:** ย้าย HP และ damage scaling ให้เกิดใน `Boss` constructor จุดเดียว โดย `pickBoss()` ส่ง raw template พร้อม `cycle` และ modifier เฉพาะ timer/enrage
- **Boss restrictions:** เปลี่ยน restriction ของ `void_architect` จากหมวดที่ไม่มี (`volume`, `digital`) เป็นหมวดที่มีจริง (`amount`, `luminous`)
- **Validation:** เพิ่ม `validateBossRestrictions()` และเรียกใน `main.js:init()` เพื่อ `console.warn` เมื่อพบ category ที่ไม่รู้จัก
- **Visual feedback:** ใช้ `.dmg-number` เป็น class มาตรฐาน เพิ่ม `.floating-text` พร้อม keyframe ลอยขึ้นและ fade out และเอา inline transform ที่ขัดกับ CSS animation ออก
- **Save versioning:** เพิ่ม `SCHEMA_VERSION = 1`; defaults และ save มี version; load รองรับ legacy version 0 ด้วยการเติมค่า default/migrate และ reset พร้อม warning หากเป็น version ที่ใหม่กว่าหรือข้อมูลเสีย
- **EventBus:** `once()` คืน unsubscribe function แล้ว
- **Syntax repair:** แก้ closing braces ที่ผิดรูปใน `SaveSystem.js` ซึ่งทำให้ module parse ไม่ผ่าน

## 9. Smoke-test ล่าสุด

คำสั่งตรวจด้วย Node.js ผ่านทั้งหมด:

- `SaveSystem.js` syntax check: PASS
- `main.js` syntax check: PASS
- Boss restriction validation: `warnings: []`
- Boss level 15 / Void Architect: actual damage `28`, expected damage `28`
- `EventBus.once()`: callback count `1` หลัง emit สองครั้ง

ยังไม่ได้แทนที่ browser runtime verification: ยังต้องเปิดเกมผ่าน HTTP server, ตรวจ DevTools console และเล่น flow จริง
