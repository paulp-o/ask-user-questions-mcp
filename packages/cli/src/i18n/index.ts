import { en, TranslationKeys } from "./locales/en.js";
import { ko } from "./locales/ko.js";
import type { Translations, SupportedLanguage } from "./types.js";

// Registry of all available translations
const translations: Record<string, Translations> = {
  en: en as unknown as Translations,
  ko: ko as unknown as Translations,
};

// Current language state
let currentLanguage: string = "en";
let currentTranslations: Translations = en as unknown as Translations;

/**
 * Detect system language from environment variables and Intl API
 * Priority: LANG -> LC_ALL -> LC_MESSAGES -> Intl API -> fallback "en"
 */
function detectSystemLanguage(): string {
  // Check environment variables
  const envLang =
    process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES;

  if (envLang) {
    // Extract language code (e.g., "en_US.UTF-8" -> "en")
    const langCode = envLang.split("_")[0].split(".")[0].toLowerCase();
    if (langCode && translations[langCode]) {
      return langCode;
    }
  }

  // Try Intl API for system locale
  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    const langCode = intlLocale.split("-")[0].toLowerCase();
    if (langCode && translations[langCode]) {
      return langCode;
    }
  } catch {
    // Intl API not available, fall through
  }

  // Fallback to English
  return "en";
}

/**
 * Detect language based on config and system settings
 * @param configLanguage - Language setting from config ("auto" or specific language code)
 * @returns Detected language code
 */
export function detectLanguage(configLanguage?: string): string {
  // If config specifies a language (not "auto"), use it
  if (configLanguage && configLanguage !== "auto") {
    const normalizedLang = configLanguage.toLowerCase();
    if (translations[normalizedLang]) {
      return normalizedLang;
    }
    // Config language not available, fall through to detection
  }

  // Detect from system
  return detectSystemLanguage();
}

/**
 * Initialize the i18n system with optional config language
 * @param configLanguage - Language setting from config file
 */
export function initI18n(configLanguage?: string): void {
  currentLanguage = detectLanguage(configLanguage);
  currentTranslations = translations[currentLanguage] || translations["en"];
}

/**
 * Get nested value from object using dot notation
 * @param obj - Object to traverse
 * @param path - Dot-separated path (e.g., "footer.options")
 * @returns Value at path or undefined
 */
function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Substitute placeholders in a translation string
 * @param text - Translation text with placeholders like "{key}"
 * @param placeholders - Object with placeholder values
 * @returns Text with placeholders replaced
 */
function substitutePlaceholders(
  text: string,
  placeholders?: Record<string, string | number>,
): string {
  if (!placeholders) {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (match, key) => {
    const value = placeholders[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Translate a key with optional placeholder substitution
 * @param key - Dot-separated translation key (e.g., "footer.options")
 * @param placeholders - Optional placeholder values for substitution
 * @returns Translated string or the key if translation not found
 */
export function t(
  key: string,
  placeholders?: Record<string, string | number>,
): string {
  const translation = getNestedValue(
    currentTranslations as unknown as Record<string, unknown>,
    key,
  );

  if (translation === undefined) {
    // Fallback: try English
    const fallbackTranslation = getNestedValue(
      translations["en"] as unknown as Record<string, unknown>,
      key,
    );

    if (fallbackTranslation === undefined) {
      // Return key as last resort
      return key;
    }

    return substitutePlaceholders(fallbackTranslation, placeholders);
  }

  return substitutePlaceholders(translation, placeholders);
}

/**
 * Get the current language code
 * @returns Current language code
 */
export function getCurrentLanguage(): string {
  return currentLanguage;
}

/**
 * Get list of supported languages
 * @returns Array of supported language codes
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(translations);
}

/**
 * Register a new translation locale
 * @param languageCode - Language code (e.g., "ko")
 * @param translation - Translation object
 */
export function registerLocale(
  languageCode: string,
  translation: Translations,
): void {
  translations[languageCode.toLowerCase()] = translation;
}

// Re-export types
export type { Translations, SupportedLanguage };
export { en };
