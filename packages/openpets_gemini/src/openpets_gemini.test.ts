import { describe, expect, test } from "bun:test";
import {
  GEMINI_PET_CHARACTERS,
  GeminiPetStateManager,
  LeaseManager,
  MOCHI_EMOTE_CATALOGUE,
  OPENPETS_3D_WGPU_SHADER_WGSL,
  awardMochiBondXp,
  convertPngToGlb,
  createVelocityTracker,
  generateGeminiPetSvgSpritesheet,
  getCodexV2GazeSpritePosition,
  mochiBondXpRequired,
  quantizeCodexV2GazeDirection,
  resolveReactionSpriteState,
  stepThrow,
  validateSvgSpritesheet,
} from "./index";

describe("@gemini-live/openpets-gemini", () => {
  test("validates V2 1536x2288 Gemini Sparkle Pet SVG spritesheet", () => {
    const svg = generateGeminiPetSvgSpritesheet();
    const validation = validateSvgSpritesheet(svg);
    expect(validation.valid).toBe(true);
    expect(validation.width).toBe(1536);
    expect(validation.height).toBe(2288);
    expect(validation.errors).toEqual([]);
  });

  test("maps reactions to UniversalSpriteState and 16-sector cursor gaze", () => {
    expect(resolveReactionSpriteState("thinking")).toBe("review");
    expect(resolveReactionSpriteState("celebrating")).toBe("jumping");
    expect(resolveReactionSpriteState("error")).toBe("failed");

    expect(quantizeCodexV2GazeDirection(0, -100)).toBe(0);
    expect(quantizeCodexV2GazeDirection(100, 0)).toBe(4);
    expect(quantizeCodexV2GazeDirection(0, 100)).toBe(8);
    expect(quantizeCodexV2GazeDirection(-100, 0)).toBe(12);

    const pos = getCodexV2GazeSpritePosition(12);
    expect(pos.row).toBe(10);
    expect(pos.col).toBe(4);
  });

  test("simulates throw physics and Tamagotchi care state + LeaseManager", () => {
    const tracker = createVelocityTracker();
    tracker.record(10, 10, 100);
    tracker.record(110, 10, 150);
    const rel = tracker.release(155);
    expect(rel.vx).toBeGreaterThan(1000);

    let throwState = {
      x: 100,
      y: 40,
      vx: 500,
      vy: -150,
      resting: false,
      bouncedX: false,
      bouncedY: false,
    };
    const bounds = { minX: 0, maxX: 250, minY: 0, maxY: 180 };
    for (let i = 0; i < 300; i++) {
      throwState = stepThrow(throwState, bounds, 1 / 60);
      if (throwState.resting) break;
    }
    expect(throwState.resting).toBe(true);
    expect(throwState.y).toBe(180);

    const mgr = new GeminiPetStateManager({ hunger: 60, xp: 95 });
    const fed = mgr.feed();
    expect(fed.leveledUp).toBe(true);
    expect(fed.snapshot.hunger).toBe(88);
    expect(fed.snapshot.level).toBe(3);

    const leases = new LeaseManager(5000);
    const lease = leases.acquire({ sessionId: "s1", agent: "antigravity" });
    expect(lease.petId).toBe("gemini-sparkle");
    expect(leases.list().length).toBe(1);
    expect(leases.release("s1")).toBe(true);
  });

  test("supports Mochi cross-platform deskling bond XP, 12 emotes, focus, and pocket", () => {
    expect(GEMINI_PET_CHARACTERS.some((p) => p.id === "mochi")).toBe(true);
    expect(MOCHI_EMOTE_CATALOGUE.length).toBe(12);
    expect(mochiBondXpRequired(1)).toBe(480);
    expect(mochiBondXpRequired(2)).toBe(570);
    expect(mochiBondXpRequired(5)).toBe(660);

    const awarded = awardMochiBondXp({ level: 1, xp: 0 }, 480);
    expect(awarded.levelsGained).toBe(1);
    expect(awarded.state.level).toBe(2);
    expect(awarded.state.xp).toBe(0);

    const mgr = new GeminiPetStateManager();
    const switched = mgr.switchPet("mochi");
    expect(switched.activePetId).toBe("mochi");

    const emoted = mgr.triggerMochiEmote("mochi-exe");
    expect(emoted.mochiAnimation).toBe("emote_mochi_exe");

    const focused = mgr.startMochiFocus(25, 5, 1);
    expect(focused.mochiFocus.phase).toBe("focusing");
    expect(focused.mochiAnimation).toBe("focus");

    const pocketed = mgr.addMochiPocketItem(
      "url",
      "https://github.com/aphrody-dev/mochi-desktop",
      "Mochi Cross-Platform Repo",
    );
    expect(pocketed.mochiPocket.length).toBe(1);
    expect(pocketed.mochiPocket[0]?.title).toBe("Mochi Cross-Platform Repo");
  });

  test("extrudes 2D PNG sprites (Mochi & OpenPets) into binary glTF 2.0 .glb with wgpu WGSL shader", async () => {
    expect(OPENPETS_3D_WGPU_SHADER_WGSL).toContain("@vertex");
    expect(OPENPETS_3D_WGPU_SHADER_WGSL).toContain(
      "textureSample(pet_texture, pet_sampler",
    );

    const mochiPngPath = `${import.meta.dir}/../../../vendor/mochi-desktop/assets/mochi/master/mochi_default.png`;
    const pngBytes = await Bun.file(mochiPngPath).bytes();
    const { width, height, mesh, glbBytes } = convertPngToGlb(pngBytes, {
      depth: 0.16,
      alphaThreshold: 24,
      sampleStep: 8,
    });
    expect(width).toBe(256);
    expect(height).toBe(256);
    expect(mesh.voxelCount).toBeGreaterThan(50);
    expect(mesh.triangleCount).toBeGreaterThan(100);

    const dv = new DataView(
      glbBytes.buffer,
      glbBytes.byteOffset,
      glbBytes.byteLength,
    );
    expect(dv.getUint32(0, true)).toBe(0x46546c67); // "glTF"
    expect(dv.getUint32(4, true)).toBe(2);
    expect(dv.getUint32(8, true)).toBe(glbBytes.byteLength);
  });
});
