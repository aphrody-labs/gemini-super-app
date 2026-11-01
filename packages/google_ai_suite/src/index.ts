/**
 * @gemini-live/google-ai-suite
 * Unified Google Cloud (`aphrody`) & Google AI SDK Suite for:
 * - Auth: GCP Project `aphrody`, OAuth 2.0 Client (`GOOGLE_CLIENT_ID` / `AUTO_GOOGLE_CLIENT_ID`),
 *   Service Account Impersonation (`aphrody-bot@aphrody.iam.gserviceaccount.com`)
 * - Search: Google Search Grounding, URL Context, Maps Grounding & Deep Research Agents
 * - Voice & STS: `gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.5-live-translate-preview`
 * - TTS: `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, Voice Design & Voice Replication
 * - STT: `gemini-3.5-transcribe` (batch) & `gemini-3.5-transcribe-live` (streaming Hybrid VAD)
 * - ML & Agents: `gemini-4-argon`, `gemini-embedding-2`, `gemini-nano-banana-2.1`, `antigravity-preview-09-2026`
 * - YouTube Data v3 + Gemini YouTube Multimodal Video Understanding
 * - Lyria Music: `lyria-3.5` (full songs + lyrics), `lyria-3-clip-preview` (30s clips) & `models/lyria-realtime-exp` (48kHz live stream)
 * - Flow Video: `gemini-omni-1.1-flash` (Text-to-Video, First/Last Frame, 40s Extensions, Reference-Guided Editing, 360p-4K)
 */

import { GoogleGenAI } from "@google/genai";

export const APHRODY_GCP_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || "aphrody",
  projectNumber: process.env.GOOGLE_CLOUD_PROJECT_NUMBER || "468000409790",
  region: process.env.GOOGLE_CLOUD_REGION || "us-central1",
  primaryServiceAccount:
    process.env.APHRODY_SERVICE_ACCOUNT ||
    "aphrody-bot@aphrody.iam.gserviceaccount.com",
  automationServiceAccount:
    process.env.APHRODY_AUTOMATION_SERVICE_ACCOUNT ||
    "bun-google-automation@aphrody.iam.gserviceaccount.com",
  firebaseServiceAccount:
    process.env.APHRODY_FIREBASE_SERVICE_ACCOUNT ||
    "firebase-adminsdk-fbsvc@aphrody.iam.gserviceaccount.com",
  oauthClientId:
    process.env.GOOGLE_CLIENT_ID ||
    "468000409790-f66ui5vphebsj9mgu38b146s519pu11d.apps.googleusercontent.com",
  autoOauthClientId:
    process.env.AUTO_GOOGLE_CLIENT_ID ||
    "468000409790-qf5cjq6vdj2v0rsdgnj5deb5kt6l9k9t.apps.googleusercontent.com",
  oauthRedirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    "http://127.0.0.1:8765/oauth2callback",
} as const;

export const GOOGLE_AI_MODELS = {
  reasoning: "gemini-4-argon",
  flash: "gemini-3.8-flash",
  flashLite: "gemini-3.5-flash-lite",
  ultraLite: "gemini-3.1-flash-lite",
  live: "gemini-3.8-live",
  liveExtendedThinking: "gemini-3.8-live-extended-thinking",
  liveTranslate: "gemini-3.5-live-translate-preview",
  tts: "gemini-3.8-flash-tts",
  ttsLite: "gemini-3.8-flash-lite-tts",
  stt: "gemini-3.5-transcribe",
  sttLive: "gemini-3.5-transcribe-live",
  lyriaSong: "lyria-3.5",
  lyriaClip: "lyria-3-clip-preview",
  lyriaRealtime: "models/lyria-realtime-exp",
  flowVideo: "gemini-omni-1.1-flash",
  imageDefault: "gemini-nano-banana-2.1",
  imagePro: "gemini-3-pro-image",
  imageLite: "gemini-3.1-flash-lite-image",
  embeddingMultimodal: "gemini-embedding-2",
  embeddingText: "gemini-embedding-001",
  gemmaDense: "gemma-4-31b-it",
  gemmaMoe: "gemma-4-26b-a4b-it",
  agentAntigravity: "antigravity-preview-09-2026",
  agentDeepResearch: "deep-research-preview-04-2026",
  agentDeepResearchMax: "deep-research-max-preview-04-2026",
} as const;

export const DEFAULT_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/generative-language.retriever",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "openid",
  "email",
  "profile",
] as const;

