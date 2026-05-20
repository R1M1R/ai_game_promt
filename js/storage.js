/**
 * localStorage layer — API key, history, AI settings, UI prefs.
 */

export const STORAGE_KEYS = {
  apiKey: 'aipk_v4_apiKey',
  history: 'aipk_v4_history',
  aiSettings: 'aipk_v4_aiSettings',
  language: 'aipk_v4_language',
  sidebarOpen: 'aipk_v4_sidebarOpen',
  historyFilter: 'aipk_v4_historyFilter',
};

export const JSON_FIELDS = [
  'mj_banner',
  'mj_menu',
  'suno_style',
  'suno_lyrics',
  'steam_desc',
  'twitter_post',
];

export const DEFAULT_AI_SETTINGS = {
  customRules: '',
  temperature: 0.85,
};

const MAX_HISTORY = 50;

export function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId() {
  return `kit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function sanitizeFilename(name) {
  return (
    (name || 'PromoKit')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'PromoKit'
  );
}

// ——— API Key ———

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEYS.apiKey) || '';
}

export function setApiKey(key) {
  if (key) localStorage.setItem(STORAGE_KEYS.apiKey, key);
  else localStorage.removeItem(STORAGE_KEYS.apiKey);
}

// ——— AI Settings ———

export function getAiSettings() {
  const stored = loadJson(STORAGE_KEYS.aiSettings, null);
  return { ...DEFAULT_AI_SETTINGS, ...stored };
}

export function saveAiSettings(settings) {
  saveJson(STORAGE_KEYS.aiSettings, {
    customRules: settings.customRules ?? '',
    temperature:
      typeof settings.temperature === 'number'
        ? settings.temperature
        : DEFAULT_AI_SETTINGS.temperature,
  });
}

// ——— Language ———

export function getStoredLanguage() {
  const lang = localStorage.getItem(STORAGE_KEYS.language);
  return lang === 'ru' ? 'ru' : 'en';
}

export function setStoredLanguage(lang) {
  localStorage.setItem(STORAGE_KEYS.language, lang === 'ru' ? 'ru' : 'en');
}

// ——— Sidebar ———

export function getSidebarOpen() {
  return loadJson(STORAGE_KEYS.sidebarOpen, false);
}

export function setSidebarOpen(open) {
  saveJson(STORAGE_KEYS.sidebarOpen, Boolean(open));
}

// ——— History filter ———

export function getHistoryFilter() {
  return localStorage.getItem(STORAGE_KEYS.historyFilter) === 'favorites'
    ? 'favorites'
    : 'all';
}

export function setHistoryFilter(filter) {
  localStorage.setItem(
    STORAGE_KEYS.historyFilter,
    filter === 'favorites' ? 'favorites' : 'all'
  );
}

// ——— History ———

export function loadHistory() {
  const items = loadJson(STORAGE_KEYS.history, []);
  return Array.isArray(items) ? items : [];
}

export function saveHistory(history) {
  saveJson(STORAGE_KEYS.history, history.slice(0, MAX_HISTORY));
}

export function addHistoryEntry(entry) {
  const history = loadHistory();
  history.unshift(entry);
  saveHistory(history);
  return history;
}

export function updateHistoryEntry(id, patch) {
  const history = loadHistory();
  const idx = history.findIndex((h) => h.id === id);
  if (idx === -1) return history;
  history[idx] = { ...history[idx], ...patch };
  saveHistory(history);
  return history;
}

export function deleteHistoryEntry(id) {
  const history = loadHistory().filter((h) => h.id !== id);
  saveHistory(history);
  return history;
}

export function toggleFavorite(id) {
  const history = loadHistory();
  const entry = history.find((h) => h.id === id);
  if (!entry) return history;
  entry.favorite = !entry.favorite;
  saveHistory(history);
  return history;
}

export function createHistoryEntry({ inputs, generatedJson, aiSettings, language }) {
  return {
    id: generateId(),
    date: new Date().toISOString(),
    title: inputs.gameTitle,
    inputs,
    generated_json: generatedJson,
    ai_settings: {
      customRules: aiSettings.customRules || '',
      temperature: aiSettings.temperature,
      language,
    },
    favorite: false,
  };
}
