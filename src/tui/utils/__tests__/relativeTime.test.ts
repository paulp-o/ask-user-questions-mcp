import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatRelativeTime } from "../relativeTime.js";

describe("formatRelativeTime", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns just now when timestamp is less than 5 seconds ago", () => {
    const input = new Date(now.getTime() - 4000);

    expect(formatRelativeTime(input)).toBe("just now");
  });

  it("formats 30 seconds ago as seconds", () => {
    expect(formatRelativeTime(now.getTime() - 30_000)).toBe("30s ago");
  });

  it("formats 90 seconds ago as 1 minute", () => {
    expect(formatRelativeTime(now.getTime() - 90_000)).toBe("1m ago");
  });

  it("formats 5 minutes ago as minutes", () => {
    expect(formatRelativeTime(now.getTime() - 5 * 60_000)).toBe("5m ago");
  });

  it("formats 2 hours ago as hours", () => {
    expect(formatRelativeTime(now.getTime() - 2 * 60 * 60_000)).toBe("2h ago");
  });

  it("formats 3 days ago as days", () => {
    expect(formatRelativeTime(now.getTime() - 3 * 24 * 60 * 60_000)).toBe(
      "3d ago",
    );
  });
});
