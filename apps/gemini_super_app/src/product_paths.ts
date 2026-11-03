import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Find the checkout or distribution containing the product's web resources. */
export function resolveProductRoot(options: { override?: string; entryDir: string; cwd: string; executableDir: string }): string {
  const hasResources = (root: string) => existsSync(join(root, "apps", "gemini_super_app", "src", "workspace.html"));
  if (options.override) {
    const root = resolve(options.override);
    if (!hasResources(root)) throw new Error("SUPER_APP_ROOT ne contient pas les ressources de l'application.");
    return root;
  }
  for (const start of [options.entryDir, options.cwd, options.executableDir]) {
    let candidate = resolve(start);
    for (let i = 0; i < 8; i++) {
      if (hasResources(candidate)) return candidate;
      const parent = dirname(candidate);
      if (parent === candidate) break;
      candidate = parent;
    }
  }
  throw new Error("Ressources de l'application introuvables. Configurez SUPER_APP_ROOT.");
}
