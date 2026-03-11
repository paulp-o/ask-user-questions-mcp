import type { SessionRequest } from "../../session/types.js";
import type { SessionUIState, Answer } from "../../tui/shared/types.js";

export function makeSessionRequest(overrides: Partial<SessionRequest> = {}): SessionRequest {
  return {
    sessionId: "test-session-1",
    questions: [
      {
        prompt: "What is your preference?",
        title: "Preference",
        options: [
          { label: "Option A", description: "First option" },
          { label: "Option B", description: "Second option" },
          { label: "Option C (Recommended)", description: "Recommended option" },
        ],
        multiSelect: false,
      },
    ],
    status: "pending",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

export function makeMultiSelectRequest(overrides: Partial<SessionRequest> = {}): SessionRequest {
  return makeSessionRequest({
    questions: [
      {
        prompt: "Select all that apply:",
        title: "MultiQ",
        options: [
          { label: "Alpha" },
          { label: "Beta" },
          { label: "Gamma" },
          { label: "Delta" },
        ],
        multiSelect: true,
      },
    ],
    ...overrides,
  });
}

export function makeMultiQuestionRequest(count: number = 3): SessionRequest {
  return makeSessionRequest({
    questions: Array.from({ length: count }, (_, i) => ({
      prompt: `Question ${i + 1} prompt`,
      title: `Q${i + 1}`,
      options: [
        { label: `Q${i + 1} Option A` },
        { label: `Q${i + 1} Option B` },
      ],
      multiSelect: false,
    })),
  });
}

export function makeSessionUIState(overrides: Partial<SessionUIState> = {}): SessionUIState {
  return {
    currentQuestionIndex: 0,
    answers: new Map<number, Answer>(),
    elaborateMarks: new Map<number, string>(),
    focusContext: "option",
    focusedOptionIndex: 0,
    showReview: false,
    ...overrides,
  };
}

export function makeAnswer(overrides: Partial<Answer> = {}): Answer {
  return {
    selectedOption: undefined,
    selectedOptions: undefined,
    customText: undefined,
    ...overrides,
  };
}