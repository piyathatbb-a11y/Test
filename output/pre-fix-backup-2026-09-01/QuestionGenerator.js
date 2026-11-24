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

export class QuestionGenerator {
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

    // Pick two different units within one SI-prefix step (10^3).
    let from, to, attempts = 0;
    const maxScaleDiff = 3;

    do {
      from = unitKeys[Math.floor(rng() * unitKeys.length)];
      to = unitKeys[Math.floor(rng() * unitKeys.length)];
      attempts++;
    } while (from === to || (
      Math.abs(getUnitScaleMagnitude(from, catId) - getUnitScaleMagnitude(to, catId)) > maxScaleDiff &&
      attempts < 50
    ));

    const fromUnit = category.units[from];
    const toUnit = category.units[to];
    let inputValue, correctAnswer;

    const easyValues = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 250, 500];
    let best = null;

    for (let i = 0; i < 40; i++) {
      const testVal = easyValues[Math.floor(rng() * easyValues.length)];
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
    correctAnswer = best.ans;

    const roundedCorrect = roundForDisplay(correctAnswer);

    // Generate wrong answers (plausible near-misses)
    const wrongAnswers = this.generateWrongAnswers(roundedCorrect, false, rng);

    const allOptions = [roundedCorrect, ...wrongAnswers];
    this.shuffleArray(allOptions, rng);

    return {
      category: category.name,
      categoryId: category.id,
      question: `${inputValue} ${fromUnit.abbr} = ?`,
      unit: toUnit.abbr,
      options: allOptions.map(v => {
        if (typeof v === 'number' && !Number.isInteger(v)) {
          return Number(v.toPrecision(4));
        }
        return v;
      }),
      correctIndex: allOptions.indexOf(roundedCorrect),
      correctValue: roundedCorrect,
      explanation: this.buildExplanation(inputValue, fromUnit, toUnit, roundedCorrect),
      hint: `Compare the SI prefixes: ${fromUnit.abbr} → ${toUnit.abbr}.`
    };
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
