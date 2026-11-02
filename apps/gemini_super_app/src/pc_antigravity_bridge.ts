/**
 * Real Full PC Filesystem & Shell Bridge + Permanent Antigravity Session
 * with Auto-Compact in `gemini-3.8-flash` (`thinkingLevel: "low"`).
 *
 * Bridges Gemini Web App (`gemini.google.com`, `aistudio.google.com`, `antigravity.google.com`),
 * Chrome Extension MV3, Voice Hub, and the local Windows PC.
 */

import type { Database } from "bun:sqlite";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export interface PcFsEntry {
  readonly name: string;
  readonly path: string;
  readonly isDir: boolean;
  readonly size: number;
  readonly mtimeMs: number;
}

export interface AntigravitySessionTurn {
  readonly id: string;
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly pcContextAttached?: string[];
  readonly model: string;
  readonly thinkingLevel: "low" | "medium" | "high";
  readonly latencyMs: number;
  readonly createdAt: number;
}

export interface PermanentAntigravitySessionState {
  sessionId: string;
  model: string;
  thinkingLevel: "low";
  autoCompactEnabled: boolean;
  autoCompactThresholdChars: number;
  maxTurnsBeforeCompact: number;
  compactCount: number;
  lastCompactedAt: number | null;
  compactedSummary: string;
  workspaceRoot: string;
  turns: AntigravitySessionTurn[];
  updatedAt: number;
}

