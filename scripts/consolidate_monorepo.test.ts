import { describe, expect, test } from "bun:test";
import { SUBMODULE_SPECS, runConsolidation } from "./consolidate_monorepo";

describe("Monorepo Consolidation Script", () => {
  test("verifies all 10 vendor submodules, 17 Rust crates, 10 Bun packages, and 4 apps", async () => {
    expect(SUBMODULE_SPECS.length).toBe(10);
    const report = await runConsolidation();
    expect(report.submodules.length).toBe(10);
    for (const sub of report.submodules) {
      expect(sub.exists).toBe(true);
    }
    expect(report.consolidatedCrates.length).toBe(17);
    expect(report.consolidatedPackages.length).toBe(10);
    expect(report.consolidatedApps.length).toBe(4);
    expect(report.tauriTargetVersion).toBe("3.0.0-alpha.5");
    expect(report.pythonManager).toBe("uv");
  });
});
