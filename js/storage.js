/**
 * AI Indie Promo Kit — localStorage layer (global AIPK.storage)
 */
(function (global) {
  'use strict';

  var STORAGE_KEYS = {
    apiKey: 'aipk_apiKey',
    history: 'aipk_history',
    aiSettings: 'aipk_aiSettings',
    sidebarOpen: 'aipk_sidebarOpen',
  };

  var JSON_FIELDS = [
    'mj_banner',
    'mj_menu',
    'suno_style',
    'suno_lyrics',
    'steam_desc',
    'twitter_post',
  ];

  var DEFAULT_AI_SETTINGS = {
    customRules: '',
    temperature: 0.85,
  };

  var MAX_HISTORY = 50;

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function generateId() {
    return 'kit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function sanitizeFilename(name) {
    return (
      (name || 'PromoKit')
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 80) || 'PromoKit'
    );
  }

  function getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.apiKey) || '';
  }

  function setApiKey(key) {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.apiKey, key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.apiKey);
    }
  }

  function getAiSettings() {
    var stored = loadJson(STORAGE_KEYS.aiSettings, null);
    if (!stored) return { customRules: '', temperature: 0.85 };
    return {
      customRules: stored.customRules || '',
      temperature:
        typeof stored.temperature === 'number' && !isNaN(stored.temperature)
          ? stored.temperature
          : 0.85,
    };
  }

  function saveAiSettings(settings) {
    var temp = Number(settings.temperature);
    if (isNaN(temp)) temp = DEFAULT_AI_SETTINGS.temperature;
    temp = Math.min(1, Math.max(0, temp));

    saveJson(STORAGE_KEYS.aiSettings, {
      customRules: settings.customRules || '',
      temperature: temp,
    });
  }

  function getSidebarOpen() {
    return !!loadJson(STORAGE_KEYS.sidebarOpen, false);
  }

  function setSidebarOpen(open) {
    saveJson(STORAGE_KEYS.sidebarOpen, !!open);
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    return {
      id: entry.id,
      date: entry.date,
      title: entry.title,
      inputs: entry.inputs || {},
      generated_json: entry.generated_json || {},
      ai_settings: entry.ai_settings || {},
      favorite: !!entry.favorite,
    };
  }

  function loadHistory() {
    var items = loadJson(STORAGE_KEYS.history, []);
    if (!Array.isArray(items)) return [];
    return items.map(normalizeEntry).filter(Boolean);
  }

  function saveHistory(history) {
    saveJson(STORAGE_KEYS.history, history.slice(0, MAX_HISTORY));
  }

  function addHistoryEntry(entry) {
    var history = loadHistory();
    history.unshift(entry);
    saveHistory(history);
    return history;
  }

  function deleteHistoryEntry(id) {
    var history = loadHistory().filter(function (h) {
      return h.id !== id;
    });
    saveHistory(history);
    return history;
  }

  function createHistoryEntry(payload) {
    return {
      id: generateId(),
      date: new Date().toISOString(),
      title: payload.inputs.gameTitle,
      inputs: payload.inputs,
      generated_json: payload.generatedJson,
      ai_settings: {
        customRules: payload.aiSettings.customRules || '',
        temperature: payload.aiSettings.temperature,
      },
      favorite: false,
    };
  }

  global.AIPK = global.AIPK || {};
  global.AIPK.storage = {
    STORAGE_KEYS: STORAGE_KEYS,
    JSON_FIELDS: JSON_FIELDS,
    DEFAULT_AI_SETTINGS: DEFAULT_AI_SETTINGS,
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    getAiSettings: getAiSettings,
    saveAiSettings: saveAiSettings,
    getSidebarOpen: getSidebarOpen,
    setSidebarOpen: setSidebarOpen,
    loadHistory: loadHistory,
    saveHistory: saveHistory,
    addHistoryEntry: addHistoryEntry,
    deleteHistoryEntry: deleteHistoryEntry,
    createHistoryEntry: createHistoryEntry,
    sanitizeFilename: sanitizeFilename,
    generateId: generateId,
  };
})(window);
