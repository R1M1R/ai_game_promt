/**
 * AI Indie Promo Kit — DOM / UI layer (global AIPK.ui)
 */
(function (global) {
  'use strict';

  var storage = global.AIPK.storage;
  var JSON_FIELDS = storage.JSON_FIELDS;
  var VISUAL_STYLES = ['Pixel Art', 'Unreal Engine 5', 'Anime', 'Dark Fantasy', 'Low Poly'];

  var state = {
    apiKey: '',
    apiKeyLocked: false,
    aiSettings: storage.getAiSettings(),
    history: [],
    currentKit: null,
    currentInputs: null,
    currentAiSettings: null,
    activeHistoryId: null,
    sidebarOpen: false,
    generating: false,
    apiHelpOpen: false,
  };

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function isDesktop() {
    return global.matchMedia('(min-width: 1024px)').matches;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return iso;
    }
  }

  function cacheElements() {
    els.toastContainer = $('toast-container');
    els.apiKeyInput = $('api-key-input');
    els.apiKeyToggleBtn = $('api-key-toggle-btn');
    els.apiKeyBtnLabel = $('api-key-btn-label');
    els.apiKeyHelpToggle = $('api-key-help-toggle');
    els.apiKeyHelpPanel = $('api-key-help-panel');
    els.aiSettingsModal = $('ai-settings-modal');
    els.customRulesInput = $('custom-rules');
    els.temperatureInput = $('temperature');
    els.temperatureValue = $('temperature-value');
    els.toggleSidebarBtn = $('toggle-sidebar-btn');
    els.closeSidebarBtn = $('close-sidebar-btn');
    els.sidebar = $('history-sidebar');
    els.sidebarOverlay = $('sidebar-overlay');
    els.historyList = $('history-list');
    els.historyEmpty = $('history-empty');
    els.generateBtn = $('generate-btn');
    els.outputSection = $('output-section');
    els.outputPlaceholder = $('output-placeholder');
    els.outputGameTitle = $('output-game-title');
  }

  function showToast(message, type) {
    type = type || 'success';
    if (!els.toastContainer) return;

    var toast = document.createElement('div');
    var isError = type === 'error';
    toast.className =
      'toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-xl glass border ' +
      (isError ? 'border-red-500/30 text-red-100' : 'border-emerald-500/30 text-emerald-100');

    toast.innerHTML =
      '<i class="fa-solid ' +
      (isError ? 'fa-circle-exclamation text-red-400' : 'fa-circle-check text-emerald-400') +
      ' mt-0.5 shrink-0"></i>' +
      '<p class="text-sm flex-1 leading-snug">' +
      escapeHtml(message) +
      '</p>' +
      '<button type="button" class="btn btn-ghost btn-icon shrink-0 toast-dismiss" aria-label="Закрыть">' +
      '<i class="fa-solid fa-xmark text-xs"></i></button>';

    function dismiss() {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(function () {
        toast.remove();
      }, 280);
    }

    toast.querySelector('.toast-dismiss').addEventListener('click', dismiss);
    els.toastContainer.appendChild(toast);
    setTimeout(dismiss, 5000);
  }

  function updateApiKeyButtonLabel() {
    if (els.apiKeyBtnLabel) {
      els.apiKeyBtnLabel.textContent = state.apiKeyLocked ? 'Изменить' : 'Сохранить';
    }
  }

  function lockApiKey() {
    state.apiKeyLocked = true;
    if (els.apiKeyInput) els.apiKeyInput.readOnly = true;
    var icon = els.apiKeyToggleBtn && els.apiKeyToggleBtn.querySelector('i');
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
    var icon = els.apiKeyToggleBtn && els.apiKeyToggleBtn.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-floppy-disk';
    updateApiKeyButtonLabel();
  }

  function initApiKey() {
    state.apiKey = storage.getApiKey();
    if (state.apiKey && els.apiKeyInput) {
      els.apiKeyInput.value = state.apiKey;
      lockApiKey();
    } else {
      updateApiKeyButtonLabel();
    }
  }

  function setApiKeyHelpOpen(open) {
    state.apiHelpOpen = open;
    if (els.apiKeyHelpPanel) {
      els.apiKeyHelpPanel.classList.toggle('is-open', open);
      els.apiKeyHelpPanel.setAttribute('aria-hidden', String(!open));
    }
    if (els.apiKeyHelpToggle) {
      els.apiKeyHelpToggle.setAttribute('aria-expanded', String(open));
    }
  }

  function toggleApiKeyHelp() {
    setApiKeyHelpOpen(!state.apiHelpOpen);
  }

  function openAiSettingsModal() {
    if (!els.aiSettingsModal) return;
    if (els.customRulesInput) {
      els.customRulesInput.value = state.aiSettings.customRules || '';
    }
    if (els.temperatureInput) {
      els.temperatureInput.value = String(state.aiSettings.temperature);
    }
    syncTemperatureDisplay();
    els.aiSettingsModal.classList.add('is-open');
    els.aiSettingsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeAiSettingsModal() {
    if (!els.aiSettingsModal) return;
    els.aiSettingsModal.classList.remove('is-open');
    els.aiSettingsModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function syncTemperatureDisplay() {
    if (els.temperatureValue && els.temperatureInput) {
      els.temperatureValue.textContent = parseFloat(els.temperatureInput.value).toFixed(1);
    }
  }

  function applySidebarState() {
    var open = state.sidebarOpen;
    var desktop = isDesktop();

    if (els.sidebar) els.sidebar.classList.toggle('is-open', open);
    document.body.classList.toggle('sidebar-open', open && desktop);

    if (desktop && open && els.sidebar) {
      document.documentElement.style.setProperty(
        '--sidebar-width',
        els.sidebar.offsetWidth + 'px'
      );
    }

    var showOverlay = open && !desktop;
    if (els.sidebarOverlay) {
      els.sidebarOverlay.classList.toggle('is-visible', showOverlay);
      els.sidebarOverlay.setAttribute('aria-hidden', String(!showOverlay));
    }
    if (els.toggleSidebarBtn) {
      els.toggleSidebarBtn.setAttribute('aria-expanded', String(open));
    }

    storage.setSidebarOpen(open);
  }

  function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    applySidebarState();
  }

  function setActiveHistory(id) {
    state.activeHistoryId = id;
    if (!els.historyList) return;
    var items = els.historyList.querySelectorAll('.history-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-active', items[i].dataset.id === id);
    }
  }

  function renderHistory() {
    if (!els.historyList) return;

    var items = state.history;
    if (els.historyEmpty) {
      els.historyEmpty.classList.toggle('hidden', items.length > 0);
    }

    var existing = els.historyList.querySelectorAll('.history-item');
    for (var i = 0; i < existing.length; i++) {
      existing[i].remove();
    }

    for (var j = 0; j < items.length; j++) {
      (function (entry) {
        var row = document.createElement('div');
        row.className =
          'history-item glass relative group ' +
          (state.activeHistoryId === entry.id ? 'is-active' : '');
        row.dataset.id = entry.id;

        row.innerHTML =
          '<button type="button" class="history-load-btn" data-id="' +
          entry.id +
          '">' +
          '<p class="text-sm font-medium text-slate-200 truncate">' +
          escapeHtml(entry.title) +
          '</p>' +
          '<p class="text-xs text-slate-500 mt-1">' +
          escapeHtml(formatDate(entry.date)) +
          '</p>' +
          '<p class="text-xs text-cyan-500/60 mt-0.5 truncate">' +
          escapeHtml((entry.inputs && entry.inputs.genre) || '') +
          '</p>' +
          '</button>' +
          '<button type="button" class="btn btn-history-icon btn-delete" data-action="delete" data-id="' +
          entry.id +
          '" title="Удалить">' +
          '<i class="fa-solid fa-trash-can text-xs"></i></button>';

        els.historyList.appendChild(row);
      })(items[j]);
    }
  }

  function displayKit(kit, title) {
    if (!kit) return;

    for (var i = 0; i < JSON_FIELDS.length; i++) {
      var field = JSON_FIELDS[i];
      var el = $('val-' + field);
      if (el) el.textContent = kit[field] || '';
    }

    if (els.outputGameTitle) {
      els.outputGameTitle.textContent = title ? '— ' + title : '';
    }
    if (els.outputSection) els.outputSection.classList.remove('output-hidden');
    if (els.outputPlaceholder) {
      els.outputPlaceholder.classList.add('hidden');
      els.outputPlaceholder.classList.remove('xl:flex');
    }
  }

  function hideOutput() {
    if (els.outputSection) els.outputSection.classList.add('output-hidden');
    if (els.outputPlaceholder) {
      els.outputPlaceholder.classList.remove('hidden');
      els.outputPlaceholder.classList.add('xl:flex');
    }
  }

  function getFormInputs() {
    return {
      gameTitle: ($('game-title') && $('game-title').value.trim()) || '',
      genre: ($('genre') && $('genre').value.trim()) || '',
      visualStyle: ($('visual-style') && $('visual-style').value) || 'Pixel Art',
      coreMechanic: ($('core-mechanic') && $('core-mechanic').value.trim()) || '',
    };
  }

  function setFormInputs(inputs) {
    if (!inputs) return;
    var titleEl = $('game-title');
    var genreEl = $('genre');
    var styleEl = $('visual-style');
    var mechanicEl = $('core-mechanic');

    if (titleEl) titleEl.value = inputs.gameTitle || '';
    if (genreEl) genreEl.value = inputs.genre || '';
    if (styleEl) {
      var v = inputs.visualStyle || 'Pixel Art';
      styleEl.value = VISUAL_STYLES.indexOf(v) >= 0 ? v : 'Pixel Art';
    }
    if (mechanicEl) mechanicEl.value = inputs.coreMechanic || '';
  }

  function setGenerating(isLoading) {
    state.generating = isLoading;
    if (!els.generateBtn) return;
    els.generateBtn.disabled = isLoading;
    els.generateBtn.classList.toggle('is-loading', isLoading);
    els.generateBtn.setAttribute('aria-busy', String(isLoading));
  }

  function copyToClipboard(text, btn) {
    if (!navigator.clipboard) {
      showToast('Копирование недоступно в этом браузере.', 'error');
      return Promise.resolve();
    }
    return navigator.clipboard.writeText(text).then(
      function () {
        btn.classList.add('copied');
        var icon = btn.querySelector('i');
        var orig = icon && icon.className;
        if (icon) icon.className = 'fa-solid fa-check';
        showToast('Скопировано в буфер обмена.');
        setTimeout(function () {
          btn.classList.remove('copied');
          if (icon && orig) icon.className = orig;
        }, 2000);
      },
      function () {
        showToast('Не удалось скопировать.', 'error');
      }
    );
  }

  function loadHistoryEntry(entry) {
    state.currentKit = entry.generated_json;
    state.currentInputs = entry.inputs;
    state.currentAiSettings = entry.ai_settings || state.aiSettings;
    setFormInputs(entry.inputs);
    displayKit(entry.generated_json, entry.inputs && entry.inputs.gameTitle);
    setActiveHistory(entry.id);
    if (!isDesktop()) {
      state.sidebarOpen = false;
      applySidebarState();
    }
    showToast('Загружено: ' + entry.title);
  }

  function initFloatingLabels() {
    var inputs = document.querySelectorAll('.field-input');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].value) inputs[i].classList.add('has-value');
    }
  }

  global.AIPK = global.AIPK || {};
  global.AIPK.ui = {
    state: state,
    els: els,
    cacheElements: cacheElements,
    showToast: showToast,
    initApiKey: initApiKey,
    lockApiKey: lockApiKey,
    unlockApiKey: unlockApiKey,
    updateApiKeyButtonLabel: updateApiKeyButtonLabel,
    setApiKeyHelpOpen: setApiKeyHelpOpen,
    toggleApiKeyHelp: toggleApiKeyHelp,
    openAiSettingsModal: openAiSettingsModal,
    closeAiSettingsModal: closeAiSettingsModal,
    syncTemperatureDisplay: syncTemperatureDisplay,
    applySidebarState: applySidebarState,
    toggleSidebar: toggleSidebar,
    renderHistory: renderHistory,
    setActiveHistory: setActiveHistory,
    displayKit: displayKit,
    hideOutput: hideOutput,
    getFormInputs: getFormInputs,
    setFormInputs: setFormInputs,
    setGenerating: setGenerating,
    copyToClipboard: copyToClipboard,
    loadHistoryEntry: loadHistoryEntry,
    initFloatingLabels: initFloatingLabels,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    isDesktop: isDesktop,
  };
})(window);
