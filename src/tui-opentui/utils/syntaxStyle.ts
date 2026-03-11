import { SyntaxStyle, RGBA } from "@opentui/core";
import type { Theme } from "../../tui/shared/themes/types.js";

/**
 * Auto-generate an OpenTUI SyntaxStyle from AUQ theme color tokens.
 *
 * Color mapping (design.md §5):
 *   accent  → keywords, headings (bold), functions, operators, links, tags
 *   success → strings
 *   muted   → comments (italic), punctuation
 *   warning → numbers, constants, types, attributes
 *   text    → default, variables, list markup
 *   info    → code/raw blocks, properties
 */
export function generateSyntaxStyle(theme: Theme): SyntaxStyle {
  const { colors } = theme;

  // Semantic color tokens → RGBA instances
  const accent = RGBA.fromHex(colors.primary);
  const success = RGBA.fromHex(colors.success);
  const muted = RGBA.fromHex(colors.textDim);
  const warning = RGBA.fromHex(colors.warning);
  const text = RGBA.fromHex(colors.text);
  const info = RGBA.fromHex(colors.info);

  return SyntaxStyle.fromStyles({
    // ── Keywords ──────────────────────────────────────────────
    keyword: { fg: accent, bold: true },
    "keyword.control": { fg: accent },
    "keyword.operator": { fg: accent },
    storage: { fg: accent },

    // ── Strings ──────────────────────────────────────────────
    string: { fg: success },
    "string.special": { fg: success },

    // ── Comments ─────────────────────────────────────────────
    comment: { fg: muted, italic: true },
    "comment.line": { fg: muted, italic: true },
    "comment.block": { fg: muted, italic: true },

    // ── Numeric / Constants ──────────────────────────────────
    number: { fg: warning },
    constant: { fg: warning },
    "constant.numeric": { fg: warning },

    // ── Markup ───────────────────────────────────────────────
    "markup.heading": { fg: accent, bold: true },
    "markup.list": { fg: text },
    "markup.raw": { fg: info },
    "markup.bold": { bold: true },
    "markup.italic": { italic: true },
    "markup.link": { fg: accent, underline: true },

    // ── Types ────────────────────────────────────────────────
    type: { fg: warning },
    "type.builtin": { fg: warning },

    // ── Functions ────────────────────────────────────────────
    function: { fg: accent },
    "function.method": { fg: accent },

    // ── Identifiers ──────────────────────────────────────────
    variable: { fg: text },
    property: { fg: info },

    // ── Delimiters ───────────────────────────────────────────
    punctuation: { fg: muted },
    operator: { fg: accent },

    // ── HTML / JSX ───────────────────────────────────────────
    tag: { fg: accent },
    attribute: { fg: warning },

    // ── Fallback ─────────────────────────────────────────────
    default: { fg: text },
  });
}