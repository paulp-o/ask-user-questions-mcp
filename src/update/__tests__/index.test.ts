import { describe, it, expect } from "vitest";
import * as updateModule from "../index.js";

describe("update module exports", () => {
  it("exports UpdateChecker class", () => {
    expect(typeof updateModule.UpdateChecker).toBe("function");
  });

  it("exports fetchChangelog function", () => {
    expect(typeof updateModule.fetchChangelog).toBe("function");
  });

  it("exports cache functions", () => {
    expect(typeof updateModule.readCache).toBe("function");
    expect(typeof updateModule.writeCache).toBe("function");
    expect(typeof updateModule.clearUpdateCache).toBe("function");
    expect(typeof updateModule.isCacheFresh).toBe("function");
    expect(typeof updateModule.shouldSkipVersion).toBe("function");
    expect(typeof updateModule.getCachePath).toBe("function");
  });

  it("exports CACHE_TTL as 3600000", () => {
    expect(updateModule.CACHE_TTL).toBe(3600000);
  });

  it("exports installer functions", () => {
    expect(typeof updateModule.installUpdate).toBe("function");
    expect(typeof updateModule.getManualCommand).toBe("function");
  });

  it("exports package manager functions", () => {
    expect(typeof updateModule.detectPackageManager).toBe("function");
  });

  it("exports PACKAGE_NAME as auq-mcp-server", () => {
    expect(updateModule.PACKAGE_NAME).toBe("auq-mcp-server");
  });

  it("exports version utilities", () => {
    expect(typeof updateModule.parseVersion).toBe("function");
    expect(typeof updateModule.isNewer).toBe("function");
    expect(typeof updateModule.getUpdateType).toBe("function");
    expect(typeof updateModule.getCurrentVersion).toBe("function");
  });
});