export interface YouTubeVideoSummary {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnailUrl?: string;
  url: string;
}

export interface LyriaGenerationResult {
  model: string;
  audioBase64: string | null;
  mimeType: string;
  lyricsOrStructure: string | null;
  interactionId?: string;
}

export interface FlowVideoRequest {
  prompt: string;
  resolution?: "360p" | "720p" | "1080p" | "4k";
  aspectRatio?: "16:9" | "9:16";
  durationSeconds?: number;
  firstFrameUri?: string;
  lastFrameUri?: string;
  referenceImageUris?: string[];
  referenceVideoUris?: string[];
  previousInteractionId?: string;
}

/**
 * Manages Aphrody GCP Authentication:
 * 1. OAuth 2.0 Client (`GOOGLE_CLIENT_ID` / `AUTO_GOOGLE_CLIENT_ID`)
 * 2. Service Account Impersonation (`aphrody-bot@aphrody.iam.gserviceaccount.com`)
 * 3. API Keys (`GEMINI_API_KEY`, `GOOGLE_API_KEY`, `YOUTUBE_API_KEY`)
 */
export class AphrodyAuthManager {
  readonly projectId = APHRODY_GCP_CONFIG.projectId;
  readonly projectNumber = APHRODY_GCP_CONFIG.projectNumber;
  readonly serviceAccount = APHRODY_GCP_CONFIG.primaryServiceAccount;
  readonly automationServiceAccount =
    APHRODY_GCP_CONFIG.automationServiceAccount;

  getOAuthClientCredentials(useAutomationClient = false) {
    const clientId = useAutomationClient
      ? process.env.AUTO_GOOGLE_CLIENT_ID ||
        APHRODY_GCP_CONFIG.autoOauthClientId
      : process.env.GOOGLE_CLIENT_ID || APHRODY_GCP_CONFIG.oauthClientId;
    const clientSecret = useAutomationClient
      ? process.env.AUTO_GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET ||
        ""
      : process.env.GOOGLE_CLIENT_SECRET || "";

    return {
      clientId,
      clientSecret,
      redirectUri: APHRODY_GCP_CONFIG.oauthRedirectUri,
    };
  }

  generateConsentUrl(
    scopes: readonly string[] = DEFAULT_OAUTH_SCOPES,
    useAutomationClient = false,
  ): string {
    const { clientId, redirectUri } =
      this.getOAuthClientCredentials(useAutomationClient);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: scopes.join(" "),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeAuthCode(code: string, useAutomationClient = false) {
    const { clientId, clientSecret, redirectUri } =
      this.getOAuthClientCredentials(useAutomationClient);
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!resp.ok) {
      throw new Error(`OAuth token exchange failed (${resp.status})`);
    }
    const tokens = (await resp.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    };
    try {
      if (tokens.refresh_token && typeof Bun !== "undefined" && Bun.secrets) {
        await Bun.secrets.set({
          service: "aphrody-google-oauth",
          name: useAutomationClient ? "auto_refresh_token" : "refresh_token",
          value: tokens.refresh_token,
        });
      }
    } catch {}
    return tokens;
  }

