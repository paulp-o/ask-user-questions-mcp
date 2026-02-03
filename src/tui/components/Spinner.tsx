import { Text } from "ink";
import React, { useEffect, useState } from "react";
import { useTheme } from "../ThemeContext.js";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface SpinnerProps {
  color?: string;
}

/**
 * Spinner displays an animated loading indicator
 * Uses braille pattern characters for smooth animation
 */
export const Spinner: React.FC<SpinnerProps> = ({ color }) => {
  const { theme } = useTheme();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return (
    <Text color={color ?? theme.colors.primary}>{SPINNER_FRAMES[frame]}</Text>
  );
};
