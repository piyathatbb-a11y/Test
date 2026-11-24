// Deterministic expedition rules. DOM and storage are owned by ExpeditionUI.
export const RULESET = 'turns-v1';
export const QUESTION_RULESET = 'variety-v2';
export const QTE = Object.freeze({ version: 'fast-v2', duration: 850, center: .62, perfect: .09, good: .23 });
export const TOPICS = {
  length: 'ความยาว',
  mass: 'มวล',
  time: 'เวลา',
  area: 'พื้นที่',
  volume: 'ปริมาตร',
  speed: 'ความเร็ว'
};
export const ROOMS = { fight: 'ต่อสู้', elite: 'อีลิต', event: 'เหตุการณ์', shop: 'ร้านค้า', treasure: 'สมบัติ', rest: 'จุดพัก', boss: 'บอส' };
export const GRADES = { PERFECT: { attack: 1.2, defense: 0.75 }, GOOD: { attack: 1, defense: 1 }, BAD: { attack: 0.75, defense: 1.15 } };
export const SKILLS = {
  basic: { name: 'โจมตีพื้นฐาน', power: 16, cooldown: 0, description: 'โจมตี 16 · ใช้ได้เสมอ' },
  heavy: { name: 'ฟันหนัก', power: 27, cooldown: 2, description: 'โจมตี 27 · คูลดาวน์ 2 ตา' },
  pierce: { name: 'เจาะเกราะ', power: 19, cooldown: 1, description: 'โจมตี 19 ไม่สนเกราะ · คูลดาวน์ 1 ตา' },
  mend: { name: 'ซ่อมแซม', power: 18, cooldown: 3, description: 'ฟื้น HP สูงสุด 18 ตามผลท่า · คูลดาวน์ 3 ตา' },
  focus: { name: 'ตั้งสมาธิ', power: 0, cooldown: 2, description: 'ลดการโจมตีถัดไป 4/7/9 ตาม Bad/Good/Perfect · คูลดาวน์ 2 ตา' },
  drain: { name: 'ดูดพลัง', power: 21, cooldown: 2, description: 'โจมตี 21 และฟื้น HP เท่าครึ่งหนึ่งของดาเมจ · คูลดาวน์ 2 ตา' },
  surge: { name: 'กระแสพลัง', power: 33, cooldown: 3, description: 'โจมตี 33 · คูลดาวน์ 3 ตา' }
};
export const RELICS = {
  clock: { name: 'เฟืองจังหวะ', description: 'Perfect ในตาเรา ลดคูลดาวน์สกิลอื่นอีก 1 ตา' },
  lens: { name: 'เลนส์แม่นยำ', description: 'Perfect โจมตีแรงขึ้นอีก 3' },
  shell: { name: 'เกราะสนาม', description: 'ลดดาเมจที่ได้รับ 2 ทุกครั้ง' },
  battery: { name: 'แบตเตอรี่สำรอง', description: 'ชนะการต่อสู้ ฟื้น HP 8' }
};
const UNITS = {
  length: [['mm', 0.001], ['cm', 0.01], ['m', 1], ['km', 1000]],
  mass: [['µg', 0.000001], ['mg', 0.001], ['g', 1], ['kg', 1000]],
  time: [['ms', 0.001], ['s', 1], ['min', 60], ['h', 3600]],
  area: [['cm²', 0.0001], ['m²', 1], ['ha', 10000], ['km²', 1000000]],
  volume: [['µL', 0.000001], ['mL', 0.001], ['L', 1], ['m³', 1000]],
  speed: [['cm/s', 0.01], ['m/s', 1], ['km/h', 1 / 3.6], ['km/s', 1000]]
};
const QUESTION_FORMATS = ['convert', 'reverse', 'choose-unit', 'compare', 'word-problem'];
const AI_QUESTION_FORMATS = [...QUESTION_FORMATS, 'diagram-math'];
const WORD_PROBLEM_CONTEXTS = {
  length: ['A hiking trail is', 'A road section measures', 'A cable has a length of'],
  mass: ['A package has a mass of', 'A science sample has a mass of', 'A shipment weighs'],
  time: ['A machine runs for', 'A signal lasts', 'A process takes'],
  area: ['A garden covers', 'A floor has an area of', 'A field measures'],
  volume: ['A container holds', 'A water tank contains', 'A bottle has a volume of'],
  speed: ['A vehicle travels at', 'A runner moves at', 'A current flows at']
};
const unitFactor = (topic, key) => UNITS[topic]?.find(([unit]) => unit === key)?.[1];
const normalize = value => Number(value.toPrecision(9));
const numericOptions = (answer, rng) => {
  const correct = normalize(answer);
  const options = [correct];
  const candidates = [correct * 10, correct / 10, correct + 1, correct - 1, correct * 2, correct / 2, correct + 5, correct + 10];
  for (const candidate of candidates) {
    const value = normalize(candidate);
    if (Number.isFinite(value) && value > 0 && !options.includes(value)) options.push(value);
    if (options.length === 4) break;
  }
  for (let offset = 1; options.length < 4 && offset < 100; offset++) {
    const value = normalize(correct + offset * Math.max(Math.abs(correct) * 0.1, 0.1));
    if (Number.isFinite(value) && !options.includes(value)) options.push(value);
  }
  if (options.length !== 4) return null;
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, correct: options.indexOf(correct), value: correct };
};
export function getQuestionUnitKeys(topic) {
  return UNITS[topic]?.map(([unit]) => unit) || [];
}
const EVENTS = [
  { id: 'lab', title: 'ห้องทดลองร้าง', text: 'เครื่องทดสอบยังทำงาน ลองใช้ความรู้เพื่อเปิดคลัง', choices: [['quiz', 'ทำโจทย์เสริม · ถูกได้เงิน 30 ผิดได้เงิน 5 พร้อมเฉลย'], ['leave', 'เดินต่อ']] },
  { id: 'trade', title: 'แท่นแลกเปลี่ยน', text: 'ใช้พลังชีวิตปรับเครื่องมือให้แรงขึ้น', choices: [['trade', 'เสีย HP 12 · เพิ่มพลังโจมตีทุกสกิล 2'], ['leave', 'ปฏิเสธ']] },
  { id: 'archive', title: 'คลังความรู้', text: 'ฝึกแนวคิดที่เคยพลาด หรือรับเสบียงแล้วเดินทางต่อ', choices: [['review', 'ทำโจทย์ทบทวน · รับพลังโจมตี +1 ไม่ว่าตอบถูกหรือผิด'], ['coins', 'รับเงิน 15 แล้วเดินต่อ']] },
  { id: 'machine', title: 'เครื่องจักรชำรุด', text: 'ซ่อมเครื่องส่งเสบียงเพื่อเตรียมรับศัตรู', choices: [['repair', 'จ่าย 20 เหรียญ · ฟื้น HP 35'], ['leave', 'เดินต่อ']] },
  { id: 'traveler', title: 'นักเดินทางบาดเจ็บ', text: 'แบ่งชุดซ่อมสนามให้ผู้เดินทาง แล้วรับเครื่องมือของเขา', choices: [['help', 'ใช้ชุดซ่อม 1 ชิ้น · รับไอเทมติดตัว'], ['leave', 'เดินต่อ']] }
];
export function seeded(seed) {
  let value = 2166136261;
  for (const c of String(seed)) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  return () => {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (items, rng) => items[Math.floor(rng() * items.length)];
const clone = value => JSON.parse(JSON.stringify(value));
export function makeMap(seed) {
  const rng = seeded(`${seed}:map`);
  const bag = ['fight', 'fight', 'fight', 'fight', 'fight', 'event', 'event', 'event', 'shop', 'treasure', 'rest'];
  const rows = Array.from({ length: 9 }, (_, row) => Array.from({ length: row === 8 ? 1 : 3 }, (_, col) => {
    let type = pick(bag, rng);
    if ([0, 3, 5].includes(row)) type = 'fight';
    if ([4, 6].includes(row) && col !== 1 && rng() < 0.5) type = 'elite';
    if (row === 7) type = 'rest';
    if (row === 8) type = 'boss';
    return { id: `${row}-${col}`, row, col, type, next: [], cleared: false };
  }));
  rows.slice(0, -1).forEach((nodes, row) => nodes.forEach(node => {
    node.next = row === 7 ? ['8-0'] : [
      `${row + 1}-${node.col}`,
      `${row + 1}-${node.col === 0 ? 1 : node.col === 2 ? 1 : (rng() < 0.5 ? 0 : 2)}`
    ];
  }));
  return rows.flat();
}
export function makeQuestion(topic, key, reviewPair = null) {
  const rng = seeded(`${QUESTION_RULESET}:${key}:question`);
  const units = UNITS[topic];
  if (!units) throw new Error(`Unknown question topic: ${topic}`);
  const from = reviewPair ? units.find(u => u[0] === reviewPair[0]) : pick(units, rng);
  const to = reviewPair ? units.find(u => u[0] === reviewPair[1]) : pick(units.filter(u => u !== from), rng);
  const input = pick([0.25, 0.5, 1, 2, 3, 5, 10, 15, 20, 30, 60, 100, 250, 500], rng);
  const formats = units.length >= 4 ? QUESTION_FORMATS : QUESTION_FORMATS.filter(format => format !== 'choose-unit');
  const format = pick(formats, rng);
  const selection = {
    format,
    from: from[0],
    to: to[0],
    value: input,
    comparisonFrom: pick(units.filter(unit => unit !== from), rng)[0],
    comparisonValue: pick([0.25, 0.5, 1, 2, 3, 5, 10, 20, 50, 100], rng)
  };
  if (selection.format === 'compare') {
    const compareFactor = unitFactor(topic, selection.comparisonFrom);
    if (selection.value * from[1] === selection.comparisonValue * compareFactor) selection.comparisonValue *= 2;
  }
  return makeQuestionFromSelection(topic, selection, rng);
}
export function makeQuestionFromSelection(topic, selection, rng = seeded(`${QUESTION_RULESET}:${topic}:${JSON.stringify(selection)}:options`)) {
  const units = UNITS[topic];
  if (!units || !selection || !Number.isFinite(selection.value) || selection.value <= 0) return null;
  const from = units.find(([unit]) => unit === selection.from);
  const to = units.find(([unit]) => unit === selection.to);
  if (!from || !to || from === to) return null;

  const input = selection.value;
  const formats = selection.source === 'ai' ? AI_QUESTION_FORMATS : QUESTION_FORMATS;
  const format = formats.includes(selection.format) ? selection.format : 'convert';
  const converted = input * from[1] / to[1];
  if (!Number.isFinite(converted) || converted <= 0) return null;
  let text, options, correct, explanation, diagram;

  if (format === 'choose-unit') {
    if (units.length < 4) return null;
    const candidates = units.map(unit => ({
      unit,
      value: input * from[1] / unit[1]
    }));
    if (candidates.some(candidate => !Number.isFinite(candidate.value) || candidate.value <= 0)) return null;
    const selected = [...candidates].sort((a, b) => (
      Math.abs(Math.log10(a.value / 100)) - Math.abs(Math.log10(b.value / 100))
    ))[0];
    options = units.map(([unit]) => unit);
    const correctUnit = selected.unit[0];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    correct = options.indexOf(correctUnit);
    text = `หน่วยใดทำให้ ${input} ${from[0]} มีค่าตัวเลขใกล้ 100 ที่สุด?`;
    explanation = `${input} ${from[0]} = ${normalize(selected.value)} ${correctUnit}; ค่านี้ใกล้ 100 ที่สุด`;
  } else if (format === 'compare') {
    const comparisonFrom = units.find(([unit]) => unit === selection.comparisonFrom);
    if (!comparisonFrom) return null;
    const comparisonValue = Number.isFinite(selection.comparisonValue) && selection.comparisonValue > 0
      ? selection.comparisonValue
      : input * from[1] / comparisonFrom[1] * 1.5;
    if (from[1] * input === comparisonFrom[1] * comparisonValue) return null;
    const difference = Math.abs(input * from[1] - comparisonValue * comparisonFrom[1]) / to[1];
    if (!Number.isFinite(difference) || difference <= 0) return null;
    const numeric = numericOptions(difference, rng);
    if (!numeric) return null;
    ({ options, correct } = numeric);
    text = `A: ${input} ${from[0]} · B: ${comparisonValue} ${comparisonFrom[0]} — ต่างกันกี่ ${to[0]}?`;
    explanation = `A = ${normalize(input * from[1] / to[1])} ${to[0]}; B = ${normalize(comparisonValue * comparisonFrom[1] / to[1])} ${to[0]}; ผลต่าง = ${numeric.value} ${to[0]}`;
  } else if (format === 'diagram-math') {
    const comparisonFrom = units.find(([unit]) => unit === selection.comparisonFrom);
    if (
      !comparisonFrom
      || comparisonFrom === from
      || comparisonFrom === to
      || !Number.isFinite(selection.comparisonValue)
      || selection.comparisonValue <= 0
      || !['add', 'difference'].includes(selection.operation)
    ) return null;
    const first = input * from[1] / to[1];
    const second = selection.comparisonValue * comparisonFrom[1] / to[1];
    const result = selection.operation === 'add' ? first + second : Math.abs(first - second);
    if (!Number.isFinite(result)) return null;
    const numeric = numericOptions(result, rng);
    if (!numeric) return null;
    ({ options, correct } = numeric);
    const operation = selection.operation === 'add' ? 'ผลรวม' : 'ผลต่าง';
    text = `จากแผนภาพ แปลง A และ B เป็น ${to[0]} แล้วหา${operation}`;
    explanation = `A = ${normalize(first)} ${to[0]}; B = ${normalize(second)} ${to[0]}; ${operation} = ${numeric.value} ${to[0]}`;
    diagram = {
      first: { value: input, unit: from[0] },
      second: { value: selection.comparisonValue, unit: comparisonFrom[0] },
      operator: selection.operation === 'add' ? '+' : '−',
      targetUnit: to[0]
    };
  } else {
    let answer = converted;
    if (format === 'reverse') {
      answer = input;
      text = `${normalize(converted)} ${to[0]} = ? ${from[0]}`;
      explanation = `${normalize(converted)} ${to[0]} × ${normalize(to[1] / from[1])} = ${input} ${from[0]}`;
    } else {
      text = `${input} ${from[0]} = ? ${to[0]}`;
      explanation = `${input} × ${normalize(from[1] / to[1])} = ${normalize(converted)} ${to[0]} (แปลงเป็นหน่วยฐานก่อน แล้วหารด้วยตัวคูณของหน่วยปลายทาง)`;
      if (format === 'word-problem') {
        const contexts = WORD_PROBLEM_CONTEXTS[topic];
        const context = selection.context || pick(contexts, rng);
        text = `${context} ${input} ${from[0]} ต้องการแปลงเป็น ${to[0]} จะได้เท่าไร?`;
      }
    }
    const numeric = numericOptions(answer, rng);
    if (!numeric) return null;
    ({ options, correct } = numeric);
  }

  return {
    text,
    options,
    correct,
    pair: [from[0], to[0]],
    explanation,
    format,
    ...(diagram ? { diagram } : {}),
    ...(selection.source === 'ai' ? { source: 'ai' } : {})
  };
}
export function qteGrade(progress, timedOut = false) {
  if (timedOut || !Number.isFinite(progress)) return 'BAD';
  const distance = Math.abs(progress - QTE.center);
  return distance <= QTE.perfect ? 'PERFECT' : distance <= QTE.good ? 'GOOD' : 'BAD';
}
export class Expedition {
  constructor({ seed, topic = 'length', ranked = false, dateKey = '', now = Date.now() }) {
    if (!(topic in TOPICS)) throw new Error('Unknown topic');
    this.s = {
      version: RULESET, seed, topic, ranked, dateKey, startedAt: now, phase: 'map',
      hp: 120, maxHp: 120, gold: 0, kits: 1, bonus: 0, skills: ['heavy', 'pierce', 'mend', 'focus'],
      levels: {}, cooldowns: {}, relics: [], map: makeMap(seed), current: null, history: [],
      questionNumber: 0, correct: 0, total: 0, mistakes: [], seenEvents: [], log: 'เลือกห้องแรกเพื่อเริ่มการเดินทาง',
      enemy: null, question: null, selected: null, turn: 'player', ward: 0, rewards: [], result: null
    };
  }
  static restore(snapshot) {
    const s = clone(snapshot);
    if (!s || s.version !== RULESET || !(s.topic in TOPICS) || !Array.isArray(s.map) || s.map.length !== 25 ||
        !['map', 'skill', 'question', 'qte', 'feedback', 'reward', 'replace', 'room', 'event', 'ended'].includes(s.phase) ||
        !Number.isFinite(s.hp) || !Number.isFinite(s.startedAt) || !Array.isArray(s.skills) || s.skills.some(id => !SKILLS[id])) {
      throw new Error('Incompatible expedition save');
    }
    const expectedIds = makeMap(s.seed).map(n => n.id);
    const validPair = pair => Array.isArray(pair) && pair.length === 2 && pair[0] !== pair[1] && pair.every(id => UNITS[s.topic].some(u => u[0] === id));
    if (s.map.some((n, i) => !n || n.id !== expectedIds[i] || !ROOMS[n.type] || !Array.isArray(n.next) || n.next.some(id => !expectedIds.includes(id))) ||
        !Array.isArray(s.history) || s.history.some(id => !expectedIds.includes(id)) ||
        !Array.isArray(s.relics) || s.relics.some(id => !RELICS[id]) ||
        !Array.isArray(s.mistakes) || s.mistakes.some(pair => !validPair(pair)) ||
        !s.cooldowns || !s.levels || !Number.isFinite(s.gold) || !Number.isFinite(s.maxHp) ||
        !Number.isFinite(s.total) || !Number.isFinite(s.correct) || s.hp < 0 || s.hp > s.maxHp ||
        (s.current !== null && !expectedIds.includes(s.current)) ||
        (['skill', 'qte'].includes(s.phase) && !s.enemy) ||
        (['question', 'qte', 'feedback'].includes(s.phase) && (!s.question || !Array.isArray(s.question.options) || s.question.options.length !== 4))) {
      throw new Error('Damaged expedition save');
    }
    const game = Object.create(Expedition.prototype);
    game.s = s;
    // Leaving a timed QTE cannot reset it or preserve ranked eligibility.
    game.s.ranked = false;
    if (s.phase === 'qte') game.resolve('BAD');
    return game;
  }
  snapshot() { return clone(this.s); }
  node() { return this.s.map.find(n => n.id === this.s.current); }
  available() {
    if (this.s.phase !== 'map') return [];
    const current = this.node();
    return this.s.map.filter(n => current ? current.next.includes(n.id) : n.row === 0);
  }
  enter(id) {
    const node = this.available().find(n => n.id === id);
    if (!node) return false;
    const s = this.s;
    s.current = id;
    s.history.push(id);
    s.rewards = [];
    s.cooldowns = {};
    s.ward = 0;
    if (['fight', 'elite', 'boss'].includes(node.type)) {
      const boss = node.type === 'boss';
      const elite = node.type === 'elite';
      const rng = seeded(`${s.seed}:enemy:${id}`);
      const sprite = boss ? 'quantum_sentry' : pick(['glitch', 'fragment', 'corruptor', 'byte_drone'], rng);
      const hp = boss ? 150 : Math.round((38 + node.row * 6) * (elite ? 1.45 : 1));
      s.enemy = { name: boss ? 'ผู้พิทักษ์มาตรวัด' : elite ? 'หน่วยพิฆาตชั้นสูง' : 'หน่วยข้อมูลคลาดเคลื่อน', sprite, hp, maxHp: hp, damage: boss ? 18 : 7 + node.row, armor: boss ? 3 : elite ? 4 : 1, attacks: 0, boss, elite };
      s.turn = 'player';
      s.phase = 'skill';
      s.log = 'เลือกสกิล แล้วใช้ความรู้เพื่อกำหนดผลของท่า';
    } else if (node.type === 'event') {
      const unseen = EVENTS.filter(e => !s.seenEvents.includes(e.id));
      const event = pick(unseen, seeded(`${s.seed}:event:${id}`));
      if (!event) { this.clear('ไม่พบสัญญาณใหม่ เดินทางต่อ'); return true; }
      s.event = clone(event);
      s.seenEvents.push(event.id);
      s.phase = 'event';
    } else if (node.type === 'treasure') {
      this.offerRewards(true);
    } else {
      s.phase = 'room';
    }
    return true;
  }
  chooseSkill(id) {
    const s = this.s;
    if (s.phase !== 'skill' || !(id === 'basic' || s.skills.includes(id)) || (s.cooldowns[id] || 0) > 0) return false;
    s.selected = id;
    s.turn = 'player';
    this.ask();
    return true;
  }
  ask(review = false) {
    const s = this.s;
    const mistakes = [...(s.priorMistakes || []), ...s.mistakes];
    const revisit = review || (s.questionNumber > 0 && s.questionNumber % 4 === 0);
    const candidate = revisit && mistakes.length ? mistakes[mistakes.length - 1] : null;
    const pair = Array.isArray(candidate) && candidate.length === 2 && candidate[0] !== candidate[1] && candidate.every(id => UNITS[s.topic].some(u => u[0] === id)) ? candidate : null;
    s.question = makeQuestion(s.topic, `${s.seed}:${s.current}:${s.questionNumber++}`, pair);
    s.answerCorrect = null;
    s.phase = 'question';
  }
  answer(index, now = Date.now()) {
    const s = this.s;
    if (s.phase !== 'question' || !Number.isInteger(index) || index < 0 || index > 3) return false;
    const correct = index === s.question.correct;
    s.total++;
    if (correct) s.correct++;
    else s.mistakes.push(s.question.pair);
    s.answerCorrect = correct;
    s.answerIndex = index;
    s.continueAt = correct ? now : now + 3000;
    if (s.turn === 'event') {
      s.lastGrade = correct ? 'GOOD' : 'BAD';
      if (s.eventAction === 'quiz') s.gold += correct ? 30 : 5;
      else s.bonus++;
      s.feedback = correct ? 'ตอบถูก รับรางวัลแล้ว' : 'ทบทวนวิธีคิด แล้วเดินทางต่อ';
      s.afterFeedback = 'clear';
      s.phase = 'feedback';
    } else if (correct) s.phase = 'qte';
    else this.resolve('BAD');
    return correct;
  }
  intentDamage() {
    const e = this.s.enemy;
    if (!e) return 0;
    return e.damage + (e.boss && e.hp <= e.maxHp / 2 ? 4 : 0) + (e.attacks % 3 === 2 ? 4 : 0);
  }
  resolve(grade) {
    const s = this.s;
    if (!(grade in GRADES) || !['qte', 'question'].includes(s.phase) || (s.phase === 'question' && s.answerCorrect !== false)) return false;
    const factors = GRADES[grade];
    let amount;
    if (s.turn === 'player') {
      const id = s.selected;
      const skill = SKILLS[id];
      const level = s.levels[id] || 0;
      if (id === 'mend') {
        amount = Math.min(s.maxHp - s.hp, Math.round((skill.power + level * 4) * factors.attack));
        s.hp += amount;
        s.effect = { type: 'heal', amount };
        s.feedback = `${grade} · ฟื้น HP ${amount}`;
      } else if (id === 'focus') {
        s.ward = ({ BAD: 4, GOOD: 7, PERFECT: 9 })[grade] + level * 2;
        s.effect = { type: 'guard', amount: s.ward };
        s.feedback = `${grade} · ตั้งเกราะรับการโจมตีถัดไป ${s.ward}`;
      } else {
        amount = Math.max(1, Math.round((skill.power + s.bonus + level * 4) * factors.attack) - (id === 'pierce' ? 0 : s.enemy.armor));
        if (grade === 'PERFECT' && s.relics.includes('lens')) amount += 3;
        s.enemy.hp = Math.max(0, s.enemy.hp - amount);
        s.effect = { type: 'strike', amount };
        if (id === 'drain') s.hp = Math.min(s.maxHp, s.hp + Math.floor(amount / 2));
        s.feedback = `${grade} · ทำความเสียหาย ${amount}`;
      }
      if (grade === 'PERFECT' && s.relics.includes('clock')) {
        for (const key of Object.keys(s.cooldowns)) s.cooldowns[key] = Math.max(0, s.cooldowns[key] - 1);
      }
      // +1 offsets the decrement at the start of the next player turn.
      if (skill.cooldown) s.cooldowns[id] = skill.cooldown + 1;
      s.afterFeedback = s.enemy.hp === 0 ? 'victory' : 'enemy';
    } else {
      amount = Math.max(0, Math.round(this.intentDamage() * factors.defense) - s.ward - (s.relics.includes('shell') ? 2 : 0));
      s.ward = 0;
      s.hp = Math.max(0, s.hp - amount);
      s.effect = { type: 'damage', amount };
      s.enemy.attacks++;
      s.feedback = `${grade} · ได้รับความเสียหาย ${amount}`;
      s.afterFeedback = s.hp === 0 ? 'defeat' : 'player';
    }
    s.lastGrade = grade;
    s.phase = 'feedback';
    return true;
  }
  advance(now = Date.now()) {
    const s = this.s;
    if (s.phase !== 'feedback' || now < s.continueAt) return false;
    if (s.afterFeedback === 'clear') this.clear(s.feedback);
    else if (s.afterFeedback === 'defeat') this.end(false, now);
    else if (s.afterFeedback === 'victory') {
      s.gold += s.enemy.boss ? 50 : s.enemy.elite ? 35 : 20;
      if (s.relics.includes('battery')) s.hp = Math.min(s.maxHp, s.hp + 8);
      if (s.enemy.boss) this.end(true, now);
      else this.offerRewards();
    } else if (s.afterFeedback === 'enemy') {
      s.turn = 'enemy';
      this.ask();
    } else {
      for (const id of Object.keys(s.cooldowns)) s.cooldowns[id] = Math.max(0, s.cooldowns[id] - 1);
      s.turn = 'player';
      s.phase = 'skill';
      s.question = null;
    }
    return true;
  }
  offerRewards(treasure = false) {
    const s = this.s;
    const rng = seeded(`${s.seed}:reward:${s.current}`);
    const availableRelics = Object.keys(RELICS).filter(id => !s.relics.includes(id));
    const newSkills = Object.keys(SKILLS).filter(id => id !== 'basic' && !s.skills.includes(id));
    s.rewards = [
      availableRelics.length ? { kind: 'relic', id: pick(availableRelics, rng) } : { kind: 'gold', amount: 25 },
      { kind: 'upgrade', id: pick(s.skills, rng) },
      !treasure && newSkills.length ? { kind: 'skill', id: pick(newSkills, rng) } : { kind: 'heal', amount: 20 }
    ];
    s.phase = 'reward';
  }
  takeReward(index, replaceId = null) {
    const s = this.s;
    if (!['reward', 'replace'].includes(s.phase)) return false;
    if (s.phase === 'replace' && index !== s.pendingReward) return false;
    if (index === -1) { this.clear('ข้ามรางวัล'); return true; }
    const reward = s.rewards[index];
    if (!reward) return false;
    if (reward.kind === 'skill' && s.skills.length >= 4) {
      if (!replaceId) { s.pendingReward = index; s.phase = 'replace'; return true; }
      if (!s.skills.includes(replaceId)) return false;
      s.skills[s.skills.indexOf(replaceId)] = reward.id;
    } else if (reward.kind === 'skill') s.skills.push(reward.id);
    if (reward.kind === 'relic' && !s.relics.includes(reward.id)) s.relics.push(reward.id);
    if (reward.kind === 'upgrade') s.levels[reward.id] = (s.levels[reward.id] || 0) + 1;
    if (reward.kind === 'gold') s.gold += reward.amount;
    if (reward.kind === 'heal') s.hp = Math.min(s.maxHp, s.hp + reward.amount);
    this.clear('รับรางวัลแล้ว เลือกเส้นทางต่อไป');
    return true;
  }
  roomAction(action) {
    const s = this.s;
    if (s.phase !== 'room') return false;
    const type = this.node().type;
    if (action === 'leave') { this.clear('เดินทางต่อ'); return true; }
    if (type === 'rest' && action === 'rest') s.hp = Math.min(s.maxHp, s.hp + 36);
    else if (type === 'rest' && s.skills.includes(action)) s.levels[action] = (s.levels[action] || 0) + 1;
    else if (type === 'shop') {
      if (s.purchases?.includes(`${s.current}:${action}`)) return false;
      const prices = { heal: 20, kit: 25, relic: 45 };
      const cost = prices[action];
      if (!cost || s.gold < cost || (action === 'heal' && s.hp === s.maxHp)) return false;
      const relic = Object.keys(RELICS).find(id => !s.relics.includes(id));
      if (action === 'relic' && !relic) return false;
      s.gold -= cost;
      if (action === 'heal') s.hp = Math.min(s.maxHp, s.hp + 35);
      if (action === 'kit') s.kits++;
      if (action === 'relic') s.relics.push(relic);
      s.purchases = [...(s.purchases || []), `${s.current}:${action}`];
      s.log = 'ซื้อแล้ว เลือกซื้ออย่างอื่นหรือเดินต่อ';
      return true;
    } else return false;
    this.clear('เตรียมพร้อมแล้ว เดินทางต่อ');
    return true;
  }
  eventAction(action) {
    const s = this.s;
    if (s.phase !== 'event' || !s.event.choices.some(c => c[0] === action)) return false;
    if (action === 'quiz' || action === 'review') {
      s.turn = 'event'; s.eventAction = action; this.ask(action === 'review'); return true;
    }
    if (action === 'trade') { if (s.hp <= 12) return false; s.hp -= 12; s.bonus += 2; }
    if (action === 'repair') { if (s.gold < 20) return false; s.gold -= 20; s.hp = Math.min(s.maxHp, s.hp + 35); }
    if (action === 'coins') s.gold += 15;
    if (action === 'help') {
      if (s.kits < 1) return false;
      s.kits--;
      const relic = Object.keys(RELICS).find(id => !s.relics.includes(id));
      if (relic) s.relics.push(relic); else s.gold += 25;
    }
    this.clear('เหตุการณ์จบแล้ว เดินทางต่อ');
    return true;
  }
  useKit() {
    const s = this.s;
    if (!['map', 'skill'].includes(s.phase) || s.kits < 1 || s.hp >= s.maxHp) return false;
    s.kits--; s.hp = Math.min(s.maxHp, s.hp + 30); return true;
  }
  clear(message) {
    this.node().cleared = true;
    this.s.phase = 'map';
    this.s.enemy = null;
    this.s.question = null;
    this.s.log = message;
  }
  end(won, now) {
    this.node().cleared = won;
    this.s.phase = 'ended';
    this.s.result = { won, elapsed: Math.max(0, now - this.s.startedAt), correct: this.s.correct, total: this.s.total };
  }
}
