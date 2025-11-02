import { expect, it } from "vitest";

import { add } from "./add.js";

it("should add two numbers", () => {
  expect(add(1, 2)).toBe(3);
});
