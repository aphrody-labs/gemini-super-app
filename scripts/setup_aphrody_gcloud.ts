/**
 * Aphrody Google Cloud, OAuth 2.0 Client, Service Account & API Keys Bootstrap
 * Synchronizes credentials from GCP Project `aphrody` (468000409790) into:
 * - `.env` (gitignored)
 * - `config/secrets/aphrody_oauth_client.secret.json` (gitignored)
 *
 * Usage:
 *   bun run scripts/setup_aphrody_gcloud.ts
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ID = "aphrody";
const PROJECT_NUMBER = "468000409790";
const REGION = "us-central1";
const PRIMARY_SA = "aphrody-bot@aphrody.iam.gserviceaccount.com";
const AUTOMATION_SA = "bun-google-automation@aphrody.iam.gserviceaccount.com";

const API_KEY_IDS = {
  aphrodyFull: "58bc4d6d-9161-4dc3-8ec7-4f63015bc687",
  geminiFirebase: "f3dc64cd-3e4c-439e-9734-0c6970ab779f",
  youtube: "f2e05521-c22d-4c09-bd8b-c0cecbada99c",
} as const;

function maskSecret(val: string): string {
  if (!val || val.length < 8) return "***";
  return `${val.slice(0, 6)}...${val.slice(-4)} (len=${val.length})`;
}

async function runGcloud(args: string[]): Promise<string> {
  const cmd = process.platform === "win32" ? "gcloud.cmd" : "gcloud";
  const proc = Bun.spawn([cmd, ...args, `--project=${PROJECT_ID}`, "--quiet"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(
      `gcloud ${args.join(" ")} failed (${exitCode}): ${stderr.trim()}`,
    );
  }
  return stdout.trim();
}

async function getSecret(secretName: string): Promise<string> {
  try {
    return await runGcloud([
      "secrets",
      "versions",
      "access",
      "latest",
      `--secret=${secretName}`,
    ]);
  } catch (err) {
    console.warn(
      `[AphrodySetup] Could not read secret ${secretName}:`,
      (err as Error).message,
    );
    return "";
  }
}

async function getApiKeyString(keyUid: string): Promise<string> {
  try {
    const out = await runGcloud([
      "services",
      "api-keys",
      "get-key-string",
      keyUid,
      "--location=global",
      "--format=value(keyString)",
    ]);
    return out.trim();
  } catch (err) {
    console.warn(
      `[AphrodySetup] Could not read API key ${keyUid}:`,
      (err as Error).message,
    );
    return "";
  }
}

export async function setupAphrodyGcloud() {
  console.log("=== Aphrody Google Cloud & Google AI Setup ===");
  console.log(`Project: ${PROJECT_ID} (${PROJECT_NUMBER}) | Region: ${REGION}`);
  console.log(`Primary Service Account: ${PRIMARY_SA}`);
  console.log(`Automation Service Account: ${AUTOMATION_SA}`);

  // 1. Fetch OAuth 2.0 Clients from Secret Manager
  const [
    googleClientId,
    googleClientSecret,
    autoGoogleClientId,
    autoGoogleClientSecret,
  ] = await Promise.all([
    getSecret("GOOGLE_CLIENT_ID"),
    getSecret("GOOGLE_CLIENT_SECRET"),
    getSecret("AUTO_GOOGLE_CLIENT_ID"),
    getSecret("AUTO_GOOGLE_CLIENT_SECRET"),
  ]);

  // 2. Fetch API Keys (Gemini Developer API Key, Aphrody Full, YouTube Data v3)
  const [aphrodyFullKey, geminiFirebaseKey, youtubeKey] = await Promise.all([
    getApiKeyString(API_KEY_IDS.aphrodyFull),
    getApiKeyString(API_KEY_IDS.geminiFirebase),
    getApiKeyString(API_KEY_IDS.youtube),
  ]);

  const geminiApiKey = geminiFirebaseKey || aphrodyFullKey;
  const googleApiKey = aphrodyFullKey || geminiFirebaseKey;
  const youtubeApiKey = youtubeKey || aphrodyFullKey;

  console.log("\n[1/3] Retrieved Credentials Summary (Masked):");
  console.log(`  - GOOGLE_CLIENT_ID       : ${googleClientId}`);
  console.log(`  - GOOGLE_CLIENT_SECRET   : ${maskSecret(googleClientSecret)}`);
  console.log(`  - AUTO_GOOGLE_CLIENT_ID  : ${autoGoogleClientId}`);
  console.log(
    `  - AUTO_GOOGLE_CLIENT_SEC : ${maskSecret(autoGoogleClientSecret)}`,
  );
  console.log(`  - GEMINI_API_KEY         : ${maskSecret(geminiApiKey)}`);
  console.log(`  - GOOGLE_API_KEY (Full)  : ${maskSecret(googleApiKey)}`);
  console.log(`  - YOUTUBE_API_KEY        : ${maskSecret(youtubeApiKey)}`);

  // 3. Write OAuth 2.0 Client JSON files (gitignored in config/secrets/)
  const secretsDir = join(import.meta.dir, "..", "config", "secrets");
  mkdirSync(secretsDir, { recursive: true });

  const oauthClientJson = {
    web: {
      client_id: googleClientId,
      project_id: PROJECT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: googleClientSecret,
      redirect_uris: [
        "http://127.0.0.1:8765/oauth2callback",
        "http://localhost:8765/oauth2callback",
        "http://localhost:3000/api/auth/callback/google",
      ],
    },
    installed: {
      client_id: autoGoogleClientId || googleClientId,
      project_id: PROJECT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: autoGoogleClientSecret || googleClientSecret,
      redirect_uris: [
        "http://127.0.0.1:8765/oauth2callback",
        "http://localhost",
      ],
    },
  };

  const oauthFilePath = join(secretsDir, "aphrody_oauth_client.secret.json");
  await Bun.write(oauthFilePath, JSON.stringify(oauthClientJson, null, 2));
  console.log(`\n[2/3] Wrote OAuth 2.0 Client config -> ${oauthFilePath}`);

  // 4. Write root .env (gitignored) for Bun, UV/Python, Flutter & CLI automatic loading
  const envContent = `# Auto-generated by scripts/setup_aphrody_gcloud.ts — DO NOT COMMIT
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
GOOGLE_CLOUD_PROJECT_NUMBER=${PROJECT_NUMBER}
GOOGLE_CLOUD_REGION=${REGION}
GOOGLE_CLOUD_QUOTA_PROJECT=${PROJECT_ID}

# Aphrody Service Accounts (Impersonation via ADC / gcloud)
APHRODY_SERVICE_ACCOUNT=${PRIMARY_SA}
APHRODY_AUTOMATION_SERVICE_ACCOUNT=${AUTOMATION_SA}
APHRODY_FIREBASE_SERVICE_ACCOUNT=firebase-adminsdk-fbsvc@aphrody.iam.gserviceaccount.com

# Aphrody OAuth 2.0 Clients
GOOGLE_CLIENT_ID=${googleClientId}
GOOGLE_CLIENT_SECRET=${googleClientSecret}
AUTO_GOOGLE_CLIENT_ID=${autoGoogleClientId}
AUTO_GOOGLE_CLIENT_SECRET=${autoGoogleClientSecret}
GOOGLE_OAUTH_CLIENT_JSON=${oauthFilePath.replace(/\\/g, "/")}
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:8765/oauth2callback

# Aphrody Google AI, Gemini & YouTube Data v3 API Keys
GEMINI_API_KEY=${geminiApiKey}
GOOGLE_API_KEY=${googleApiKey}
YOUTUBE_API_KEY=${youtubeApiKey}

# Canonical 2026 Google AI Models
GEMINI_REASONING_MODEL=gemini-4-argon
GEMINI_FLASH_MODEL=gemini-3.8-flash
GEMINI_FLASH_LITE_MODEL=gemini-3.5-flash-lite
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_LIVE_THINKING_MODEL=gemini-3.8-live-extended-thinking
GEMINI_LIVE_TRANSLATE_MODEL=gemini-3.5-live-translate-preview
GEMINI_TTS_MODEL=gemini-3.8-flash-tts
GEMINI_TTS_LITE_MODEL=gemini-3.8-flash-lite-tts
GEMINI_DEFAULT_VOICE=Aoede
GEMINI_STT_MODEL=gemini-3.5-transcribe
GEMINI_STT_LIVE_MODEL=gemini-3.5-transcribe-live
WHISPER_LOCAL_MODEL=large-v3-turbo
GEMINI_LYRIA_SONG_MODEL=lyria-3.5
GEMINI_LYRIA_CLIP_MODEL=lyria-3-clip-preview
GEMINI_LYRIA_REALTIME_MODEL=models/lyria-realtime-exp
GEMINI_FLOW_VIDEO_MODEL=gemini-omni-1.1-flash
GEMINI_IMAGE_MODEL=gemini-nano-banana-2.1
GEMINI_IMAGE_PRO_MODEL=gemini-3-pro-image
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_MANAGED_AGENT=antigravity-preview-09-2026
GEMINI_DEEP_RESEARCH_AGENT=deep-research-preview-04-2026
GEMINI_DEEP_RESEARCH_MAX_AGENT=deep-research-max-preview-04-2026
`;

  const envPath = join(import.meta.dir, "..", ".env");
  await Bun.write(envPath, envContent);
  console.log(`[3/3] Wrote root .env -> ${envPath}`);
}

if (import.meta.main) {
  await setupAphrodyGcloud();
}
