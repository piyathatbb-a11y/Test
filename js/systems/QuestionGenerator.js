// ============================================
// UNIT HUNTER — QuestionGenerator
// ============================================

import {
  CONVERSION_CATEGORIES,
  convertLinear,
  roundForDisplay,
  getUnitScaleMagnitude,
  getUnlockedCategories
} from '../data/conversions.js';

const QUESTION_FORMATS = ['convert', 'reverse', 'choose-unit', 'compare', 'word-problem'];
const WORD_PROBLEM_CONTEXTS = {
  length: ['A trail is', 'A cable measures', 'A road section is'],
  mass: ['A package has a mass of', 'A sample weighs', 'A shipment has a mass of'],
  time: ['A process lasts', 'A signal continues for', 'A machine runs for'],
  current: ['A device draws a current of', 'A circuit carries', 'A sensor measures a current of'],
  temperature: ['A lab records a temperature of', 'A chamber is at', 'A sensor reads'],
  amount: ['A solution contains', 'A sample has an amount of', 'A reaction uses'],
  luminous: ['A lamp has an intensity of', 'A beacon emits', 'A light source measures']
};

export class QuestionGenerator {
  generateFromSelection(selection, rng = Math.random) {
    if (!selection || typeof selection !== 'object') return null;
    const category = CONVERSION_CATEGORIES[selection?.categoryId];
    if (!category || !Number.isFinite(selection.value) || selection.value <= 0) return null;

    const fromUnit = category.units[selection.from];
    const toUnit = category.units[selection.to];
    if (!fromUnit || !toUnit || selection.from === selection.to) return null;

    const format = QUESTION_FORMATS.includes(selection.format) ? selection.format : 'convert';
    const correctAnswer = convertLinear(selection.value, fromUnit.factor, toUnit.factor);
    if (!Number.isFinite(correctAnswer) || correctAnswer <= 0.00000001 || correctAnswer >= 1e12) return null;

    let questionText = `${selection.value} ${fromUnit.abbr} = ?`;
    let unit = toUnit.abbr;
    let roundedCorrect = roundForDisplay(correctAnswer);
    let options;
    let explanation = this.buildExplanation(selection.value, fromUnit, toUnit, roundedCorrect);

    if (format === 'reverse') {
      roundedCorrect = roundForDisplay(selection.value);
      questionText = `${this.formatNumber(correctAnswer)} ${toUnit.abbr} = ?`;
      unit = fromUnit.abbr;
      explanation = this.buildExplanation(correctAnswer, toUnit, fromUnit, roundedCorrect);
    } else if (format === 'choose-unit') {
      const units = Object.values(category.units);
      if (units.length < 4) return null;
      const candidates = units.map(candidate => ({
        unit: candidate,
        value: convertLinear(selection.value, fromUnit.factor, candidate.factor)
      }));
      if (candidates.some(candidate => !Number.isFinite(candidate.value) || candidate.value <= 0)) return null;
      const selected = candidates.reduce((best, candidate) => (
        Math.abs(Math.log10(candidate.value / 100)) < Math.abs(Math.log10(best.value / 100))
          ? candidate
          : best
      ));
      roundedCorrect = selected.unit.abbr;
      questionText = `Which unit makes ${selection.value} ${fromUnit.abbr} closest to 100?`;
      unit = '';
      options = [selected.unit.abbr];
      const distractors = units
        .filter(candidate => candidate !== selected.unit)
        .map(candidate => candidate.abbr);
      this.shuffleArray(distractors, rng);
      options.push(...distractors.slice(0, 3));
      this.shuffleArray(options, rng);
      explanation = `${selection.value} ${fromUnit.abbr} = ${this.formatNumber(selected.value)} ${selected.unit.abbr}; this is closest to 100.`;
    } else if (format === 'compare') {
      const comparisonUnit = category.units[selection.comparisonFrom];
      const comparisonValue = Number.isFinite(selection.comparisonValue) && selection.comparisonValue > 0
        ? selection.comparisonValue
        : selection.value * fromUnit.factor / (comparisonUnit?.factor || 1) * 1.5;
      if (!comparisonUnit || selection.value * fromUnit.factor === comparisonValue * comparisonUnit.factor) {
        return null;
      }
      const difference = Math.abs(
        convertLinear(selection.value, fromUnit.factor, toUnit.factor)
        - convertLinear(comparisonValue, comparisonUnit.factor, toUnit.factor)
      );
      if (!Number.isFinite(difference) || difference <= 0) return null;
      roundedCorrect = roundForDisplay(difference);
      questionText = `A: ${selection.value} ${fromUnit.abbr} · B: ${comparisonValue} ${comparisonUnit.abbr} — what is the difference in ${toUnit.abbr}?`;
      explanation = `A = ${this.formatNumber(convertLinear(selection.value, fromUnit.factor, toUnit.factor))} ${toUnit.abbr}; B = ${this.formatNumber(convertLinear(comparisonValue, comparisonUnit.factor, toUnit.factor))} ${toUnit.abbr}; difference = ${this.formatNumber(roundedCorrect)} ${toUnit.abbr}.`;
    } else if (format === 'word-problem') {
      const contexts = WORD_PROBLEM_CONTEXTS[category.id];
      questionText = `${contexts[Math.floor(rng() * contexts.length)]} ${selection.value} ${fromUnit.abbr}. What is this in ${toUnit.abbr}?`;
    }

    if (!options) {
      options = [roundedCorrect, ...this.generateWrongAnswers(roundedCorrect, false, rng)];
      this.shuffleArray(options, rng);
    }

    return {
      category: category.name,
      categoryId: category.id,
      question: questionText,
      unit,
      options: options.map(value => (
        typeof value === 'number' && !Number.isInteger(value)
          ? Number(value.toPrecision(4))
          : value
      )),
      correctIndex: options.indexOf(roundedCorrect),
      correctValue: roundedCorrect,
      explanation,
      hint: `Compare the SI prefixes: ${fromUnit.abbr} → ${toUnit.abbr}.`,
      format,
      ...(selection.source === 'ai' ? { source: 'ai', sources: Array.isArray(selection.sources) ? selection.sources : [] } : {})
    };
  }

