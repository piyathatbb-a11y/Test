import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QuestionGenerator } from '../js/systems/QuestionGenerator.js';
import { CONVERSION_CATEGORIES } from '../js/data/conversions.js';
import { UNIT_KNOWLEDGE_QUESTIONS } from '../js/data/unitKnowledge.js';

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
  assert.ok(new Set(first.map(question => question.format)).size >= 3);
  for (const question of first) {
    assert.equal(question.options.length, 4);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
    assert.equal(new Set(question.options.map(String)).size, 4);
  }
});

test('the 100-question unit knowledge deck has sourced factual prompts and checkable answers', () => {
  const generator = new QuestionGenerator();
  const deck = generator.createKnowledgeDeck([], seeded(2026));
  assert.equal(UNIT_KNOWLEDGE_QUESTIONS.length, 100);
  assert.equal(new Set(UNIT_KNOWLEDGE_QUESTIONS.map(item => item.prompt.th)).size, 100);
  assert.equal(new Set(deck).size, 100);
  for (const index of deck) {
    const question = generator.generateKnowledgeQuestion(index, seeded(index + 1));
    assert.ok(question, UNIT_KNOWLEDGE_QUESTIONS[index].id);
    assert.equal(question.format, 'knowledge');
    assert.equal(question.bankId, UNIT_KNOWLEDGE_QUESTIONS[index].id);
    assert.equal(question.options.length, 4);
    assert.equal(question.options[question.correctIndex], question.correctValue);
    assert.equal(question.unit, '');
    assert.ok(question.explanation.length > 0);
    assert.match(question.sourceUrl, /^https:/);
  }
  assert.equal(generator.createKnowledgeDeck(['length']).length, 2);
});

test('unsupported unit-choice requests fall back to direct conversion questions', () => {
  const generator = new QuestionGenerator();
  const question = generator.generateFromSelection({
    categoryId: 'temperature', from: 'K', to: 'mK', value: 2, format: 'choose-unit'
  });
  assert.equal(question.format, 'convert');
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
