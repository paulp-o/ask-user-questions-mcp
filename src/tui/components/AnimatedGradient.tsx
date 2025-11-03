import { Text } from "ink";
import gradient from "gradient-string";
import React, { useEffect, useState } from "react";

interface AnimatedGradientProps {
  text: string;
  colors?: string[];
  flowSpeed?: number; // How fast the gradient flows (lower = slower)
}

/**
 * AnimatedGradient component - creates the smoothest possible flowing gradient effect
 * Uses high-frequency updates (60 FPS) with many color stops for visible smoothness
 * The gradient flows from right to left
 */
export const AnimatedGradient: React.FC<AnimatedGradientProps> = ({
  text,
  flowSpeed = 0.3, // Speed of flow
}) => {
  const [frame, setFrame] = useState(0);

  // Generate a large color palette with many intermediate shades for smooth transitions
  const generateColorStops = (numStops: number = 100): string[] => {
    const stops: string[] = [];
    for (let i = 0; i < numStops; i++) {
      const t = i / numStops;
      // Create a wave pattern with sparse white peaks (2 peaks across the gradient)
      const wave = Math.sin(t * Math.PI * 2 * 2) * 0.5 + 0.5;
      // Apply power function to make white peaks sharper and briefer
      const sharpWave = Math.pow(wave, 4); // Quartic power makes whites very brief
      // Interpolate between light gray (175) and white (255)
      const value = Math.floor(175 + (255 - 175) * sharpWave);
      const hex = value.toString(16).padStart(2, "0");
      stops.push(`#${hex}${hex}${hex}`);
    }
    return stops;
  };

  const colors = generateColorStops(100);

  useEffect(() => {
    // Run at 60 FPS for smooth updates - reversed direction
    const interval = setInterval(() => {
      setFrame((prev) => (prev - flowSpeed + colors.length) % colors.length);
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [colors.length, flowSpeed]);

  // Rotate colors array based on current frame to create flowing effect
  const frameIndex = Math.floor(frame);
  const rotatedColors = [
    ...colors.slice(frameIndex),
    ...colors.slice(0, frameIndex),
  ];

  const gradientFn = gradient(rotatedColors);
  const styledText = gradientFn(text);

  return <Text>{styledText}</Text>;
};
