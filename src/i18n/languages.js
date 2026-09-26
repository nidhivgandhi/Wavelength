// Languages offered in the picker: the 20 most-spoken languages in US homes
// (Census ACS) plus Tamil. Button text for each lives in ./locales/<code>.json;
// any language or key without a file/entry falls back to English.
//
// To add a language: add a line here, then run `npm run translate-ui` to
// generate its locales file (see scripts/translate-ui.mjs).
//
//   code   — locales file name + <html lang>
//   name   — English name (used in the translation prompt)
//   label  — how it appears in the picker (in its own language)
//   speech — Web Speech API locale, or null if browsers can't recognize it
//   dir    — 'rtl' for right-to-left scripts

export const LANGUAGES = [
  { code: 'en', name: 'English', label: 'English', speech: 'en-US' },
  { code: 'es', name: 'Spanish', label: 'Español', speech: 'es-US' },
  { code: 'zh', name: 'Chinese (Simplified, Mandarin)', label: '中文', speech: 'zh-CN' },
  { code: 'tl', name: 'Tagalog (Filipino)', label: 'Tagalog', speech: 'fil-PH' },
  { code: 'vi', name: 'Vietnamese', label: 'Tiếng Việt', speech: 'vi-VN' },
  { code: 'ar', name: 'Arabic', label: 'العربية', speech: 'ar-SA', dir: 'rtl' },
  { code: 'fr', name: 'French', label: 'Français', speech: 'fr-FR' },
  { code: 'ko', name: 'Korean', label: '한국어', speech: 'ko-KR' },
  { code: 'ru', name: 'Russian', label: 'Русский', speech: 'ru-RU' },
  { code: 'ht', name: 'Haitian Creole', label: 'Kreyòl ayisyen', speech: null },
  { code: 'de', name: 'German', label: 'Deutsch', speech: 'de-DE' },
  { code: 'hi', name: 'Hindi', label: 'हिन्दी', speech: 'hi-IN' },
  { code: 'pt', name: 'Portuguese (Brazilian)', label: 'Português', speech: 'pt-BR' },
  { code: 'it', name: 'Italian', label: 'Italiano', speech: 'it-IT' },
  { code: 'pl', name: 'Polish', label: 'Polski', speech: 'pl-PL' },
  { code: 'ur', name: 'Urdu', label: 'اردو', speech: 'ur-PK', dir: 'rtl' },
  { code: 'ja', name: 'Japanese', label: '日本語', speech: 'ja-JP' },
  { code: 'fa', name: 'Persian (Farsi)', label: 'فارسی', speech: 'fa-IR', dir: 'rtl' },
  { code: 'gu', name: 'Gujarati', label: 'ગુજરાતી', speech: 'gu-IN' },
  { code: 'te', name: 'Telugu', label: 'తెలుగు', speech: 'te-IN' },
  { code: 'ta', name: 'Tamil', label: 'தமிழ்', speech: 'ta-IN' },
]