  async getImpersonatedAccessToken(
    serviceAccountEmail = this.serviceAccount,
  ): Promise<string> {
    const cmd = process.platform === "win32" ? "gcloud.cmd" : "gcloud";
    const proc = Bun.spawn(
      [
        cmd,
        "auth",
        "print-access-token",
        `--impersonate-service-account=${serviceAccountEmail}`,
        `--project=${this.projectId}`,
        "--quiet",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const out = (await new Response(proc.stdout).text()).trim();
    const code = await proc.exited;
    if (code !== 0 || !out) {
      throw new Error(
        `Failed to obtain impersonated token for ${serviceAccountEmail}`,
      );
    }
    return out;
  }

  getStatusSummary() {
    return {
      projectId: this.projectId,
      projectNumber: this.projectNumber,
      region: APHRODY_GCP_CONFIG.region,
      serviceAccounts: {
        primary: this.serviceAccount,
        automation: this.automationServiceAccount,
        firebase: APHRODY_GCP_CONFIG.firebaseServiceAccount,
      },
      oauthClients: {
        primaryClientId: APHRODY_GCP_CONFIG.oauthClientId,
        automationClientId: APHRODY_GCP_CONFIG.autoOauthClientId,
        redirectUri: APHRODY_GCP_CONFIG.oauthRedirectUri,
        hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      },
      apiKeysConfigured: {
        geminiApiKey: Boolean(process.env.GEMINI_API_KEY),
        googleApiKey: Boolean(process.env.GOOGLE_API_KEY),
        youtubeApiKey: Boolean(process.env.YOUTUBE_API_KEY),
      },
      models: GOOGLE_AI_MODELS,
    };
  }
}

/**
 * Unified Client for all Google AI 2026 Capabilities:
 * Search, Voice/STS, TTS, STT, ML/Reasoning/Embeddings/Agents, YouTube Data v3, Lyria Music & Flow Video
 */
export class AphrodyGoogleAIClient {
  readonly ai: GoogleGenAI;
  readonly auth: AphrodyAuthManager;
  private readonly youtubeApiKey: string;

  constructor(apiKey?: string) {
    const resolvedKey =
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "MOCK_KEY_FOR_TESTS";
    this.ai = new GoogleGenAI({ apiKey: resolvedKey, vertexai: false });
    this.auth = new AphrodyAuthManager();
    this.youtubeApiKey =
      process.env.YOUTUBE_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      "";
  }

  // ==========================================================================
  // 1. SEARCH GROUNDING, URL CONTEXT & DEEP RESEARCH
  // ==========================================================================

  async searchGrounded(
    query: string,
    options?: {
      model?: string;
      includeUrlContext?: boolean;
      includeMaps?: boolean;
    },
  ) {
    const tools: Array<Record<string, unknown>> = [{ type: "google_search" }];
    if (options?.includeUrlContext) tools.push({ type: "url_context" });
    if (options?.includeMaps) tools.push({ type: "google_maps" });

    const interaction = await this.ai.interactions.create({
      model: options?.model || GOOGLE_AI_MODELS.flash,
      input: query,
      tools: tools as any,
    });

    const searchSteps = (interaction.steps || []).filter(
      (s: any) =>
        s.type === "google_search_call" || s.type === "google_search_result",
    );

    return {
      id: interaction.id,
      text: interaction.output_text || "",
      searchSteps,
    };
  }

  async startDeepResearch(query: string, maxExhaustiveness = false) {
    const agent = maxExhaustiveness
      ? GOOGLE_AI_MODELS.agentDeepResearchMax
      : GOOGLE_AI_MODELS.agentDeepResearch;

    const interaction = await this.ai.interactions.create({
      agent,
      input: query,
      background: true,
    });

    return {
      interactionId: interaction.id,
      status: interaction.status,
      agent,
    };
  }

  // ==========================================================================
  // 2. SPEECH-TO-SPEECH (STS) & GEMINI 3.8 LIVE VOICE / TRANSLATE
  // ==========================================================================

  async connectLiveVoice(options: {
    extendedThinking?: boolean;
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
    systemInstruction?: string;
    onAudioChunk?: (base64Pcm24k: string) => void;
    onInputTranscript?: (text: string) => void;
    onOutputTranscript?: (text: string) => void;
    onInteractionStatus?: (status: "IN_PROGRESS" | "IDLE" | string) => void;
    onInterrupted?: () => void;
  }) {
    const model = options.extendedThinking
      ? GOOGLE_AI_MODELS.liveExtendedThinking
      : GOOGLE_AI_MODELS.live;

    const config: Record<string, unknown> = {
      responseModalities: ["audio"],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [
          {
            text:
              options.systemInstruction ||
              "Tu es Gemini Live sur le projet Aphrody. Réponds de manière naturelle, chaleureuse, concise et réactive.",
          },
        ],
      },
    };

    if (options.extendedThinking) {
      config.thinkingConfig = {
        thinkingLevel: options.thinkingLevel || "low",
      };
    }

    const session = await this.ai.live.connect({
      model,
      config: config as any,
      callbacks: {
        onmessage: (response: any) => {
          if (response.interactionStatus && options.onInteractionStatus) {
            options.onInteractionStatus(response.interactionStatus);
          }
          const content = response.serverContent;
          if (content?.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
              if (part.inlineData?.data && options.onAudioChunk) {
                options.onAudioChunk(part.inlineData.data);
              }
            }
          }
          if (content?.inputTranscription?.text && options.onInputTranscript) {
            options.onInputTranscript(content.inputTranscription.text);
          }
          if (
            content?.outputTranscription?.text &&
            options.onOutputTranscript
          ) {
            options.onOutputTranscript(content.outputTranscription.text);
          }
          if (content?.interrupted && options.onInterrupted) {
            options.onInterrupted();
          }
        },
        onerror: (err: unknown) =>
          console.error("[AphrodyLive] WebSocket error:", err),
      },
    });

    return {
      session,
      sendPcm16Chunk: (base64Pcm16k: string) =>
        session.sendRealtimeInput({
          audio: { data: base64Pcm16k, mimeType: "audio/pcm;rate=16000" },
        }),
      notifySilenceHybridVad: () =>
        session.sendRealtimeInput({ audioStreamEnd: true } as any),
      sendTextRealtime: (text: string) => session.sendRealtimeInput({ text }),
    };
  }