  generate(level, restrictedCats = [], rng = Math.random, options = {}) {
    const requestedCategories = Array.isArray(options.categories) && options.categories.length > 0
      ? options.categories
      : getUnlockedCategories(level);
    const unlocked = requestedCategories
      .filter(c => getUnlockedCategories(level).includes(c))
      .filter(c => !restrictedCats.includes(c));
    if (unlocked.length === 0) {
      // Fallback to always-available categories
      unlocked.push('length', 'mass');
    }

    const catId = unlocked[Math.floor(rng() * unlocked.length)];
    const category = CONVERSION_CATEGORIES[catId];
    const unitKeys = Object.keys(category.units);

    const difficulty = options.difficulty || 'standard';
    const minimumScaleDiff = difficulty === 'guided' ? 1 : difficulty === 'challenge' ? 4 : 3;
    const maximumScaleDiff = difficulty === 'guided' ? 3 : 6;
    const unitPairs = [];
    for (const fromKey of unitKeys) {
      for (const toKey of unitKeys) {
        const scaleDiff = Math.abs(
          getUnitScaleMagnitude(fromKey, catId) - getUnitScaleMagnitude(toKey, catId)
        );
        if (fromKey !== toKey && scaleDiff >= minimumScaleDiff && scaleDiff <= maximumScaleDiff) {
          unitPairs.push({ from: fromKey, to: toKey });
        }
      }
    }

    const fallbackPairs = unitPairs.length > 0
      ? unitPairs
      : unitKeys.flatMap(fromKey => unitKeys
        .filter(toKey => toKey !== fromKey)
        .map(toKey => ({ from: fromKey, to: toKey })));
    const selectedPair = fallbackPairs[Math.floor(rng() * fallbackPairs.length)];
    const from = selectedPair.from;
    const to = selectedPair.to;

    const fromUnit = category.units[from];
    const toUnit = category.units[to];
    let inputValue;

    const inputValues = difficulty === 'guided'
      ? [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]
      : [0.003, 0.007, 0.012, 0.025, 0.08, 0.125, 0.37, 0.75, 1.2, 2.4,
        3.6, 4.8, 7.5, 12.5, 18, 24, 37.5, 64, 125, 250, 375, 640, 1250,
        2500, 7500, 12500, 25000, 75000, 125000];
    let best = null;

    for (let i = 0; i < 40; i++) {
      const testVal = inputValues[Math.floor(rng() * inputValues.length)];
      const testAns = convertLinear(testVal, fromUnit.factor, toUnit.factor);
      const rounded = roundForDisplay(testAns);

      if (testAns > 0.01 && testAns < 10000 && Math.abs(testAns - rounded) <= Math.max(0.05, Math.abs(rounded) * 0.05)) {
        best = { val: testVal, ans: testAns };
        break;
      }
      if (!best && testAns > 0.01 && testAns < 10000) {
        best = { val: testVal, ans: testAns };
      }
    }

    if (!best) {
      best = { val: 1, ans: convertLinear(1, fromUnit.factor, toUnit.factor) };
    }

    inputValue = best.val;

    const formats = unitKeys.length >= 4 ? QUESTION_FORMATS : QUESTION_FORMATS.filter(format => format !== 'choose-unit');
    const format = options.format || formats[Math.floor(rng() * formats.length)];
    const comparisonFrom = unitKeys.filter(key => key !== from)[Math.floor(rng() * (unitKeys.length - 1))];
    let comparisonValue = inputValues[Math.floor(rng() * inputValues.length)];
    if (format === 'compare') {
      const comparisonUnit = category.units[comparisonFrom];
      if (inputValue * fromUnit.factor === comparisonValue * comparisonUnit.factor) {
        comparisonValue = inputValue * fromUnit.factor / comparisonUnit.factor * 1.5;
      }
    }
    return this.generateFromSelection({
      categoryId: catId,
      from,
      to,
      value: inputValue,
      format,
      comparisonFrom,
      comparisonValue
    }, rng);
  }

