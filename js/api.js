/**
 * OpenAI Chat Completions integration.
 */

import { JSON_FIELDS } from './storage.js';
import {
  t,
  getLocale,
  getMarketingLanguageName,
  isSupportedLanguage,
} from './i18n.js';

const MODEL = 'gpt-4o-mini';

function normalizeLanguage(language) {
  return isSupportedLanguage(language) ? language : 'ru';
}

function buildSystemPrompt(language, customRules) {
  const lang = normalizeLanguage(language);
  const marketingLang = getMarketingLanguageName(lang);

  let prompt = `You are an expert Game Marketing Specialist for indie games. Given game details, produce promotional assets.

LANGUAGE RULES (strict):
- "mj_banner" and "mj_menu": MUST be in English (Midjourney prompts).
- "suno_style" and "suno_lyrics": MUST be in English (Suno AI).
- "steam_desc" and "twitter_post": MUST be in ${marketingLang} (matching the user's UI language).

You MUST respond with ONLY a raw, valid JSON object — no markdown, no code fences, no explanation before or after. The JSON must parse with JSON.parse() and use exactly these keys (all string values):
{
  "mj_banner": "Detailed Midjourney prompt for cinematic key art / banner (style, lighting, composition, no text in image)",
  "mj_menu": "Detailed Midjourney prompt for main menu / title screen art",
  "suno_style": "Comma-separated Suno AI style tags and mood descriptors",
  "suno_lyrics": "Full song lyrics with [Verse], [Chorus], etc. sections themed to the game",
  "steam_desc": "Full Steam store page description with hook, about section, and feature bullets",
  "twitter_post": "Compelling Twitter/X announcement under 280 characters with hashtags"
}

Make every field rich, specific to the game, and production-ready.`;

  if (customRules && customRules.trim()) {
    prompt += `\n\nADDITIONAL USER RULES (follow strictly):\n${customRules.trim()}`;
  }

  return prompt;
}

export function buildUserPrompt(inputs, language) {
  const lang = normalizeLanguage(language);
  const langNote = t('apiMarketingNote', {
    language: getMarketingLanguageName(lang),
  }, lang);

  return `Create a complete indie game promo kit for:

Game Title: ${inputs.gameTitle}
Genre: ${inputs.genre}
Visual Style: ${inputs.visualStyle}
Core Mechanic: ${inputs.coreMechanic}

${langNote}
Art/music prompts in English.

Return ONLY the JSON object with keys: mj_banner, mj_menu, suno_style, suno_lyrics, steam_desc, twitter_post.`;
}

export function parseAIResponse(content) {
  let text = (content || '').trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(t('toastGenerationFailed'));
  }

  for (const key of JSON_FIELDS) {
    if (typeof parsed[key] !== 'string') {
      throw new Error(t('errorInvalidField', { field: key }));
    }
  }

  return parsed;
}

/**
 * @param {object} params
 * @param {string} params.apiKey
 * @param {object} params.inputs
 * @param {object} params.aiSettings - { customRules, temperature }
 * @param {string} params.language - UI language code
 */
export async function generatePromoKit({ apiKey, inputs, aiSettings, language }) {
  if (!apiKey) {
    throw new Error(t('errorApiKeyRequired'));
  }

  const lang = normalizeLanguage(language);
  let temperature = Number(aiSettings.temperature);
  if (Number.isNaN(temperature)) temperature = 0.85;
  temperature = Math.min(1, Math.max(0, temperature));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(lang, aiSettings.customRules),
        },
        {
          role: 'user',
          content: buildUserPrompt(inputs, lang),
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || `API error (${response.status})`;
    if (response.status === 401) throw new Error(t('errorInvalidKey'));
    if (response.status === 429) throw new Error(t('errorRateLimit'));
    throw new Error(msg);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(t('errorEmptyResponse'));

  return parseAIResponse(content);
}

export function buildMarkdown(kit, inputs, aiSettings, language) {
  const lang = normalizeLanguage(language);
  const title = inputs?.gameTitle || t('mdTitle', {}, lang);
  const rules = aiSettings?.customRules?.trim() || t('mdNone', {}, lang);
  const temp =
    typeof aiSettings?.temperature === 'number' && !Number.isNaN(aiSettings.temperature)
      ? aiSettings.temperature.toFixed(2)
      : '0.85';

  const langLabel = getMarketingLanguageName(lang);
  const dateStr = new Date().toLocaleString(getLocale(lang));

  const lines = [
    `# ${title} — ${t('mdSubtitle', {}, lang)}`,
    '',
    `> ${t('mdGeneratedBy', {}, lang)}`,
    `> ${dateStr}`,
    '',
    `## ${t('mdGenSettings', {}, lang)}`,
    '',
    `| ${t('mdSetting', {}, lang)} | ${t('mdValue', {}, lang)} |`,
    '|---------|-------|',
    `| **${t('mdUiLanguage', {}, lang)}** | ${langLabel} |`,
    `| **${t('mdTemperature', {}, lang)}** | ${temp} |`,
    `| **${t('mdCustomRules', {}, lang)}** | ${rules.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`,
    '',
    `## ${t('mdGameOverview', {}, lang)}`,
    '',
    `| ${t('mdField', {}, lang)} | ${t('mdValue', {}, lang)} |`,
    '|-------|-------|',
    `| **${t('mdTitle', {}, lang)}** | ${title} |`,
    `| **${t('mdGenre', {}, lang)}** | ${inputs?.genre || t('mdNone', {}, lang)} |`,
    `| **${t('mdVisualStyle', {}, lang)}** | ${inputs?.visualStyle || t('mdNone', {}, lang)} |`,
    '',
    `### ${t('mdCoreMechanic', {}, lang)}`,
    '',
    inputs?.coreMechanic || t('mdNone', {}, lang),
    '',
    '---',
    '',
    `## ${t('mdArtEnglish', {}, lang)}`,
    '',
    `### ${t('mdBannerPrompt', {}, lang)}`,
    '',
    kit.mj_banner,
    '',
    `### ${t('mdMenuPrompt', {}, lang)}`,
    '',
    kit.mj_menu,
    '',
    '---',
    '',
    `## ${t('mdMusicEnglish', {}, lang)}`,
    '',
    `### ${t('mdStyleTags', {}, lang)}`,
    '',
    kit.suno_style,
    '',
    `### ${t('mdLyrics', {}, lang)}`,
    '',
    '```',
    kit.suno_lyrics,
    '```',
    '',
    '---',
    '',
    `## ${t('mdMarketing', {}, lang)} (${langLabel})`,
    '',
    `### ${t('mdSteamDesc', {}, lang)}`,
    '',
    kit.steam_desc,
    '',
    `### ${t('mdTwitterPost', {}, lang)}`,
    '',
    kit.twitter_post,
    '',
    '---',
    '',
    `*${t('mdEnd', {}, lang)}*`,
  ];

  return lines.join('\n');
}
