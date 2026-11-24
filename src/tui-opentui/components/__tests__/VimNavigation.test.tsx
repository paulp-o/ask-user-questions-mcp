import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React, { act, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { testRender } from "@opentui/react/test-utils";

import { DEFAULT_CONFIG } from "../../../config/defaults.js";
import { ConfigProvider } from "../../ConfigContext.js";
import { ThemeProvider } from "../../ThemeProvider.js";
import { OptionsList } from "../OptionsList.js";

const configHome = mkdtempSync(join(tmpdir(), "auq-opentui-vim-"));
const previousConfigHome = process.env.XDG_CONFIG_HOME;
process.env.XDG_CONFIG_HOME = configHome;

const cleanupRenderers: Array<() => void> = [];

afterEach(async () => {
  for (const destroy of cleanupRenderers.splice(0)) {
    await act(async () => destroy());
  }
});

afterAll(() => {
  if (previousConfigHome === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = previousConfigHome;
  rmSync(configHome, { force: true, recursive: true });
});

interface HarnessProps {
  elaborate?: boolean;
  onCustomValue: (value: string) => void;
  onElaborateValue: (value: string) => void;
  onFocusedIndex: (index: number) => void;
}

function Harness({
  onCustomValue,
  onElaborateValue,
  onFocusedIndex,
}: HarnessProps) {
  const [customValue, setCustomValue] = useState("");
  const [elaborateText, setElaborateText] = useState("");
  useKeyboard((key) => {
    if (key.name === "f2") {
      setElaborateText("");
      onElaborateValue("");
    }
  });
  return (
    <ConfigProvider config={DEFAULT_CONFIG}>
      <ThemeProvider initialTheme="AUQ dark">
        <OptionsList
          autoSelectRecommended={false}
          customValue={customValue}
          elaborateText={elaborateText}
          isFocused
          onCustomChange={(value) => {
            setCustomValue(value);
            onCustomValue(value);
          }}
          onElaborateTextChange={(value) => {
            setElaborateText(value);
            onElaborateValue(value);
          }}
          onElaborateSelect={() => {
            setElaborateText("");
            onElaborateValue("");
          }}
          onFocusedIndexChange={onFocusedIndex}
          onSelect={() => {}}
          options={[{ label: "A" }, { label: "B" }]}
          questionKey={0}
          showCustomInput
        />
      </ThemeProvider>
    </ConfigProvider>
  );
}

async function setup(elaborate: boolean) {
  const customValues: string[] = [];
  const elaborateValues: string[] = [];
  const focusedIndices: number[] = [];
  const setupResult = await testRender(
    <Harness
      onCustomValue={(value) => customValues.push(value)}
      onElaborateValue={(value) => elaborateValues.push(value)}
      onFocusedIndex={(index) => focusedIndices.push(index)}
    />,
    { height: 30, kittyKeyboard: true, width: 80 },
  );
  cleanupRenderers.push(() => setupResult.renderer.destroy());

  const press = async (
    key: string,
    modifiers?: { ctrl?: boolean },
  ): Promise<void> => {
    await act(async () => {
      setupResult.mockInput.pressKey(key, modifiers);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await setupResult.renderOnce();
    });
    await setupResult.renderer.idle();
  };
  const typeText = async (text: string): Promise<void> => {
    for (const key of text) await press(key);
  };

  for (let index = 0; index < (elaborate ? 3 : 2); index++) {
    await press(elaborate && index === 2 ? "\x1b[B" : "j");
  }
  return {
    customValues,
    elaborateValues,
    focusedIndices,
    press,
    setupResult,
    typeText,
  };
}

describe("OpenTUI vim navigation text-input guards", () => {
  test("custom input keeps literal j/k and Kitty Ctrl+J", async () => {
    const context = await setup(false);
    expect(context.focusedIndices.at(-1)).toBe(2);

    await context.typeText("jk");
    expect(context.customValues.at(-1)).toBe("jk");
    expect(context.focusedIndices.at(-1)).toBe(2);

    await context.press("j", { ctrl: true });
    expect(context.customValues.at(-1)).toBe("jk\n");
    expect(context.focusedIndices.at(-1)).toBe(2);

    await context.typeText("x");
    expect(context.customValues.at(-1)).toBe("jk\nx");
    expect(context.focusedIndices.at(-1)).toBe(2);
  });

  test("elaborate input keeps literal j/k and Kitty Ctrl+J", async () => {
    const context = await setup(true);
    expect(context.focusedIndices.at(-1)).toBe(3);

    await context.typeText("jk");
    expect(context.elaborateValues.at(-1)).toBe("jk");
    expect(context.focusedIndices.at(-1)).toBe(3);

    await context.press("j", { ctrl: true });
    expect(context.elaborateValues.at(-1)).toBe("jk\n");
    expect(context.focusedIndices.at(-1)).toBe(3);

    await context.typeText("x");
    expect(context.elaborateValues.at(-1)).toBe("jk\nx");
    expect(context.focusedIndices.at(-1)).toBe(3);
  });

  test("clears the native elaborate buffer when the parent clears its value", async () => {
    const context = await setup(true);
    await context.typeText("old");
    expect(context.elaborateValues.at(-1)).toBe("old");

    await context.press("\x1bOQ");
    expect(context.elaborateValues.at(-1)).toBe("");

    await context.typeText("x");
    expect(context.elaborateValues.at(-1)).toBe("x");
  });
});
