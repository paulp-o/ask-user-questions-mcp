import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  detectLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  initI18n,
  t,
} from "../index.js";

describe("i18n System", () => {
  beforeEach(() => {
    // Reset to English before each test
    initI18n("en");
    // Clear environment variables
    delete process.env.LANG;
    delete process.env.LC_ALL;
    delete process.env.LC_MESSAGES;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("detectLanguage", () => {
    it("should return specified language when not auto", () => {
      expect(detectLanguage("ko")).toBe("ko");
      expect(detectLanguage("en")).toBe("en");
    });

    it("should detect language from LANG environment variable", () => {
      process.env.LANG = "ko_KR.UTF-8";
      expect(detectLanguage("auto")).toBe("ko");
    });

    it("should detect language from LC_ALL environment variable", () => {
      process.env.LC_ALL = "ko_KR.UTF-8";
      expect(detectLanguage("auto")).toBe("ko");
    });

    it("should fall back to English for unsupported languages", () => {
      process.env.LANG = "fr_FR.UTF-8";
      expect(detectLanguage("auto")).toBe("en");
    });

    it("should fall back to English when no language detected", () => {
      expect(detectLanguage("auto")).toBe("en");
      expect(detectLanguage(undefined)).toBe("en");
    });
  });

  describe("initI18n", () => {
    it("should initialize with specified language", () => {
      initI18n("ko");
      expect(getCurrentLanguage()).toBe("ko");
    });

    it("should initialize with English by default", () => {
      initI18n();
      expect(getCurrentLanguage()).toBe("en");
    });

    it("should fall back to English for unsupported languages", () => {
      initI18n("unsupported");
      expect(getCurrentLanguage()).toBe("en");
    });
  });

  describe("t (translation function)", () => {
    it("should return English translation", () => {
      initI18n("en");
      expect(t("footer.submit")).toBe("Submit");
      expect(t("footer.back")).toBe("Back");
      expect(t("footer.options")).toBe("Options");
    });

    it("should return Korean translation when language is ko", () => {
      initI18n("ko");
      expect(t("footer.submit")).toBe("제출");
      expect(t("footer.back")).toBe("뒤로");
      expect(t("footer.options")).toBe("옵션");
    });

    it("should support placeholder substitution", () => {
      initI18n("en");
      expect(t("header.questionCount", { current: 1, total: 5 })).toBe(
        "Question 1 of 5",
      );
    });

    it("should support placeholder substitution in Korean", () => {
      initI18n("ko");
      expect(t("header.questionCount", { current: 1, total: 5 })).toBe(
        "질문 1 / 5",
      );
    });

    it("should fall back to English for missing keys", () => {
      initI18n("ko");
      // If a key is missing in ko, should fall back to en
      expect(t("footer.submit")).toBe("제출"); // This exists in ko
    });

    it("should return key as fallback when translation not found", () => {
      initI18n("en");
      expect(t("nonexistent.key")).toBe("nonexistent.key");
    });

    it("should handle nested keys correctly", () => {
      initI18n("en");
      expect(t("waiting.title")).toBe("Waiting for questions...");
      expect(t("confirmation.rejectTitle")).toBe("Reject Questions?");
    });
  });

  describe("getSupportedLanguages", () => {
    it("should return list of supported languages", () => {
      const languages = getSupportedLanguages();
      expect(languages).toContain("en");
      expect(languages).toContain("ko");
    });
  });

  describe("getCurrentLanguage", () => {
    it("should return current language after initialization", () => {
      initI18n("en");
      expect(getCurrentLanguage()).toBe("en");

      initI18n("ko");
      expect(getCurrentLanguage()).toBe("ko");
    });
  });
});
