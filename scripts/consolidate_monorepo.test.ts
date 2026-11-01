import { describe, expect, test } from "bun:test";
import { SUBMODULE_SPECS, runConsolidation } from "./consolidate_monorepo";

describe("Monorepo Consolidation Script", () => {
  test("verifies all 9 vendor submodules, 16 Rust crates, 9 Bun packages, and 4 apps", async () => {
    expect(SUBMODULE_SPECS.length).toBe(9);
    const report = await runConsolidation();
    expect(report.submodules.length).toBe(9);
    for (const sub of report.submodules) {
      expect(sub.exists).toBe(true);
    }
    expect(report.consolidatedCrates.length).toBe(16);
    expect(report.consolidatedPackages.length).toBe(9);
    expect(report.consolidatedApps.length).toBe(4);
    expect(report.tauriTargetVersion).toBe("3.0.0-alpha.5");
    expect(report.pythonManager).toBe("uv");
  });
});