  buildExplanation(inputValue, fromUnit, toUnit, correctAnswer) {
    const multiplier = fromUnit.factor / toUnit.factor;
    const formattedMultiplier = this.formatNumber(multiplier);
    return `${inputValue} ${fromUnit.abbr} × ${formattedMultiplier} = ${this.formatNumber(correctAnswer)} ${toUnit.abbr}`;
  }

  formatNumber(value) {
    if (Number.isInteger(value)) return value.toLocaleString('en-US');
    return Number(value.toPrecision(5)).toLocaleString('en-US', { maximumSignificantDigits: 5 });
  }

  generateWrongAnswers(correct, isTemp, rng = Math.random) {
    const wrongs = [];
    const strategies = [
      () => roundForDisplay(correct * 1000), // prefix moved three steps too far
      () => roundForDisplay(correct / 1000), // prefix moved three steps too short
      () => roundForDisplay(correct * (0.8 + rng() * 0.2)), // near miss
      () => roundForDisplay(correct + (rng() > 0.5 ? 1 : -1) * (Math.abs(correct) * 0.08)), // small offset
      () => isTemp ? roundForDisplay(correct + (rng() > 0.5 ? 5 : -5)) : roundForDisplay(correct * (0.9 + rng() * 0.2)),
      () => roundForDisplay(correct + (rng() - 0.5) * Math.max(1, Math.abs(correct) * 0.15)),
    ];

    const used = new Set([correct]);
    let attempts = 0;
    while (wrongs.length < 3 && attempts < 50) {
      const strat = strategies[Math.floor(rng() * strategies.length)];
      const val = strat();
      const rounded = typeof val === 'number' && !Number.isInteger(val) ? Number(val.toPrecision(4)) : val;
      if (!used.has(rounded) && rounded !== correct && isFinite(rounded) && !isNaN(rounded)) {
        used.add(rounded);
        wrongs.push(rounded);
      }
      attempts++;
    }

    // Fill any remaining with simple offsets
    let fallbackAttempts = 0;
    while (wrongs.length < 3 && fallbackAttempts < 100) {
      const offset = (wrongs.length + 1) * (Math.abs(correct) > 1 ? Math.ceil(Math.abs(correct) * 0.25) : 1);
      const val = roundForDisplay(correct + (rng() > 0.5 ? offset : -offset));
      if (!used.has(val) && val !== correct && Number.isFinite(val)) {
        used.add(val);
        wrongs.push(val);
      }
      fallbackAttempts++;
    }

    // This should only be reachable for pathological rounding cases.
    if (wrongs.length < 3) {
      for (let n = 1; wrongs.length < 3 && n < 1000; n++) {
        const val = roundForDisplay(correct + n * (Math.abs(correct) > 1 ? Math.ceil(Math.abs(correct) * 0.1) : 0.1));
        if (!used.has(val) && val !== correct) {
          used.add(val);
          wrongs.push(val);
        }
      }
    }

    return wrongs;
  }

  shuffleArray(arr, rng = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
