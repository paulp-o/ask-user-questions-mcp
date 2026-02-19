import { describe, expect, it } from "vitest";
import {
  getAdjustedIndexAfterRemoval,
  getDirectJumpIndex,
  getNextSessionIndex,
  getPrevSessionIndex,
} from "../sessionSwitching.js";

describe("getNextSessionIndex", () => {
  it("returns current index when queue length is 0", () => {
    expect(getNextSessionIndex(0, 0)).toBe(0);
  });

  it("returns current index when queue length is 1", () => {
    expect(getNextSessionIndex(0, 1)).toBe(0);
  });

  it("advances from index 0 to 1 in queue length 2", () => {
    expect(getNextSessionIndex(0, 2)).toBe(1);
  });

  it("wraps from index 1 to 0 in queue length 2", () => {
    expect(getNextSessionIndex(1, 2)).toBe(0);
  });

  it("wraps from index 4 to 0 in queue length 5", () => {
    expect(getNextSessionIndex(4, 5)).toBe(0);
  });

  it("advances from index 2 to 3 in queue length 5", () => {
    expect(getNextSessionIndex(2, 5)).toBe(3);
  });
});

describe("getPrevSessionIndex", () => {
  it("returns current index when queue length is 0", () => {
    expect(getPrevSessionIndex(0, 0)).toBe(0);
  });

  it("returns current index when queue length is 1", () => {
    expect(getPrevSessionIndex(0, 1)).toBe(0);
  });

  it("wraps from index 0 to 1 in queue length 2", () => {
    expect(getPrevSessionIndex(0, 2)).toBe(1);
  });

  it("moves from index 1 to 0 in queue length 2", () => {
    expect(getPrevSessionIndex(1, 2)).toBe(0);
  });

  it("wraps from index 0 to 4 in queue length 5", () => {
    expect(getPrevSessionIndex(0, 5)).toBe(4);
  });

  it("moves from index 3 to 2 in queue length 5", () => {
    expect(getPrevSessionIndex(3, 5)).toBe(2);
  });
});

describe("getDirectJumpIndex", () => {
  it("maps keyNumber 1 to index 0", () => {
    expect(getDirectJumpIndex(1, 2, 3)).toBe(0);
  });

  it("maps keyNumber 3 to index 2", () => {
    expect(getDirectJumpIndex(3, 0, 3)).toBe(2);
  });

  it("returns null when keyNumber is out of queue range", () => {
    expect(getDirectJumpIndex(4, 0, 3)).toBeNull();
  });

  it("returns null for keyNumber 0", () => {
    expect(getDirectJumpIndex(0, 0, 3)).toBeNull();
  });

  it("returns null for keyNumber 10", () => {
    expect(getDirectJumpIndex(10, 0, 12)).toBeNull();
  });

  it("returns null when key maps to current index", () => {
    expect(getDirectJumpIndex(2, 1, 3)).toBeNull();
  });

  it("maps keyNumber 9 to index 8 when queue length is 9", () => {
    expect(getDirectJumpIndex(9, 0, 9)).toBe(8);
  });
});

describe("getAdjustedIndexAfterRemoval", () => {
  it("decrements active index when removed index is before active", () => {
    expect(getAdjustedIndexAfterRemoval(1, 3, 4)).toBe(2);
  });

  it("keeps active index when removed index is after active", () => {
    expect(getAdjustedIndexAfterRemoval(4, 1, 4)).toBe(1);
  });

  it("keeps same index when active session is removed and next item slides in", () => {
    expect(getAdjustedIndexAfterRemoval(1, 1, 3)).toBe(1);
  });

  it("clamps to last index when active removed and it was last item", () => {
    expect(getAdjustedIndexAfterRemoval(3, 3, 3)).toBe(2);
  });

  it("returns 0 when queue becomes empty", () => {
    expect(getAdjustedIndexAfterRemoval(0, 0, 0)).toBe(0);
  });
});
