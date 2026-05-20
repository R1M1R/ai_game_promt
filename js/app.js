/**
 * AI Indie Promo Kit — UI bootstrap (single DOMContentLoaded init).
 */

import {
  JSON_FIELDS,
  getApiKey,
  setApiKey,
  getAiSettings,
  saveAiSettings,
  loadHistory,
  addHistoryEntry,
  deleteHistoryEntry,
  toggleFavorite,
  createHistoryEntry,
  getSidebarOpen,
  setSidebarOpen,
  getHistoryFilter,
  setHistoryFilter,
  sanitizeFilename,
  DEFAULT_AI_SETTINGS,
} from './storage.js';

import {
  initI18n,
  applyTranslations,
  setLanguage,
  getLanguage,
  getLocale,
  t,
  onLanguageChange,
} from './i18n.js';

import { generatePromoKit, buildMarkdown } from './api.js';

const state = {
  apiKey: '',
  apiKeyLocked: false,
  history: [],
  historyFilter: 'all',
  currentKit: null,
  currentInputs: null,
  currentAiSettings: null,
  currentLanguage: 'ru',
  activeHistoryId: null,
  sidebarOpen: false,
  generating: false,
  aiSettings: { ...DEFAULT_AI_SETTINGS },
  apiHelpOpen: false,
};

/** @type {Record<string, HTMLElement | null>} */
const els = {};

const VISUAL_STYLES = ['Pixel Art', 'Unreal Engine 5', 'Anime', 'Dark Fantasy', 'Low Poly'];

function getEl(id) {
  return document.getElementById(id);
}

