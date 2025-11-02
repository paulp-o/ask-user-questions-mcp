import gradient from "gradient-string";

/**
 * Cyan to purple gradient for decorative text in the TUI.
 * Uses cyan → blue → magenta color progression.
 */
export const cyanPurpleGradient = gradient(["cyan", "blue", "magenta"]);

/**
 * Apply cyan-purple gradient to welcome/decorative text.
 * Returns ANSI-colored string compatible with Ink <Text> components.
 */
export function welcomeText(text: string): string {
	return cyanPurpleGradient(text);
}

/**
 * Apply cyan-purple gradient to goodbye/decorative text.
 * Returns ANSI-colored string compatible with Ink <Text> components.
 */
export function goodbyeText(text: string): string {
	return cyanPurpleGradient(text);
}
