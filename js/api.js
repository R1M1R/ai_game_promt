/**
 * AI Indie Promo Kit — OpenAI API (global AIPK.api)
 */
(function (global) {
  'use strict';

  var storage = global.AIPK.storage;
  var JSON_FIELDS = storage.JSON_FIELDS;
  var MODEL = 'gpt-4o-mini';

  function buildSystemPrompt(customRules) {
    var prompt =
      'Ты — эксперт по маркетингу инди-игр. По данным об игре создай промо-набор.\n\n' +
      'СТРОГИЕ ПРАВИЛА ЯЗЫКА:\n' +
      '- "mj_banner" и "mj_menu": ТОЛЬКО на английском (промпты Midjourney).\n' +
      '- "suno_style" и "suno_lyrics": ТОЛЬКО на английском (Suno AI).\n' +
      '- "steam_desc" и "twitter_post": ТОЛЬКО на русском языке.\n\n' +
      'Ответь ТОЛЬКО валидным JSON без markdown и без текста до/после. Ключи (все строки):\n' +
      '{\n' +
      '  "mj_banner": "детальный промпт Midjourney для баннера/ключевого арта",\n' +
      '  "mj_menu": "детальный промпт Midjourney для экрана меню",\n' +
      '  "suno_style": "теги стиля Suno через запятую",\n' +
      '  "suno_lyrics": "полный текст песни с [Куплет], [Припев] и т.д.",\n' +
      '  "steam_desc": "полное описание страницы Steam на русском",\n' +
      '  "twitter_post": "пост для Twitter/X на русском, до 280 символов с хештегами"\n' +
      '}\n\n' +
      'Сделай каждое поле богатым, конкретным и готовым к использованию.';

    if (customRules && customRules.trim()) {
      prompt += '\n\nДОПОЛНИТЕЛЬНЫЕ ПРАВИЛА ПОЛЬЗОВАТЕЛЯ (соблюдай строго):\n' + customRules.trim();
    }

    return prompt;
  }

  function buildUserPrompt(inputs) {
    return (
      'Создай полный промо-кит для инди-игры:\n\n' +
      'Название: ' +
      inputs.gameTitle +
      '\n' +
      'Жанр: ' +
      inputs.genre +
      '\n' +
      'Визуальный стиль: ' +
      inputs.visualStyle +
      '\n' +
      'Основная механика: ' +
      inputs.coreMechanic +
      '\n\n' +
      'Арт и музыка — на английском. Steam и Twitter — на русском.\n' +
      'Верни ТОЛЬКО JSON с ключами: mj_banner, mj_menu, suno_style, suno_lyrics, steam_desc, twitter_post.'
    );
  }

  function parseAIResponse(content) {
    var text = (content || '').trim();
    var fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) text = fenceMatch[1].trim();

    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('Не удалось разобрать ответ ИИ. Попробуйте снова.');
    }

    for (var i = 0; i < JSON_FIELDS.length; i++) {
      var key = JSON_FIELDS[i];
      if (typeof parsed[key] !== 'string') {
        throw new Error('Отсутствует или неверное поле: ' + key);
      }
    }

    return parsed;
  }

  function generatePromoKit(apiKey, inputs, aiSettings) {
    if (!apiKey) {
      return Promise.reject(new Error('Сначала сохраните ключ OpenAI API.'));
    }

    var temperature = Number(aiSettings.temperature);
    if (isNaN(temperature)) temperature = 0.85;
    temperature = Math.min(1, Math.max(0, temperature));

    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: temperature,
        messages: [
          { role: 'system', content: buildSystemPrompt(aiSettings.customRules) },
          { role: 'user', content: buildUserPrompt(inputs) },
        ],
      }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          var msg =
            (result.data && result.data.error && result.data.error.message) ||
            'Ошибка API (' + result.status + ')';
          if (result.status === 401) {
            throw new Error('Неверный ключ API. Проверьте ключ и повторите.');
          }
          if (result.status === 429) {
            throw new Error('Превышен лимит запросов. Подождите и повторите.');
          }
          throw new Error(msg);
        }

        var content =
          result.data &&
          result.data.choices &&
          result.data.choices[0] &&
          result.data.choices[0].message &&
          result.data.choices[0].message.content;

        if (!content) {
          throw new Error('Пустой ответ от API.');
        }

        return parseAIResponse(content);
      });
  }

  function buildMarkdown(kit, inputs, aiSettings) {
    var title = (inputs && inputs.gameTitle) || 'Игра';
    var rules = (aiSettings && aiSettings.customRules && aiSettings.customRules.trim()) || '—';
    var temp =
      aiSettings && typeof aiSettings.temperature === 'number' && !isNaN(aiSettings.temperature)
        ? aiSettings.temperature.toFixed(2)
        : '0.85';

    var lines = [
      '# ' + title + ' — Инди Промо-Кит',
      '',
      '> Создано в AI Indie Promo Kit',
      '> Дата: ' + new Date().toLocaleString('ru-RU'),
      '',
      '## Параметры генерации',
      '',
      '| Параметр | Значение |',
      '|----------|----------|',
      '| **Temperature** | ' + temp + ' |',
      '| **Память / правила** | ' + rules.replace(/\|/g, '\\|').replace(/\n/g, ' ') + ' |',
      '',
      '## Об игре',
      '',
      '| Поле | Значение |',
      '|------|----------|',
      '| **Название** | ' + title + ' |',
      '| **Жанр** | ' + ((inputs && inputs.genre) || '—') + ' |',
      '| **Визуальный стиль** | ' + ((inputs && inputs.visualStyle) || '—') + ' |',
      '',
      '### Основная механика',
      '',
      (inputs && inputs.coreMechanic) || '—',
      '',
      '---',
      '',
      '## Арт — Midjourney (англ.)',
      '',
      '### Баннер',
      '',
      kit.mj_banner,
      '',
      '### Меню',
      '',
      kit.mj_menu,
      '',
      '---',
      '',
      '## Музыка — Suno (англ.)',
      '',
      '### Стиль',
      '',
      kit.suno_style,
      '',
      '### Текст песни',
      '',
      '```',
      kit.suno_lyrics,
      '```',
      '',
      '---',
      '',
      '## Маркетинг (рус.)',
      '',
      '### Steam',
      '',
      kit.steam_desc,
      '',
      '### Twitter / X',
      '',
      kit.twitter_post,
      '',
      '---',
      '',
      '*Конец промо-кита*',
    ];

    return lines.join('\n');
  }

  global.AIPK = global.AIPK || {};
  global.AIPK.api = {
    generatePromoKit: generatePromoKit,
    buildMarkdown: buildMarkdown,
    parseAIResponse: parseAIResponse,
  };
})(window);
