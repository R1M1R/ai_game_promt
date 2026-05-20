/**
 * AI Indie Promo Kit — main orchestrator (DOMContentLoaded)
 */
(function () {
  'use strict';

  var storage = window.AIPK.storage;
  var api = window.AIPK.api;
  var ui = window.AIPK.ui;
  var state = ui.state;

  function saveApiKeyHandler() {
    var key = ui.els.apiKeyInput ? ui.els.apiKeyInput.value.trim() : '';
    if (!key) {
      ui.showToast('Введите корректный ключ API.', 'error');
      return;
    }
    if (key.indexOf('sk-') !== 0) {
      ui.showToast('Ключ API обычно начинается с «sk-».', 'error');
    }
    state.apiKey = key;
    storage.setApiKey(key);
    ui.lockApiKey();
    ui.showToast('Ключ API сохранён локально.');
  }

  function saveAiSettingsFromModal() {
    var tempInput = ui.els.temperatureInput;
    var rulesInput = ui.els.customRulesInput;

    var temp = parseFloat(tempInput ? tempInput.value : '0.85');
    if (isNaN(temp)) temp = state.aiSettings.temperature || 0.85;
    temp = Math.min(1, Math.max(0, temp));

    state.aiSettings = {
      customRules: rulesInput ? rulesInput.value.trim() : '',
      temperature: temp,
    };
    storage.saveAiSettings(state.aiSettings);
    if (tempInput) tempInput.value = String(temp);
    ui.syncTemperatureDisplay();
    ui.closeAiSettingsModal();
    ui.showToast('Настройки ИИ сохранены.');
  }

  function handleHistoryListClick(e) {
    var delBtn = e.target.closest('[data-action="delete"]');
    if (delBtn) {
      e.preventDefault();
      e.stopPropagation();
      var id = delBtn.dataset.id;
      state.history = storage.deleteHistoryEntry(id);
      if (state.activeHistoryId === id) state.activeHistoryId = null;
      ui.renderHistory();
      ui.showToast('Запись удалена из истории.');
      return;
    }

    var loadBtn = e.target.closest('.history-load-btn');
    if (loadBtn) {
      e.preventDefault();
      var entryId = loadBtn.dataset.id;
      for (var i = 0; i < state.history.length; i++) {
        if (state.history[i].id === entryId) {
          ui.loadHistoryEntry(state.history[i]);
          break;
        }
      }
    }
  }

  function handleOutputClick(e) {
    var copyBtn = e.target.closest('.copy-btn');
    if (!copyBtn) return;
    e.preventDefault();
    var field = copyBtn.dataset.copyTarget;
    var text =
      (state.currentKit && state.currentKit[field]) ||
      (document.getElementById('val-' + field) &&
        document.getElementById('val-' + field).textContent) ||
      '';
    if (text) ui.copyToClipboard(text, copyBtn);
  }

  function downloadMarkdown() {
    if (!state.currentKit) {
      ui.showToast('Нечего экспортировать. Сначала сгенерируйте кит.', 'error');
      return;
    }

    var md = api.buildMarkdown(
      state.currentKit,
      state.currentInputs,
      state.currentAiSettings || state.aiSettings
    );
    var filename =
      storage.sanitizeFilename(state.currentInputs && state.currentInputs.gameTitle) +
      '-PromoKit.md';
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ui.showToast('Скачан файл ' + filename);
  }

  function handleGenerate(e) {
    e.preventDefault();
    if (state.generating) return;

    var inputs = ui.getFormInputs();
    if (!inputs.gameTitle || !inputs.genre || !inputs.coreMechanic) {
      ui.showToast('Заполните все обязательные поля.', 'error');
      return;
    }

    var apiKey = state.apiKey || (ui.els.apiKeyInput && ui.els.apiKeyInput.value.trim()) || '';
    if (!apiKey) {
      ui.showToast('Сначала сохраните ключ OpenAI API.', 'error');
      ui.unlockApiKey();
      return;
    }

    ui.setGenerating(true);

    api
      .generatePromoKit(apiKey, inputs, state.aiSettings)
      .then(function (kit) {
        state.currentKit = kit;
        state.currentInputs = inputs;
        state.currentAiSettings = {
          customRules: state.aiSettings.customRules,
          temperature: state.aiSettings.temperature,
        };

        ui.displayKit(kit, inputs.gameTitle);

        var entry = storage.createHistoryEntry({
          inputs: inputs,
          generatedJson: kit,
          aiSettings: state.aiSettings,
        });
        state.history = storage.addHistoryEntry(entry);
        ui.renderHistory();
        ui.setActiveHistory(entry.id);

        ui.showToast('Промо-кит успешно сгенерирован!');
      })
      .catch(function (err) {
        console.error('[AIPK]', err);
        ui.showToast(err.message || 'Ошибка генерации.', 'error');
      })
      .then(function () {
        ui.setGenerating(false);
      });
  }

  function handleDocumentClick(e) {
    if (e.target.closest('#toggle-sidebar-btn')) {
      e.preventDefault();
      e.stopPropagation();
      ui.toggleSidebar();
      return;
    }

    if (e.target.closest('#close-sidebar-btn')) {
      e.preventDefault();
      if (state.sidebarOpen) ui.toggleSidebar();
      return;
    }

    if (e.target.closest('#sidebar-overlay')) {
      if (state.sidebarOpen) ui.toggleSidebar();
      return;
    }

    if (e.target.closest('#ai-settings-btn')) {
      e.preventDefault();
      e.stopPropagation();
      ui.openAiSettingsModal();
      return;
    }

    if (e.target.closest('#ai-settings-close')) {
      e.preventDefault();
      ui.closeAiSettingsModal();
      return;
    }

    if (e.target.closest('#ai-settings-save')) {
      e.preventDefault();
      saveAiSettingsFromModal();
      return;
    }

    var modal = ui.els.aiSettingsModal;
    if (modal && modal.classList.contains('is-open') && e.target === modal) {
      ui.closeAiSettingsModal();
      return;
    }

    if (e.target.closest('#api-key-help-toggle')) {
      e.preventDefault();
      e.stopPropagation();
      ui.toggleApiKeyHelp();
      return;
    }

    if (
      state.apiHelpOpen &&
      !e.target.closest('.api-key-help-wrap') &&
      !e.target.closest('#api-key-help-panel')
    ) {
      ui.setApiKeyHelpOpen(false);
      return;
    }

    if (e.target.closest('#api-key-toggle-btn')) {
      e.preventDefault();
      if (state.apiKeyLocked) ui.unlockApiKey();
      else saveApiKeyHandler();
      return;
    }

    if (e.target.closest('#export-md-btn')) {
      e.preventDefault();
      downloadMarkdown();
      return;
    }
  }

  function bindEvents() {
    var gameForm = document.getElementById('game-form');
    if (gameForm) gameForm.addEventListener('submit', handleGenerate);

    var historyList = document.getElementById('history-list');
    if (historyList) historyList.addEventListener('click', handleHistoryListClick);

    var outputGrid = document.getElementById('output-grid');
    if (outputGrid) outputGrid.addEventListener('click', handleOutputClick);

    if (ui.els.temperatureInput) {
      ui.els.temperatureInput.addEventListener('input', ui.syncTemperatureDisplay);
    }

    document.addEventListener('click', handleDocumentClick);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;

      if (state.apiHelpOpen) {
        ui.setApiKeyHelpOpen(false);
        return;
      }

      if (ui.els.aiSettingsModal && ui.els.aiSettingsModal.classList.contains('is-open')) {
        ui.closeAiSettingsModal();
        return;
      }

      if (state.sidebarOpen) {
        state.sidebarOpen = false;
        ui.applySidebarState();
      }
    });

    window.addEventListener('resize', ui.applySidebarState);
  }

  function boot() {
    if (!window.AIPK || !window.AIPK.storage || !window.AIPK.api || !window.AIPK.ui) {
      console.error('[AIPK] Не загружены зависимости. Проверьте порядок <script> в index.html.');
      return;
    }

    ui.cacheElements();
    ui.initApiKey();

    state.aiSettings = storage.getAiSettings();
    state.sidebarOpen = storage.getSidebarOpen();
    state.history = storage.loadHistory();

    if (ui.els.temperatureInput) {
      ui.els.temperatureInput.value = String(state.aiSettings.temperature);
      ui.syncTemperatureDisplay();
    }

    ui.renderHistory();
    bindEvents();
    ui.applySidebarState();
    ui.hideOutput();
    ui.initFloatingLabels();
    ui.closeAiSettingsModal();
    ui.setApiKeyHelpOpen(false);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
