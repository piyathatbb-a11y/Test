import { CONVERSION_CATEGORIES } from '../data/conversions.js';

const API_KEY_STORAGE_KEY = 'unitHunterOpenAIKey';
const ENABLED_STORAGE_KEY = 'unitHunterAIQuestionsEnabled';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const QUESTION_BATCH_SIZE = 5;
const RETRY_DELAY_MS = 30000;
const REQUEST_TIMEOUT_MS = 20000;
const QUESTION_FORMATS = ['convert', 'reverse', 'choose-unit', 'compare', 'word-problem'];
const DIAGRAM_QUESTION_FORMAT = 'diagram-math';

export class AIQuestionService {
  constructor({ fetchImpl = globalThis.fetch, onStatus = () => {} } = {}) {
    this.fetchImpl = fetchImpl;
    this.onStatus = onStatus;
    this.queue = [];
    this.request = null;
    this.requestId = 0;
    this.retryAt = 0;
    this.status = { type: 'idle', message: 'AI question generation is off.' };

    try {
      this.apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
      this.enabled = localStorage.getItem(ENABLED_STORAGE_KEY) === 'true';
    } catch (error) {
      this.apiKey = '';
      this.enabled = false;
      this.setStatus('error', `Could not read AI settings: ${error.message}`);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  hasKey() {
    return Boolean(this.apiKey);
  }

  getStatus() {
    return { ...this.status };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    try {
      localStorage.setItem(ENABLED_STORAGE_KEY, String(this.enabled));
    } catch (error) {
      this.setStatus('error', `Could not save AI preference: ${error.message}`);
      return;
    }

    if (!this.enabled) {
      this.resetQueue();
      this.setStatus('idle', 'AI question generation is off.');
    } else if (!this.apiKey) {
      this.setStatus('error', 'Enter and save an OpenAI API key to use AI questions.');
    } else {
      this.setStatus('idle', 'AI questions enabled for casual and practice runs, including diagram calculations; ranked questions stay deterministic.');
    }
  }

  saveKey(value) {
    const key = value.trim();
    if (!key) {
      this.setStatus('error', 'Enter an OpenAI API key before saving.');
      return false;
    }

    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } catch (error) {
      this.setStatus('error', `Could not save API key in this browser: ${error.message}`);
      return false;
    }

    this.apiKey = key;
    this.resetQueue();
    this.setStatus('idle', 'API key saved in this browser. It is not stored securely.');
    return true;
  }

  clearKey() {
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      this.setStatus('error', `Could not remove API key from this browser: ${error.message}`);
      return false;
    }

    this.apiKey = '';
    this.resetQueue();
    this.setStatus('idle', 'API key removed from this browser.');
    return true;
  }

  resetQueue() {
    this.queue = [];
    this.retryAt = 0;
    this.requestId++;
    this.request?.abort();
    this.request = null;
  }

  takeQuestion(options = {}) {
    const question = this.queue.shift() || null;
    if (this.queue.length <= 2) void this.prefetch(options);
    return question;
  }