  async connectLiveTranslate(options: {
    targetLanguageCode: string;
    onAudioChunk?: (base64Pcm24k: string) => void;
    onTranscript?: (input: string, translated: string) => void;
  }) {
    return await this.ai.live.connect({
      model: GOOGLE_AI_MODELS.liveTranslate,
      config: {
        responseModalities: ["audio"],
        translationConfig: {
          targetLanguageCode: options.targetLanguageCode,
          echoTargetLanguage: true,
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      } as any,
      callbacks: {
        onmessage: (response: any) => {
          const content = response.serverContent;
          if (content?.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
              if (part.inlineData?.data && options.onAudioChunk) {
                options.onAudioChunk(part.inlineData.data);
              }
            }
          }
          if (
            (content?.inputTranscription?.text ||
              content?.outputTranscription?.text) &&
            options.onTranscript
          ) {
            options.onTranscript(
              content?.inputTranscription?.text || "",
              content?.outputTranscription?.text || "",
            );
          }
        },
      },
    });
  }

  // ==========================================================================
  // 3. CONTROLLABLE TEXT-TO-SPEECH (TTS), VOICE DESIGN & REPLICATION
  // ==========================================================================

  async synthesizeSpeech(options: {
    text: string;
    voice?: string;
    style?: string;
    lite?: boolean;
  }) {
    const model = options.lite
      ? GOOGLE_AI_MODELS.ttsLite
      : GOOGLE_AI_MODELS.tts;
    const voice = options.voice || process.env.GEMINI_DEFAULT_VOICE || "Aoede";

    const interaction = await this.ai.interactions.create({
      model,
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text: options.text,
              annotations: options.style
                ? [{ type: "speech_metadata", style: options.style }]
                : undefined,
            },
          ],
        },
      ] as any,
      response_format: { type: "audio" } as any,
      generation_config: {
        speech_config: [{ voice }],
      } as any,
    });

    return {
      interactionId: interaction.id,
      audioBase64: interaction.output_audio?.data || null,
      mimeType: interaction.output_audio?.mime_type || "audio/wav",
      voice,
      model,
    };
  }

  async designVoicePersona(options: {
    displayName: string;
    promptDescription: string;
    languageCode?: string;
    gender?: "female" | "male" | "neutral";
  }) {
    const voicesApi = (this.ai as any).voices;
    if (!voicesApi?.create) {
      throw new Error(
        "SDK voices.create requires @google/genai >= 2.25.0 and active Gemini API endpoint",
      );
    }
    return await voicesApi.create({
      store: true,
      voice: {
        model: GOOGLE_AI_MODELS.tts,
        type: "prompted",
        display_name: options.displayName,
        gender: options.gender || "female",
        language_code: options.languageCode || "fr-FR",
        prompted: {
          input: options.promptDescription,
        },
      },
    });
  }

  // ==========================================================================
  // 4. SPEECH-TO-TEXT (STT): BATCH & STREAMING LIVE TRANSCRIBE
  // ==========================================================================

  async transcribeAudioFile(filePath: string, mimeType = "audio/wav") {
    const uploaded = await this.ai.files.upload({
      file: filePath,
      config: { mimeType },
    });

    const interaction = await this.ai.interactions.create({
      model: GOOGLE_AI_MODELS.stt,
      input: [
        {
          type: "audio",
          uri: uploaded.uri,
          mime_type: uploaded.mimeType || mimeType,
        },
      ] as any,
    });

    return {
      interactionId: interaction.id,
      transcript: interaction.output_text || "",
      fileUri: uploaded.uri,
    };
  }

  async connectLiveTranscribe(options: {
    mode?: "smart" | "verbatim";
    onInterim?: (text: string) => void;
    onFinal?: (text: string) => void;
  }) {
    return await this.ai.live.connect({
      model: GOOGLE_AI_MODELS.sttLive,
      config: {
        responseModalities: ["text"],
        inputAudioTranscription: { mode: options.mode || "smart" },
      } as any,
      callbacks: {
        onmessage: (msg: any) => {
          if (
            msg.serverContent?.interimInputTranscription?.text &&
            options.onInterim
          ) {
            options.onInterim(msg.serverContent.interimInputTranscription.text);
          }
          if (msg.serverContent?.inputTranscription?.text && options.onFinal) {
            options.onFinal(msg.serverContent.inputTranscription.text);
          }
        },
      },
    });
  }

  // ==========================================================================
  // 5. ML, GEMINI 4 ARGON REASONING, EMBEDDINGS 2, IMAGE GEN & MANAGED AGENTS
  // ==========================================================================

  async reasonWithArgon(prompt: string, previousInteractionId?: string) {
    const interaction = await this.ai.interactions.create({
      model: GOOGLE_AI_MODELS.reasoning,
      input: prompt,
      previous_interaction_id: previousInteractionId,
    });
    return {
      id: interaction.id,
      text: interaction.output_text || "",
      steps: interaction.steps || [],
    };
  }

  async embedMultimodal(contents: string | Array<Record<string, unknown>>) {
    const response = await this.ai.models.embedContent({
      model: GOOGLE_AI_MODELS.embeddingMultimodal,
      contents: contents as any,
    });
    return response.embeddings;
  }

  async generateImage(prompt: string, proQuality = false) {
    const model = proQuality
      ? GOOGLE_AI_MODELS.imagePro
      : GOOGLE_AI_MODELS.imageDefault;
    const interaction = await this.ai.interactions.create({
      model,
      input: prompt,
    });
    return {
      id: interaction.id,
      imageBase64: interaction.output_image?.data || null,
      mimeType: interaction.output_image?.mime_type || "image/png",
      text: interaction.output_text || null,
    };
  }

  async runAntigravityManagedAgent(taskPrompt: string, useArgon = false) {
    const interaction = await this.ai.interactions.create({
      agent: GOOGLE_AI_MODELS.agentAntigravity,
      input: taskPrompt,
      environment: "remote",
      ...(useArgon
        ? { agent_config: { type: "antigravity", model: "gemini-4-argon" } }
        : {}),
    } as any);

    return {
      id: interaction.id,
      environmentId: (interaction as any).environment_id,
      outputText: interaction.output_text || "",
    };
  }

  // ==========================================================================
  // 6. YOUTUBE DATA API v3 & GEMINI YOUTUBE MULTIMODAL UNDERSTANDING
  // ==========================================================================

  async searchYouTube(
    query: string,
    maxResults = 5,
    oauthBearerToken?: string,
  ): Promise<YouTubeVideoSummary[]> {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(maxResults));
    if (!oauthBearerToken && this.youtubeApiKey) {
      url.searchParams.set("key", this.youtubeApiKey);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (oauthBearerToken) {
      headers.Authorization = `Bearer ${oauthBearerToken}`;
    }

    const resp = await fetch(url.toString(), { headers });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`YouTube Data API v3 error (${resp.status}): ${errText}`);
    }
    const data = (await resp.json()) as any;
    return (data.items || []).map((item: any) => ({
      videoId: item.id?.videoId || "",
      title: item.snippet?.title || "",
      channelTitle: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || "",
      description: item.snippet?.description || "",
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url,
      url: `https://www.youtube.com/watch?v=${item.id?.videoId || ""}`,
    }));
  }

  async analyzeYouTubeVideoWithGemini(
    youtubeUrl: string,
    question = "Résume cette vidéo YouTube en français avec les points clés et les timestamps importants.",
  ) {
    const interaction = await this.ai.interactions.create({
      model: GOOGLE_AI_MODELS.flash,
      input: [
        { type: "text", text: question },
        { type: "video", uri: youtubeUrl },
      ] as any,
    });

    return {
      interactionId: interaction.id,
      youtubeUrl,
      analysis: interaction.output_text || "",
    };
  }

  // ==========================================================================
  // 7. LYRIA 3.5 / LYRIA 3 CLIP & LYRIA REALTIME 48kHz MUSIC GENERATION
  // ==========================================================================

  async generateLyriaMusic(
    prompt: string,
    options?: { clipOnly?: boolean; outputPath?: string },
  ): Promise<LyriaGenerationResult> {
    const model = options?.clipOnly
      ? GOOGLE_AI_MODELS.lyriaClip
      : GOOGLE_AI_MODELS.lyriaSong;

    const interaction = await this.ai.interactions.create({
      model,
      input: prompt,
    });

    const audioBase64 = interaction.output_audio?.data || null;
    const mimeType = interaction.output_audio?.mime_type || "audio/mp3";

    if (audioBase64 && options?.outputPath) {
      const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
      await Bun.write(options.outputPath, bytes);
    }

    return {
      model,
      audioBase64,
      mimeType,
      lyricsOrStructure: interaction.output_text || null,
      interactionId: interaction.id,
    };
  }

  async connectLyriaRealtime(options: {
    prompts: Array<{ text: string; weight: number }>;
    bpm?: number;
    temperature?: number;
    onAudioChunk48kStereoPcm16?: (base64Pcm: string) => void;
  }) {
    const liveMusic = (this.ai.live as any).music;
    if (!liveMusic?.connect) {
      throw new Error(
        "Lyria RealTime requires @google/genai live.music.connect",
      );
    }

    const session = await liveMusic.connect({
      model: GOOGLE_AI_MODELS.lyriaRealtime,
      callbacks: {
        onmessage: (message: any) => {
          if (message.serverContent?.audioChunks) {
            for (const chunk of message.serverContent.audioChunks) {
              if (chunk.data && options.onAudioChunk48kStereoPcm16) {
                options.onAudioChunk48kStereoPcm16(chunk.data);
              }
            }
          }
        },
        onerror: (err: unknown) =>
          console.error("[LyriaRealtime] stream error:", err),
      },
    });

    await session.setWeightedPrompts({
      weightedPrompts: options.prompts,
    });
    await session.setMusicGenerationConfig({
      musicGenerationConfig: {
        bpm: options.bpm || 110,
        temperature: options.temperature ?? 1.0,
        audioFormat: "pcm16",
        sampleRateHz: 48000,
      },
    });
    await session.play();

    return session;
  }

  // ==========================================================================
  // 8. FLOW / GEMINI OMNI 1.1 FLASH VIDEO GENERATION & EDITING PIPELINE
  // ==========================================================================

  buildFlowPromptWithTags(req: FlowVideoRequest): string {
    const tags: string[] = [];
    if (req.firstFrameUri) tags.push("<FIRST_FRAME>");
    if (req.lastFrameUri && req.firstFrameUri) tags.push("<LAST_FRAME>");
    if (req.referenceImageUris?.length) {
      req.referenceImageUris.forEach((_, i) => tags.push(`<IMAGE_REF_${i}>`));
    }
    if (req.referenceVideoUris?.length) {
      req.referenceVideoUris.forEach((_, i) => tags.push(`<VIDEO_REF_${i}>`));
    }
    return tags.length > 0 ? `${tags.join(" ")} ${req.prompt}` : req.prompt;
  }

  async generateFlowVideo(req: FlowVideoRequest) {
    const inputParts: Array<Record<string, unknown>> = [];
    if (req.firstFrameUri) {
      inputParts.push({ type: "image", uri: req.firstFrameUri });
    }
    if (req.lastFrameUri && req.firstFrameUri) {
      inputParts.push({ type: "image", uri: req.lastFrameUri });
    }
    for (const imgUri of req.referenceImageUris || []) {
      inputParts.push({ type: "image", uri: imgUri });
    }
    for (const vidUri of req.referenceVideoUris || []) {
      inputParts.push({ type: "video", uri: vidUri });
    }

    const fullPrompt = this.buildFlowPromptWithTags(req);
    inputParts.push({ type: "text", text: fullPrompt });

    const interaction = await this.ai.interactions.create({
      model: GOOGLE_AI_MODELS.flowVideo,
      input: inputParts as any,
      previous_interaction_id: req.previousInteractionId,
      generation_config: {
        aspect_ratio: req.aspectRatio || "16:9",
        resolution: req.resolution || "720p",
        duration_seconds: req.durationSeconds || 5,
      } as any,
    });

    return {
      interactionId: interaction.id,
      model: GOOGLE_AI_MODELS.flowVideo,
      prompt: fullPrompt,
      status: interaction.status,
      steps: interaction.steps || [],
    };
  }
}

export * from "./cookie_session";
