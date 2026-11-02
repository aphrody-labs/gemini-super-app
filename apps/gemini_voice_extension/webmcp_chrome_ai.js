/**
 * @fileoverview Unified WebMCP (`document.modelContext`) & Chrome Built-in AI (`LanguageModel`,
 * `Summarizer`, `Translator`, `LanguageDetector`) + Native "Gemini in Chrome" (`Glic`) runtime
 * for the Gemini Live Voice Hub Chrome Extension and Super App.
 *
 * Follows all Modern Web Guidance specifications:
 * - Uses `document.modelContext.registerTool(tool, { signal })` (never deprecated `navigator.modelContext` or `unregisterTool`).
 * - Tool descriptions explain when/why to use the tool without repeating `inputSchema` parameter names, types, or enums.
 * - Tool `execute(input, { signal })` functions forward `{ signal }`, return `{ error }` for recoverable failures, and re-throw on `signal.aborted`.
 * - Includes `annotations` (`readOnlyHint`, `consequentialHint`, `untrustedContentHint`, `debugging`) on every tool.
 * - Uses `LanguageModel.availability()`, `LanguageModel.params()`, `LanguageModel.create({ initialPrompts, monitor })`, `session.clone()`, `session.destroy()`, plain-object `responseConstraint`, and `textContent`.
 * - Passes identical `options` objects to `Summarizer.availability(options)` / `Summarizer.create(options)` and `Translator.availability(options)` / `Translator.create(options)`.
 */