  async prefetch(options = {}) {
    if (!this.enabled || !this.apiKey || this.queue.length > 2 || this.request) return;
    if (Date.now() < this.retryAt) return;

    const unitSets = options.unitSets || {};
    const expeditionQuestions = Object.keys(unitSets).length > 0;
    const allowedFormats = expeditionQuestions
      ? [...QUESTION_FORMATS, DIAGRAM_QUESTION_FORMAT]
      : QUESTION_FORMATS;
    const getUnits = id => (
      Array.isArray(unitSets[id])
        ? unitSets[id]
        : Object.keys(CONVERSION_CATEGORIES[id]?.units || {})
    );
    const availableCategories = [...new Set([
      ...Object.keys(CONVERSION_CATEGORIES),
      ...Object.keys(unitSets)
    ])].filter(id => getUnits(id).length > 0);
    const allowedCategories = Array.isArray(options.categories) && options.categories.length
      ? options.categories.filter(id => availableCategories.includes(id))
      : availableCategories;
    if (allowedCategories.length === 0) {
      this.setStatus('error', 'No valid unit categories are selected for AI questions.');
      return;
    }

    const requestId = ++this.requestId;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    this.request = controller;
    this.setStatus('loading', 'Generating the next batch of AI questions…');

    try {
      const response = await this.fetchImpl(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `Create SI unit-conversion practice questions. Return only a JSON object with a "questions" array. Each item must have categoryId (one of the allowed IDs), format (one of ${allowedFormats.join(', ')}), from (a unit key in that category), to (a different unit key in that category), and value (a positive number from 0.01 to 10000). For compare, also provide comparisonFrom (an allowed unit key) and comparisonValue (a positive number from 0.01 to 10000). ${expeditionQuestions ? 'For diagram-math, also provide comparisonFrom, comparisonValue, and operation ("add" or "difference"); from, comparisonFrom, and to must be three different units; include at least one valid diagram-math item in the batch.' : ''} choose-unit is only allowed when the category has at least four units. Do not provide answers; the game calculates and verifies them. Use varied formats and unit pairs across the batch.`
            },
            {
              role: 'user',
              content: JSON.stringify({
                allowedCategories,
                allowedFormats,
                units: Object.fromEntries(allowedCategories.map(id => [
                  id,
                  getUnits(id)
                ])),
                numberOfQuestions: QUESTION_BATCH_SIZE
              })
            }
          ]
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || `OpenAI request failed (${response.status}).`);
      }

      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('OpenAI returned an empty question batch.');
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.questions)) throw new Error('OpenAI response did not contain a questions array.');

      if (requestId !== this.requestId) return;
      const allowed = new Set(allowedCategories);
      const questions = [];
      for (const question of parsed.questions.slice(0, QUESTION_BATCH_SIZE)) {
        const validUnits = getUnits(question?.categoryId);
        const format = allowedFormats.includes(question?.format) ? question.format : 'convert';
        const comparisonIsValid = (
          validUnits.includes(question?.comparisonFrom)
          && Number.isFinite(question?.comparisonValue)
          && question.comparisonValue > 0 && question.comparisonValue <= 10000
        );
        if (
          question && allowed.has(question.categoryId)
          && validUnits.includes(question.from)
          && validUnits.includes(question.to)
          && question.from !== question.to
          && Number.isFinite(question.value) && question.value > 0 && question.value <= 10000
          && (format !== 'choose-unit' || validUnits.length >= 4)
          && (
            format !== 'compare'
            || comparisonIsValid
          )
          && (
            format !== DIAGRAM_QUESTION_FORMAT
            || (
              expeditionQuestions
              && comparisonIsValid
              && question.comparisonFrom !== question.from
              && question.comparisonFrom !== question.to
              && ['add', 'difference'].includes(question.operation)
            )
          )
        ) {
          questions.push({
            categoryId: question.categoryId,
            from: question.from,
            to: question.to,
            value: question.value,
            format,
            ...(format === 'compare' || format === DIAGRAM_QUESTION_FORMAT ? {
              comparisonFrom: question.comparisonFrom,
              comparisonValue: question.comparisonValue,
              ...(format === DIAGRAM_QUESTION_FORMAT ? { operation: question.operation } : {})
            } : {})
          });
        }
      }

      if (questions.length === 0) throw new Error('OpenAI did not return any valid unit-conversion questions.');
      if (expeditionQuestions && !questions.some(question => question.format === DIAGRAM_QUESTION_FORMAT)) {
        throw new Error('OpenAI did not return a valid diagram calculation question.');
      }
      this.queue.push(...questions);
      this.retryAt = 0;
      this.setStatus('ready', `${this.queue.length} AI questions ready.`);
    } catch (error) {
      if (requestId !== this.requestId) return;
      this.retryAt = Date.now() + RETRY_DELAY_MS;
      this.setStatus('error', error.name === 'AbortError'
        ? 'AI question request timed out. Using built-in questions.'
        : `AI questions unavailable: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
      if (requestId === this.requestId) this.request = null;
    }
  }

  setStatus(type, message) {
    this.status = { type, message };
    this.onStatus({ type, message });
  }
}
