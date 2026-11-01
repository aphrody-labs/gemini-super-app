#!/usr/bin/env bun
/**
 * Aphrody Unified Google Cloud & Google AI CLI (`bun run aphrody <subcommand>`)
 *
 * Subcommands:
 *   status                         Show Aphrody GCP Project, OAuth Clients, Service Accounts & AI Models
 *   oauth-url [--auto]             Generate OAuth 2.0 Consent URL for Aphrody Client
 *   token [--auto]                 Verify Service Account Impersonation token (masked)
 *   search "<query>"               Run Gemini 3.8 Flash with Google Search Grounding & citations
 *   research "<query>" [--max]     Start background Deep Research Agent
 *   tts "<text>" [--voice=Aoede]   Generate controllable speech with gemini-3.8-flash-tts
 *   stt <file.wav>                 Transcribe audio file with gemini-3.5-transcribe
 *   ml "<prompt>"                  Complex reasoning with gemini-4-argon
 *   embed "<text>"                 Generate multimodal embeddings with gemini-embedding-2
 *   youtube "<query-or-url>"       Search YouTube Data API v3 or analyze a YouTube URL with Gemini
 *   lyria "<prompt>" [--clip]      Generate 44.1kHz stereo music + lyrics with lyria-3.5 / lyria-3-clip-preview
 *   flow "<prompt>" [--res=1080p]  Generate cinematic video with gemini-omni-1.1-flash
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  AphrodyAuthManager,
  AphrodyGoogleAIClient,
} from "../packages/google_ai_suite/src/index";

const args = process.argv.slice(2);
const subcommand = (args[0] || "status").toLowerCase();
const restArgs = args.slice(1);

function getFlag(name: string, defaultVal?: string): string | undefined {
  const prefix = `--${name}=`;
  const found = restArgs.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultVal;
}

function hasFlag(name: string): boolean {
  return restArgs.includes(`--${name}`);
}

const positional = restArgs.filter((a) => !a.startsWith("--"));

async function main() {
  const auth = new AphrodyAuthManager();
  const client = new AphrodyGoogleAIClient();

  switch (subcommand) {
    case "status": {
      console.log(JSON.stringify(auth.getStatusSummary(), null, 2));
      break;
    }

    case "oauth-url": {
      const useAuto = hasFlag("auto");
      const url = auth.generateConsentUrl(undefined, useAuto);
      console.log(
        `=== Aphrody OAuth 2.0 Consent URL (${useAuto ? "Automation" : "Primary"}) ===`,
      );
      console.log(url);
      break;
    }

    case "token": {
      const sa = hasFlag("auto")
        ? auth.automationServiceAccount
        : auth.serviceAccount;
      const token = await auth.getImpersonatedAccessToken(sa);
      console.log(`Service Account : ${sa}`);
      console.log(
        `Access Token    : ${token.slice(0, 12)}...${token.slice(-6)} (len=${token.length})`,
      );
      break;
    }

    case "search": {
      const query =
        positional.join(" ") ||
        "Quelles sont les dernières nouveautés de Google Gemini et Bun v1.4.4 ?";
      console.log(`[Aphrody Search Grounding] Query: "${query}"`);
      const res = await client.searchGrounded(query, {
        includeUrlContext: hasFlag("url"),
        includeMaps: hasFlag("maps"),
      });
      console.log("\n=== Answer ===");
      console.log(res.text);
      console.log(`\nSearch steps executed: ${res.searchSteps.length}`);
      break;
    }

    case "research": {
      const query =
        positional.join(" ") ||
        "Compare low-latency audio architectures for full-duplex voice agents.";
      const res = await client.startDeepResearch(query, hasFlag("max"));
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case "tts": {
      const text =
        positional.join(" ") ||
        "Bonjour depuis le projet Google Cloud Aphrody ! Le mode vocal Gemini 3.8 Flash TTS est prêt.";
      const voice = getFlag("voice", "Aoede")!;
      const style = getFlag(
        "style",
        "warm, natural, expressive French conversational tone",
      );
      const mediaDir = join(import.meta.dir, "..", "media");
      mkdirSync(mediaDir, { recursive: true });
      const outPath = join(mediaDir, "aphrody_tts.wav");

      console.log(
        `[Aphrody TTS] Model: gemini-3.8-flash-tts | Voice: ${voice} | Style: "${style}"`,
      );
      const res = await client.synthesizeSpeech({
        text,
        voice,
        style,
        lite: hasFlag("lite"),
      });
      if (res.audioBase64) {
        const bytes = Uint8Array.from(atob(res.audioBase64), (c) =>
          c.charCodeAt(0),
        );
        await Bun.write(outPath, bytes);
        console.log(
          `Saved TTS audio (${bytes.byteLength} bytes) -> ${outPath}`,
        );
      } else {
        console.log("TTS response:", res);
      }
      break;
    }

    case "stt": {
      const filePath = positional[0];
      if (!filePath) {
        console.error("Usage: bun run aphrody stt <path/to/audio.wav>");
        process.exit(1);
      }
      const res = await client.transcribeAudioFile(filePath);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case "ml": {
      const prompt =
        positional.join(" ") ||
        "Donne un résumé exécutif en 3 points de l'architecture vocale temps réel Gemini 3.8 Live + Whisper large-v3-turbo.";
      console.log(`[Aphrody ML Reasoning] Model: gemini-4-argon`);
      const res = await client.reasonWithArgon(prompt);
      console.log(res.text);
      break;
    }

    case "embed": {
      const text =
        positional.join(" ") ||
        "Gemini Live full-duplex voice assistant with animated official Gemini SVG";
      console.log(`[Aphrody Embeddings] Model: gemini-embedding-2`);
      const embeddings = await client.embedMultimodal(text);
      const firstVec = embeddings?.[0]?.values || [];
      console.log(
        `Generated embedding vector: dimension=${firstVec.length}, preview=[${firstVec
          .slice(0, 5)
          .map((v) => v.toFixed(5))
          .join(", ")}, ...]`,
      );
      break;
    }

    case "youtube": {
      const target = positional.join(" ") || "Google Gemini Live API";
      if (
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.includes("youtube.com/") ||
        target.includes("youtu.be/")
      ) {
        const question = getFlag(
          "q",
          "Résume cette vidéo YouTube en français avec les points clés.",
        );
        console.log(`[Aphrody YouTube Video Understanding] URL: ${target}`);
        const res = await client.analyzeYouTubeVideoWithGemini(
          target,
          question,
        );
        console.log(res.analysis);
      } else {
        console.log(`[Aphrody YouTube Data API v3] Searching: "${target}"`);
        const videos = await client.searchYouTube(target, 5);
        console.log(JSON.stringify(videos, null, 2));
      }
      break;
    }

    case "lyria": {
      const prompt =
        positional.join(" ") ||
        "An uplifting French electronic synthwave track with warm analog pads and crisp drums.";
      const mediaDir = join(import.meta.dir, "..", "media");
      mkdirSync(mediaDir, { recursive: true });
      const outPath = join(mediaDir, "aphrody_lyria.mp3");
      console.log(
        `[Aphrody Lyria Music] Model: ${hasFlag("clip") ? "lyria-3-clip-preview" : "lyria-3.5"}`,
      );
      const res = await client.generateLyriaMusic(prompt, {
        clipOnly: hasFlag("clip"),
        outputPath: outPath,
      });
      console.log(
        JSON.stringify(
          {
            model: res.model,
            interactionId: res.interactionId,
            outputPath: res.audioBase64 ? outPath : null,
            lyricsOrStructure: res.lyricsOrStructure,
          },
          null,
          2,
        ),
      );
      break;
    }

    case "flow": {
      const prompt =
        positional.join(" ") ||
        "Continuous unbroken shot of a glowing crystal Gemini star floating over Paris at twilight, calm ambient synth soundtrack.";
      const resolution = (getFlag("res", "720p") as any) || "720p";
      console.log(
        `[Aphrody Flow Video] Model: gemini-omni-1.1-flash | Resolution: ${resolution}`,
      );
      const res = await client.generateFlowVideo({
        prompt,
        resolution,
        firstFrameUri: getFlag("first-frame"),
        lastFrameUri: getFlag("last-frame"),
      });
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    default:
      console.log(
        "Unknown subcommand. Available: status, oauth-url, token, search, research, tts, stt, ml, embed, youtube, lyria, flow",
      );
  }
}

await main();
