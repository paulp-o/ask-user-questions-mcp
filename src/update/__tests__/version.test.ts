import { describe, expect, it } from "vitest";

import { parseVersion, isNewer, getUpdateType } from "../version.js";

describe("version utilities", () => {
  describe("parseVersion", () => {
    it("should parse a standard semver string", () => {
      const result = parseVersion("2.5.0");
      expect(result).toEqual({ major: 2, minor: 5, patch: 0 });
    });

    it("should strip a leading 'v' prefix", () => {
      const result = parseVersion("v1.2.3");
      expect(result).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it("should treat two-part versions as patch 0", () => {
      const result = parseVersion("2.5");
      expect(result).toEqual({ major: 2, minor: 5, patch: 0 });
    });

    it("should capture prerelease identifiers", () => {
      const result = parseVersion("1.0.0-beta.1");
      expect(result).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: "beta.1",
      });
    });

    it("should throw on completely invalid input 'abc'", () => {
      expect(() => parseVersion("abc")).toThrow("Invalid version string");
    });

    it("should parse empty string as 0.0.0 (all parts default to 0)", () => {
      const result = parseVersion("");
      expect(result).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it("should throw on version with non-numeric parts", () => {
      expect(() => parseVersion("1.x.3")).toThrow("Invalid version string");
    });
  });

  describe("isNewer", () => {
    it("should detect a newer patch version", () => {
      expect(isNewer("2.4.0", "2.4.1")).toBe(true);
    });

    it("should detect a newer minor version", () => {
      expect(isNewer("2.4.0", "2.5.0")).toBe(true);
    });

    it("should detect a newer major version", () => {
      expect(isNewer("2.4.0", "3.0.0")).toBe(true);
    });

    it("should return false when versions are the same", () => {
      expect(isNewer("2.4.0", "2.4.0")).toBe(false);
    });

    it("should return false when latest is older", () => {
      expect(isNewer("2.5.0", "2.4.0")).toBe(false);
    });

    it("should treat prerelease as older than same release version", () => {
      expect(isNewer("2.5.0-beta.1", "2.5.0")).toBe(true);
    });

    it("should treat release as newer than same prerelease version", () => {
      expect(isNewer("2.5.0", "2.5.0-beta.1")).toBe(false);
    });
  });

  describe("getUpdateType", () => {
    it("should return 'patch' for patch-level update", () => {
      expect(getUpdateType("2.4.0", "2.4.1")).toBe("patch");
    });

    it("should return 'minor' for minor-level update", () => {
      expect(getUpdateType("2.4.0", "2.5.0")).toBe("minor");
    });

    it("should return 'major' for major-level update", () => {
      expect(getUpdateType("2.4.0", "3.0.0")).toBe("major");
    });

    it("should return 'major' when major differs even with other changes", () => {
      expect(getUpdateType("1.0.0", "2.1.3")).toBe("major");
    });
  });
});