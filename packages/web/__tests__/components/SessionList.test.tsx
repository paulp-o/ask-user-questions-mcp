/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));


import { SessionList } from "../../src/components/SessionList";

const makeResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("SessionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal(
      "EventSource",
      class MockEventSource {
        onerror: ((event: Event) => void) | null = null;
        onopen: ((event: Event) => void) | null = null;

        constructor(_url: string) {
          setTimeout(() => {
            this.onopen?.(new Event("open"));
          }, 0);
        }

        addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {
          return;
        }

        close(): void {
          return;
        }
      },
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("renders session rows from API data", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeResponse([
        {
          id: "session-1234567890",
          status: "pending",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
          questionCount: 2,
          answered: false,
        },
      ]),
    );

    render(<SessionList />);

    await waitFor(() => {
      expect(screen.getByTitle("session-1234567890")).toBeTruthy();
    });
    expect(screen.getByText("pending")).toBeTruthy();
  });

  it("switches filters and requests filtered sessions", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse([]))
      .mockResolvedValueOnce(makeResponse([]));

    render(<SessionList />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/sessions", { cache: "no-store" });
    });

    fireEvent.click(screen.getByRole("button", { name: "Pending" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/sessions?status=pending", {
        cache: "no-store",
      });
    });
  });

  it("deletes a session after confirmation", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        makeResponse([
          {
            id: "s-1",
            status: "pending",
            createdAt: "2026-03-19T00:00:00.000Z",
            updatedAt: "2026-03-19T00:00:00.000Z",
            questionCount: 1,
            answered: false,
          },
        ]),
      )
      .mockResolvedValueOnce(makeResponse({ success: true }))
      .mockResolvedValueOnce(makeResponse([]));

    render(<SessionList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/sessions/s-1", { method: "DELETE" });
    });
    expect(confirm).toHaveBeenCalled();
  });
});