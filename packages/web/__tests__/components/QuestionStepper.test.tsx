// @vitest-environment jsdom

import React from "react";
import type { Question } from "@auq/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionStepper } from "../../src/components/QuestionStepper";

const questions: Question[] = [
  {
    title: "Language",
    prompt: "Pick your preferred language.",
    options: [
      { label: "TypeScript" },
      { label: "Other" },
    ],
  },
  {
    title: "Frameworks",
    prompt: "Pick all frameworks you use.",
    multiSelect: true,
    options: [
      { label: "React" },
      { label: "Next.js" },
      { label: "Other" },
    ],
  },
];

describe("QuestionStepper", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("renders first question", () => {
    render(
      <QuestionStepper questions={questions} sessionId="session-1" onComplete={() => {}} />,
);

    expect(screen.getByText("Question 1 of 2")).toBeTruthy();
    expect(screen.getByText("Language")).toBeTruthy();
    expect(screen.getByText("Pick your preferred language.")).toBeTruthy();
  });

  it("handles single-select interaction", () => {
    render(
      <QuestionStepper questions={questions} sessionId="session-1" onComplete={() => {}} />,
);

    const typeScriptOption = screen.getByLabelText("TypeScript");
    fireEvent.click(typeScriptOption);

    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton.hasAttribute("disabled")).toBe(false);
  });

  it("handles multi-select interaction", () => {
    render(
      <QuestionStepper questions={questions} sessionId="session-1" onComplete={() => {}} />,
);

    fireEvent.click(screen.getByLabelText("TypeScript"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Question 2 of 2")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("React"));
    fireEvent.click(screen.getByLabelText("Next.js"));

    expect(screen.getByRole("button", { name: "Review" }).hasAttribute("disabled")).toBe(false);
  });

  it("supports navigation with back and next", () => {
    render(
      <QuestionStepper questions={questions} sessionId="session-1" onComplete={() => {}} />,
);

    fireEvent.click(screen.getByLabelText("TypeScript"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Frameworks")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Language")).toBeTruthy();
  });

  it("shows review screen with selected answers", () => {
    render(
      <QuestionStepper questions={questions} sessionId="session-1" onComplete={() => {}} />,
);

    fireEvent.click(screen.getByLabelText("TypeScript"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByLabelText("React"));
    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    expect(screen.getByText("Review your answers")).toBeTruthy();
    expect(screen.getByText("TypeScript")).toBeTruthy();
    expect(screen.getByText("React")).toBeTruthy();
  });

  it("submits answers to API", async () => {
    const onComplete = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <QuestionStepper
        questions={questions}
        sessionId="session-submit"
        onComplete={onComplete}
      />,
);

    fireEvent.click(screen.getByLabelText("Other"));
    fireEvent.change(screen.getByPlaceholderText("Enter your response"), {
      target: { value: "Elm" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByLabelText("React"));
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const firstCall = (fetchMock as any).mock.calls[0] as [string, RequestInit] | undefined;
    if (!firstCall) {
      throw new Error("Expected fetch to be called");
    }
    const [url, requestInit] = firstCall;
    expect(url).toBe("/api/sessions/session-submit/answer");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.headers).toEqual({ "Content-Type": "application/json" });

    const payload = JSON.parse(String(requestInit.body)) as {
      answers: Array<{
        customText?: string;
        questionIndex: number;
        selectedOption?: string;
        selectedOptions?: string[];
        timestamp: string;
      }>;
    };

    expect(payload.answers).toHaveLength(2);
    expect(payload.answers[0].questionIndex).toBe(0);
    expect(payload.answers[0].selectedOption).toBe("Other");
    expect(payload.answers[0].customText).toBe("Elm");
    expect(payload.answers[1].questionIndex).toBe(1);
    expect(payload.answers[1].selectedOptions).toEqual(["React"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});