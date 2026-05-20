/**
 * AI Indie Promo Kit v4.0 — main application bootstrap & UI.
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
} from './storage.js';

import {
  initI18n,
  applyTranslations,
  setLanguage,
  getLanguage,
  t,
  onLanguageChange,
} from './i18n.js';

import { generatePromoKit, buildMarkdown } from './api.js';

// ——— State ———

const state = {
  apiKey: '',
  apiKeyLocked: false,
  history: [],
  historyFilter: 'all',
  currentKit: null,
  currentInputs: null,
  currentAiSettings: null,
  currentLanguage: 'en',
  activeHistoryId: null,
  sidebarOpen: false,
  generating: false,
  aiSettings: getAiSettings(),
};

// ——— DOM ———

const $ = (sel) => document.querySelector(sel);

const els = {};

function cacheElements() {
  els.apiKeyInput = $('#api-key-input');
  els.apiKeyToggleBtn = $('#api-key-toggle-btn');
  els.apiKeyBtnLabel = $('#api-key-btn-label');
  els.langSelect = $('#lang-select');
  els.aiSettingsBtn = $('#ai-settings-btn');
  els.aiSettingsModal = $('#ai-settings-modal');
  els.aiSettingsClose = $('#ai-settings-close');
  els.aiSettingsSave = $('#ai-settings-save');
  els.customRulesInput = $('#custom-rules');
  els.temperatureInput = $('#temperature');
  els.temperatureValue = $('#temperature-value');
  els.toggleSidebarBtn = $('#toggle-sidebar-btn');
  els.closeSidebarBtn = $('#close-sidebar-btn');
  els.sidebar = $('#history-sidebar');
  els.sidebarOverlay = $('#sidebar-overlay');
  els.mainWrapper = $('#main-wrapper');
  els.historyList = $('#history-list');
  els.historyEmpty = $('#history-empty');
  els.historyFilterAll = $('#history-filter-all');
  els.historyFilterFav = $('#history-filter-favorites');
  els.gameForm = $('#game-form');
  els.generateBtn = $('#generate-btn');
  els.generateBtnText = $('#generate-btn-text');
  els.generateSpinner = $('#generate-spinner');
  els.outputSection = $('#output-section');
  els.outputPlaceholder = $('#output-placeholder');
  els.outputGameTitle = $('#output-game-title');
  els.exportMdBtn = $('#export-md-btn');
  els.toastContainer = $('#toast-container');
}

// ——— Utilities ———

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
    const locale = getLanguage() === 'ru' ? 'ru-RU' : undefined;
    return new Date(iso).toLocaleString(locale, {
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
  const toast = document.createElement('div');
  const isError = type === 'error';
  toast.className = `toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-lg glass border ${
    isError ? 'border-red-500/40 text-red-200' : 'border-green-500/40 text-green-200'
  } shadow-lg`;
  toast.innerHTML = `
    <i class="fa-solid ${isError ? 'fa-circle-exclamation text-red-400' : 'fa-circle-check text-green-400'} mt-0.5"></i>
    <p class="text-sm flex-1">${escapeHtml(message)}</p>
    <button type="button" class="text-slate-500 hover:text-slate-300 shrink-0" data-i18n-aria="toastDismiss">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  const dismiss = () => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  };
  toast.querySelector('button').addEventListener('click', dismiss);
  els.toastContainer.appendChild(toast);
  applyTranslations();
  setTimeout(dismiss, 5000);
}

// ——— API Key ———

function initApiKey() {
  state.apiKey = getApiKey();
  if (state.apiKey) {
    els.apiKeyInput.value = state.apiKey;
    lockApiKey();
  }
  updateApiKeyButtonLabel();
}

function updateApiKeyButtonLabel() {
  els.apiKeyBtnLabel.textContent = state.apiKeyLocked ? t('apiKeyEdit') : t('apiKeySave');
}

function lockApiKey() {
  state.apiKeyLocked = true;
  els.apiKeyInput.readOnly = true;
  els.apiKeyInput.classList.add('opacity-70');
  els.apiKeyToggleBtn.querySelector('i').className = 'fa-solid fa-pen mr-1';
  updateApiKeyButtonLabel();
}

function unlockApiKey() {
  state.apiKeyLocked = false;
  els.apiKeyInput.readOnly = false;
  els.apiKeyInput.classList.remove('opacity-70');
  els.apiKeyToggleBtn.querySelector('i').className = 'fa-solid fa-floppy-disk mr-1';
  updateApiKeyButtonLabel();
  els.apiKeyInput.focus();
  els.apiKeyInput.select();
}

function saveApiKeyHandler() {
  const key = els.apiKeyInput.value.trim();
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

// ——— AI Settings Modal ———

function openAiSettingsModal() {
  const settings = state.aiSettings;
  els.customRulesInput.value = settings.customRules || '';
  els.temperatureInput.value = settings.temperature;
  els.temperatureValue.textContent = Number(settings.temperature).toFixed(1);
  els.aiSettingsModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAiSettingsModal() {
  els.aiSettingsModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function saveAiSettingsFromModal() {
  state.aiSettings = {
    customRules: els.customRulesInput.value.trim(),
    temperature: parseFloat(els.temperatureInput.value),
  };
  saveAiSettings(state.aiSettings);
  closeAiSettingsModal();
  showToast(t('toastSettingsSaved'));
}

function syncTemperatureDisplay() {
  els.temperatureValue.textContent = parseFloat(els.temperatureInput.value).toFixed(1);
}

// ——— Sidebar ———

function applySidebarState() {
  const open = state.sidebarOpen;
  els.sidebar.classList.toggle('closed', !open);
  els.sidebar.classList.toggle('collapsed', !open);
  els.sidebarOverlay.classList.toggle('opacity-0', !open || isDesktop());
  els.sidebarOverlay.classList.toggle('invisible', !open || isDesktop());
  els.sidebarOverlay.classList.toggle('pointer-events-none', !open || isDesktop());
  els.sidebarOverlay.classList.toggle('opacity-100', open && !isDesktop());
  els.sidebarOverlay.classList.toggle('visible', open && !isDesktop());
  els.sidebarOverlay.setAttribute('aria-hidden', String(!open || isDesktop()));

  if (isDesktop() && open) {
    els.mainWrapper.style.marginLeft = `${els.sidebar.offsetWidth}px`;
  } else {
    els.mainWrapper.style.marginLeft = '';
  }
  setSidebarOpen(open);
}

function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  applySidebarState();
}

// ——— History ———

function refreshHistory() {
  state.history = loadHistory();
  renderHistory();
}

function getFilteredHistory() {
  if (state.historyFilter === 'favorites') {
    return state.history.filter((h) => h.favorite);
  }
  return state.history;
}

function updateHistoryFilterUI() {
  els.historyFilterAll?.classList.toggle(
    'bg-cyan-500/20',
    state.historyFilter === 'all'
  );
  els.historyFilterAll?.classList.toggle('border-cyan-500/40', state.historyFilter === 'all');
  els.historyFilterFav?.classList.toggle(
    'bg-cyan-500/20',
    state.historyFilter === 'favorites'
  );
  els.historyFilterFav?.classList.toggle(
    'border-cyan-500/40',
    state.historyFilter === 'favorites'
  );
}

function renderHistory() {
  const items = getFilteredHistory();
  els.historyEmpty.classList.toggle('hidden', items.length > 0);

  els.historyList.querySelectorAll('.history-item').forEach((el) => el.remove());

  items.forEach((entry) => {
    const row = document.createElement('div');
    const isFav = Boolean(entry.favorite);
    row.className = `history-item relative w-full rounded-lg glass glass-hover border border-slate-700/50 transition-all group ${
      state.activeHistoryId === entry.id ? 'active' : ''
    } ${isFav ? 'favorite' : ''}`;
    row.dataset.id = entry.id;

    row.innerHTML = `
      <button type="button" class="history-load-btn w-full text-left p-3 pl-3 pr-16 pt-3 pb-3">
        <p class="text-sm font-medium text-slate-200 truncate">${escapeHtml(entry.title)}</p>
        <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(formatDate(entry.date))}</p>
        <p class="text-xs text-cyan-500/70 mt-1 truncate">${escapeHtml(entry.inputs?.genre || '')}</p>
      </button>
      <button type="button" class="favorite-btn absolute top-2 right-9 p-1.5 rounded transition-all ${
        isFav ? 'active opacity-100' : 'text-slate-500 hover:text-yellow-400 opacity-0 group-hover:opacity-100'
      }" data-favorite-id="${entry.id}" data-i18n-title="${isFav ? 'removeFavorite' : 'addFavorite'}" aria-label="${t(isFav ? 'removeFavorite' : 'addFavorite')}">
        <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star text-xs"></i>
      </button>
      <button type="button" class="delete-history-btn absolute top-2 right-2 p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all" data-delete-id="${entry.id}" data-i18n-title="deleteHistory" aria-label="${t('deleteHistory')}">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    `;

    row.querySelector('.history-load-btn').addEventListener('click', () => loadHistoryEntry(entry));
    row.querySelector('.favorite-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      handleToggleFavorite(entry.id);
    });
    row.querySelector('.delete-history-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteHistory(entry.id);
    });

    els.historyList.appendChild(row);
  });

  applyTranslations();
}

function setActiveHistory(id) {
  state.activeHistoryId = id;
  document.querySelectorAll('.history-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

function loadHistoryEntry(entry) {
  state.currentKit = entry.generated_json;
  state.currentInputs = entry.inputs;
  state.currentAiSettings = entry.ai_settings || state.aiSettings;
  state.currentLanguage = entry.ai_settings?.language || getLanguage();
  setFormInputs(entry.inputs);
  displayKit(entry.generated_json, entry.inputs.gameTitle);
  setActiveHistory(entry.id);
  if (!isDesktop()) toggleSidebar();
  showToast(t('toastLoaded', { title: entry.title }));
}

function handleDeleteHistory(id) {
  state.history = deleteHistoryEntry(id);
  if (state.activeHistoryId === id) state.activeHistoryId = null;
  renderHistory();
  showToast(t('toastDeleted'));
}

function handleToggleFavorite(id) {
  state.history = toggleFavorite(id);
  const entry = state.history.find((h) => h.id === id);
  renderHistory();
  showToast(entry?.favorite ? t('toastFavoriteAdded') : t('toastFavoriteRemoved'));
}

// ——— Form ———

function getFormInputs() {
  return {
    gameTitle: $('#game-title').value.trim(),
    genre: $('#genre').value.trim(),
    visualStyle: $('#visual-style').value,
    coreMechanic: $('#core-mechanic').value.trim(),
  };
}

function setFormInputs(inputs) {
  if (!inputs) return;
  $('#game-title').value = inputs.gameTitle || '';
  $('#genre').value = inputs.genre || '';
  $('#visual-style').value = inputs.visualStyle || 'Pixel Art';
  $('#core-mechanic').value = inputs.coreMechanic || '';
}

function setGenerating(isLoading) {
  state.generating = isLoading;
  els.generateBtn.disabled = isLoading;
  els.generateBtnText.classList.toggle('hidden', isLoading);
  els.generateSpinner.classList.toggle('hidden', isLoading);
  els.generateSpinner.classList.toggle('flex', isLoading);
}

// ——— Output ———

function displayKit(kit, title) {
  if (!kit) return;
  JSON_FIELDS.forEach((field) => {
    const el = document.getElementById(`val-${field}`);
    if (el) el.textContent = kit[field] || '';
  });
  els.outputGameTitle.textContent = title ? `— ${title}` : '';
  els.outputSection.classList.remove('output-hidden');
  els.outputPlaceholder.classList.add('hidden');
  els.outputPlaceholder.classList.remove('xl:flex');
}

function hideOutput() {
  els.outputSection.classList.add('output-hidden');
  els.outputPlaceholder.classList.remove('hidden');
  els.outputPlaceholder.classList.add('xl:flex');
}

// ——— Copy ———

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.classList.add('copied');
    const icon = btn.querySelector('i');
    const orig = icon.className;
    icon.className = 'fa-solid fa-check';
    showToast(t('toastCopied'));
    setTimeout(() => {
      btn.classList.remove('copied');
      icon.className = orig;
    }, 2000);
  } catch {
    showToast(t('toastCopyFailed'), 'error');
  }
}

// ——— Export ———

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
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(t('toastDownloaded', { filename }));
}

// ——— Generate ———

async function handleGenerate(e) {
  e.preventDefault();
  if (state.generating) return;

  const inputs = getFormInputs();
  if (!inputs.gameTitle || !inputs.genre || !inputs.coreMechanic) {
    showToast(t('toastFillFields'), 'error');
    return;
  }

  const apiKey = state.apiKey || els.apiKeyInput.value.trim();
  if (!apiKey) {
    showToast(t('toastApiKeyRequired'), 'error');
    unlockApiKey();
    return;
  }

  const language = getLanguage();
  const aiSettings = state.aiSettings;

  setGenerating(true);
  try {
    const kit = await generatePromoKit({
      apiKey,
      inputs,
      aiSettings,
      language,
    });

    state.currentKit = kit;
    state.currentInputs = inputs;
    state.currentAiSettings = { ...aiSettings, language };
    state.currentLanguage = language;

    displayKit(kit, inputs.gameTitle);

    const entry = createHistoryEntry({
      inputs,
      generatedJson: kit,
      aiSettings,
      language,
    });
    state.history = addHistoryEntry(entry);
    renderHistory();
    setActiveHistory(entry.id);

    showToast(t('toastGenerated'));
  } catch (err) {
    console.error(err);
    showToast(err.message || t('toastGenerationFailed'), 'error');
  } finally {
    setGenerating(false);
  }
}

// ——— i18n hooks ———

function onLangChanged() {
  updateApiKeyButtonLabel();
  renderHistory();
}

// ——— Events ———

function bindEvents() {
  els.apiKeyToggleBtn.addEventListener('click', () => {
    if (state.apiKeyLocked) unlockApiKey();
    else saveApiKeyHandler();
  });

  els.langSelect.addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });

  els.aiSettingsBtn.addEventListener('click', openAiSettingsModal);
  els.aiSettingsClose.addEventListener('click', closeAiSettingsModal);
  els.aiSettingsSave.addEventListener('click', saveAiSettingsFromModal);

  els.aiSettingsModal.addEventListener('click', (e) => {
    if (e.target === els.aiSettingsModal) closeAiSettingsModal();
  });

  els.temperatureInput.addEventListener('input', syncTemperatureDisplay);

  els.toggleSidebarBtn.addEventListener('click', toggleSidebar);
  els.closeSidebarBtn.addEventListener('click', () => {
    if (state.sidebarOpen) toggleSidebar();
  });
  els.sidebarOverlay.addEventListener('click', () => {
    if (state.sidebarOpen) toggleSidebar();
  });

  els.historyFilterAll?.addEventListener('click', () => {
    state.historyFilter = 'all';
    setHistoryFilter('all');
    updateHistoryFilterUI();
    renderHistory();
  });

  els.historyFilterFav?.addEventListener('click', () => {
    state.historyFilter = 'favorites';
    setHistoryFilter('favorites');
    updateHistoryFilterUI();
    renderHistory();
  });

  els.gameForm.addEventListener('submit', handleGenerate);
  els.exportMdBtn.addEventListener('click', downloadMarkdown);

  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (!copyBtn) return;
    const field = copyBtn.dataset.copyTarget;
    const text =
      state.currentKit?.[field] ||
      document.getElementById(`val-${field}`)?.textContent ||
      '';
    if (text) copyToClipboard(text, copyBtn);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.aiSettingsModal.classList.contains('hidden')) {
      closeAiSettingsModal();
    }
  });

  window.addEventListener('resize', applySidebarState);
}

// ——— Init ———

function init() {
  cacheElements();
  initI18n();
  initApiKey();

  state.aiSettings = getAiSettings();
  state.sidebarOpen = getSidebarOpen();
  state.historyFilter = getHistoryFilter();
  state.history = loadHistory();

  els.temperatureInput.value = state.aiSettings.temperature;
  syncTemperatureDisplay();

  updateHistoryFilterUI();
  renderHistory();
  bindEvents();
  applySidebarState();
  hideOutput();

  onLanguageChange(onLangChanged);
}

init();
