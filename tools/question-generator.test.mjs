import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QuestionGenerator } from '../js/systems/QuestionGenerator.js';
import { CONVERSION_CATEGORIES } from '../js/data/conversions.js';

function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

test('all supported question formats produce locally checkable answers', () => {
  const generator = new QuestionGenerator();
  const cases = [
    { format: 'convert', from: 'km', to: 'm', value: 2, answer: 2000 },
    { format: 'reverse', from: 'km', to: 'm', value: 2, answer: 2 },
    { format: 'compare', from: 'km', to: 'm', value: 2, comparisonFrom: 'm', comparisonValue: 500, answer: 1500 },
    { format: 'choose-unit', from: 'km', to: 'm', value: 100, answer: 'km' },
    { format: 'word-problem', from: 'km', to: 'm', value: 2, answer: 2000 }
  ];

  for (const selection of cases) {
    const question = generator.generateFromSelection({
      categoryId: 'length',
      ...selection,
      source: 'ai'
    }, seeded(12));
    assert.ok(question, selection.format);
    assert.equal(question.format, selection.format);
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map(String)).size, 4);
    assert.equal(question.options[question.correctIndex], selection.answer);
    assert.equal(question.source, 'ai');
    assert.ok(question.explanation.length > 0);
  }
});

test('ordinary generation varies format while a seeded random stream stays reproducible', () => {
  const generator = new QuestionGenerator();
  const generate = () => Array.from({ length: 100 }, (_, i) => (
    generator.generate(1, [], seeded(i + 1), { categories: ['length'] })
  ));
  const first = generate();
  const second = generate();

  assert.deepEqual(first, second);
  assert.ok(new Set(first.map(question => question.format)).size >= 4);
  for (const question of first) {
    assert.equal(question.options.length, 4);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
    assert.equal(new Set(question.options.map(String)).size, 4);
  }
});

test('categories with fewer than four units never get an unsupported unit-choice question', () => {
  const generator = new QuestionGenerator();
  assert.equal(generator.generateFromSelection({
    categoryId: 'temperature', from: 'K', to: 'mK', value: 2, format: 'choose-unit'
  }), null);
});

test('all conversion categories produce four distinct answers across seeded question streams', () => {
  const generator = new QuestionGenerator();
  for (const categoryId of Object.keys(CONVERSION_CATEGORIES)) {
    for (let i = 1; i <= 250; i++) {
      const question = generator.generate(1, [], seeded(i), { categories: [categoryId] });
      assert.ok(question, `${categoryId}/${i} should generate`);
      assert.equal(question.categoryId, categoryId);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options.map(String)).size, 4, `${categoryId}/${i} has unique options`);
      assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
    }
  }
});
