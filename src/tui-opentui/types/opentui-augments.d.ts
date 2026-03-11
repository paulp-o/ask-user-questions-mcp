/**
 * Type augmentation for @opentui/core TextOptions.
 *
 * OpenTUI's TextRenderable supports bold/dim/underline/italic at runtime
 * through the `attributes` bitmask, but the TextOptions interface doesn't
 * expose friendly boolean shorthands. This augmentation bridges the gap
 * so JSX authors can use `style={{ bold: true }}` naturally.
 */
import "@opentui/core";

declare module "@opentui/core" {
  interface TextBufferOptions {
    /** Render text as bold. */
    bold?: boolean;
    /** Render text as dim / faint. */
    dim?: boolean;
    /** Render text with underline. */
    underline?: boolean;
    /** Render text as italic. */
    italic?: boolean;
  }
}

/**
 * Fix TS2786: Override the JSX.ElementType to accept function components
 * from @opentui/react's bundled React types.
 */
// @ts-ignore - Intentional override to fix dual React type conflict
declare module "react" {
  namespace JSX {
    type ElementType =
      | string
      | ((props: any) => React.ReactNode | Promise<React.ReactNode>)
      | (new (props: any) => React.Component<any, any>);
  }
}