const DEFAULT_WORKSPACE_ROOT = path.resolve(import.meta.dir, "../../..");
const SESSION_STATE_FILE = path.join(
  DEFAULT_WORKSPACE_ROOT,
  "config",
  "antigravity_session_state.json",
);

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function resolvePcPath(inputPath?: string, baseDir?: string): string {
  const root = baseDir || DEFAULT_WORKSPACE_ROOT;
  if (!inputPath || inputPath.trim() === "" || inputPath === ".") {
    return root;
  }
  const cleaned = inputPath.trim().replace(/^["']|["']$/g, "");
  if (path.isAbsolute(cleaned)) {
    return path.normalize(cleaned);
  }
  return path.resolve(root, cleaned);
}

export async function executePcFilesystemAction(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const action = String(body.action || "list");
  const targetPath = resolvePcPath(
    typeof body.path === "string" ? body.path : undefined,
    typeof body.cwd === "string" ? body.cwd : undefined,
  );

  if (action === "info") {
    return {
      ok: true,
      action: "info",
      pc: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        homedir: os.homedir(),
        workspaceRoot: DEFAULT_WORKSPACE_ROOT,
        cpus: os.cpus().length,
        totalMemGb: Number((os.totalmem() / 1024 ** 3).toFixed(2)),
        freeMemGb: Number((os.freemem() / 1024 ** 3).toFixed(2)),
      },
    };
  }

  if (action === "list") {
    const dirents = await readdir(targetPath, { withFileTypes: true });
    const entries: PcFsEntry[] = [];
    const maxEntries = Math.min(Number(body.limit || 200), 500);
    for (const d of dirents.slice(0, maxEntries)) {
      const full = path.join(targetPath, d.name);
      let size = 0;
      let mtimeMs = 0;
      try {
        const st = await stat(full);
        size = st.size;
        mtimeMs = Math.round(st.mtimeMs);
      } catch {}
      entries.push({
        name: d.name,
        path: full,
        isDir: d.isDirectory(),
        size,
        mtimeMs,
      });
    }
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return {
      ok: true,
      action: "list",
      path: targetPath,
      parentPath: path.dirname(targetPath),
      count: entries.length,
      entries,
    };
  }

  if (action === "glob") {
    const pattern = String(body.pattern || "**/*");
    const glob = new Bun.Glob(pattern);
    const matches: string[] = [];
    const maxMatches = Math.min(Number(body.limit || 150), 500);
    for (const m of glob.scanSync({
      cwd: targetPath,
      onlyFiles: false,
      dot: false,
    })) {
      if (
        m.startsWith("node_modules") ||
        m.startsWith(".git") ||
        m.startsWith("target") ||
        m.startsWith(".venv")
      ) {
        continue;
      }
      matches.push(path.join(targetPath, m));
      if (matches.length >= maxMatches) break;
    }
    return {
      ok: true,
      action: "glob",
      cwd: targetPath,
      pattern,
      count: matches.length,
      matches,
    };
  }

  if (action === "read") {
    const file = Bun.file(targetPath);
    const exists = await file.exists();
    if (!exists) {
      return {
        ok: false,
        action: "read",
        path: targetPath,
        error: `File not found: ${targetPath}`,
      };
    }
    const rawText = await file.text();
    const lines = rawText.split(/\r?\n/);
    const startLine = Math.max(1, Number(body.startLine || 1));
    const endLine = Math.min(
      lines.length,
      Number(body.endLine || Math.min(lines.length, startLine + 399)),
    );
    const sliced = lines.slice(startLine - 1, endLine).join("\n");
    return {
      ok: true,
      action: "read",
      path: targetPath,
      size: file.size,
      totalLines: lines.length,
      startLine,
      endLine,
      content: sliced,
    };
  }

  if (action === "write") {
    const content = String(body.content ?? "");
    await mkdir(path.dirname(targetPath), { recursive: true });
    await Bun.write(targetPath, content);
    return {
      ok: true,
      action: "write",
      path: targetPath,
      bytesWritten: Buffer.byteLength(content, "utf-8"),
    };
  }

  if (action === "edit") {
    const file = Bun.file(targetPath);
    if (!(await file.exists())) {
      return {
        ok: false,
        action: "edit",
        path: targetPath,
        error: `File not found: ${targetPath}`,
      };
    }
    const target = String(body.target ?? "");
    const replacement = String(body.replacement ?? "");
    const original = await file.text();
    if (!target || !original.includes(target)) {
      return {
        ok: false,
        action: "edit",
        path: targetPath,
        error: "Target string not found in file",
      };
    }
    const updated = original.split(target).join(replacement);
    await Bun.write(targetPath, updated);
    return {
      ok: true,
      action: "edit",
      path: targetPath,
      bytesWritten: Buffer.byteLength(updated, "utf-8"),
    };
  }

  if (action === "mkdir") {
    await mkdir(targetPath, { recursive: true });
    return { ok: true, action: "mkdir", path: targetPath };
  }

  if (action === "move") {
    const destPath = resolvePcPath(String(body.destination || ""));
    await mkdir(path.dirname(destPath), { recursive: true });
    await rename(targetPath, destPath);
    return { ok: true, action: "move", from: targetPath, to: destPath };
  }

  if (action === "delete") {
    await rm(targetPath, { recursive: Boolean(body.recursive), force: true });
    return { ok: true, action: "delete", path: targetPath };
  }

  return { ok: false, error: `Unknown filesystem action: ${action}` };
}

export async function executePcCommand(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const command = String(body.command || "").trim();
  if (!command) {
    return { ok: false, error: "Missing command" };
  }
  const cwd = resolvePcPath(
    typeof body.cwd === "string" ? body.cwd : DEFAULT_WORKSPACE_ROOT,
  );
  const timeoutMs = Math.min(
    Math.max(Number(body.timeoutMs || 15000), 1000),
    60000,
  );
  const t0 = performance.now();

  const proc = Bun.spawn(
    ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command],
    {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        ANTIGRAVITY_MIC: "127.0.0.1:24713",
      },
    },
  );

  const timer = setTimeout(() => {
    try {
      proc.kill();
    } catch {}
  }, timeoutMs);

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timer);

  return {
    ok: exitCode === 0,
    command,
    cwd,
    exitCode,
    durationMs: Math.round(performance.now() - t0),
    stdout: stdout.slice(0, 32000),
    stderr: stderr.slice(0, 16000),
  };
}

export class PermanentAntigravitySessionManager {
  private readonly db: Database;
  private state: PermanentAntigravitySessionState;

