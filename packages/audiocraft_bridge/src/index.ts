/** Local MusicGen execution. Model dependencies and weights must be installed separately. */
export const MUSICGEN_MODELS = ["facebook/musicgen-small", "facebook/musicgen-medium", "facebook/musicgen-large", "facebook/musicgen-stereo-small", "facebook/musicgen-stereo-medium", "facebook/musicgen-stereo-large"] as const;
export interface MusicGenRequest { model: string; prompt: string; durationSec: number }

export function validateMusicGenRequest(value: Partial<MusicGenRequest>): string | null {
  if (!value || typeof value !== "object") return "Requête invalide.";
  if (typeof value.prompt !== "string" || !value.prompt.trim() || value.prompt.length > 1000) return "Saisissez une description de 1 à 1 000 caractères.";
  if (typeof value.model !== "string" || !MUSICGEN_MODELS.includes(value.model as (typeof MUSICGEN_MODELS)[number])) return "Modèle MusicGen non pris en charge.";
  if (typeof value.durationSec !== "number" || !Number.isFinite(value.durationSec) || value.durationSec < 1 || value.durationSec > 30) return "La durée doit être comprise entre 1 et 30 secondes.";
  return null;
}

export async function generateMusicGen(request: MusicGenRequest, output: string, script: string): Promise<void> {
  const executable = Bun.which("bun");
  if (!executable) throw new Error("Bun est introuvable dans le PATH ; MusicGen nécessite bun uv.");
  const proc = Bun.spawn([executable, "uv", "run", "--no-sync", "python", script], {
    stdin: "pipe", stdout: "ignore", stderr: "pipe",
    env: { ...process.env, HF_HUB_OFFLINE: "1" },
  });
  const stderr = (async () => {
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text;
      if (text.length < 8192) text += decoder.decode(value, { stream: true }).slice(0, 8192 - text.length);
    }
  })();
  proc.stdin.write(JSON.stringify({ ...request, output }));
  proc.stdin.end();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; proc.kill(); }, 10 * 60 * 1000);
  try {
    const code = await proc.exited;
    const diagnostic = await stderr;
    if (timedOut) throw new Error("La génération a dépassé 10 minutes.");
    if (code !== 0 && diagnostic.includes('Script not found "uv"')) throw new Error("Cette version de Bun ne fournit pas bun uv. Un runtime compatible est nécessaire pour MusicGen.");
    if (code !== 0 || !(await Bun.file(output).exists())) throw new Error("La génération a échoué. Vérifiez Bun uv, AudioCraft, PyTorch et les poids MusicGen locaux.");
  } finally { clearTimeout(timer); }
}
