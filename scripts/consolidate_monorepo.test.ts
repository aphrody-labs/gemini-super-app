import { describe, expect, test } from "bun:test";
import { SUBMODULE_SPECS, runConsolidation } from "./consolidate_monorepo";
import { packageChromeWebStoreBundles } from "./package_chrome_web_store";

describe("Monorepo Consolidation Script", () => {
  test("verifies all 11 vendor submodules, 17 Rust crates, 10 Bun packages, and 4 apps", async () => {
    expect(SUBMODULE_SPECS.length).toBe(11);
    const report = await runConsolidation();
    expect(report.submodules.length).toBe(11);
    for (const sub of report.submodules) {
      expect(sub.exists).toBe(true);
    }
    expect(report.consolidatedCrates.length).toBe(17);
    expect(report.consolidatedPackages.length).toBe(10);
    expect(report.consolidatedApps.length).toBe(4);
    expect(report.tauriTargetVersion).toBe("3.0.0-alpha.5");
    expect(report.pythonManager).toBe("uv");
  });

  test("packages and validates Chrome Web Store Manifest V3 extensions", async () => {
    const cws = await packageChromeWebStoreBundles();
    expect(cws.ok).toBe(true);
    expect(cws.voiceExtension.manifestVersion).toBe(3);
    expect(cws.voiceExtension.descriptionValid).toBe(true);
    expect(cws.voiceExtension.iconsValid).toBe(true);
    expect(cws.voiceExtension.iconDimensions["16"]).toEqual({
      width: 16,
      height: 16,
    });
    expect(cws.voiceExtension.iconDimensions["32"]).toEqual({
      width: 32,
      height: 32,
    });
    expect(cws.voiceExtension.iconDimensions["48"]).toEqual({
      width: 48,
      height: 48,
    });
    expect(cws.voiceExtension.iconDimensions["128"]).toEqual({
      width: 128,
      height: 128,
    });
    expect(cws.voiceExtension.zeroInlineScripts).toBe(true);
    expect(cws.voiceExtension.zeroThenChainsOrEval).toBe(true);
    expect(cws.themeExtension.manifestVersion).toBe(3);
    expect(cws.themeExtension.descriptionValid).toBe(true);
    expect(cws.themeExtension.iconsValid).toBe(true);
    expect(cws.themeExtension.zeroInlineScripts).toBe(true);
    expect(cws.themeExtension.zeroThenChainsOrEval).toBe(true);

    const cwsDoc = await Bun.file("CHROMEWEBSTORE.md").text();
    expect(cwsDoc).toContain("1.2.0");
    expect(cwsDoc).toContain("Permissions Justification");
    expect(await Bun.file("PRIVACY.md").exists()).toBe(true);
    expect(
      await Bun.file(
        "dist/chrome-web-store/assets/screenshot-1280x800.png",
      ).exists(),
    ).toBe(true);
  });
});
