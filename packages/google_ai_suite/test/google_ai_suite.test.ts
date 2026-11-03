import { describe, expect, test } from "bun:test";
import {
  APHRODY_GCP_CONFIG,
  AphrodyAuthManager,
  AphrodyGoogleAIClient,
  GOOGLE_AI_MODELS,
} from "../src/index";

describe("@gemini-live/google-ai-suite", () => {
  test("reports missing Gemini credentials only when the Gemini client is used", () => {
    const gemini = Bun.env.GEMINI_API_KEY;
    const google = Bun.env.GOOGLE_API_KEY;
    try {
      delete Bun.env.GEMINI_API_KEY;
      delete Bun.env.GOOGLE_API_KEY;
      const client = new AphrodyGoogleAIClient();
      expect(client.buildFlowPromptWithTags({ prompt: "test" })).toBe("test");
      expect(() => client.ai).toThrow("Clé Gemini absente");
      const configured = new AphrodyGoogleAIClient("test-key");
      expect(configured.ai).toBe(configured.ai);
    } finally {
      if (gemini === undefined) delete Bun.env.GEMINI_API_KEY; else Bun.env.GEMINI_API_KEY = gemini;
      if (google === undefined) delete Bun.env.GOOGLE_API_KEY; else Bun.env.GOOGLE_API_KEY = google;
    }
  });
  test("verifies Aphrody GCP project, Service Accounts, and OAuth Client IDs", () => {
    const auth = new AphrodyAuthManager();
    const status = auth.getStatusSummary();

    expect(status.projectId).toBe("aphrody");
    expect(status.projectNumber).toBe("468000409790");
    expect(status.serviceAccounts.primary).toBe(
      "aphrody-bot@aphrody.iam.gserviceaccount.com",
    );
    expect(status.serviceAccounts.automation).toBe(
      "bun-google-automation@aphrody.iam.gserviceaccount.com",
    );
    expect(status.oauthClients.primaryClientId).toContain(
      "468000409790-f66ui5vphebsj9mgu38b146s519pu11d.apps.googleusercontent.com",
    );
    expect(status.oauthClients.automationClientId).toContain(
      "468000409790-qf5cjq6vdj2v0rsdgnj5deb5kt6l9k9t.apps.googleusercontent.com",
    );
  });

  test("generates valid OAuth 2.0 consent URL for aphrody client", () => {
    const auth = new AphrodyAuthManager();
    const url = auth.generateConsentUrl();
    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain(encodeURIComponent(APHRODY_GCP_CONFIG.oauthClientId));
    expect(url).toContain("youtube.readonly");
  });

  test("verifies canonical 2026 Google AI models lineup", () => {
    expect(GOOGLE_AI_MODELS.reasoning).toBe("gemini-4-argon");
    expect(GOOGLE_AI_MODELS.flash).toBe("gemini-3.8-flash");
    expect(GOOGLE_AI_MODELS.live).toBe("gemini-3.8-live");
    expect(GOOGLE_AI_MODELS.liveExtendedThinking).toBe(
      "gemini-3.8-live-extended-thinking",
    );
    expect(GOOGLE_AI_MODELS.tts).toBe("gemini-3.8-flash-tts");
    expect(GOOGLE_AI_MODELS.stt).toBe("gemini-3.5-transcribe");
    expect(GOOGLE_AI_MODELS.sttLive).toBe("gemini-3.5-transcribe-live");
    expect(GOOGLE_AI_MODELS.lyriaSong).toBe("lyria-3.5");
    expect(GOOGLE_AI_MODELS.lyriaRealtime).toBe("models/lyria-realtime-exp");
    expect(GOOGLE_AI_MODELS.flowVideo).toBe("gemini-omni-1.1-flash");
    expect(GOOGLE_AI_MODELS.embeddingMultimodal).toBe("gemini-embedding-2");
    expect(GOOGLE_AI_MODELS.agentAntigravity).toBe(
      "antigravity-preview-09-2026",
    );
  });

  test("builds Flow (gemini-omni-1.1-flash) prompt tags for first/last frame and references", () => {
    const client = new AphrodyGoogleAIClient("test-key");
    const tagged = client.buildFlowPromptWithTags({
      prompt: "A futuristic neon drone flying through Paris at dusk",
      firstFrameUri: "files/start.png",
      lastFrameUri: "files/end.png",
      referenceImageUris: ["files/style.png"],
      referenceVideoUris: ["files/motion.mp4"],
    });
    expect(tagged).toBe(
      "<FIRST_FRAME> <LAST_FRAME> <IMAGE_REF_0> <VIDEO_REF_0> A futuristic neon drone flying through Paris at dusk",
    );
  });
});
