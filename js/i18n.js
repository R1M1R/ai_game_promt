/**
 * Internationalization — EN / RU with extensible dictionary map.
 */

import { getStoredLanguage, setStoredLanguage } from './storage.js';

const dictionaries = {
  en: {
    appTitle: 'AI Indie Promo Kit',
    appVersion: 'v4.0',
    toggleHistory: 'Toggle History',
    closeSidebar: 'Close sidebar',
    apiKeyPlaceholder: 'OpenAI API Key',
    apiKeySave: 'Save',
    apiKeyEdit: 'Edit',
    language: 'Language',
    aiSettings: 'AI Settings',
    projectHistory: 'Project History',
    historyEmpty: 'No kits generated yet. Create your first promo kit!',
    historyFilterAll: 'All',
    historyFilterFavorites: 'Favorites',
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove from favorites',
    deleteHistory: 'Delete',
    defineGame: 'Define Your Game',
    labelGameTitle: 'Game Title',
    placeholderGameTitle: 'e.g. Neon Drift Protocol',
    labelGenre: 'Genre',
    placeholderGenre: 'e.g. Roguelike Racing',
    labelVisualStyle: 'Visual Style',
    stylePixelArt: 'Pixel Art',
    styleUnreal: 'Unreal Engine 5',
    styleAnime: 'Anime',
    styleDarkFantasy: 'Dark Fantasy',
    styleLowPoly: 'Low Poly',
    labelCoreMechanic: 'Core Mechanic',
    placeholderCoreMechanic:
      'Describe the core gameplay loop, unique hooks, and player fantasy...',
    generateKit: 'Generate Kit',
    generating: 'Generating...',
    generatedKit: 'Generated Promo Kit',
    exportMarkdown: 'Export to Markdown',
    outputPlaceholderTitle: 'Your generated promo kit will appear here.',
    outputPlaceholderHint: 'Fill in the form and hit Generate Kit.',
    sectionArt: 'Art — Midjourney',
    sectionMusic: 'Music — Suno',
    sectionMarketing: 'Marketing — Steam & Social',
    labelBanner: 'Banner',
    labelMenuArt: 'Menu Art',
    labelStyle: 'Style',
    labelLyrics: 'Lyrics',
    labelSteam: 'Steam Page',
    labelTwitter: 'Twitter / X',
    copy: 'Copy',
    footer:
      'AI Indie Promo Kit v4.0 — Built for indie devs. API key stored locally only.',
    modalAiSettings: 'AI Settings',
    modalClose: 'Close',
    labelCustomRules: 'Custom Rules (AI Memory)',
    placeholderCustomRules:
      'e.g. Always mention our studio name. Use dark humor in social posts. Never use emoji in Steam copy.',
    labelTemperature: 'Creativity (Temperature)',
    temperatureHint: 'Lower = more focused. Higher = more creative.',
    saveSettings: 'Save Settings',
    toastDismiss: 'Dismiss',
    toastApiKeySaved: 'API key saved locally.',
    toastApiKeyInvalid: 'Please enter a valid API key.',
    toastApiKeyFormat: 'API key should typically start with "sk-".',
    toastApiKeyRequired: 'Save your OpenAI API key before generating.',
    toastFillFields: 'Please fill in all required fields.',
    toastCopied: 'Copied to clipboard.',
    toastCopyFailed: 'Failed to copy. Check browser permissions.',
    toastGenerated: 'Promo kit generated successfully!',
    toastGenerationFailed: 'Generation failed.',
    toastLoaded: 'Loaded: {title}',
    toastDeleted: 'History item deleted.',
    toastFavoriteAdded: 'Added to favorites.',
    toastFavoriteRemoved: 'Removed from favorites.',
    toastNothingExport: 'Nothing to export. Generate a kit first.',
    toastDownloaded: 'Downloaded {filename}',
    toastSettingsSaved: 'AI settings saved.',
    errorInvalidKey: 'Invalid API key. Check your key and try again.',
    errorRateLimit: 'Rate limit exceeded. Please wait and retry.',
    errorEmptyResponse: 'Empty response from API.',
    errorApiKeyRequired: 'API key is required. Save your OpenAI API key first.',
    errorInvalidField: 'Missing or invalid field: {field}',
  },
  ru: {
    appTitle: 'AI Indie Promo Kit',
    appVersion: 'v4.0',
    toggleHistory: 'История проектов',
    closeSidebar: 'Закрыть панель',
    apiKeyPlaceholder: 'Ключ OpenAI API',
    apiKeySave: 'Сохранить',
    apiKeyEdit: 'Изменить',
    language: 'Язык',
    aiSettings: 'Настройки ИИ',
    projectHistory: 'История проектов',
    historyEmpty: 'Пока нет наборов. Создайте первый промо-кит!',
    historyFilterAll: 'Все',
    historyFilterFavorites: 'Избранное',
    addFavorite: 'В избранное',
    removeFavorite: 'Убрать из избранного',
    deleteHistory: 'Удалить',
    defineGame: 'Опишите игру',
    labelGameTitle: 'Название игры',
    placeholderGameTitle: 'напр. Neon Drift Protocol',
    labelGenre: 'Жанр',
    placeholderGenre: 'напр. Roguelike-гонки',
    labelVisualStyle: 'Визуальный стиль',
    stylePixelArt: 'Пиксель-арт',
    styleUnreal: 'Unreal Engine 5',
    styleAnime: 'Аниме',
    styleDarkFantasy: 'Тёмное фэнтези',
    styleLowPoly: 'Low Poly',
    labelCoreMechanic: 'Основная механика',
    placeholderCoreMechanic:
      'Опишите игровой цикл, уникальные фишки и фантазию игрока...',
    generateKit: 'Сгенерировать кит',
    generating: 'Генерация...',
    generatedKit: 'Сгенерированный промо-кит',
    exportMarkdown: 'Экспорт в Markdown',
    outputPlaceholderTitle: 'Здесь появится ваш промо-кит.',
    outputPlaceholderHint: 'Заполните форму и нажмите «Сгенерировать кит».',
    sectionArt: 'Арт — Midjourney',
    sectionMusic: 'Музыка — Suno',
    sectionMarketing: 'Маркетинг — Steam и соцсети',
    labelBanner: 'Баннер',
    labelMenuArt: 'Меню',
    labelStyle: 'Стиль',
    labelLyrics: 'Текст песни',
    labelSteam: 'Страница Steam',
    labelTwitter: 'Twitter / X',
    copy: 'Копировать',
    footer:
      'AI Indie Promo Kit v4.0 — для инди-разработчиков. Ключ API хранится только локально.',
    modalAiSettings: 'Настройки ИИ',
    modalClose: 'Закрыть',
    labelCustomRules: 'Свои правила (память ИИ)',
    placeholderCustomRules:
      'напр. Всегда упоминать студию. Тёмный юмор в соцсетях. Без эмодзи в тексте Steam.',
    labelTemperature: 'Креативность (Temperature)',
    temperatureHint: 'Ниже — точнее. Выше — креативнее.',
    saveSettings: 'Сохранить настройки',
    toastDismiss: 'Закрыть',
    toastApiKeySaved: 'Ключ API сохранён локально.',
    toastApiKeyInvalid: 'Введите корректный ключ API.',
    toastApiKeyFormat: 'Ключ API обычно начинается с «sk-».',
    toastApiKeyRequired: 'Сначала сохраните ключ OpenAI API.',
    toastFillFields: 'Заполните все обязательные поля.',
    toastCopied: 'Скопировано в буфер обмена.',
    toastCopyFailed: 'Не удалось скопировать. Проверьте разрешения браузера.',
    toastGenerated: 'Промо-кит успешно сгенерирован!',
    toastGenerationFailed: 'Ошибка генерации.',
    toastLoaded: 'Загружено: {title}',
    toastDeleted: 'Запись удалена из истории.',
    toastFavoriteAdded: 'Добавлено в избранное.',
    toastFavoriteRemoved: 'Удалено из избранного.',
    toastNothingExport: 'Нечего экспортировать. Сначала сгенерируйте кит.',
    toastDownloaded: 'Скачан файл {filename}',
    toastSettingsSaved: 'Настройки ИИ сохранены.',
    errorInvalidKey: 'Неверный ключ API. Проверьте ключ и повторите.',
    errorRateLimit: 'Превышен лимит запросов. Подождите и повторите.',
    errorEmptyResponse: 'Пустой ответ от API.',
    errorApiKeyRequired: 'Нужен ключ API. Сначала сохраните ключ OpenAI.',
    errorInvalidField: 'Отсутствует или неверное поле: {field}',
  },
};

let currentLang = getStoredLanguage();

const listeners = new Set();

export function getLanguage() {
  return currentLang;
}

export function getLanguageLabel(lang) {
  return lang === 'ru' ? 'Русский' : 'English';
}

export function t(key, params = {}) {
  const dict = dictionaries[currentLang] || dictionaries.en;
  let str = dict[key] ?? dictionaries.en[key] ?? key;
  Object.entries(params).forEach(([k, v]) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  });
  return str;
}

export function setLanguage(lang) {
  const next = lang === 'ru' ? 'ru' : 'en';
  if (next === currentLang) return;
  currentLang = next;
  setStoredLanguage(next);
  document.documentElement.lang = next;
  applyTranslations();
  notifyListeners();
}

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn(currentLang));
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', t(key));
  });

  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl) {
    titleEl.textContent = `${t('appTitle')} ${t('appVersion')}`;
  }

  const langSelect = document.getElementById('lang-select');
  if (langSelect) langSelect.value = currentLang;
}

export function initI18n() {
  currentLang = getStoredLanguage();
  document.documentElement.lang = currentLang;
  applyTranslations();
}
