import { describe, it, expect } from "vitest";
import {
  isRecommendedOption,
  extractCleanLabel,
  RECOMMENDED_PATTERNS,
} from "../recommended.js";

describe("isRecommendedOption", () => {
  describe("English patterns", () => {
    it("should detect (recommended) at end of label", () => {
      expect(isRecommendedOption("Option A (recommended)")).toBe(true);
    });

    it("should detect [recommended] at end of label", () => {
      expect(isRecommendedOption("Option A [recommended]")).toBe(true);
    });

    it("should detect (recommended) at start of label", () => {
      expect(isRecommendedOption("(recommended) Option A")).toBe(true);
    });

    it("should detect [recommended] at start of label", () => {
      expect(isRecommendedOption("[recommended] Option A")).toBe(true);
    });

    it("should detect (recommended) in middle of label", () => {
      expect(isRecommendedOption("Option (recommended) A")).toBe(true);
    });

    it("should detect [recommended] in middle of label", () => {
      expect(isRecommendedOption("Option [recommended] A")).toBe(true);
    });

    it("should detect (Recommended) with capital R", () => {
      expect(isRecommendedOption("Option A (Recommended)")).toBe(true);
    });

    it("should detect [Recommended] with capital R", () => {
      expect(isRecommendedOption("Option A [Recommended]")).toBe(true);
    });

    it("should detect (RECOMMENDED) in all caps", () => {
      expect(isRecommendedOption("Option A (RECOMMENDED)")).toBe(true);
    });

    it("should detect [RECOMMENDED] in all caps", () => {
      expect(isRecommendedOption("Option A [RECOMMENDED]")).toBe(true);
    });
  });

  describe("Korean patterns", () => {
    it("should detect (추천) at end of label", () => {
      expect(isRecommendedOption("옵션 A (추천)")).toBe(true);
    });

    it("should detect [추천] at end of label", () => {
      expect(isRecommendedOption("옵션 A [추천]")).toBe(true);
    });

    it("should detect (추천) at start of label", () => {
      expect(isRecommendedOption("(추천) 옵션 A")).toBe(true);
    });

    it("should detect [추천] at start of label", () => {
      expect(isRecommendedOption("[추천] 옵션 A")).toBe(true);
    });

    it("should detect (추천) in middle of label", () => {
      expect(isRecommendedOption("옵션 (추천) A")).toBe(true);
    });

    it("should detect [추천] in middle of label", () => {
      expect(isRecommendedOption("옵션 [추천] A")).toBe(true);
    });
  });

  describe("non-recommended labels", () => {
    it("should return false for labels without recommended pattern", () => {
      expect(isRecommendedOption("Option A")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isRecommendedOption("")).toBe(false);
    });

    it("should return false for labels with similar but not exact patterns", () => {
      expect(isRecommendedOption("Option A (recommend)")).toBe(false);
      expect(isRecommendedOption("Option A (recommends)")).toBe(false);
      expect(isRecommendedOption("Option A (추)")).toBe(false);
    });

    it("should return false for labels with only brackets/parentheses", () => {
      expect(isRecommendedOption("Option A ()")).toBe(false);
      expect(isRecommendedOption("Option A []")).toBe(false);
    });
  });
});

describe("extractCleanLabel", () => {
  describe("English patterns", () => {
    it("should remove (recommended) from end of label", () => {
      expect(extractCleanLabel("Option A (recommended)")).toBe("Option A");
    });

    it("should remove [recommended] from end of label", () => {
      expect(extractCleanLabel("Option A [recommended]")).toBe("Option A");
    });

    it("should remove (recommended) from start of label", () => {
      expect(extractCleanLabel("(recommended) Option A")).toBe("Option A");
    });

    it("should remove [recommended] from start of label", () => {
      expect(extractCleanLabel("[recommended] Option A")).toBe("Option A");
    });

    it("should remove (recommended) from middle of label", () => {
      expect(extractCleanLabel("Option (recommended) A")).toBe("Option A");
    });

    it("should remove [recommended] from middle of label", () => {
      expect(extractCleanLabel("Option [recommended] A")).toBe("Option A");
    });

    it("should handle (Recommended) with capital R", () => {
      expect(extractCleanLabel("Option A (Recommended)")).toBe("Option A");
    });

    it("should handle [Recommended] with capital R", () => {
      expect(extractCleanLabel("Option A [Recommended]")).toBe("Option A");
    });
  });

  describe("Korean patterns", () => {
    it("should remove (추천) from end of label", () => {
      expect(extractCleanLabel("옵션 A (추천)")).toBe("옵션 A");
    });

    it("should remove [추천] from end of label", () => {
      expect(extractCleanLabel("옵션 A [추천]")).toBe("옵션 A");
    });

    it("should remove (추천) from start of label", () => {
      expect(extractCleanLabel("(추천) 옵션 A")).toBe("옵션 A");
    });

    it("should remove [추천] from start of label", () => {
      expect(extractCleanLabel("[추천] 옵션 A")).toBe("옵션 A");
    });
  });

  describe("whitespace handling", () => {
    it("should trim leading and trailing whitespace", () => {
      expect(extractCleanLabel("  Option A  ")).toBe("Option A");
    });

    it("should normalize multiple spaces to single space", () => {
      expect(extractCleanLabel("Option    A")).toBe("Option A");
    });

    it("should handle extra spaces around recommended marker", () => {
      expect(extractCleanLabel("Option A   (recommended)")).toBe("Option A");
    });
  });

  describe("labels without patterns", () => {
    it("should return label unchanged when no recommended pattern exists", () => {
      expect(extractCleanLabel("Option A")).toBe("Option A");
    });

    it("should return empty string for empty input", () => {
      expect(extractCleanLabel("")).toBe("");
    });
  });
});

describe("RECOMMENDED_PATTERNS", () => {
  it("should export EN pattern", () => {
    expect(RECOMMENDED_PATTERNS.EN).toBeInstanceOf(RegExp);
    expect(RECOMMENDED_PATTERNS.EN.test("(recommended)")).toBe(true);
  });

  it("should export KO pattern", () => {
    expect(RECOMMENDED_PATTERNS.KO).toBeInstanceOf(RegExp);
    expect(RECOMMENDED_PATTERNS.KO.test("(추천)")).toBe(true);
  });

  it("EN pattern should be case insensitive", () => {
    expect(RECOMMENDED_PATTERNS.EN.test("(Recommended)")).toBe(true);
    expect(RECOMMENDED_PATTERNS.EN.test("(RECOMMENDED)")).toBe(true);
  });
});
