import { CONVERSION_CATEGORIES } from '../data/conversions.js';

const API_KEY_STORAGE_KEY = 'unitHunterOpenAIKey';
const ENABLED_STORAGE_KEY = 'unitHunterAIQuestionsEnabled';
const API_URL = 'https://api.openai.com/v1/responses';
const MODELS_URL = 'https://api.openai.com/v1/models';
const MODEL = 'gpt-6.2-astra';
const QUESTION_BATCH_SIZE = 5;
const RETRY_DELAY_MS = 30000;
const REQUEST_TIMEOUT_MS = 60000;
const QUESTION_FORMATS = ['convert', 'reverse', 'choose-unit', 'compare', 'word-problem'];
const DIAGRAM_QUESTION_FORMAT = 'diagram-math';
const MOTION_TRIP_FORMAT = 'motion-trip';

export class AIQuestionService {
  constructor({ fetchImpl = globalThis.fetch, onStatus = () => {} } = {}) {
    this.fetchImpl = fetchImpl;
    this.onStatus = onStatus;
    this.queue = [];
    this.mediaByCategory = new Map();
    this.mediaLoads = new Map();
    this.mediaLoaded = new Set();
    this.mediaListeners = new Set();
    this.statusListeners = new Set();
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

  getMedia(categoryId) {
    return this.mediaByCategory.get(categoryId) || { images: [], sources: [] };
  }

  subscribeMedia(listener) {
    this.mediaListeners.add(listener);
    return () => this.mediaListeners.delete(listener);
  }

  subscribeStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  loadMedia(categoryIds, unitSets = {}) {
    if (!this.enabled || !this.apiKey) return Promise.resolve();
    const ids = [...new Set(categoryIds)].filter(id => CONVERSION_CATEGORIES[id]);
    const missing = ids.filter(id => !this.mediaLoaded.has(id) && !this.mediaLoads.has(id));
    if (!missing.length) return Promise.all(ids.map(id => this.mediaLoads.get(id)).filter(Boolean));
    const load = this.requestMedia(missing, unitSets);
    missing.forEach(id => this.mediaLoads.set(id, load));
    return load;
  }

  async requestMedia(categoryIds, unitSets) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const units = Object.fromEntries(categoryIds.map(id => [
        id,
        Array.isArray(unitSets[id]) ? unitSets[id] : Object.keys(CONVERSION_CATEGORIES[id].units)
      ]));
      const response = await this.fetchImpl(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          reasoning: { effort: 'low' },
          tools: [{ type: 'web_search', search_content_types: ['text', 'image'], image_settings: { max_results: 5, caption: true } }],
          tool_choice: 'required',
          include: ['web_search_call.results'],
          input: `Search for clear educational images and reliable reference pages for these SI unit categories and units: ${JSON.stringify(units)}. Use ${getLanguageName()} search terms. Return concise results.`
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(formatOpenAIError(response.status, payload?.error?.message));
      this.cacheSearchResults(payload?.output, categoryIds, id => units[id]);
    } catch (error) {
      if (error.name !== 'AbortError') this.setStatus('error', `Web images unavailable: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
      categoryIds.forEach(id => {
        this.mediaLoaded.add(id);
        this.mediaLoads.delete(id);
      });
    }
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
      this.setStatus('idle', 'AI questions enabled for casual and practice runs, including diagrams and interactive speed trips; ranked questions stay deterministic.');
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
    this.setStatus('loading', 'Checking OpenAI API key…');
    void this.validateKey(key);
    return true;
  }

  async validateKey(key = this.apiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(MODELS_URL, {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal
      });
      const payload = await response.json();
      if (!response.ok) {
        const detail = payload?.error?.message || `OpenAI request failed (${response.status}).`;
        throw new Error(response.status === 401
          ? `Invalid API key. Check that the key is copied correctly. (${detail})`
          : detail);
      }
      if (key === this.apiKey) this.setStatus('ready', 'OpenAI accepted the API key. Model and web-search access will be checked when questions are requested.');
      return true;
    } catch (error) {
      if (key === this.apiKey) this.setStatus('error', error.name === 'AbortError'
        ? 'API key check timed out. Check your connection and try again.'
        : `API key check failed: ${error.message}`);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
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
    const motionTripsAllowed = expeditionQuestions && allowedCategories.includes('speed');
    const reusableSources = allowedCategories.flatMap(id => this.getMedia(id).sources)
      .filter(source => source.snippet)
      .slice(0, 12);
    const reuseSearch = reusableSources.length > 0
      && allowedCategories.every(id => this.getMedia(id).sources.some(source => source.snippet));
    const allowedFormats = expeditionQuestions
      ? [
        ...QUESTION_FORMATS,
        DIAGRAM_QUESTION_FORMAT,
        ...(motionTripsAllowed ? [MOTION_TRIP_FORMAT] : [])
      ]
      : QUESTION_FORMATS;

    const requestId = ++this.requestId;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    this.request = controller;
    this.setStatus('loading', 'Searching the web and preparing AI questions…');

    try {
      const response = await this.fetchImpl(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          reasoning: { effort: 'low' },
          text: { format: { type: 'json_object' } },
          ...(reuseSearch ? {} : { tools: [{
            type: 'web_search',
            search_content_types: ['text', 'image'],
            image_settings: { max_results: 5, caption: true }
          }] }),
          ...(reuseSearch ? {} : { tool_choice: 'required', include: ['web_search_call.results'] }),
          input: `${reuseSearch ? `Use this cached web research from this session: ${JSON.stringify(reusableSources)}. ` : `Search the web for reliable educational context and representative images for these SI unit categories and units: ${JSON.stringify(Object.fromEntries(allowedCategories.map(id => [id, getUnits(id)])))}. `}Then create ${QUESTION_BATCH_SIZE} practice questions grounded in the ${reuseSearch ? 'cached' : 'searched'} context. Return only JSON with a questions array. Write question text in ${getLanguageName()}. Standard questions require categoryId (one of ${allowedCategories.join(', ')}), format (one of ${allowedFormats.join(', ')}), from (a valid unit key), to (a different valid unit key), and numeric value from 0.01 to 10000. Compare also needs comparisonFrom and comparisonValue. ${expeditionQuestions ? 'Diagram-math needs comparisonFrom, comparisonValue, operation (add or difference), three different units, and at least one such item.' : ''} ${motionTripsAllowed ? 'Motion-trip must use speed and distanceKm (0,100], outboundMinutes and returnMinutes (0,360], include at least one such item, and omit from/to/value.' : ''} choose-unit only applies to categories with at least four units. Do not provide answers; the game calculates and verifies every answer. Vary formats and unit pairs. Keep numeric fields as JSON numbers.`
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatOpenAIError(response.status, payload?.error?.message));
      }

      const content = payload?.output_text
        || payload?.output?.flatMap(item => item?.content || []).find(item => item?.type === 'output_text')?.text;
      if (typeof content !== 'string') throw new Error('OpenAI returned an empty question batch.');
      const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
      if (!Array.isArray(parsed.questions)) throw new Error('OpenAI response did not contain a questions array.');

      if (requestId !== this.requestId) return;
      this.cacheSearchResults(payload?.output, allowedCategories, getUnits);
      const allowed = new Set(allowedCategories);
      const questions = [];
      for (const question of parsed.questions.slice(0, QUESTION_BATCH_SIZE)) {
        const validUnits = getUnits(question?.categoryId);
        const format = allowedFormats.includes(question?.format) ? question.format : 'convert';
        if (format === MOTION_TRIP_FORMAT) {
          if (
            motionTripsAllowed
            && question?.categoryId === 'speed'
            && allowed.has(question.categoryId)
            && Number.isFinite(question.distanceKm) && question.distanceKm > 0 && question.distanceKm <= 100
            && Number.isFinite(question.outboundMinutes) && question.outboundMinutes > 0 && question.outboundMinutes <= 360
            && Number.isFinite(question.returnMinutes) && question.returnMinutes > 0 && question.returnMinutes <= 360
          ) {
            questions.push({
              categoryId: 'speed',
              format,
              distanceKm: question.distanceKm,
              outboundMinutes: question.outboundMinutes,
              returnMinutes: question.returnMinutes
            });
          }
          continue;
        }
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
      if (motionTripsAllowed && !questions.some(question => question.format === MOTION_TRIP_FORMAT)) {
        throw new Error('OpenAI did not return a valid interactive speed question.');
      }
      const sharedSources = [...new Map(allowedCategories.flatMap(id => this.getMedia(id).sources).map(source => [source.url, source])).values()].slice(0, 5);
      this.queue.push(...questions.map(question => {
        const sources = this.getMedia(question.categoryId).sources.length
          ? this.getMedia(question.categoryId).sources
          : sharedSources;
        return sources.length ? { ...question, sources } : question;
      }));
      this.retryAt = 0;
      this.setStatus('ready', `${this.queue.length} AI questions ready.`);
    } catch (error) {
      if (requestId !== this.requestId) return;
      this.retryAt = Date.now() + RETRY_DELAY_MS;
      this.setStatus('error', error.name === 'AbortError'
        ? 'AI question request timed out. Using built-in questions.'
        : `AI questions unavailable: ${error instanceof TypeError ? `Network/browser request failed (${error.message}). Check your connection and whether the browser allows requests to api.openai.com.` : error.message}`);
    } finally {
      clearTimeout(timeoutId);
      if (requestId === this.requestId) this.request = null;
    }
  }

  cacheSearchResults(output, categoryIds, getUnits) {
    const calls = (Array.isArray(output) ? output : []).filter(item => item?.type === 'web_search_call');
    const results = calls.flatMap(item => item.results || item.action?.results || []);
    const images = results.filter(result => result?.type === 'image_result').map(result => ({
      url: safeHttpsUrl(result.image_url || result.thumbnail_url),
      sourceUrl: safeHttpsUrl(result.source_website_url),
      caption: String(result.caption || result.title || 'Web image').slice(0, 180)
    })).filter(image => image.url && image.sourceUrl);
    const sources = calls.flatMap(item => [
      ...(item.action?.sources || item.sources || []),
      ...(item.results?.filter(result => result?.type !== 'image_result') || [])
    ]).map(source => ({
      url: safeHttpsUrl(source.url),
      title: String(source.title || source.url || 'Web source').slice(0, 180),
      snippet: String(source.snippet || source.description || '').slice(0, 500)
    })).filter(source => source.url);

    for (const categoryId of categoryIds) {
      const category = CONVERSION_CATEGORIES[categoryId];
      const terms = [categoryId, category?.name, ...getUnits(categoryId)].filter(Boolean).map(term => String(term).toLowerCase());
      const rankedImages = images.map(image => {
        const caption = image.caption.toLowerCase();
        const tokens = new Set(caption.match(/[\wµ²³]+/g) || []);
        return {
          image,
          score: terms.reduce((score, term) => {
            const normalized = term.toLowerCase();
            return score + (normalized.length < 3 ? Number(tokens.has(normalized)) : Number(caption.includes(normalized)));
          }, 0)
        };
      }).sort((a, b) => b.score - a.score);
      const matchedImages = rankedImages.filter(item => item.score > 0).map(item => item.image);
      const categoryImages = matchedImages.length ? matchedImages : categoryIds.length === 1 ? images : [];
      const categorySources = sources.length ? sources : results.filter(result => result?.type !== 'image_result').map(source => ({
        url: safeHttpsUrl(source.url),
        title: String(source.title || source.url || 'Web source').slice(0, 180),
        snippet: String(source.snippet || source.description || '').slice(0, 500)
      })).filter(source => source.url);
      if (categoryImages.length || categorySources.length) this.mediaByCategory.set(categoryId, {
        images: categoryImages.slice(0, 2),
        sources: [...new Map(categorySources.map(source => [source.url, source])).values()].slice(0, 5)
      });
    }
    for (const listener of this.mediaListeners) listener(categoryIds);
  }

  setStatus(type, message) {
    this.status = { type, message };
    this.onStatus({ type, message });
    for (const listener of this.statusListeners) listener(this.status);
  }
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function formatOpenAIError(status, message = '') {
  const detail = message || `OpenAI request failed (${status}).`;
  if (status === 401) return `OpenAI rejected the API key (401). Check that it is an API key from the OpenAI API Platform and that it has not been revoked. ${detail}`;
  if (status === 403) return `The API key was accepted, but this project cannot use the requested model or web search (403). Check project permissions. ${detail}`;
  if (status === 429) return `OpenAI rate or usage limit reached (429). Check API billing and project limits. ${detail}`;
  if (status === 404) return `The requested OpenAI model or API endpoint was not found (404). ${detail}`;
  return `OpenAI request failed (${status}). ${detail}`;
}

function getLanguageName() {
  try { return localStorage.getItem('unitHunterLanguage') === 'en' ? 'English' : 'Thai'; }
  catch { return 'Thai'; }
}