  constructor(db: Database) {
    this.db = db;
    this.db.run(`
      CREATE TABLE IF NOT EXISTS antigravity_permanent_sessions (
        session_id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        thinking_level TEXT NOT NULL,
        compact_count INTEGER NOT NULL,
        compacted_summary TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    this.state = this.loadInitialState();
    this.persistState();
  }

  private loadInitialState(): PermanentAntigravitySessionState {
    const row = this.db
      .query(
        "SELECT payload_json FROM antigravity_permanent_sessions WHERE session_id = 'agy-permanent-main'",
      )
      .get() as { payload_json: string } | null;
    if (row?.payload_json) {
      try {
        return JSON.parse(row.payload_json) as PermanentAntigravitySessionState;
      } catch {}
    }
    try {
      const f = Bun.file(SESSION_STATE_FILE);
      if (f.size > 0) {
        const raw = require("node:fs").readFileSync(
          SESSION_STATE_FILE,
          "utf-8",
        );
        return JSON.parse(raw) as PermanentAntigravitySessionState;
      }
    } catch {}

    return {
      sessionId: "agy-permanent-main",
      model: "gemini-3.8-flash",
      thinkingLevel: "low",
      autoCompactEnabled: true,
      autoCompactThresholdChars: 4200,
      maxTurnsBeforeCompact: 6,
      compactCount: 0,
      lastCompactedAt: null,
      compactedSummary:
        "Session permanente Antigravity connectée à Gemini Web App et au PC Windows (C:\\Users\\aphro\\google). Modèle actif : gemini-3.8-flash (thinkingLevel: low) avec Auto-Compact temps réel et accès complet au système de fichiers.",
      workspaceRoot: DEFAULT_WORKSPACE_ROOT,
      turns: [],
      updatedAt: Date.now(),
    };
  }

  private persistState(): void {
    this.state.updatedAt = Date.now();
    const json = JSON.stringify(this.state, null, 2);
    this.db
      .query(
        `INSERT OR REPLACE INTO antigravity_permanent_sessions
         (session_id, model, thinking_level, compact_count, compacted_summary, payload_json, updated_at)
         VALUES ($id, $model, $thinking, $count, $summary, $payload, $updatedAt)`,
      )
      .run({
        $id: this.state.sessionId,
        $model: this.state.model,
        $thinking: this.state.thinkingLevel,
        $count: this.state.compactCount,
        $summary: this.state.compactedSummary,
        $payload: json,
        $updatedAt: this.state.updatedAt,
      });
    void Bun.write(SESSION_STATE_FILE, json).catch(() => {});
  }

  public getState(): PermanentAntigravitySessionState {
    return this.state;
  }

  public configure(
    patch: Record<string, unknown>,
  ): PermanentAntigravitySessionState {
    if (typeof patch.autoCompactEnabled === "boolean") {
      this.state.autoCompactEnabled = patch.autoCompactEnabled;
    }
    if (typeof patch.autoCompactThresholdChars === "number") {
      this.state.autoCompactThresholdChars = Math.max(
        800,
        patch.autoCompactThresholdChars,
      );
    }
    if (typeof patch.maxTurnsBeforeCompact === "number") {
      this.state.maxTurnsBeforeCompact = Math.max(
        2,
        patch.maxTurnsBeforeCompact,
      );
    }
    if (typeof patch.workspaceRoot === "string" && patch.workspaceRoot.trim()) {
      this.state.workspaceRoot = resolvePcPath(patch.workspaceRoot);
    }
    this.state.model = "gemini-3.8-flash";
    this.state.thinkingLevel = "low";
    this.persistState();
    return this.state;
  }

  /**
   * Compacts conversation history into `compactedSummary` using `gemini-3.8-flash` (`thinkingLevel: "low"`).
   */
  public async compactSessionWithFlashLow(
    keepRecentTurns: number = 2,
  ): Promise<{
    compacted: boolean;
    compactCount: number;
    compactedSummary: string;
    turnsRemaining: number;
    model: string;
    thinkingLevel: "low";
  }> {
    const turnsToCompress =
      this.state.turns.length > keepRecentTurns
        ? this.state.turns.slice(0, this.state.turns.length - keepRecentTurns)
        : this.state.turns.slice();

    const serializedTurns = turnsToCompress
      .map((t) => `[${t.role.toUpperCase()}]: ${t.content.slice(0, 600)}`)
      .join("\n");

    let newSummary = "";
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey && serializedTurns.trim().length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey, vertexai: false });
        const prompt = [
          "Tu es le moteur Auto-Compact d'Antigravity (gemini-3.8-flash, thinking_level=low).",
          "Résume de façon ultra-dense et sans perte d'information technique le contexte précédent et les nouveaux échanges.",
          "Conserve les chemins de fichiers PC, commandes exécutées, décisions d'architecture et états actifs.",
          `Résumé précédent :\n${this.state.compactedSummary}`,
          `Nouveaux tours à compacter :\n${serializedTurns}`,
        ].join("\n\n");

        const resp = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            temperature: 0.2,
            abortSignal: AbortSignal.timeout(3500),
          },
        });
        if (resp.text && resp.text.trim()) {
          newSummary = resp.text.trim();
        }
      } catch {}
    }

    if (!newSummary) {
      const snippet = serializedTurns
        ? serializedTurns.replace(/\s+/g, " ").slice(-900)
        : "Aucun tour additionnel.";
      newSummary = `[Auto-Compact #${this.state.compactCount + 1} • gemini-3.8-flash (low) • Workspace: ${this.state.workspaceRoot}] ${this.state.compactedSummary.slice(0, 500)} | Derniers états : ${snippet}`;
    }

    this.state.compactedSummary = newSummary;
    this.state.compactCount += 1;
    this.state.lastCompactedAt = Date.now();
    if (this.state.turns.length > keepRecentTurns) {
      this.state.turns = this.state.turns.slice(-keepRecentTurns);
    }
    this.persistState();

    return {
      compacted: true,
      compactCount: this.state.compactCount,
      compactedSummary: this.state.compactedSummary,
      turnsRemaining: this.state.turns.length,
      model: "gemini-3.8-flash",
      thinkingLevel: "low",
    };
  }

  /**
   * Processes a prompt from Gemini Web App / Voice / CLI with automatic PC filesystem & command resolution
   * and automatic `gemini-3.8-flash` (`low`) compaction when the threshold is reached.
   */
  public async runTurn(
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const rawPrompt = String(body.prompt || body.text || "").trim();
    if (!rawPrompt) {
      return { ok: false, error: "Empty prompt" };
    }

    if (rawPrompt.toLowerCase() === "/compact") {
      const compactRes = await this.compactSessionWithFlashLow(2);
      return {
        ok: true,
        action: "compact",
        reply: `Session Antigravity auto-compactée avec succès (gemini-3.8-flash low, #${compactRes.compactCount}).`,
        ...compactRes,
        session: this.state,
      };
    }

    const t0 = performance.now();
    const pcContextSnippets: string[] = [];
    const pcContextLabels: string[] = [];

    // 1. Parse inline PC commands (/fs, @fs, /read, @read, /cmd, @cmd)
    const fsMatch = rawPrompt.match(
      /(?:^|\s)(?:\/fs|@fs|\/ls|@ls)\s+("[^"]+"|'[^']+'|\S+)/i,
    );
    if (fsMatch?.[1]) {
      const target = fsMatch[1].trim().replace(/^["']|["']$/g, "");
      try {
        const listRes = await executePcFilesystemAction({
          action: "list",
          path: target,
          cwd: this.state.workspaceRoot,
          limit: 60,
        });
        pcContextLabels.push(`fs:list:${listRes.path}`);
        pcContextSnippets.push(
          `[PC DIRECTORY ${listRes.path}]:\n` +
            ((listRes.entries as PcFsEntry[]) || [])
              .map(
                (e) => `${e.isDir ? "[DIR]" : "[FILE]"} ${e.name} (${e.size}B)`,
              )
              .join("\n"),
        );
      } catch (err) {
        pcContextSnippets.push(`[PC DIRECTORY ERROR]: ${String(err)}`);
      }
    }

    const readMatch = rawPrompt.match(
      /(?:^|\s)(?:\/read|@read)\s+("[^"]+"|'[^']+'|\S+)/i,
    );
    if (readMatch?.[1]) {
      const target = readMatch[1].trim().replace(/^["']|["']$/g, "");
      try {
        const readRes = await executePcFilesystemAction({
          action: "read",
          path: target,
          cwd: this.state.workspaceRoot,
          startLine: 1,
          endLine: 160,
        });
        if (readRes.ok) {
          pcContextLabels.push(`fs:read:${readRes.path}`);
          pcContextSnippets.push(
            `[PC FILE ${readRes.path} (lines ${readRes.startLine}-${readRes.endLine}/${readRes.totalLines})]:\n${readRes.content}`,
          );
        } else {
          pcContextSnippets.push(`[PC FILE ERROR]: ${readRes.error}`);
        }
      } catch (err) {
        pcContextSnippets.push(`[PC FILE ERROR]: ${String(err)}`);
      }
    }

    const cmdMatch = rawPrompt.match(/(?:^|\s)(?:\/cmd|@cmd)\s+([^\n\r]+)/i);
    if (cmdMatch?.[1]) {
      const cmdStr = cmdMatch[1].trim();
      try {
        const execRes = await executePcCommand({
          command: cmdStr,
          cwd: this.state.workspaceRoot,
          timeoutMs: 12000,
        });
        pcContextLabels.push(`pc:exec:${cmdStr}`);
        pcContextSnippets.push(
          `[PC COMMAND "${cmdStr}" (exit=${execRes.exitCode})]:\n${execRes.stdout || execRes.stderr}`,
        );
      } catch (err) {
        pcContextSnippets.push(`[PC COMMAND ERROR]: ${String(err)}`);
      }
    }

    const userTurn: AntigravitySessionTurn = {
      id: `agy-u-${Date.now()}`,
      role: "user",
      content: rawPrompt,
      pcContextAttached: pcContextLabels,
      model: "gemini-3.8-flash",
      thinkingLevel: "low",
      latencyMs: 0,
      createdAt: Date.now(),
    };
    this.state.turns.push(userTurn);

    // 2. Call `gemini-3.8-flash` with `thinkingLevel: "low"`
    let replyText = "";
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const recentHistory = this.state.turns
      .slice(-6)
      .map(
        (t) =>
          `${t.role === "user" ? "Utilisateur" : "Antigravity"}: ${t.content}`,
      )
      .join("\n");

    const fullContextPrompt = [
      "Tu es l'agent permanent Antigravity branché en direct dans Gemini Web App et sur le PC Windows de l'utilisateur.",
      `Workspace PC actif : ${this.state.workspaceRoot}`,
      `Mémoire Auto-Compactée (#${this.state.compactCount}) :\n${this.state.compactedSummary}`,
      pcContextSnippets.length > 0
        ? `Données temps réel lues sur le PC :\n${pcContextSnippets.join("\n\n")}`
        : "",
      `Historique récent :\n${recentHistory}`,
      "Réponds de façon directe, précise et exploite les fichiers/commandes du PC.",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey, vertexai: false });
        const resp = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: fullContextPrompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: AbortSignal.timeout(4000),
          },
        });
        if (resp.text && resp.text.trim()) {
          replyText = resp.text.trim();
        }
      } catch {}
    }

