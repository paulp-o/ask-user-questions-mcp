/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { SessionHistory } from "../../src/components/SessionHistory";

const mockSession = {
  id: "s-123",
  request: {
    sessionId: "s-123",
    status: "pending",
    timestamp: "2026-03-19T00:00:00.000Z",
    questions: [
      {
        title: "Language",
        prompt: "Which language?",
        options: [{ label: "TypeScript" }, { label: "Go" }],
      },
    ],
  },
  status: {
    sessionId: "s-123",
    status: "completed",
    createdAt: "2026-03-19T00:00:00.000Z",
    lastModified: "2026-03-19T00:05:00.000Z",
    totalQuestions: 1,
  },
  answers: {
    sessionId: "s-123",
    timestamp: "2026-03-19T00:05:00.000Z",
    answers: [
      {
        questionIndex: 0,
        selectedOption: "TypeScript",
        timestamp: "2026-03-19T00:05:00.000Z",
      },
    ],
  },
};

describe("SessionHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders timeline and answer details", () => {
    render(<SessionHistory session={mockSession as any} />);

    expect(screen.getByText("Timeline")).toBeTruthy();
    expect(screen.getByText("Session created")).toBeTruthy();
    expect(screen.getByText("Session completed")).toBeTruthy();
    expect(screen.getByText("Question & answers")).toBeTruthy();
    expect(screen.getByText(/Language/)).toBeTruthy();
    expect(screen.getByText(/TypeScript/)).toBeTruthy();
  });

  it("exports session JSON", () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const append = vi.spyOn(document.body, "append");
    const remove = vi.spyOn(HTMLElement.prototype, "remove");

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    render(<SessionHistory session={mockSession as any} />);
    screen.getByRole("button", { name: "Export JSON" }).click();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(append).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });
});