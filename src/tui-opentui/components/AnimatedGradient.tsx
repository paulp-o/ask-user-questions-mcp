import React, { useEffect, useState } from "react";

import { useTheme } from "../ThemeProvider.js";

interface AnimatedGradientProps {
  text: string;
  /** Speed of gradient flow (higher = faster). Default 0.5 */
  flowSpeed?: number;
  /** Frames per second for animation. Default 30 */
  fps?: number;
}

/** Hex string → [r, g, b] tuple */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** [r, g, b] tuple → hex string */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Linear interpolation between two hex colours */
function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/**
 * AnimatedGradient – flowing gradient text for OpenTUI.
 *
 * Renders each character in its own <text> element with a per-character
 * foreground colour derived from the theme gradient palette, animated
 * with a sine-wave shimmer at `fps` frames/sec.
 *
 * IMPORTANT: We do NOT use gradient-string here because that library
 * produces ANSI escape sequences which OpenTUI renders as literal text.
 * Instead each character gets its own <text style={{ fg: hexColor }}> leaf.
 */
export const AnimatedGradient = ({
  text,
  flowSpeed = 0.5,
  fps = 30,
}: AnimatedGradientProps): React.ReactNode => {
  const { theme } = useTheme();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => f + 1);
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [fps]);

  const chars = text.split("");
  const total = chars.length || 1;

  const elements = chars.map((char, i) => {
    // Sine-wave phase: each char has a different phase offset, frame advances it
    const phase = (i / total) * Math.PI * 2 + frame * flowSpeed * 0.1;
    const t = (Math.sin(phase) + 1) / 2; // 0..1
    // Interpolate start→middle in first half, middle→end in second half
    const color =
      t < 0.5
        ? lerpColor(theme.gradient.start, theme.gradient.middle, t * 2)
        : lerpColor(theme.gradient.middle, theme.gradient.end, (t - 0.5) * 2);
    return (
      <text key={i} style={{ fg: color }}>
        {char}
      </text>
    );
  });

  // <box flexDirection="row"> arranges the per-character <text> nodes side by side
  return <box style={{ flexDirection: "row" }}>{elements}</box>;
};