(() => {
  const BRIDGE_HTTP_URL = "http://127.0.0.1:8765";
  const SUPER_APP_HTTP_URL = "http://127.0.0.1:8787";

  /** @type {AbortController | null} */
  let webMcpRegistrationController = null;

  /** @type {any | null} */
  let cachedBaseLanguageModelSession = null;

  /**
   * Returns the active WebMCP modelContext container using the Chromium 150+
   * `document.modelContext` standard.
   * @return {any | null}
   */
  function getDocumentModelContext() {
    if (typeof document !== "undefined" && document.modelContext) {
      return document.modelContext;
    }
    return null;
  }

  /**
   * Probes availability of all Chrome Built-in AI APIs (`LanguageModel`, `Summarizer`,
   * `Translator`, `LanguageDetector`) and WebMCP (`document.modelContext`).
   * @return {Promise<Record<string, unknown>>}
   */
  async function probeChromeAiCapabilities() {
    const capabilities = {
      webMcpAvailable: Boolean(getDocumentModelContext()),
      languageModel: "unavailable",
      languageModelParams: null,
      summarizer: "unavailable",
      translatorFrEn: "unavailable",
      languageDetector: "unavailable",
      userActivationActive:
        typeof navigator !== "undefined" && "userActivation" in navigator
          ? Boolean(navigator.userActivation.isActive)
          : false,
    };

    if ("LanguageModel" in self) {
      try {
        capabilities.languageModel = await self.LanguageModel.availability();
        if (typeof self.LanguageModel.params === "function") {
          capabilities.languageModelParams = await self.LanguageModel.params();
        }
      } catch {
        capabilities.languageModel = "unavailable";
      }
    }

    if ("Summarizer" in self) {
      try {
        const summarizerOptions = {
          type: "key-points",
          format: "plain-text",
          length: "short",
        };
        capabilities.summarizer =
          await self.Summarizer.availability(summarizerOptions);
      } catch {
        capabilities.summarizer = "unavailable";
      }
    }

    if ("Translator" in self) {
      try {
        const translatorOptions = {
          sourceLanguage: "fr",
          targetLanguage: "en",
        };
        capabilities.translatorFrEn =
          await self.Translator.availability(translatorOptions);
      } catch {
        capabilities.translatorFrEn = "unavailable";
      }
    }

    if ("LanguageDetector" in self) {
      try {
        capabilities.languageDetector =
          await self.LanguageDetector.availability();
      } catch {
        capabilities.languageDetector = "unavailable";
      }
    }

    return capabilities;
  }

  /**
   * Runs a prompt through Chrome's built-in on-device `LanguageModel` (Gemini Nano)
   * using a cloned session for isolation and deterministic cleanup via `session.destroy()`.
   * Optionally writes output to a target DOM element's `textContent` (never `innerHTML`).
   *
   * @param {string} promptText
   * @param {{
   *   systemPrompt?: string,
   *   responseConstraint?: Record<string, unknown>,
   *   signal?: AbortSignal,
   *   targetElement?: HTMLElement | null,
   *   onDownloadProgress?: (loadedFraction: number) => void
   * }} [options]
   * @return {Promise<{ ok: boolean, source: string, output?: string, parsed?: unknown, error?: string }>}
   */
  async function runOnDeviceLanguageModel(promptText, options = {}) {
    if (!("LanguageModel" in self)) {
      return {
        ok: false,
        source: "LanguageModel",
        error: "LanguageModel API is not supported in this browser.",
      };
    }

    const availability = await self.LanguageModel.availability();
    if (availability === "unavailable") {
      return {
        ok: false,
        source: "LanguageModel",
        error: "On-device Gemini Nano model is unavailable on this device.",
      };
    }

    if (
      (availability === "downloadable" || availability === "downloading") &&
      typeof navigator !== "undefined" &&
      navigator.userActivation &&
      !navigator.userActivation.isActive
    ) {
      return {
        ok: false,
        source: "LanguageModel",
        error:
          "User interaction is required to initiate the on-device Gemini Nano download.",
      };
    }

    let taskSession = null;
    try {
      if (!cachedBaseLanguageModelSession) {
        const systemPrompt =
          options.systemPrompt ||
          "You are Gemini in Chrome, a concise, accurate voice and browser assistant.";
        cachedBaseLanguageModelSession = await self.LanguageModel.create({
          initialPrompts: [{ role: "system", content: systemPrompt }],
          monitor(m) {
            m.addEventListener("downloadprogress", (e) => {
              if (typeof options.onDownloadProgress === "function") {
                options.onDownloadProgress(Number(e.loaded) || 0);
              }
            });
          },
        });
      }

      taskSession = await cachedBaseLanguageModelSession.clone();
      const promptOptions = {};
      if (options.signal) {
        promptOptions.signal = options.signal;
      }
      if (
        options.responseConstraint &&
        typeof options.responseConstraint === "object"
      ) {
        promptOptions.responseConstraint = options.responseConstraint;
      }

      if (options.targetElement && !options.responseConstraint) {
        options.targetElement.textContent = "";
        const stream = taskSession.promptStreaming(promptText, promptOptions);
        let fullText = "";
        for await (const chunk of stream) {
          fullText += String(chunk);
          options.targetElement.textContent = fullText;
        }
        return { ok: true, source: "LanguageModel", output: fullText };
      }

      const resultText = await taskSession.prompt(promptText, promptOptions);
      if (options.targetElement) {
        options.targetElement.textContent = String(resultText);
      }
      if (options.responseConstraint) {
        try {
          return {
            ok: true,
            source: "LanguageModel",
            output: String(resultText),
            parsed: JSON.parse(String(resultText)),
          };
        } catch {
          return {
            ok: true,
            source: "LanguageModel",
            output: String(resultText),
          };
        }
      }
      return { ok: true, source: "LanguageModel", output: String(resultText) };
    } catch (err) {
      if (options.signal && options.signal.aborted) {
        throw err;
      }
      return {
        ok: false,
        source: "LanguageModel",
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (taskSession && typeof taskSession.destroy === "function") {
        taskSession.destroy();
      }
    }
  }

  /**
   * Summarizes text using Chrome's built-in `Summarizer` API, passing the exact same
   * configuration options to both `Summarizer.availability(options)` and `Summarizer.create()`.
   *
   * @param {string} text
   * @param {{
   *   sharedContext?: string,
   *   context?: string,
   *   type?: 'key-points' | 'tldr' | 'teaser' | 'headline',
   *   format?: 'plain-text' | 'markdown',
   *   length?: 'short' | 'medium' | 'long'
   * }} [config]
   * @return {Promise<{ ok: boolean, summary?: string, error?: string }>}
   */
  async function runOnDeviceSummarizer(text, config = {}) {
    if (!("Summarizer" in self)) {
      return {
        ok: false,
        error: "Summarizer API is not supported in this browser.",
      };
    }

    const options = {
      sharedContext:
        config.sharedContext || "Web page and voice transcript content",
      type: config.type || "key-points",
      format: config.format || "plain-text",
      length: config.length || "short",
    };

    const availability = await self.Summarizer.availability(options);
    if (availability === "unavailable") {
      return { ok: false, error: "Summarizer model is unavailable." };
    }
    if (
      (availability === "downloadable" || availability === "downloading") &&
      typeof navigator !== "undefined" &&
      navigator.userActivation &&
      !navigator.userActivation.isActive
    ) {
      return {
        ok: false,
        error: "User interaction is required to download the Summarizer model.",
      };
    }

    let summarizer = null;
    try {
      summarizer = await self.Summarizer.create({
        ...options,
        monitor(m) {
          m.addEventListener("downloadprogress", () => {});
        },
      });
      const summary = await summarizer.summarize(text, {
        context: config.context || "Provide a clear, concise summary.",
      });
      return { ok: true, summary: String(summary) };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (summarizer && typeof summarizer.destroy === "function") {
        summarizer.destroy();
      }
    }
  }

  /**
   * Detects language with `LanguageDetector` and translates text with `Translator`,
   * passing identical `{ sourceLanguage, targetLanguage }` options to `availability()` and `create()`.
   *
   * @param {string} text
   * @param {{ sourceLanguage?: string, targetLanguage?: string }} [langConfig]
   * @return {Promise<{ ok: boolean, detectedLanguage?: string, confidence?: number, translatedText?: string, error?: string }>}
   */
  async function runOnDeviceLanguageAndTranslator(text, langConfig = {}) {
    let sourceLanguage = langConfig.sourceLanguage || "";
    let confidence = 1;

    if (!sourceLanguage && "LanguageDetector" in self) {
      const detAvail = await self.LanguageDetector.availability();
      if (
        detAvail === "available" ||
        (navigator.userActivation && navigator.userActivation.isActive)
      ) {
        let detector = null;
        try {
          detector = await self.LanguageDetector.create({
            monitor(m) {
              m.addEventListener("downloadprogress", () => {});
            },
          });
          const detections = await detector.detect(text);
          if (Array.isArray(detections) && detections.length > 0) {
            sourceLanguage = detections[0].detectedLanguage || "fr";
            confidence = Number(detections[0].confidence) || 0;
          }
        } catch {
          sourceLanguage = "fr";
        } finally {
          if (detector && typeof detector.destroy === "function") {
            detector.destroy();
          }
        }
      }
    }

    if (!sourceLanguage) {
      sourceLanguage = "fr";
    }
    const targetLanguage =
      langConfig.targetLanguage || (sourceLanguage === "fr" ? "en" : "fr");

    if (!("Translator" in self)) {
      return {
        ok: true,
        detectedLanguage: sourceLanguage,
        confidence,
        error:
          "Translator API is not supported; returning detected language only.",
      };
    }

    const options = { sourceLanguage, targetLanguage };
    const availability = await self.Translator.availability(options);
    if (availability === "unavailable") {
      return {
        ok: false,
        detectedLanguage: sourceLanguage,
        confidence,
        error: `Translation pair ${sourceLanguage} -> ${targetLanguage} is unavailable.`,
      };
    }
    if (
      (availability === "downloadable" || availability === "downloading") &&
      typeof navigator !== "undefined" &&
      navigator.userActivation &&
      !navigator.userActivation.isActive
    ) {
      return {
        ok: false,
        detectedLanguage: sourceLanguage,
        confidence,
        error: "User gesture required to download the Translator pack.",
      };
    }

    let translator = null;
    try {
      translator = await self.Translator.create({
        ...options,
        monitor(m) {
          m.addEventListener("downloadprogress", () => {});
        },
      });
      const translatedText = await translator.translate(text);
      return {
        ok: true,
        detectedLanguage: sourceLanguage,
        confidence,
        translatedText: String(translatedText),
      };
    } catch (err) {
      return {
        ok: false,
        detectedLanguage: sourceLanguage,
        confidence,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (translator && typeof translator.destroy === "function") {
        translator.destroy();
      }
    }
  }

  /**
   * Registers all imperative WebMCP tools on `document.modelContext` using an `AbortController`
   * signal for lifecycle management, plus wires declarative WebMCP `<form toolname="...">`
   * and `toolactivated` / `toolcancel` listeners.
   *
   * @return {{ registered: boolean, toolCount: number, abort: () => void }}
   */
  function registerGeminiWebMcpTools() {
    if (webMcpRegistrationController) {
      webMcpRegistrationController.abort();
    }
    webMcpRegistrationController = new AbortController();
    const { signal } = webMcpRegistrationController;

    // Bind WebMCP lifecycle events using feature-detected event target
    if (typeof document !== "undefined") {
      const eventTarget =
        "ontoolactivated" in (document.modelContext ?? {})
          ? document.modelContext
          : window;

      eventTarget.addEventListener(
        "toolactivated",
        (event) => {
          const detail = /** @type {any} */ (event);
          document.documentElement.dataset.activeWebmcpTool =
            detail.toolName || "active";
        },
        { signal },
      );

      eventTarget.addEventListener(
        "toolcancel",
        () => {
          delete document.documentElement.dataset.activeWebmcpTool;
        },
        { signal },
      );

      // Bind declarative WebMCP form if present on the page
      const voiceForm = document.getElementById("webmcp-voice-form");
      if (voiceForm) {
        voiceForm.addEventListener(
          "submit",
          (event) => {
            const submitEvent = /** @type {any} */ (event);
            const formData = new FormData(
              /** @type {HTMLFormElement} */ (voiceForm),
            );
            const promptValue = String(formData.get("prompt") || "").trim();
            if (!promptValue) {
              if (submitEvent.agentInvoked && submitEvent.respondWith) {
                event.preventDefault();
                submitEvent.respondWith(
                  Promise.resolve({ error: "Prompt cannot be empty." }),
                );
              }
              return;
            }
            event.preventDefault();
            const executionPromise = (async () => {
              try {
                const res = await fetch(`${BRIDGE_HTTP_URL}/prompt`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prompt: promptValue,
                    speak: true,
                    voice: "Aoede",
                  }),
                });
                if (!res.ok) {
                  return { error: `Voice Hub returned HTTP ${res.status}` };
                }
                return await res.json();
              } catch (err) {
                return {
                  error: err instanceof Error ? err.message : String(err),
                };
              }
            })();

            if (
              submitEvent.agentInvoked &&
              typeof submitEvent.respondWith === "function"
            ) {
              submitEvent.respondWith(executionPromise);
            }
          },
          { signal },
        );
      }
    }

    const modelContext = getDocumentModelContext();
    if (!modelContext || typeof modelContext.registerTool !== "function") {
      return {
        registered: false,
        toolCount: 0,
        abort: () => webMcpRegistrationController?.abort(),
      };
    }

    const tools = [
      {
        name: "get_realtime_clock_and_date",
        description:
          "Returns the exact current local time, date, weekday, timezone, and Unix timestamp from the host PC with zero latency.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          consequentialHint: false,
        },
        async execute(_input, { signal: execSignal } = {}) {
          try {
            const res = await fetch(
              `${BRIDGE_HTTP_URL}/api/antigravity/clock`,
              {
                signal: execSignal,
              },
            );
            if (!res.ok) {
              const now = new Date();
              return {
                iso: now.toISOString(),
                localTime: now.toLocaleTimeString("fr-FR"),
                localDate: now.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              };
            }
            return await res.json();
          } catch (err) {
            if (execSignal?.aborted) {
              throw err;
            }
            const now = new Date();
            return {
              iso: now.toISOString(),
              localTime: now.toLocaleTimeString("fr-FR"),
              localDate: now.toLocaleDateString("fr-FR"),
            };
          }
        },
      },
      {
        name: "speak_with_gemini_live",
        description:
          "Sends a spoken instruction or question to the full-duplex Gemini Live Voice Hub and synthesizes the response using Aoede HD audio.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The spoken message or question to send to Gemini.",
            },
            speak: {
              type: "boolean",
              description: "Whether to play the spoken TTS response aloud.",
            },
          },
          required: ["prompt"],
        },
        annotations: {
          readOnlyHint: false,
          consequentialHint: false,
        },
        async execute(input, { signal: execSignal } = {}) {
          try {
            const res = await fetch(`${BRIDGE_HTTP_URL}/prompt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: input.prompt,
                speak: input.speak !== false,
                voice: "Aoede",
              }),
              signal: execSignal,
            });
            if (!res.ok) {
              return { error: `Voice Hub returned HTTP ${res.status}` };
            }
            return await res.json();
          } catch (err) {
            if (execSignal?.aborted) {
              throw err;
            }
            return {
              error: err instanceof Error ? err.message : String(err),
            };
          }
        },
      },
      {
        name: "read_pc_filesystem",
        description:
          "Lists directory entries or reads file contents on the local Windows PC via the Antigravity FileSystem bridge.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["list", "read", "stat"],
              description: "Filesystem operation to perform.",
            },
            path: {
              type: "string",
              description: "Absolute or workspace-relative path on the PC.",
            },
          },
          required: ["action", "path"],
        },
        annotations: {
          readOnlyHint: true,
          consequentialHint: false,
          untrustedContentHint: true,
        },
        async execute(input, { signal: execSignal } = {}) {
          try {
            const endpoint = `${BRIDGE_HTTP_URL}/api/fs/${encodeURIComponent(input.action)}`;
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: input.path }),
              signal: execSignal,
            });
            if (!res.ok) {
              return { error: `Filesystem bridge returned HTTP ${res.status}` };
            }
            return await res.json();
          } catch (err) {
            if (execSignal?.aborted) {
              throw err;
            }
            return {
              error: err instanceof Error ? err.message : String(err),
            };
          }
        },
      },
      {
        name: "execute_pc_command",
        description:
          "Executes a shell command or Antigravity CLI skill on the local PC and returns stdout, stderr, and exit code.",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Command line to run in the workspace.",
            },
            cwd: {
              type: "string",
              description: "Working directory for the command.",
            },
          },
          required: ["command"],
        },
        annotations: {
          readOnlyHint: false,
          consequentialHint: true,
        },
        async execute(input, { signal: execSignal } = {}) {
          try {
            const res = await fetch(`${BRIDGE_HTTP_URL}/api/fs/exec`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                command: input.command,
                cwd: input.cwd || "C:\\Users\\aphro\\google",
              }),
              signal: execSignal,
            });
            if (!res.ok) {
              return { error: `Command execution returned HTTP ${res.status}` };
            }
            return await res.json();
          } catch (err) {
            if (execSignal?.aborted) {
              throw err;
            }
            return {
              error: err instanceof Error ? err.message : String(err),
            };
          }
        },
      },
      {
        name: "run_chrome_builtin_ai",
        description:
          "Runs on-device Chrome Built-in AI tasks including Gemini Nano prompting, key-point summarization, language detection, or translation.",
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              enum: ["prompt", "summarize", "translate", "capabilities"],
              description: "Built-in Chrome AI capability to invoke.",
            },
            text: {
              type: "string",
              description: "Input text to process.",
            },
            targetLanguage: {
              type: "string",
              description: "BCP-47 target language code when translating.",
            },
          },
          required: ["task"],
        },
        annotations: {
          readOnlyHint: true,
          consequentialHint: false,
        },
        async execute(input, { signal: execSignal } = {}) {
          try {
            if (input.task === "capabilities") {
              return await probeChromeAiCapabilities();
            }
            const text = String(input.text || "").trim();
            if (!text) {
              return { error: "Input text is required for this AI task." };
            }
            if (input.task === "summarize") {
              return await runOnDeviceSummarizer(text);
            }
            if (input.task === "translate") {
              return await runOnDeviceLanguageAndTranslator(text, {
                targetLanguage: input.targetLanguage,
              });
            }
            return await runOnDeviceLanguageModel(text, { signal: execSignal });
          } catch (err) {
            if (execSignal?.aborted) {
              throw err;
            }
            return {
              error: err instanceof Error ? err.message : String(err),
            };
          }
        },
      },
      {
        name: "inspect_gemini_in_chrome_glic",
        description:
          "Retrieves the extracted native Gemini in Chrome (Glic) WebUI manifest, Mojom resources, and active Chrome AI experiments.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          consequentialHint: false,
          debugging: true,
        },
        async execute(_input, { signal: execSignal } = {}) {
          try {
            const res = await fetch(`${SUPER_APP_HTTP_URL}/api/chrome/glic`, {
              signal: execSignal,
            });
            if (!res.ok) {
              return {
                error: `Glic inspection endpoint returned HTTP ${res.status}`,
              };
            }
            return await res.json();
          } catch (err) {
            if (execSignal?.aborted) {
              throw err;
            }
            return {
              error: err instanceof Error ? err.message : String(err),
            };
          }
        },
      },
    ];

    let registeredCount = 0;
    for (const tool of tools) {
      try {
        modelContext.registerTool(tool, { signal });
        registeredCount += 1;
      } catch {
        // Ignore duplicate registration errors on hot reload
      }
    }

    return {
      registered: registeredCount > 0,
      toolCount: registeredCount,
      abort: () => webMcpRegistrationController?.abort(),
    };
  }

  // Expose unified API on globalThis for newtab.js, content.js, and Glic host
  const runtimeApi = {
    registerGeminiWebMcpTools,
    probeChromeAiCapabilities,
    runOnDeviceLanguageModel,
    runOnDeviceSummarizer,
    runOnDeviceLanguageAndTranslator,
  };

  /** @type {any} */ (globalThis).GeminiWebMcpChromeAi = runtimeApi;

  // Auto-register WebMCP tools when loaded in a Document context
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          registerGeminiWebMcpTools();
        },
        { once: true },
      );
    } else {
      registerGeminiWebMcpTools();
    }
  }
})();
