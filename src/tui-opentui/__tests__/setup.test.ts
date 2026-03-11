import { test, expect, describe } from "bun:test";
import {
  makeSessionRequest,
  makeMultiSelectRequest,
  makeMultiQuestionRequest,
  makeSessionUIState,
} from "./fixtures.js";
import { makeTestConfig, makeDimensions } from "./test-utils.js";

describe("OpenTUI Test Harness", () => {
  test("fixtures: makeSessionRequest creates valid session", () => {
    const session = makeSessionRequest();
    expect(session.sessionId).toBe("test-session-1");
    expect(session.questions).toHaveLength(1);
    expect(session.questions[0].options).toHaveLength(3);
    expect(session.status).toBe("pending");
  });

  test("fixtures: makeMultiSelectRequest creates multi-select question", () => {
    const session = makeMultiSelectRequest();
    expect(session.questions[0].multiSelect).toBe(true);
    expect(session.questions[0].options).toHaveLength(4);
  });

  test("fixtures: makeMultiQuestionRequest creates N questions", () => {
    const session = makeMultiQuestionRequest(5);
    expect(session.questions).toHaveLength(5);
  });

  test("fixtures: makeSessionUIState creates valid initial state", () => {
    const state = makeSessionUIState();
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.focusContext).toBe("option");
    expect(state.answers).toBeInstanceOf(Map);
    expect(state.elaborateMarks).toBeInstanceOf(Map);
    expect(state.showReview).toBe(false);
  });

  test("test-utils: makeTestConfig creates config with defaults", () => {
    const config = makeTestConfig();
    expect(config.renderer).toBe("ink");
    expect(config.maxQuestions).toBe(5);
  });

  test("test-utils: makeTestConfig allows overrides", () => {
    const config = makeTestConfig({ renderer: "opentui", theme: "dracula" });
    expect(config.renderer).toBe("opentui");
    expect(config.theme).toBe("dracula");
  });

  test("test-utils: makeDimensions returns default 80x24", () => {
    const dims = makeDimensions();
    expect(dims.width).toBe(80);
    expect(dims.height).toBe(24);
  });
});