type RequestAddress = { address: string } | null;

/** Guard local product APIs against remote peers, DNS rebinding and unapproved browser origins. */
export function allowsLocalRequest(req: Request, peer: RequestAddress, configuredOrigins = ""): boolean {
  if (!peer || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer.address)) return false;
  const url = new URL(req.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return false;
  const origin = req.headers.get("origin");
  const allowed = new Set(configuredOrigins.split(",").map(value => value.trim()).filter(Boolean));
  if (origin && origin !== url.origin && !allowed.has(origin)) return false;
  const site = req.headers.get("sec-fetch-site");
  if (!origin && (site === "cross-site" || site === "same-site")) return false;
  return true;
}

/** Bun routes are matched before fetch(), so wrap each API handler directly. */
export function protectApiRoutes<T extends Record<string, unknown>>(routes: T, allow: (request: Request) => boolean): T {
  const result: Record<string, unknown> = {};
  const wrap = (handler: unknown) => typeof handler === "function"
    ? (request: Request, ...args: unknown[]) => allow(request)
      ? (handler as (request: Request, ...args: unknown[]) => unknown)(request, ...args)
      : Response.json({ error: "Origine ou accès réseau non autorisé." }, { status: 403 })
    : handler;
  for (const [path, definition] of Object.entries(routes)) {
    if (!path.startsWith("/api/")) { result[path] = definition; continue; }
    if (typeof definition === "function") { result[path] = wrap(definition); continue; }
    const methods = Object.fromEntries(Object.entries(definition as Record<string, unknown>).map(([method, handler]) => [method, wrap(handler)]));
    if (!methods.OPTIONS) methods.OPTIONS = wrap(() => new Response(null, { status: 405 }));
    result[path] = methods;
  }
  return result as T;
}
