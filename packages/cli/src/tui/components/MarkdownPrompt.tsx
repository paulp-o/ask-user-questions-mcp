import React from "react";

import { useTheme } from "../ThemeProvider.js";

interface MarkdownPromptProps {
  text: string;
}

/**
 * MarkdownPrompt renders markdown text using OpenTUI's native <markdown> element.
 * Uses the theme-derived SyntaxStyle for code highlighting.
 */
export const MarkdownPrompt = ({ text }: MarkdownPromptProps): React.ReactNode => {
  const { syntaxStyle } = useTheme();

  if (!text || text.trim().length === 0) {
    return <text>{text}</text>;
  }

  return <markdown content={text} syntaxStyle={syntaxStyle} />;
};