    if (!replyText) {
      replyText =
        pcContextSnippets.length > 0
          ? `Accès PC exécuté sur ${this.state.workspaceRoot} :\n\n${pcContextSnippets.join("\n\n")}`
          : `Session Antigravity permanente active (gemini-3.8-flash low, workspace: ${this.state.workspaceRoot}). Reçu : "${rawPrompt}".`;
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - t0));
    const assistantTurn: AntigravitySessionTurn = {
      id: `agy-a-${Date.now()}`,
      role: "assistant",
      content: replyText,
      pcContextAttached: pcContextLabels,
      model: "gemini-3.8-flash",
      thinkingLevel: "low",
      latencyMs,
      createdAt: Date.now(),
    };
    this.state.turns.push(assistantTurn);

    // 3. Check Auto-Compact trigger (`gemini-3.8-flash` `thinkingLevel: "low"`)
    const totalTurnChars = this.state.turns.reduce(
      (acc, t) => acc + t.content.length,
      0,
    );
    let autoCompacted = false;
    if (
      Boolean(body.forceCompact) ||
      (this.state.autoCompactEnabled &&
        (totalTurnChars >= this.state.autoCompactThresholdChars ||
          this.state.turns.length >= this.state.maxTurnsBeforeCompact))
    ) {
      await this.compactSessionWithFlashLow(2);
      autoCompacted = true;
    } else {
      this.persistState();
    }

    return {
      ok: true,
      reply: replyText,
      model: "gemini-3.8-flash",
      thinkingLevel: "low",
      latencyMs,
      autoCompacted,
      compactCount: this.state.compactCount,
      pcContextAttached: pcContextLabels,
      pcContextData: pcContextSnippets,
      session: this.state,
    };
  }
}
