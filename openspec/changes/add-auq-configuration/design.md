# Design: AUQ Configuration System

## Context

AUQ needs a configuration system to allow users to customize behavior without code changes. This includes question/option limits, session parameters, and language settings. The configuration should follow standard patterns used by other CLI tools (like ESLint, Prettier, etc.).

## Goals / Non-Goals

**Goals:**
- Provide JSON-based configuration file support
- Support both global and local (project-level) config files
- Implement full TUI internationalization
- Auto-detect system language preferences
- Maintain backward compatibility (defaults match current behavior)

**Non-Goals:**
- GUI configuration interface
- Runtime config changes (requires restart)
- Config file migration tools
- Supporting multiple config file formats (JSON only for v1)

## Decisions

### Decision 1: Configuration File Locations

**What**: Use standard XDG-compliant paths with local override

**Config file search order (first found wins for each setting):**
1. Local: `./.auqrc.json` (project directory)
2. Global: `~/.config/auq/.auqrc.json` (XDG_CONFIG_HOME)
3. Defaults: Built-in values

**Why**: Follows conventions of tools like ESLint, Prettier. Local config allows project-specific settings while global provides user defaults.

### Decision 2: Configuration Schema

**What**: JSON schema with typed fields

```typescript
interface AUQConfig {
  // Limits
  maxOptions?: number;        // Default: 4, Max: 10
  maxQuestions?: number;      // Default: 4, Max: 10
  recommendedOptions?: number; // Default: 3 (suggested options per question)
  recommendedQuestions?: number; // Default: 3 (suggested questions per call)
  
  // Session
  sessionTimeout?: number;    // Default: 0 (infinite), in milliseconds
  retentionPeriod?: number;   // Default: 7 days, in milliseconds
  
  // UI
  language?: string;          // Default: "auto" (system locale)
  theme?: "default" | "minimal" | "colorful";
}
```

**Why**: JSON is widely understood, easy to validate with Zod, and requires no additional dependencies.

### Decision 3: Internationalization Architecture

**What**: Simple key-based translation system

```typescript
// src/i18n/index.ts
const translations = {
  en: {
    footer: {
      options: "Options",
      questions: "Questions",
      select: "Select",
      toggle: "Toggle",
      elaborate: "Elaborate",
      rephrase: "Rephrase",
      reject: "Reject",
      quickSubmit: "Quick Submit",
    },
    // ... more keys
  },
  ko: {
    footer: {
      options: "옵션",
      questions: "질문",
      select: "선택",
      toggle: "토글",
      elaborate: "자세히",
      rephrase: "재질문",
      reject: "거부",
      quickSubmit: "빠른 제출",
    },
    // ... more keys
  },
};

// Usage: t("footer.select") -> "Select" or "선택"
```

**Why**: Lightweight, no external i18n library needed. Easy to add new languages.

### Decision 4: System Locale Detection

**What**: Use Node.js `Intl` API with fallback chain

```typescript
function detectLanguage(): string {
  // 1. Check config file setting
  if (config.language && config.language !== "auto") {
    return config.language;
  }
  
  // 2. Check environment variables
  const envLang = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES;
  if (envLang) {
    const lang = envLang.split(".")[0].split("_")[0]; // "en_US.UTF-8" -> "en"
    if (translations[lang]) return lang;
  }
  
  // 3. Use Intl API
  const systemLang = new Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];
  if (translations[systemLang]) return systemLang;
  
  // 4. Fallback to English
  return "en";
}
```

**Why**: Standard approach, works cross-platform, no external dependencies.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Config file syntax errors crash app | Validate with Zod, show helpful error messages, fall back to defaults |
| Missing translations cause runtime errors | Use English fallback for missing keys |
| Large translation files increase bundle size | Lazy-load translations by language |
| Breaking change for existing users | All new settings are optional with sensible defaults |

## Migration Plan

1. **Phase 1**: Add config file loading with optional settings (non-breaking)
2. **Phase 2**: Add i18n infrastructure with English only
3. **Phase 3**: Add Korean translations
4. **Phase 4**: Document config options in README

**Rollback**: Remove config loading code; all settings have defaults so app works without config.

## Open Questions

1. Should we support `.auqrc` (no extension) in addition to `.auqrc.json`?
2. Should theme settings be expanded beyond color schemes (e.g., compact mode)?
3. Should we add a `auq config` CLI command for editing config?
