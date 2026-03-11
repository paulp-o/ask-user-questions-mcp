import React, { useEffect, useState } from "react";

import { useTheme } from "../ThemeProvider.js";

interface AnimatedGradientProps {
  text: string;
  /** Speed of gradient sweep (higher = faster). Default 0.12 */
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
 * AnimatedGradient – ChatGPT-style shimmer sweep for OpenTUI.
 *
 * Renders each character with a white-to-gray gradient highlight that
 * sweeps slowly from left to right, creating a large flowing shimmer effect.
 */
export const AnimatedGradient = ({
  text,
  flowSpeed = 0.12,
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

  // Sweep width: covers ~40% of text for a large, smooth highlight
  const sweepWidth = Math.max(8, Math.floor(total * 0.4));
  const totalRange = total + sweepWidth * 2;

  // Sweep position moves continuously left to right, wraps around
  const sweepPos = ((frame * flowSpeed) % totalRange) - sweepWidth;

  const baseColor = theme.colors.textDim;
  const highlightColor = theme.colors.text;

  const elements = chars.map((char, i) => {
    const dist = Math.abs(i - sweepPos);
    const brightness = Math.max(0, 1 - dist / sweepWidth);
    // Smooth cosine falloff for natural-looking sweep
    const smooth = brightness > 0 ? (Math.cos((1 - brightness) * Math.PI) + 1) / 2 : 0;
    const color = lerpColor(baseColor, highlightColor, smooth);

    return (
      <text key={i} style={{ fg: color }}>
        {char}
      </text>
    );
  });

  return <box style={{ flexDirection: "row" }}>{elements}</box>;
};