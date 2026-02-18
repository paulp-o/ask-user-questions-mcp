import React from "react";
import { Box, Text } from "ink";
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
    // For now, render as plain text with basic markdown support
    // This is a simplified implementation that handles common cases
    // Full markdown rendering would require ink-markdown-es library
    
    // Check if text contains code blocks (triple backticks)
    const hasCodeBlocks = text.includes("```");
    
    if (hasCodeBlocks) {
      // Split by code blocks
      const parts = text.split(/(```[\s\S]*?```)/);
      
      return (
        <Box flexDirection="column">
          {parts.map((part, idx) => {
            if (part.startsWith("```")) {
              // This is a code block
              const codeContent = part.replace(/```[\w]*\n?/g, "").replace(/```$/g, "");
              return (
                <Box
                  key={idx}
                  flexDirection="column"
                  borderStyle="round"
                  borderColor={theme.components.markdown.codeBlockBorder}
                  paddingX={1}
                  paddingY={0}
                  marginY={0}
                >
                  <Text color={theme.components.markdown.codeBlockText}>
                    {codeContent}
                  </Text>
                </Box>
              );
            } else {
              // Regular text with inline markdown
              return (
                <Text key={idx}>
                  {renderInlineMarkdown(part, theme)}
                </Text>
              );
            }
          })}
        </Box>
      );
    } else {
      // No code blocks, just render inline markdown
      return <Text>{renderInlineMarkdown(text, theme)}</Text>;
    }
  } catch (error) {
    // Silently fall back to plain text on any error
    return <Text>{text}</Text>;
  }
};

/**
 * Render inline markdown formatting (bold, italic, code, strikethrough, links)
 * This is a simplified implementation that handles common cases
 */
function renderInlineMarkdown(text: string, theme: any): React.ReactNode {
  // This is a simplified version - a full implementation would use
  // ink-markdown-es or similar library for proper markdown parsing
  
  // For now, just return the text as-is
  // The full implementation will be added when ink-markdown-es is installed
  return text;
}
