declare module "@opentui/core" {
  export type TextAttributes = Record<string, unknown>;
  export function createCliRenderer(options?: Record<string, unknown>): Promise<{
    destroy(): void;
  }>;
}

declare module "@opentui/react" {
  import type React from "react";

  export type KeyboardEvent = {
    ctrl?: boolean;
    meta?: boolean;
    name?: string;
    sequence?: string;
    shift?: boolean;
  };

  export function useKeyboard(handler: (key: KeyboardEvent) => void): void;
  export function createRoot(renderer: unknown): {
    render(node: React.ReactNode): void;
  };
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      box: any;
      input: any;
      markdown: any;
      text: any;
    }
  }
}

export {};