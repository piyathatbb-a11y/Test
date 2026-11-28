import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AIQuestionService } from '../js/systems/AIQuestionService.js';
import { QuestionGenerator } from '../js/systems/QuestionGenerator.js';
import { getQuestionUnitKeys, makeQuestionFromSelection } from '../js/systems/Expedition.js';

const KEY = 'unitHunterOpenAIKey';
const ENABLED = 'unitHunterAIQuestionsEnabled';

function storage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  return values;
}

function openAIResponse(questions, status = 200, searchResults = []) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => status >= 200 && status < 300
      ? {
        output_text: JSON.stringify({ questions }),
        output: [{ type: 'web_search_call', results: searchResults }]
      }
      : { error: { message: 'Invalid API key' } }
  };
}

test('AI batch is filtered to the selected category and uses locally verified answers', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  let request;
  const service = new AIQuestionService({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return openAIResponse([
        { categoryId: 'length', from: 'km', to: 'm', value: 2 },
        { categoryId: 'mass', from: 'kg', to: 'g', value: 3 },
        { categoryId: 'length', from: 'm', to: 'm', value: 1 },
        { categoryId: 'length', from: 'unknown', to: 'm', value: 1 },
        { categoryId: 'length', from: 'km', to: 'm', value: '2' }
      ]);
    }
  });

  await service.prefetch({ categories: ['length'] });
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.options.headers.Authorization, 'Bearer sk-test');
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, 'gpt-6.2-astra');
  assert.deepEqual(body.tools[0].search_content_types, ['text', 'image']);
  assert.doesNotMatch(body.input, /diagram-math/);
  assert.deepEqual(service.takeQuestion(), { categoryId: 'length', from: 'km', to: 'm', value: 2, format: 'convert' });

  const question = new QuestionGenerator().generateFromSelection(
    { categoryId: 'length', from: 'km', to: 'm', value: 2, source: 'ai' },
    () => 0
  );
  assert.equal(question.correctValue, 2000);
  assert.equal(question.options[question.correctIndex], 2000);
  assert.equal(question.source, 'ai');
});

test('Responses web search caches safe images and attaches source links to generated questions', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  const image = {
    type: 'image_result',
    image_url: 'https://images.example.test/meter.jpg',
    source_website_url: 'https://learn.example.test/length',
    caption: 'Length measurement with a meter ruler'
  };
  const source = { type: 'text_result', url: 'https://learn.example.test/length', title: 'Length reference' };
  const service = new AIQuestionService({
    fetchImpl: async () => openAIResponse([
      { categoryId: 'length', from: 'km', to: 'm', value: 2 }
    ], 200, [image, source])
  });

  await service.prefetch({ categories: ['length'] });
  assert.deepEqual(service.getMedia('length').images[0], {
    url: image.image_url,
    sourceUrl: image.source_website_url,
    caption: image.caption
  });
  assert.equal(service.takeQuestion().sources[0].url, source.url);
});

test('media search is cached in memory and rejects non-HTTPS image URLs', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  let calls = 0;
  const service = new AIQuestionService({
    fetchImpl: async () => {
      calls++;
      return openAIResponse([], 200, [{
        type: 'image_result', image_url: 'javascript:alert(1)',
        source_website_url: 'https://learn.example.test', caption: 'Length'
      }]);
    }
  });

  await service.loadMedia(['length']);
  await service.loadMedia(['length']);
  assert.equal(calls, 1);
  assert.equal(service.getMedia('length').images.length, 0);
});

test('cached web snippets ground later AI batches without repeating web search', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  let calls = 0;
  let lastBody;
  const service = new AIQuestionService({
    fetchImpl: async (_url, options) => {
      calls++;
      lastBody = JSON.parse(options.body);
      return openAIResponse([
        { categoryId: 'length', from: 'km', to: 'm', value: 2 }
      ], 200, [{
        type: 'text_result', url: 'https://learn.example.test/length',
        title: 'Metric length units', snippet: 'A kilometer contains one thousand meters.'
      }]);
    }
  });

  await service.loadMedia(['length']);
  await service.prefetch({ categories: ['length'] });
  assert.equal(calls, 2);
  assert.equal(lastBody.tools, undefined);
  assert.match(lastBody.input, /one thousand meters/);
  assert.equal(service.takeQuestion().sources[0].url, 'https://learn.example.test/length');
});