function cacheElements() {
  const ids = {
    apiKeyInput: 'api-key-input',
    apiKeyToggleBtn: 'api-key-toggle-btn',
    apiKeyBtnLabel: 'api-key-btn-label',
    apiKeyHelpToggle: 'api-key-help-toggle',
    apiKeyHelpPanel: 'api-key-help-panel',
    langSelect: 'lang-select',
    aiSettingsBtn: 'ai-settings-btn',
    aiSettingsModal: 'ai-settings-modal',
    aiSettingsClose: 'ai-settings-close',
    aiSettingsSave: 'ai-settings-save',
    customRulesInput: 'custom-rules',
    temperatureInput: 'temperature',
    temperatureValue: 'temperature-value',
    toggleSidebarBtn: 'toggle-sidebar-btn',
    closeSidebarBtn: 'close-sidebar-btn',
    sidebar: 'history-sidebar',
    sidebarOverlay: 'sidebar-overlay',
    mainWrapper: 'main-wrapper',
    historyList: 'history-list',
    historyEmpty: 'history-empty',
    historyFilterAll: 'history-filter-all',
    historyFilterFav: 'history-filter-favorites',
    gameForm: 'game-form',
    generateBtn: 'generate-btn',
    outputSection: 'output-section',
    outputPlaceholder: 'output-placeholder',
    outputGameTitle: 'output-game-title',
    exportMdBtn: 'export-md-btn',
    toastContainer: 'toast-container',
  };

  for (const [key, id] of Object.entries(ids)) {
    els[key] = getEl(id);
  }

  const critical = ['toggle-sidebar-btn', 'ai-settings-btn', 'ai-settings-modal', 'history-sidebar'];
  critical.forEach((id) => {
    if (!getEl(id)) console.error(`[AIPK] Critical element missing: #${id}`);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isDesktop() {
  return window.matchMedia('(min-width: 1024px)').matches;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(getLocale(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ——— Toast ———

function showToast(message, type = 'success') {
  if (!els.toastContainer) return;

  const toast = document.createElement('div');
  const isError = type === 'error';
  toast.className = `toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-xl glass border ${
    isError ? 'border-red-500/30 text-red-100' : 'border-emerald-500/30 text-emerald-100'
  }`;
  toast.innerHTML = `
    <i class="fa-solid ${isError ? 'fa-circle-exclamation text-red-400' : 'fa-circle-check text-emerald-400'} mt-0.5 shrink-0"></i>
    <p class="text-sm flex-1 leading-snug">${escapeHtml(message)}</p>
    <button type="button" class="btn btn-ghost btn-icon shrink-0 !w-8 !h-8 toast-dismiss" aria-label="${escapeHtml(t('toastDismiss'))}">
      <i class="fa-solid fa-xmark text-xs"></i>
    </button>
  `;

  const dismiss = () => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 280);
  };

  toast.querySelector('.toast-dismiss')?.addEventListener('click', dismiss);
  els.toastContainer.appendChild(toast);
  setTimeout(dismiss, 5000);
}

// ——— API Key ———

function updateApiKeyButtonLabel() {
  if (els.apiKeyBtnLabel) {
    els.apiKeyBtnLabel.textContent = state.apiKeyLocked ? t('apiKeyEdit') : t('apiKeySave');
  }
}

function lockApiKey() {
  state.apiKeyLocked = true;
  if (els.apiKeyInput) els.apiKeyInput.readOnly = true;
  const icon = els.apiKeyToggleBtn?.querySelector('i');
  if (icon) icon.className = 'fa-solid fa-pen';
  updateApiKeyButtonLabel();
}

function unlockApiKey() {
  state.apiKeyLocked = false;
  if (els.apiKeyInput) {
    els.apiKeyInput.readOnly = false;
    els.apiKeyInput.focus();
    els.apiKeyInput.select();
  }
  const icon = els.apiKeyToggleBtn?.querySelector('i');
  if (icon) icon.className = 'fa-solid fa-floppy-disk';
  updateApiKeyButtonLabel();
}

function initApiKey() {
  state.apiKey = getApiKey();
  if (state.apiKey && els.apiKeyInput) {
    els.apiKeyInput.value = state.apiKey;
    lockApiKey();
  } else {
    updateApiKeyButtonLabel();
  }
}

function saveApiKeyHandler() {
  const key = els.apiKeyInput?.value.trim() || '';
  if (!key) {
    showToast(t('toastApiKeyInvalid'), 'error');
    return;
  }
  if (!key.startsWith('sk-')) {
    showToast(t('toastApiKeyFormat'), 'error');
  }
  state.apiKey = key;
  setApiKey(key);
  lockApiKey();
  showToast(t('toastApiKeySaved'));
}

// ——— API key help panel ———

function setApiKeyHelpOpen(open) {
  state.apiHelpOpen = open;
  els.apiKeyHelpPanel?.classList.toggle('is-open', open);
  els.apiKeyHelpPanel?.setAttribute('aria-hidden', String(!open));
  els.apiKeyHelpToggle?.setAttribute('aria-expanded', String(open));
}

function toggleApiKeyHelp() {
  setApiKeyHelpOpen(!state.apiHelpOpen);
}

// ——— AI Settings modal ———

function openAiSettingsModal() {
  const modal = els.aiSettingsModal || getEl('ai-settings-modal');
  if (!modal) {
    console.error('[AIPK] AI Settings modal not found');
    return;
  }

  const rules = els.customRulesInput || getEl('custom-rules');
  const temp = els.temperatureInput || getEl('temperature');
  if (rules) rules.value = state.aiSettings.customRules || '';
  if (temp) temp.value = String(state.aiSettings.temperature ?? 0.85);

  syncTemperatureDisplay();
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeAiSettingsModal() {
  const modal = els.aiSettingsModal || getEl('ai-settings-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function saveAiSettingsFromModal() {
  const tempInput = els.temperatureInput || getEl('temperature');
  const rulesInput = els.customRulesInput || getEl('custom-rules');

  let temp = parseFloat(tempInput?.value ?? '0.85');
  if (Number.isNaN(temp)) temp = state.aiSettings.temperature ?? DEFAULT_AI_SETTINGS.temperature;
  temp = Math.min(1, Math.max(0, temp));

  state.aiSettings = {
    customRules: rulesInput?.value.trim() || '',
    temperature: temp,
  };
  saveAiSettings(state.aiSettings);
  if (tempInput) tempInput.value = String(temp);
  syncTemperatureDisplay();
  closeAiSettingsModal();
  showToast(t('toastSettingsSaved'));
}

function syncTemperatureDisplay() {
  const tempInput = els.temperatureInput || getEl('temperature');
  const tempVal = els.temperatureValue || getEl('temperature-value');
  if (tempVal && tempInput) {
    tempVal.textContent = parseFloat(tempInput.value).toFixed(1);
  }
}

// ——— Sidebar ———

function applySidebarState() {
  const open = state.sidebarOpen;
  const desktop = isDesktop();
  const sidebar = els.sidebar || getEl('history-sidebar');
  const overlay = els.sidebarOverlay || getEl('sidebar-overlay');
  const toggleBtn = els.toggleSidebarBtn || getEl('toggle-sidebar-btn');

  sidebar?.classList.toggle('is-open', open);
  document.body.classList.toggle('sidebar-open', open && desktop);

  if (desktop && open && sidebar) {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebar.offsetWidth}px`);
  }

  const showOverlay = open && !desktop;
  overlay?.classList.toggle('is-visible', showOverlay);
  overlay?.setAttribute('aria-hidden', String(!showOverlay));

  toggleBtn?.setAttribute('aria-expanded', String(open));
  setSidebarOpen(open);
}

function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  applySidebarState();
}

// ——— History ———

function getFilteredHistory() {
  return state.historyFilter === 'favorites'
    ? state.history.filter((h) => h.favorite)
    : state.history;
}

function updateHistoryFilterUI() {
  const allActive = state.historyFilter === 'all';
  const favActive = state.historyFilter === 'favorites';
  els.historyFilterAll?.classList.toggle('is-active', allActive);
  els.historyFilterFav?.classList.toggle('is-active', favActive);
}

function setActiveHistory(id) {
  state.activeHistoryId = id;
  els.historyList?.querySelectorAll('.history-item').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.id === id);
  });
}

function renderHistory() {
  if (!els.historyList) return;

  const items = getFilteredHistory();
  els.historyEmpty?.classList.toggle('hidden', items.length > 0);
  els.historyList.querySelectorAll('.history-item').forEach((el) => el.remove());

  items.forEach((entry) => {
    const isFav = Boolean(entry.favorite);
    const row = document.createElement('div');
    row.className = `history-item glass relative group ${state.activeHistoryId === entry.id ? 'is-active' : ''} ${isFav ? 'is-favorite' : ''}`;
    row.dataset.id = entry.id;

    row.innerHTML = `
      <button type="button" class="history-load-btn" data-id="${entry.id}">
        <p class="text-sm font-medium text-slate-200 truncate">${escapeHtml(entry.title)}</p>
        <p class="text-xs text-slate-500 mt-1">${escapeHtml(formatDate(entry.date))}</p>
        <p class="text-xs text-cyan-500/60 mt-0.5 truncate">${escapeHtml(entry.inputs?.genre || '')}</p>
      </button>
      <div class="history-actions">
        <button type="button" class="btn btn-history-icon btn-favorite ${isFav ? 'is-active' : ''}" data-action="favorite" data-id="${entry.id}" title="${escapeHtml(t(isFav ? 'removeFavorite' : 'addFavorite'))}">
          <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star text-xs"></i>
        </button>
        <button type="button" class="btn btn-history-icon btn-delete" data-action="delete" data-id="${entry.id}" title="${escapeHtml(t('deleteHistory'))}">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
    els.historyList.appendChild(row);
  });
}

function loadHistoryEntry(entry) {
  state.currentKit = entry.generated_json;
  state.currentInputs = entry.inputs;
  state.currentAiSettings = entry.ai_settings || state.aiSettings;
  state.currentLanguage = entry.ai_settings?.language || getLanguage();
  setFormInputs(entry.inputs);
  displayKit(entry.generated_json, entry.inputs?.gameTitle);
  setActiveHistory(entry.id);
  if (!isDesktop()) {
    state.sidebarOpen = false;
    applySidebarState();
  }
  showToast(t('toastLoaded', { title: entry.title }));
}

function handleHistoryListClick(e) {
  const favBtn = e.target.closest('[data-action="favorite"]');
  if (favBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = favBtn.dataset.id;
    state.history = toggleFavorite(id);
    const entry = state.history.find((h) => h.id === id);
    renderHistory();
    showToast(entry?.favorite ? t('toastFavoriteAdded') : t('toastFavoriteRemoved'));
    return;
  }

  const delBtn = e.target.closest('[data-action="delete"]');
  if (delBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = delBtn.dataset.id;
    state.history = deleteHistoryEntry(id);
    if (state.activeHistoryId === id) state.activeHistoryId = null;
    renderHistory();
    showToast(t('toastDeleted'));
    return;
  }

  const loadBtn = e.target.closest('.history-load-btn');
  if (loadBtn) {
    e.preventDefault();
    const entry = state.history.find((h) => h.id === loadBtn.dataset.id);
    if (entry) loadHistoryEntry(entry);
  }
}

// ——— Form ———

function getFormInputs() {
  return {
    gameTitle: getEl('game-title')?.value.trim() || '',
    genre: getEl('genre')?.value.trim() || '',
    visualStyle: getEl('visual-style')?.value || 'Pixel Art',
    coreMechanic: getEl('core-mechanic')?.value.trim() || '',
  };
}

function setFormInputs(inputs) {
  if (!inputs) return;
  const titleEl = getEl('game-title');
  const genreEl = getEl('genre');
  const styleEl = getEl('visual-style');
  const mechanicEl = getEl('core-mechanic');
  if (titleEl) titleEl.value = inputs.gameTitle || '';
  if (genreEl) genreEl.value = inputs.genre || '';
  if (styleEl) {
    const v = inputs.visualStyle || 'Pixel Art';
    styleEl.value = VISUAL_STYLES.includes(v) ? v : 'Pixel Art';
  }
  if (mechanicEl) mechanicEl.value = inputs.coreMechanic || '';
}

function setGenerating(isLoading) {
  state.generating = isLoading;
  const btn = els.generateBtn || getEl('generate-btn');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle('is-loading', isLoading);
  btn.setAttribute('aria-busy', String(isLoading));
}

function displayKit(kit, title) {
  if (!kit) return;
  JSON_FIELDS.forEach((field) => {
    const el = getEl(`val-${field}`);
    if (el) el.textContent = kit[field] || '';
  });
  if (els.outputGameTitle) {
    els.outputGameTitle.textContent = title ? `— ${title}` : '';
  }
  els.outputSection?.classList.remove('output-hidden');
  els.outputPlaceholder?.classList.add('hidden');
  els.outputPlaceholder?.classList.remove('xl:flex');
}

function hideOutput() {
  els.outputSection?.classList.add('output-hidden');
  els.outputPlaceholder?.classList.remove('hidden');
  els.outputPlaceholder?.classList.add('xl:flex');
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.classList.add('copied');
    const icon = btn.querySelector('i');
    const orig = icon?.className;
    if (icon) icon.className = 'fa-solid fa-check';
    showToast(t('toastCopied'));
    setTimeout(() => {
      btn.classList.remove('copied');
      if (icon && orig) icon.className = orig;
    }, 2000);
  } catch {
    showToast(t('toastCopyFailed'), 'error');
  }
}

function handleOutputClick(e) {
  const copyBtn = e.target.closest('.copy-btn');
  if (!copyBtn) return;
  e.preventDefault();
  const field = copyBtn.dataset.copyTarget;
  const text =
    state.currentKit?.[field] ||
    getEl(`val-${field}`)?.textContent ||
    '';
  if (text) copyToClipboard(text, copyBtn);
}

function downloadMarkdown() {
  if (!state.currentKit) {
    showToast(t('toastNothingExport'), 'error');
    return;
  }
  const md = buildMarkdown(
    state.currentKit,
    state.currentInputs,
    state.currentAiSettings || state.aiSettings,
    state.currentLanguage || getLanguage()
  );
  const filename = `${sanitizeFilename(state.currentInputs?.gameTitle)}-PromoKit.md`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(t('toastDownloaded', { filename }));
}

async function handleGenerate(e) {
  e.preventDefault();
  if (state.generating) return;

  const inputs = getFormInputs();
  if (!inputs.gameTitle || !inputs.genre || !inputs.coreMechanic) {
    showToast(t('toastFillFields'), 'error');
    return;
  }

  const apiKey = state.apiKey || els.apiKeyInput?.value.trim() || '';
  if (!apiKey) {
    showToast(t('toastApiKeyRequired'), 'error');
    unlockApiKey();
    return;
  }

  setGenerating(true);
  try {
    const kit = await generatePromoKit({
      apiKey,
      inputs,
      aiSettings: state.aiSettings,
      language: getLanguage(),
    });

    state.currentKit = kit;
    state.currentInputs = inputs;
    state.currentAiSettings = { ...state.aiSettings, language: getLanguage() };
    state.currentLanguage = getLanguage();

    displayKit(kit, inputs.gameTitle);

    const entry = createHistoryEntry({
      inputs,
      generatedJson: kit,
      aiSettings: state.aiSettings,
      language: getLanguage(),
    });
    state.history = addHistoryEntry(entry);
    renderHistory();
    setActiveHistory(entry.id);
    showToast(t('toastGenerated'));
  } catch (err) {
    console.error('[AIPK]', err);
    showToast(err.message || t('toastGenerationFailed'), 'error');
  } finally {
    setGenerating(false);
  }
}

function onLangChanged() {
  updateApiKeyButtonLabel();
  applyTranslations();
  updateHistoryFilterUI();
  renderHistory();
  if (state.currentKit && state.currentInputs) {
    displayKit(state.currentKit, state.currentInputs.gameTitle);
  }
}

function initFloatingLabels() {
  document.querySelectorAll('.field-input').forEach((input) => {
    if (input.value) input.classList.add('has-value');
  });
}

/**
 * Global click delegation — survives re-renders and fixes missed direct bindings.
 */
function handleDocumentClick(e) {
  if (e.target.closest('#toggle-sidebar-btn')) {
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar();
    return;
  }

  if (e.target.closest('#close-sidebar-btn')) {
    e.preventDefault();
    if (state.sidebarOpen) toggleSidebar();
    return;
  }

  if (e.target.closest('#sidebar-overlay')) {
    if (state.sidebarOpen) toggleSidebar();
    return;
  }

  if (e.target.closest('#ai-settings-btn')) {
    e.preventDefault();
    e.stopPropagation();
    openAiSettingsModal();
    return;
  }

  if (e.target.closest('#ai-settings-close')) {
    e.preventDefault();
    closeAiSettingsModal();
    return;
  }

  if (e.target.closest('#ai-settings-save')) {
    e.preventDefault();
    saveAiSettingsFromModal();
    return;
  }

  const modal = els.aiSettingsModal || getEl('ai-settings-modal');
  if (modal?.classList.contains('is-open') && e.target === modal) {
    closeAiSettingsModal();
    return;
  }

  if (e.target.closest('#api-key-help-toggle')) {
    e.preventDefault();
    e.stopPropagation();
    toggleApiKeyHelp();
    return;
  }

  if (
    state.apiHelpOpen &&
    !e.target.closest('.api-key-help-wrap') &&
    !e.target.closest('#api-key-help-panel')
  ) {
    setApiKeyHelpOpen(false);
  }

  if (e.target.closest('#api-key-toggle-btn')) {
    e.preventDefault();
    if (state.apiKeyLocked) unlockApiKey();
    else saveApiKeyHandler();
    return;
  }

  if (e.target.closest('#export-md-btn')) {
    e.preventDefault();
    downloadMarkdown();
    return;
  }

  if (e.target.closest('#history-filter-all')) {
    e.preventDefault();
    state.historyFilter = 'all';
    setHistoryFilter('all');
    updateHistoryFilterUI();
    renderHistory();
    return;
  }

  if (e.target.closest('#history-filter-favorites')) {
    e.preventDefault();
    state.historyFilter = 'favorites';
    setHistoryFilter('favorites');
    updateHistoryFilterUI();
    renderHistory();
    return;
  }
}

function bindDirectEvents() {
  els.langSelect?.addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });

  els.temperatureInput?.addEventListener('input', syncTemperatureDisplay);

  els.gameForm?.addEventListener('submit', handleGenerate);

  els.historyList?.addEventListener('click', handleHistoryListClick);

  getEl('output-grid')?.addEventListener('click', handleOutputClick);

  document.addEventListener('click', handleDocumentClick);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (state.apiHelpOpen) {
      setApiKeyHelpOpen(false);
      return;
    }

    const modal = els.aiSettingsModal || getEl('ai-settings-modal');
    if (modal?.classList.contains('is-open')) {
      closeAiSettingsModal();
      return;
    }

    if (state.sidebarOpen) {
      state.sidebarOpen = false;
      applySidebarState();
    }
  });

  window.addEventListener('resize', applySidebarState);
}

function boot() {
  cacheElements();
  initI18n();
  initApiKey();

  state.aiSettings = getAiSettings();
  state.sidebarOpen = getSidebarOpen();
  state.historyFilter = getHistoryFilter();
  state.history = loadHistory();
  state.currentLanguage = getLanguage();

  if (els.temperatureInput) {
    els.temperatureInput.value = String(state.aiSettings.temperature);
    syncTemperatureDisplay();
  }

  updateHistoryFilterUI();
  renderHistory();
  bindDirectEvents();
  applySidebarState();
  hideOutput();
  initFloatingLabels();
  closeAiSettingsModal();
  setApiKeyHelpOpen(false);

  onLanguageChange(onLangChanged);
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    boot();
  } catch (err) {
    console.error('[AIPK] Initialization failed:', err);
  }
});
