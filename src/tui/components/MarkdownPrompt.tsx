import React from "react";
import { Text } from "ink";
import Markdown from "ink-markdown-es";
import { lexer } from "marked";
import { useTheme } from "../ThemeContext.js";

interface MarkdownPromptProps {
  text: string;
}

/**
 * MarkdownPrompt renders markdown text with basic formatting support.
 * Falls back to plain text if markdown parsing fails.
 *
 * Supports:
 * - **bold** text
 * - *italic* text
 * - `inline code`
 * - ~~strikethrough~~
 * - [links](url) rendered as "text (url)"
 * - Fenced code blocks with syntax highlighting
 */
export const MarkdownPrompt: React.FC<MarkdownPromptProps> = ({ text }) => {
  const { theme } = useTheme();

  // Fallback to plain text if text is empty
  if (!text || text.trim().length === 0) {
    return <Text>{text}</Text>;
  }

  try {
    const tokens = lexer(text);
    const hasBlockElements = tokens.some((token) =>
      ["code", "list", "blockquote", "heading", "hr", "table"].includes(
        token.type,
      ),
    );

    const styles = {
      code: {
        backgroundColor: theme.components.markdown.codeBlockBg,
        color: theme.components.markdown.codeBlockText,
        borderColor: theme.components.markdown.codeBlockBorder,
        borderStyle: "round" as const,
        paddingX: 1,
      },
      codespan: {
        backgroundColor: theme.components.markdown.codeBlockBg,
        color: theme.components.markdown.codeBlockText,
      },
    };

    const baseRenderers = {
      link: (linkText: string, href: string) => (
        <Text>
          {linkText} ({href})
        </Text>
      ),
    };

    if (!hasBlockElements) {
      return (
        <Markdown
          styles={styles}
          renderers={{
            ...baseRenderers,
            paragraph: (content: React.ReactNode) => <Text>{content}</Text>,
          }}
          highlight={true}
        >
          {text}
        </Markdown>
      );
    }

    return (
      <Markdown styles={styles} renderers={baseRenderers} highlight={true}>
        {text}
      </Markdown>
    );
  } catch {
    // Silently fall back to plain text on any error
    return <Text>{text}</Text>;
  }
};
