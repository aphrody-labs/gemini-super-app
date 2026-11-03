import { expect, test } from "bun:test";
import { validateMusicGenRequest } from "./index";

test("validates real MusicGen requests before launching a process", () => {
  expect(validateMusicGenRequest({ model: "facebook/musicgen-small", prompt: "Slow piano", durationSec: 5 })).toBeNull();
  expect(validateMusicGenRequest({ model: "google/lyria-realtime-3.8", prompt: "Slow piano", durationSec: 5 })).not.toBeNull();
  expect(validateMusicGenRequest({ model: "facebook/musicgen-small", prompt: " ", durationSec: 5 })).not.toBeNull();
  expect(validateMusicGenRequest({ model: "facebook/musicgen-small", prompt: "Slow piano", durationSec: 31 })).not.toBeNull();
});
