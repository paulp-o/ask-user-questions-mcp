import { describe, expect, it } from "vitest";
import {
  ApiUnavailableError,
  NetworkError,
  WebAdapterError,
} from "../errors.js";

describe("error classes", () => {
  it("WebAdapterError is an Error with the correct name", () => {
    const error = new WebAdapterError("boom");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WebAdapterError);
    expect(error.name).toBe("WebAdapterError");
  });

  it("ApiUnavailableError extends WebAdapterError and stores statusCode and cause", () => {
    const cause = new Error("upstream unavailable");
    const error = new ApiUnavailableError("api unavailable", {
      cause,
      statusCode: 503,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WebAdapterError);
    expect(error).toBeInstanceOf(ApiUnavailableError);
    expect(error.name).toBe("ApiUnavailableError");
    expect(error.statusCode).toBe(503);
    expect((error as Error & { cause?: unknown }).cause).toBe(cause);
  });

  it("NetworkError extends WebAdapterError and stores cause", () => {
    const cause = new Error("network failed");
    const error = new NetworkError("network error", { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WebAdapterError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.name).toBe("NetworkError");
    expect((error as Error & { cause?: unknown }).cause).toBe(cause);
  });
});