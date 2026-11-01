import { describe, expect, test } from "bun:test";
import {
  GeminiPetStateManager,
  LeaseManager,
  createVelocityTracker,
  generateGeminiPetSvgSpritesheet,
  getCodexV2GazeSpritePosition,
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
});