test('AI generation is disabled unless enabled and a key is saved', async () => {
  storage();
  let calls = 0;
  const service = new AIQuestionService({
    fetchImpl: async url => {
      calls++;
      if (url.endsWith('/models')) return openAIResponse([]);
      return openAIResponse([{ categoryId: 'length', from: 'km', to: 'm', value: 1 }]);
    }
  });
  await service.prefetch({ categories: ['length'] });
  assert.equal(calls, 0);

  service.setEnabled(true);
  assert.equal(service.saveKey('  sk-local  '), true);
  assert.equal(localStorage.getItem(KEY), 'sk-local');
  await service.prefetch({ categories: ['length'] });
  assert.equal(calls, 2);
});

test('API failures are reported and do not trigger immediate retry loops', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  const statuses = [];
  let calls = 0;
  const service = new AIQuestionService({
    fetchImpl: async () => { calls++; return openAIResponse([], 401); },
    onStatus: status => statuses.push(status)
  });

  await service.prefetch({ categories: ['length'] });
  await service.prefetch({ categories: ['length'] });
  assert.equal(calls, 1);
  assert.equal(statuses.at(-1).type, 'error');
  assert.match(statuses.at(-1).message, /Invalid API key/);
});

test('saving an invalid API key immediately validates it and announces the authentication error', async () => {
  storage();
  const statuses = [];
  let checkedUrl;
  const service = new AIQuestionService({
    fetchImpl: async url => {
      checkedUrl = url;
      return openAIResponse([], 401);
    },
    onStatus: status => statuses.push(status)
  });

  assert.equal(service.saveKey('sk-invalid'), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(checkedUrl, 'https://api.openai.com/v1/models');
  assert.equal(statuses.at(-1).type, 'error');
  assert.match(statuses.at(-1).message, /Invalid API key/);
});

test('invalid AI selections cannot create malformed questions', () => {
  const generator = new QuestionGenerator();
  assert.equal(generator.generateFromSelection(null), null);
  assert.equal(generator.generateFromSelection({ categoryId: 'length', from: 'cm', to: 'cm', value: 2 }), null);
  assert.equal(generator.generateFromSelection({ categoryId: 'length', from: 'cm', to: 'm', value: Infinity }), null);
});

test('AI selections use each expedition topic unit table and keep answer options valid', () => {
  for (const [topic, selection, expected] of [
    ['length', { from: 'km', to: 'm', value: 2 }, 2000],
    ['mass', { from: 'kg', to: 'g', value: 3 }, 3000],
    ['time', { from: 'h', to: 'min', value: 2 }, 120]
  ]) {
    const question = makeQuestionFromSelection(topic, { ...selection, source: 'ai' });
    assert.ok(getQuestionUnitKeys(topic).includes(selection.from));
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.equal(question.options[question.correct], expected);
    assert.equal(question.source, 'ai');
    assert.deepEqual(question, makeQuestionFromSelection(topic, { ...selection, source: 'ai' }));
  }
});

test('AI service accepts the expedition-specific minute and hour units', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  let requestBody;
  const service = new AIQuestionService({
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return openAIResponse([
        { categoryId: 'time', from: 'h', to: 'min', value: 1 },
        {
          categoryId: 'time',
          format: 'diagram-math',
          from: 'h',
          to: 'min',
          value: 1,
          comparisonFrom: 's',
          comparisonValue: 1800,
          operation: 'add'
        }
      ]);
    }
  });

  await service.prefetch({ categories: ['time'], unitSets: { time: ['s', 'min', 'h'] } });
  assert.match(requestBody.input, /"time":\["s","min","h"\]/);
  assert.match(requestBody.input, /diagram-math/);
  assert.equal(requestBody.tool_choice, 'required');
  assert.deepEqual(service.takeQuestion({ categories: ['time'], unitSets: { time: ['s', 'min', 'h'] } }), {
    categoryId: 'time', from: 'h', to: 'min', value: 1, format: 'convert'
  });
  assert.deepEqual(service.takeQuestion({ categories: ['time'], unitSets: { time: ['s', 'min', 'h'] } }), {
    categoryId: 'time',
    from: 'h',
    to: 'min',
    value: 1,
    format: 'diagram-math',
    comparisonFrom: 's',
    comparisonValue: 1800,
    operation: 'add'
  });
});

test('AI validates compare metadata and rejects unavailable unit-choice formats', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  const service = new AIQuestionService({
    fetchImpl: async () => openAIResponse([
      { categoryId: 'area', format: 'choose-unit', from: 'm²', to: 'cm²', value: 1 },
      { categoryId: 'area', format: 'compare', from: 'm²', to: 'cm²', value: 2, comparisonFrom: 'ha', comparisonValue: 3 },
      { categoryId: 'area', format: 'compare', from: 'm²', to: 'cm²', value: 2, comparisonFrom: 'bad-unit', comparisonValue: 3 },
      {
        categoryId: 'area',
        format: 'diagram-math',
        from: 'm²',
        to: 'cm²',
        value: 2,
        comparisonFrom: 'ha',
        comparisonValue: 3,
        operation: 'add'
      },
      {
        categoryId: 'area',
        format: 'diagram-math',
        from: 'm²',
        to: 'cm²',
        value: 2,
        comparisonFrom: 'ha',
        comparisonValue: 3,
        operation: 'divide'
      }
    ])
  });

  await service.prefetch({
    categories: ['area'],
    unitSets: { area: ['cm²', 'm²', 'ha', 'km²'] }
  });
  assert.deepEqual(service.takeQuestion(), {
    categoryId: 'area', from: 'm²', to: 'cm²', value: 1, format: 'choose-unit'
  });
  assert.deepEqual(service.takeQuestion(), {
    categoryId: 'area', from: 'm²', to: 'cm²', value: 2, format: 'compare', comparisonFrom: 'ha', comparisonValue: 3
  });
  assert.deepEqual(service.takeQuestion(), {
    categoryId: 'area',
    from: 'm²',
    to: 'cm²',
    value: 2,
    format: 'diagram-math',
    comparisonFrom: 'ha',
    comparisonValue: 3,
    operation: 'add'
  });
  assert.equal(service.takeQuestion(), null);
});

test('expedition AI batches fail explicitly when no valid diagram calculation is returned', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  const statuses = [];
  const service = new AIQuestionService({
    fetchImpl: async () => openAIResponse([
      { categoryId: 'length', from: 'km', to: 'm', value: 2, format: 'convert' }
    ]),
    onStatus: status => statuses.push(status)
  });

  await service.prefetch({
    categories: ['length'],
    unitSets: { length: ['mm', 'cm', 'm', 'km'] }
  });
  assert.equal(service.takeQuestion(), null);
  assert.equal(statuses.at(-1).type, 'error');
  assert.match(statuses.at(-1).message, /valid diagram calculation question/);
});

test('speed expedition batches include a validated interactive round-trip question', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  let requestBody;
  const service = new AIQuestionService({
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return openAIResponse([
        {
          categoryId: 'speed',
          format: 'diagram-math',
          from: 'km/h',
          to: 'm/s',
          value: 36,
          comparisonFrom: 'km/s',
          comparisonValue: 0.002,
          operation: 'add'
        },
        {
          categoryId: 'speed',
          format: 'motion-trip',
          distanceKm: 6,
          outboundMinutes: 10,
          returnMinutes: 20
        }
      ]);
    }
  });

  await service.prefetch({
    categories: ['speed'],
    unitSets: { speed: ['cm/s', 'm/s', 'km/h', 'km/s'] }
  });
  assert.match(requestBody.input, /motion-trip/);
  assert.deepEqual(service.takeQuestion(), {
    categoryId: 'speed',
    from: 'km/h',
    to: 'm/s',
    value: 36,
    format: 'diagram-math',
    comparisonFrom: 'km/s',
    comparisonValue: 0.002,
    operation: 'add'
  });
  assert.deepEqual(service.takeQuestion(), {
    categoryId: 'speed',
    format: 'motion-trip',
    distanceKm: 6,
    outboundMinutes: 10,
    returnMinutes: 20
  });
});

test('speed expedition batch reports an error if AI omits the interactive trip', async () => {
  const memory = storage();
  memory.set(KEY, 'sk-test');
  memory.set(ENABLED, 'true');
  const statuses = [];
  const service = new AIQuestionService({
    fetchImpl: async () => openAIResponse([
      {
        categoryId: 'speed',
        format: 'diagram-math',
        from: 'km/h',
        to: 'm/s',
        value: 36,
        comparisonFrom: 'km/s',
        comparisonValue: 0.002,
        operation: 'add'
      },
      {
        categoryId: 'speed',
        format: 'motion-trip',
        distanceKm: 6,
        outboundMinutes: 0,
        returnMinutes: 20
      }
    ]),
    onStatus: status => statuses.push(status)
  });

  await service.prefetch({
    categories: ['speed'],
    unitSets: { speed: ['cm/s', 'm/s', 'km/h', 'km/s'] }
  });
  assert.equal(service.takeQuestion(), null);
  assert.equal(statuses.at(-1).type, 'error');
  assert.match(statuses.at(-1).message, /valid interactive speed question/);
});
