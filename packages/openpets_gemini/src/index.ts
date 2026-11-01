/**
 * @gemini-live/openpets-gemini
 *
 * Full-Bun (v1.4.5) consolidated OpenPets & Gemini Pet Companion engine for the
 * Gemini Super App (`apps/gemini_super_app`) and Tauri v3 (`crates/gemini-super-tauri`).
 *
 * Consolidates from `vendor/openpets` (`https://github.com/aphrody-labs/openpets`):
 * 1. OpenPets IPC Protocol v1 & Lease Manager (`LeaseManager`, `allowedReactions`, `OpenPetsReaction`)
 * 2. Reaction-to-Sprite State Mapping (`defaultPetSprite`, `resolveReactionSpriteState`, `resolveEffectiveSpriteState`)
 * 3. Localized EN/FR Reaction Speech Pools (`reactionMessagePools`, `pickReactionMessage`)
 * 4. Codex V2 Spritesheet Layout (`192x208`, `8x11`, `1536x2288`) & 16-Direction Cursor Gaze (`quantizeCodexV2GazeDirection`)
 * 5. Pet Wardrobe & Auto-Schedule Engine (`builtInPetWardrobe`, `resolveWornOutfitId`)
 * 6. Pet Throw Ball-Physics Engine (`createVelocityTracker`, `stepThrow`)
 * 7. Tamagotchi Virtual Pet Care Engine (`GeminiPetStateManager`, `feed`, `play`, `pet`, `nap`, `applyDecay`)
 * 8. Static SVG Spritesheet Validator (`validateSvgSpritesheet`) & Custom **Gemini Sparkle Pet** V2 SVG Atlas Generator (`generateGeminiPetSvgSpritesheet`)
 */

// ── 1. OpenPets Reactions & IPC Protocol v1 ──────────────────────────────────

export const allowedReactions = [
  "idle",
  "thinking",
  "working",
  "editing",
  "running",
  "testing",
  "waiting",
  "waving",
  "success",
  "error",
  "celebrating",
] as const;

export type OpenPetsReaction = (typeof allowedReactions)[number];

export function isAllowedReaction(value: unknown): value is OpenPetsReaction {
  return (
    typeof value === "string" &&
    (allowedReactions as readonly string[]).includes(value)
  );
}

export type UniversalSpriteState =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

export interface LeaseInput {
  sessionId: string;
  agent: string;
  cwd?: string;
  petId?: string;
}

export interface ActiveLease extends LeaseInput {
  petId: string;
  acquiredAt: string;
  lastHeartbeatAt: string;
  expiresAt: string;
  lastReaction: OpenPetsReaction;
  lastText?: string;
}

export class LeaseManager {
  private readonly leases = new Map<string, ActiveLease>();

  constructor(private readonly ttlMs = 30_000) {}

  acquire(input: LeaseInput, now = new Date()): ActiveLease {
    const existing = this.leases.get(input.sessionId);
    const acquiredAt = existing?.acquiredAt ?? now.toISOString();
    const lease: ActiveLease = {
      sessionId: input.sessionId,
      agent: input.agent,
      cwd: input.cwd,
      petId: input.petId ?? existing?.petId ?? "gemini-sparkle",
      acquiredAt,
      lastHeartbeatAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.ttlMs).toISOString(),
      lastReaction: existing?.lastReaction ?? "idle",
      lastText: existing?.lastText,
    };
    this.leases.set(input.sessionId, lease);
    return lease;
  }

  heartbeat(sessionId: string, now = new Date()): ActiveLease | undefined {
    this.prune(now);
    const lease = this.leases.get(sessionId);
    if (!lease) return undefined;
    lease.lastHeartbeatAt = now.toISOString();
    lease.expiresAt = new Date(now.getTime() + this.ttlMs).toISOString();
    return lease;
  }

  react(
    sessionId: string,
    reaction: OpenPetsReaction,
    text?: string,
    now = new Date(),
  ): ActiveLease | undefined {
    const lease = this.heartbeat(sessionId, now);
    if (!lease) return undefined;
    lease.lastReaction = reaction;
    lease.lastText = text;
    return lease;
  }

  release(sessionId: string): boolean {
    return this.leases.delete(sessionId);
  }

  list(now = new Date()): ActiveLease[] {
    this.prune(now);
    return [...this.leases.values()];
  }

  prune(now = new Date()): string[] {
    const expired: string[] = [];
    for (const [sessionId, lease] of this.leases.entries()) {
      if (Date.parse(lease.expiresAt) <= now.getTime()) {
        this.leases.delete(sessionId);
        expired.push(sessionId);
      }
    }
    return expired;
  }
}

// ── 2. Sprite Layout, Cursor Gaze & Reaction Mapping ─────────────────────────

export const defaultPetSprite = {
  frameWidth: 192,
  frameHeight: 208,
  columns: 8,
  rows: 11,
  states: {
    idle: { row: 0, frames: 8, fps: 8, loop: true },
    "running-right": { row: 1, frames: 8, fps: 12, loop: true },
    "running-left": { row: 2, frames: 8, fps: 12, loop: true },
    waving: { row: 3, frames: 8, fps: 10, loop: false },
    jumping: { row: 4, frames: 8, fps: 10, loop: false },
    failed: { row: 5, frames: 8, fps: 8, loop: false },
    waiting: { row: 6, frames: 8, fps: 6, loop: true },
    running: { row: 7, frames: 8, fps: 12, loop: true },
    review: { row: 8, frames: 8, fps: 8, loop: true },
  },
} as const;

export const codexV2SpriteLayout = {
  frameWidth: 192,
  frameHeight: 208,
  columns: 8,
  rows: 11,
  sheetWidth: 1536,
  sheetHeight: 2288,
  gazeStartRow: 9,
  gazeRowCount: 2,
  gazeDirectionCount: 16,
} as const;

export function resolveReactionSpriteState(
  reaction: OpenPetsReaction,
): UniversalSpriteState {
  switch (reaction) {
    case "idle":
      return "idle";
    case "thinking":
    case "testing":
      return "review";
    case "working":
    case "editing":
    case "running":
      return "running";
    case "waiting":
      return "waiting";
    case "waving":
      return "waving";
    case "success":
    case "celebrating":
      return "jumping";
    case "error":
      return "failed";
  }
}

export function resolveEffectiveSpriteState(
  reaction: OpenPetsReaction,
  movementState: "running-left" | "running-right" | null = null,
): UniversalSpriteState {
  return movementState ?? resolveReactionSpriteState(reaction);
}

export function quantizeCodexV2GazeDirection(
  dx: number,
  dy: number,
  deadzonePx = 12,
): number | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.hypot(dx, dy) < Math.max(0, deadzonePx)) return null;
  const angleFromNorthClockwise =
    (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
  const sectorSize = (Math.PI * 2) / codexV2SpriteLayout.gazeDirectionCount;
  return (
    Math.floor((angleFromNorthClockwise + sectorSize / 2) / sectorSize) %
    codexV2SpriteLayout.gazeDirectionCount
  );
}

export function getCodexV2GazeSpritePosition(directionIndex: number): {
  col: number;
  row: number;
  x: number;
  y: number;
} {
  const normalized =
    ((Math.trunc(directionIndex) % codexV2SpriteLayout.gazeDirectionCount) +
      codexV2SpriteLayout.gazeDirectionCount) %
    codexV2SpriteLayout.gazeDirectionCount;
  const rowOffset = Math.floor(normalized / codexV2SpriteLayout.columns);
  const col = normalized % codexV2SpriteLayout.columns;
  const row = codexV2SpriteLayout.gazeStartRow + rowOffset;
  return {
    col,
    row,
    x: col * codexV2SpriteLayout.frameWidth,
    y: row * codexV2SpriteLayout.frameHeight,
  };
}

// ── 3. Localized EN & FR Speech Bubbles ──────────────────────────────────────

export const reactionMessagePools: Record<
  "en" | "fr",
  Record<Exclude<OpenPetsReaction, "idle">, readonly string[]>
> = {
  fr: {
    thinking: [
      "Réflexion Gemini 3.8 en cours... ✦",
      "Je relie les constellations neuronales...",
      "Voyons ce que dit le contexte...",
      "Analyse multimodale activée !",
    ],
    working: [
      "En plein travail sur le monorepo Bun v1.4.5 !",
      "Je veille sur ton flux de code ✦",
      "Mode concentration maximale !",
    ],
    editing: [
      "Modification chirurgicale du code...",
      "Un petit coup de patte dans ce fichier ✦",
      "Polissage TypeScript 7 & Rust 2024 !",
    ],
    running: [
      "Exécution ultra-rapide avec Bun !",
      "Les moteurs tournent à plein régime !",
      "Attention, ça file à toute allure ✦",
    ],
    testing: [
      "Vérification des invariants et tests...",
      "Inspection minutieuse de chaque assertion...",
      "Voyons si tout passe au vert !",
    ],
    waiting: [
      "J'attends ton signal vocal ou ton clic ✦",
      "Je garde la place bien au chaud.",
      "Prêt dès que tu veux parler en Live !",
    ],
    waving: [
      "Coucou ! Je suis ton Gemini Pet ✦",
      "Salut ! Clique sur Parler pour discuter en Live !",
      "Bonjour depuis l'écosystème Antigravity !",
    ],
    success: [
      "C'est dans la boîte ! Tout est vert ✦",
      "Mission accomplie avec brio !",
      "Impeccable, zéro erreur !",
    ],
    error: [
      "Oups, un petit accroc détecté !",
      "Quelque chose a trébuché, on regarde ça ?",
      "Alerte moustache : une erreur est apparue !",
    ],
    celebrating: [
      "Youpi ! Victoire totale ✦🎉",
      "Danse de la joie Gemini Live !",
      "On a tout déchiré ! Bravo !",
    ],
  },
  en: {
    thinking: [
      "Gemini 3.8 Extended Thinking active... ✦",
      "Connecting the neural constellations...",
      "Thinking this through...",
    ],
    working: [
      "Working on the Bun v1.4.5 monorepo!",
      "Keeping the momentum going ✦",
      "Deep in the zone.",
    ],
    editing: [
      "Making a few surgical edits...",
      "Polishing up the code ✦",
      "Tuning things up.",
    ],
    running: [
      "Running at native Bun speed!",
      "Off it goes ✦",
      "Executing commands...",
    ],
    testing: [
      "Checking all tests and invariants...",
      "Poking at the edges...",
      "Seeing if everything holds up.",
    ],
    waiting: [
      "Waiting for your voice or click ✦",
      "Ready whenever you are.",
      "Standing by.",
    ],
    waving: [
      "Hey there! I'm your Gemini Pet ✦",
      "Hello! Click Talk for Gemini 3.8 Live voice!",
      "Always happy to see you.",
    ],
    success: [
      "Nailed it! Everything is green ✦",
      "Wrapped up nicely.",
      "All done!",
    ],
    error: [
      "Uh oh, hit a snag.",
      "Something went sideways.",
      "That didn't go as planned.",
    ],
    celebrating: [
      "Woohoo! Ship it! ✦🎉",
      "Victory dance!",
      "Cue the confetti!",
    ],
  },
};

export function pickReactionMessage(
  reaction: OpenPetsReaction,
  locale: "en" | "fr" = "fr",
  random: () => number = Math.random,
): string | undefined {
  if (reaction === "idle") return undefined;
  const pool =
    reactionMessagePools[locale]?.[reaction] ??
    reactionMessagePools.fr[reaction];
  if (!pool || pool.length === 0) return undefined;
  const idx = Math.min(
    pool.length - 1,
    Math.max(0, Math.floor(random() * pool.length)),
  );
  return pool[idx];
}

// ── 4. Pet Catalog & Wardrobe Engine ─────────────────────────────────────────

export type GeminiPetId = "gemini-sparkle" | "hoodie-cat" | "mochi";

export interface GeminiPetCharacterSpec {
  id: GeminiPetId;
  name: string;
  subtitle: string;
  spriteSheetUrl: string;
  outfits: ReadonlyArray<{
    id: string;
    label: string;
    spriteSheetUrl: string;
  }>;
}

export const GEMINI_PET_CHARACTERS: readonly GeminiPetCharacterSpec[] = [
  {
    id: "gemini-sparkle",
    name: "Gemini Sparkle Pet ✦",
    subtitle:
      "Compagnon Officiel Gemini 3.8 Live (Atlas SVG V2 8×11 + Halo Audio)",
    spriteSheetUrl: "/assets/openpets/gemini-pet-spritesheet.svg",
    outfits: [
      {
        id: "default",
        label: "Cosmic Sparkle (Officiel)",
        spriteSheetUrl: "/assets/openpets/gemini-pet-spritesheet.svg",
      },
    ],
  },
  {
    id: "hoodie-cat",
    name: "OpenPets Hoodie Cat 🐾",
    subtitle: "Compagnon OpenPets Original (Spritesheet V2 WebP + 6 Tenues)",
    spriteSheetUrl: "/assets/openpets/default-pet-spritesheet.webp",
    outfits: [
      {
        id: "default",
        label: "Hoodie Classique",
        spriteSheetUrl: "/assets/openpets/default-pet-spritesheet.webp",
      },
      {
        id: "pajamas",
        label: "Pyjama Nocturne",
        spriteSheetUrl: "/assets/openpets/outfits/pajamas.webp",
      },
      {
        id: "weekend",
        label: "Week-end Chill",
        spriteSheetUrl: "/assets/openpets/outfits/weekend.webp",
      },
      {
        id: "summer",
        label: "Été Solaire",
        spriteSheetUrl: "/assets/openpets/outfits/summer.webp",
      },
      {
        id: "halloween",
        label: "Halloween Citrouille",
        spriteSheetUrl: "/assets/openpets/outfits/halloween.webp",
      },
      {
        id: "holidays",
        label: "Fêtes d'Hiver",
        spriteSheetUrl: "/assets/openpets/outfits/holidays.webp",
      },
    ],
  },
  {
    id: "mochi",
    name: "Mochi 🌱 (Cross-Platform Deskling)",
    subtitle:
      "Compagnon Pixel-Art 256×256 (39 Animations, 12 Emotes Bond, Focus & Pocket)",
    spriteSheetUrl: "/assets/mochi/mochi/master/mochi_default.png",
    outfits: [
      {
        id: "default",
        label: "Mochi Vert Classique 🌱",
        spriteSheetUrl: "/assets/mochi/mochi/master/mochi_default.png",
      },
      {
        id: "coworking",
        label: "Mochi Laptop Cowork 💻",
        spriteSheetUrl: "/assets/mochi/mochi/coworking/frames/frame_04.png",
      },
      {
        id: "agent",
        label: "Mochi Agent Claude/Codex 🤖",
        spriteSheetUrl: "/assets/mochi/mochi/agent_cowork/frames/frame_04.png",
      },
      {
        id: "headphones",
        label: "Mochi Casque Audio 🎧",
        spriteSheetUrl: "/assets/mochi/mochi/headphones/frames/frame_03.png",
      },
      {
        id: "focus",
        label: "Mochi Focus Bandeau 🔥",
        spriteSheetUrl: "/assets/mochi/mochi/focus/frames/frame_05.png",
      },
    ],
  },
] as const;

// ── 4b. Mochi 🌱 Cross-Platform Deskling Engine (Bond, Emotes, Focus, Pocket) ─

export type MochiBondPhase =
  "fresh" | "warming_up" | "halfway" | "almost_there";

export interface MochiBondState {
  level: number;
  xp: number;
  xpNeeded: number;
  progressFraction: number;
  phase: MochiBondPhase;
}

/**
 * Mirrors `mochi.bond.xp_required_for_level(level)`: `480 + round(90 * sqrt(level - 1))`.
 */
export function mochiBondXpRequired(level: number): number {
  const clamped = Math.max(1, Math.floor(level));
  return 480 + Math.round(90 * Math.sqrt(clamped - 1));
}

export function computeMochiBondState(
  level: number,
  xp: number,
): MochiBondState {
  const safeLevel = Math.max(1, Math.floor(level));
  const safeXp = Math.max(0, Math.floor(xp));
  const xpNeeded = mochiBondXpRequired(safeLevel);
  const progressFraction =
    xpNeeded > 0 ? Math.min(1, Math.max(0, safeXp / xpNeeded)) : 1;
  let phase: MochiBondPhase = "fresh";
  if (progressFraction >= 0.8) phase = "almost_there";
  else if (progressFraction >= 0.5) phase = "halfway";
  else if (progressFraction >= 0.25) phase = "warming_up";
  return {
    level: safeLevel,
    xp: safeXp,
    xpNeeded,
    progressFraction,
    phase,
  };
}

export function awardMochiBondXp(
  current: { level: number; xp: number },
  amount: number,
): { state: MochiBondState; levelsGained: number } {
  const gain = Math.max(0, Math.floor(amount));
  let level = Math.max(1, Math.floor(current.level));
  let xp = Math.max(0, Math.floor(current.xp)) + gain;
  let levelsGained = 0;

  while (true) {
    const needed = mochiBondXpRequired(level);
    if (xp < needed) break;
    xp -= needed;
    level += 1;
    levelsGained += 1;
  }

  return {
    state: computeMochiBondState(level, xp),
    levelsGained,
  };
}

export type MochiEmoteRarity = "common" | "uncommon" | "rare" | "epic";

export interface MochiEmoteSpec {
  id: string;
  label: string;
  animation: string;
  unlockLevel: number;
  rarity: MochiEmoteRarity;
  description: string;
  previewUrl: string;
  spritesheetUrl?: string;
  framesCount: number;
  fps: number;
}

export const MOCHI_EMOTE_CATALOGUE: readonly MochiEmoteSpec[] = [
  {
    id: "heart",
    label: "Heart 💚",
    animation: "emote_heart",
    unlockLevel: 1,
    rarity: "common",
    description: "Petit cœur chaleureux de Mochi.",
    previewUrl: "/assets/mochi/mochi/emote_heart/frames/frame_04.png",
    spritesheetUrl: "/assets/mochi/mochi/emote_heart/spritesheet.png",
    framesCount: 8,
    fps: 10,
  },
  {
    id: "bounce",
    label: "Happy Bounce 🌱",
    animation: "bounce",
    unlockLevel: 1,
    rarity: "common",
    description: "Petit bond joyeux sur le bureau.",
    previewUrl: "/assets/mochi/mochi/bounce/frames/frame_03.png",
    spritesheetUrl: "/assets/mochi/mochi/bounce/spritesheet.png",
    framesCount: 8,
    fps: 12,
  },
  {
    id: "squish",
    label: "Squish 🍡",
    animation: "squish",
    unlockLevel: 2,
    rarity: "common",
    description: "Compression moelleuse de mochi.",
    previewUrl: "/assets/mochi/mochi/squish/frames/frame_02.png",
    spritesheetUrl: "/assets/mochi/mochi/squish/spritesheet.png",
    framesCount: 6,
    fps: 10,
  },
  {
    id: "wave",
    label: "Friendly Wave 👋",
    animation: "wave",
    unlockLevel: 3,
    rarity: "common",
    description: "Coucou amical depuis le coin de l'écran.",
    previewUrl: "/assets/mochi/mochi/wave/frames/frame_03.png",
    spritesheetUrl: "/assets/mochi/mochi/wave/spritesheet.png",
    framesCount: 8,
    fps: 10,
  },
  {
    id: "coffee",
    label: "Coffee Break ☕",
    animation: "emote_coffee",
    unlockLevel: 4,
    rarity: "uncommon",
    description: "Pause café fumante pour coder.",
    previewUrl: "/assets/mochi/mochi/emote_coffee/frames/frame_06.png",
    spritesheetUrl: "/assets/mochi/mochi/emote_coffee/spritesheet.png",
    framesCount: 16,
    fps: 8,
  },
  {
    id: "side-eye",
    label: "Side Eye 👀",
    animation: "emote_side_eye",
    unlockLevel: 5,
    rarity: "uncommon",
    description: "Regard suspicieux sur ce git push --force.",
    previewUrl: "/assets/mochi/mochi/emote_side_eye/frames/frame_04.png",
    spritesheetUrl: "/assets/mochi/mochi/emote_side_eye/spritesheet.png",
    framesCount: 8,
    fps: 8,
  },
  {
    id: "look",
    label: "Curious Look 🔍",
    animation: "look",
    unlockLevel: 6,
    rarity: "uncommon",
    description: "Observe curieusement ta fenêtre active.",
    previewUrl: "/assets/mochi/mochi/look/frames/frame_03.png",
    spritesheetUrl: "/assets/mochi/mochi/look/spritesheet.png",
    framesCount: 6,
    fps: 8,
  },
  {
    id: "table-flip",
    label: "Table Flip (╯°□°)╯︵┻━┻",
    animation: "emote_table_flip",
    unlockLevel: 7,
    rarity: "rare",
    description: "Quand le build échoue à la dernière seconde.",
    previewUrl: "/assets/mochi/mochi/emote_table_flip/frames/frame_05.png",
    spritesheetUrl: "/assets/mochi/mochi/emote_table_flip/spritesheet.png",
    framesCount: 8,
    fps: 10,
  },
  {
    id: "this-is-fine",
    label: "This Is Fine 🔥",
    animation: "emote_this_is_fine",
    unlockLevel: 8,
    rarity: "rare",
    description: "Sirote calmement pendant que la prod chauffe.",
    previewUrl: "/assets/mochi/mochi/emote_this_is_fine/frames/frame_06.png",
    spritesheetUrl: "/assets/mochi/mochi/emote_this_is_fine/spritesheet.png",
    framesCount: 16,
    fps: 8,
  },
  {
    id: "vs-code",
    label: "Code Sprint 💻",
    animation: "emote_vs_code",
    unlockLevel: 9,
    rarity: "rare",
    description: "Concentration maximale sur le code.",
    previewUrl: "/assets/mochi/mochi/emote_vs_code/frames/frame_04.png",
    spritesheetUrl: "/assets/mochi/mochi/emote_vs_code/spritesheet.png",
    framesCount: 8,
    fps: 10,
  },
  {
    id: "dance",
    label: "Victory Dance 💃",
    animation: "dance",
    unlockLevel: 10,
    rarity: "epic",
    description: "Danse de la victoire après un déploiement réussi.",
    previewUrl: "/assets/mochi/mochi/dance/frames/frame_04.png",
    spritesheetUrl: "/assets/mochi/mochi/dance/spritesheet.png",
    framesCount: 8,
    fps: 12,
  },
  {
    id: "mochi-exe",
    label: "mochi.exe ⚡",
    animation: "emote_mochi_exe",
    unlockLevel: 12,
    rarity: "epic",
    description: "Mode overdrive deskling maximum.",
    previewUrl: "/assets/mochi/mochi/emote_mochi_exe/frames/frame_05.png",
    spritesheetUrl: "/assets/mochi/mochi/emote_mochi_exe/spritesheet.png",
    framesCount: 11,
    fps: 12,
  },
] as const;

export type MochiFocusPhase =
  "idle" | "focusing" | "thinking" | "break" | "complete";

export interface MochiFocusSession {
  phase: MochiFocusPhase;
  focusMinutes: number;
  breakMinutes: number;
  cycles: number;
  startedAt?: string;
  endsAt?: string;
}

export type MochiPocketKind = "local_file" | "text" | "url" | "saved_image";

export interface MochiPocketItem {
  id: string;
  kind: MochiPocketKind;
  title: string;
  value: string;
  createdAt: string;
}

export function resolveScheduledOutfitId(date = new Date()): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();
  const hour = date.getHours();

  if (month === 10 && day >= 25) return "halloween";
  if (month === 12 && day >= 20) return "holidays";
  if (hour >= 22 || hour < 7) return "pajamas";
  if (dayOfWeek === 0 || dayOfWeek === 6) return "weekend";
  if (month >= 6 && month <= 8) return "summer";
  return "default";
}

// ── 5. Pet Throw Physics Engine (`createVelocityTracker` & `stepThrow`) ─────

export interface ThrowSample {
  x: number;
  y: number;
  t: number;
}

export interface ThrowState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  resting: boolean;
  bouncedX: boolean;
  bouncedY: boolean;
}

export interface ThrowBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ThrowOptions {
  gravity?: number;
  bounceX?: number;
  bounceY?: number;
  airFriction?: number;
  floorFriction?: number;
  restSpeed?: number;
}

const DEFAULT_THROW_OPTIONS: Required<ThrowOptions> = {
  gravity: 2200,
  bounceX: 0.72,
  bounceY: 0.58,
  airFriction: 0.992,
  floorFriction: 0.86,
  restSpeed: 22,
};

export function createVelocityTracker(windowMs = 120, maxSpeed = 3200) {
  const samples: ThrowSample[] = [];
  return {
    record(x: number, y: number, t: number): void {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(t))
        return;
      samples.push({ x, y, t });
      const cutoff = t - windowMs;
      while (samples.length > 2 && (samples[0]?.t ?? 0) < cutoff) {
        samples.shift();
      }
    },
    release(now?: number): { vx: number; vy: number; speed: number } {
      if (samples.length < 2) return { vx: 0, vy: 0, speed: 0 };
      const last = samples[samples.length - 1]!;
      const referenceTime = now ?? last.t;
      if (referenceTime - last.t > windowMs) return { vx: 0, vy: 0, speed: 0 };
      const cutoff = last.t - windowMs;
      let first = samples[0]!;
      for (const sample of samples) {
        if (sample.t >= cutoff) {
          first = sample;
          break;
        }
      }
      const dtMs = last.t - first.t;
      if (dtMs <= 4) return { vx: 0, vy: 0, speed: 0 };
      let vx = ((last.x - first.x) / dtMs) * 1000;
      let vy = ((last.y - first.y) / dtMs) * 1000;
      const speed = Math.hypot(vx, vy);
      if (speed > maxSpeed && speed > 0) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
      }
      return { vx, vy, speed: Math.hypot(vx, vy) };
    },
    reset(): void {
      samples.length = 0;
    },
  };
}

export function stepThrow(
  state: ThrowState,
  bounds: ThrowBounds,
  dtSeconds: number,
  options: ThrowOptions = {},
): ThrowState {
  const cfg = { ...DEFAULT_THROW_OPTIONS, ...options };
  const dt = Math.max(
    0,
    Math.min(0.05, Number.isFinite(dtSeconds) ? dtSeconds : 0),
  );
  if (dt === 0) {
    return { ...state, bouncedX: false, bouncedY: false };
  }

  const airDrag = Math.pow(cfg.airFriction, dt * 60);
  let vx = state.vx * airDrag;
  let vy = (state.vy + cfg.gravity * dt) * airDrag;
  let x = state.x + vx * dt;
  let y = state.y + vy * dt;
  let bouncedX = false;
  let bouncedY = false;

  if (x < bounds.minX) {
    x = bounds.minX;
    if (vx < 0) {
      vx = -vx * cfg.bounceX;
      bouncedX = true;
    }
  } else if (x > bounds.maxX) {
    x = bounds.maxX;
    if (vx > 0) {
      vx = -vx * cfg.bounceX;
      bouncedX = true;
    }
  }

  if (y < bounds.minY) {
    y = bounds.minY;
    if (vy < 0) {
      vy = -vy * cfg.bounceY;
      bouncedY = true;
    }
  } else if (y > bounds.maxY) {
    y = bounds.maxY;
    if (vy > 0) {
      vy = -vy * cfg.bounceY;
      bouncedY = true;
    }
  }

  const onFloor = Math.abs(bounds.maxY - y) <= 0.5;
  if (onFloor) {
    vx *= Math.pow(cfg.floorFriction, dt * 60);
    if (Math.abs(vy) < cfg.restSpeed * 2.5) {
      vy = 0;
      y = bounds.maxY;
    }
  }

  const resting =
    cfg.gravity > 0
      ? onFloor && Math.abs(vx) < cfg.restSpeed && Math.abs(vy) < cfg.restSpeed
      : Math.hypot(vx, vy) < cfg.restSpeed;

  if (resting) {
    vx = 0;
    vy = 0;
  }

  return { x, y, vx, vy, resting, bouncedX, bouncedY };
}

// ── 6. Tamagotchi Virtual Pet Care Engine (`openpets.virtual-pet`) ───────────

export type GeminiPetMood =
  "content" | "happy" | "hungry" | "sleepy" | "bored" | "grumpy";

export interface GeminiPetCareSnapshot {
  activePetId: GeminiPetId;
  activeOutfitId: string;
  autoScheduleOutfit: boolean;
  reaction: OpenPetsReaction;
  spriteState: UniversalSpriteState;
  spriteRow: number;
  speechText: string;
  hunger: number;
  energy: number;
  happiness: number;
  affection: number;
  xp: number;
  level: number;
  mood: GeminiPetMood;
  gravityEnabled: boolean;
  position: { x: number; y: number };
  mochiBond: MochiBondState;
  mochiAnimation: string;
  mochiFocus: MochiFocusSession;
  mochiPocket: MochiPocketItem[];
  updatedAt: string;
}

function clampStat(val: number): number {
  if (!Number.isFinite(val)) return 80;
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function getPetMood(state: {
  hunger: number;
  energy: number;
  happiness: number;
}): GeminiPetMood {
  if (state.hunger <= 20 && state.happiness <= 20) return "grumpy";
  if (state.hunger <= 30) return "hungry";
  if (state.energy <= 25) return "sleepy";
  if (state.happiness <= 30) return "bored";
  if (state.hunger >= 70 && state.energy >= 60 && state.happiness >= 75)
    return "happy";
  return "content";
}

export class GeminiPetStateManager {
  private state: GeminiPetCareSnapshot;
  public readonly leaseManager = new LeaseManager(30_000);

  constructor(initial?: Partial<GeminiPetCareSnapshot>) {
    const reaction = initial?.reaction ?? "idle";
    const spriteState = resolveReactionSpriteState(reaction);
    const hunger = clampStat(initial?.hunger ?? 86);
    const energy = clampStat(initial?.energy ?? 92);
    const happiness = clampStat(initial?.happiness ?? 88);
    const affection = clampStat(initial?.affection ?? 78);
    this.state = {
      activePetId: initial?.activePetId ?? "gemini-sparkle",
      activeOutfitId: initial?.activeOutfitId ?? "default",
      autoScheduleOutfit: initial?.autoScheduleOutfit ?? false,
      reaction,
      spriteState,
      spriteRow: defaultPetSprite.states[spriteState].row,
      speechText:
        initial?.speechText ??
        "Bonjour ! Je suis ton Gemini Pet ✦ Clique sur moi, lance-moi ou parle-moi en Live !",
      hunger,
      energy,
      happiness,
      affection,
      xp: initial?.xp ?? 45,
      level: initial?.level ?? 2,
      mood: getPetMood({ hunger, energy, happiness }),
      gravityEnabled: initial?.gravityEnabled ?? true,
      position: initial?.position ?? { x: 240, y: 220 },
      mochiBond: initial?.mochiBond ?? computeMochiBondState(12, 180),
      mochiAnimation: initial?.mochiAnimation ?? "idle_breathe",
      mochiFocus: initial?.mochiFocus ?? {
        phase: "idle",
        focusMinutes: 25,
        breakMinutes: 5,
        cycles: 1,
      },
      mochiPocket: initial?.mochiPocket ?? [],
      updatedAt: new Date().toISOString(),
    };
  }

  getSnapshot(): GeminiPetCareSnapshot {
    if (
      this.state.autoScheduleOutfit &&
      this.state.activePetId === "hoodie-cat"
    ) {
      this.state.activeOutfitId = resolveScheduledOutfitId();
    }
    return {
      ...this.state,
      mochiBond: { ...this.state.mochiBond },
      mochiFocus: { ...this.state.mochiFocus },
      mochiPocket: [...this.state.mochiPocket],
    };
  }

  private addXp(amount: number): boolean {
    const total = this.state.xp + amount;
    const newLevels = Math.floor(total / 100);
    this.state.xp = total % 100;
    this.state.level += newLevels;
    const bondAward = awardMochiBondXp(
      this.state.mochiBond,
      Math.max(1, amount * 12),
    );
    this.state.mochiBond = bondAward.state;
    return newLevels > 0 || bondAward.levelsGained > 0;
  }

  private updateReactionInternal(
    reaction: OpenPetsReaction,
    customSpeech?: string,
    mochiAnimationOverride?: string,
  ): void {
    this.state.reaction = reaction;
    this.state.spriteState = resolveReactionSpriteState(reaction);
    this.state.spriteRow = defaultPetSprite.states[this.state.spriteState].row;
    if (mochiAnimationOverride) {
      this.state.mochiAnimation = mochiAnimationOverride;
    } else if (reaction === "celebrating") {
      this.state.mochiAnimation = "dance";
    } else if (reaction === "waving") {
      this.state.mochiAnimation = "wave";
    } else if (reaction === "working" || reaction === "editing") {
      this.state.mochiAnimation = "coworking";
    } else if (reaction === "thinking") {
      this.state.mochiAnimation = "look";
    } else if (reaction === "error") {
      this.state.mochiAnimation = "emote_this_is_fine";
    } else {
      this.state.mochiAnimation = "idle_breathe";
    }
    if (customSpeech !== undefined) {
      this.state.speechText = customSpeech;
    } else {
      const picked = pickReactionMessage(reaction, "fr");
      if (picked) this.state.speechText = picked;
    }
    this.state.mood = getPetMood(this.state);
    this.state.updatedAt = new Date().toISOString();
  }

  feed(): { snapshot: GeminiPetCareSnapshot; leveledUp: boolean } {
    this.state.hunger = clampStat(this.state.hunger + 28);
    this.state.happiness = clampStat(this.state.happiness + 6);
    this.state.affection = clampStat(this.state.affection + 3);
    const leveledUp = this.addXp(10);
    this.updateReactionInternal(
      leveledUp ? "celebrating" : "success",
      leveledUp
        ? `Niveau ${this.state.level} atteint ! Merci pour les tokens étoilés ✦🎉`
        : "Miam ! Délicieux cristaux de contexte Gemini ✦ (+28 Food)",
      "eat",
    );
    return { snapshot: this.getSnapshot(), leveledUp };
  }

  play(): { snapshot: GeminiPetCareSnapshot; leveledUp: boolean } {
    if (this.state.energy < 15) {
      this.updateReactionInternal(
        "waiting",
        "Je suis trop fatigué pour jouer... Une petite sieste d'abord ? ☾",
        "sleep",
      );
      return { snapshot: this.getSnapshot(), leveledUp: false };
    }
    this.state.happiness = clampStat(this.state.happiness + 24);
    this.state.energy = clampStat(this.state.energy - 10);
    this.state.hunger = clampStat(this.state.hunger - 6);
    this.state.affection = clampStat(this.state.affection + 5);
    const leveledUp = this.addXp(15);
    this.updateReactionInternal(
      "celebrating",
      leveledUp
        ? `Niveau ${this.state.level} ! Quel saut acrobatique ✦🎉`
        : "Youpi ! Lance-moi à travers l'écran avec la souris ! (+24 Play)",
      "bounce",
    );
    return { snapshot: this.getSnapshot(), leveledUp };
  }

  pet(): { snapshot: GeminiPetCareSnapshot; leveledUp: boolean } {
    this.state.happiness = clampStat(this.state.happiness + 12);
    this.state.affection = clampStat(this.state.affection + 8);
    const leveledUp = this.addXp(8);
    this.updateReactionInternal(
      leveledUp ? "celebrating" : "waving",
      leveledUp
        ? `Niveau ${this.state.level} ! Notre lien cosmique grandit ✦💛`
        : "Ronronnement quantique ✦ J'adore les caresses ! (+8 Bond)",
      "emote_heart",
    );
    return { snapshot: this.getSnapshot(), leveledUp };
  }

  nap(): { snapshot: GeminiPetCareSnapshot; leveledUp: boolean } {
    this.state.energy = clampStat(this.state.energy + 35);
    this.state.happiness = clampStat(this.state.happiness + 5);
    const leveledUp = this.addXp(5);
    this.updateReactionInternal(
      "waiting",
      "Zzz... Rêve de tenseurs et d'étoiles Gemini... (+35 Energy) ☾",
      "sleep",
    );
    return { snapshot: this.getSnapshot(), leveledUp };
  }

  react(reaction: OpenPetsReaction, text?: string): GeminiPetCareSnapshot {
    this.updateReactionInternal(reaction, text);
    return this.getSnapshot();
  }

  say(text: string): GeminiPetCareSnapshot {
    this.state.speechText = text.trim().slice(0, 220);
    this.state.updatedAt = new Date().toISOString();
    return this.getSnapshot();
  }

  switchPet(petId: GeminiPetId, outfitId?: string): GeminiPetCareSnapshot {
    this.state.activePetId = petId;
    if (outfitId) {
      this.state.activeOutfitId = outfitId;
    } else {
      this.state.activeOutfitId = "default";
    }
    const switchMsg =
      petId === "gemini-sparkle"
        ? "Transformation en Gemini Sparkle Pet officiel ✦"
        : petId === "mochi"
          ? "Mochi 🌱 Cross-Platform Deskling activé ! (39 animations pixel-art 256×256 + 12 Emotes Bond)"
          : "Meow ! Transformation en OpenPets Hoodie Cat 🐾";
    this.updateReactionInternal("waving", switchMsg, "wave");
    return this.getSnapshot();
  }

  triggerMochiEmote(emoteId: string): GeminiPetCareSnapshot {
    const emote = MOCHI_EMOTE_CATALOGUE.find(
      (item) => item.id === emoteId || item.animation === emoteId,
    );
    if (!emote) {
      return this.getSnapshot();
    }
    this.addXp(4);
    this.updateReactionInternal(
      emote.rarity === "epic" ? "celebrating" : "waving",
      `Mochi Emote : ${emote.label} — ${emote.description}`,
      emote.animation,
    );
    return this.getSnapshot();
  }

  startMochiFocus(
    focusMinutes = 25,
    breakMinutes = 5,
    cycles = 1,
  ): GeminiPetCareSnapshot {
    const clampedFocus = Math.max(1, Math.min(180, Math.round(focusMinutes)));
    const clampedBreak = Math.max(1, Math.min(60, Math.round(breakMinutes)));
    const now = new Date();
    this.state.mochiFocus = {
      phase: "focusing",
      focusMinutes: clampedFocus,
      breakMinutes: clampedBreak,
      cycles: Math.max(1, Math.min(8, Math.round(cycles))),
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + clampedFocus * 60 * 1000).toISOString(),
    };
    this.updateReactionInternal(
      "working",
      `Focus avec Mochi 🌱 démarré : ${clampedFocus} min de concentration profonde !`,
      "focus",
    );
    return this.getSnapshot();
  }

  stopMochiFocus(completed = false): GeminiPetCareSnapshot {
    this.state.mochiFocus = {
      ...this.state.mochiFocus,
      phase: completed ? "complete" : "idle",
      endsAt: undefined,
    };
    if (completed) {
      this.addXp(25);
    }
    this.updateReactionInternal(
      completed ? "celebrating" : "idle",
      completed
        ? "Session Focus terminée ! Bravo, Mochi danse de joie 🌱🎉 (+300 Bond XP)"
        : "Session Focus mise en pause.",
      completed ? "focus_celebrate" : "idle_breathe",
    );
    return this.getSnapshot();
  }

  addMochiPocketItem(
    kind: MochiPocketKind,
    value: string,
    title?: string,
  ): GeminiPetCareSnapshot {
    const trimmed = value.trim();
    if (!trimmed) return this.getSnapshot();
    const item: MochiPocketItem = {
      id: `pocket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      title: (title?.trim() || trimmed).slice(0, 80),
      value: trimmed.slice(0, 2000),
      createdAt: new Date().toISOString(),
    };
    this.state.mochiPocket = [item, ...this.state.mochiPocket].slice(0, 20);
    this.addXp(5);
    this.updateReactionInternal(
      "success",
      `Mochi a rangé « ${item.title} » dans sa poche secrète 🌱🎒`,
      "pocket_receive",
    );
    return this.getSnapshot();
  }

  removeMochiPocketItem(id: string): GeminiPetCareSnapshot {
    this.state.mochiPocket = this.state.mochiPocket.filter(
      (item) => item.id !== id,
    );
    this.state.updatedAt = new Date().toISOString();
    return this.getSnapshot();
  }

  clearMochiPocket(): GeminiPetCareSnapshot {
    this.state.mochiPocket = [];
    this.state.updatedAt = new Date().toISOString();
    return this.getSnapshot();
  }

  setOutfit(outfitId: string, autoSchedule = false): GeminiPetCareSnapshot {
    this.state.autoScheduleOutfit = autoSchedule;
    this.state.activeOutfitId = autoSchedule
      ? resolveScheduledOutfitId()
      : outfitId;
    const animMap: Record<string, string> = {
      default: "idle_breathe",
      coworking: "coworking",
      agent: "agent_cowork",
      headphones: "headphones",
      focus: "focus",
    };
    this.updateReactionInternal(
      "celebrating",
      `Nouvelle tenue équipée : ${this.state.activeOutfitId} ✦`,
      animMap[this.state.activeOutfitId] ?? "wave",
    );
    return this.getSnapshot();
  }

  setPhysics(
    gravityEnabled: boolean,
    position?: { x: number; y: number },
  ): GeminiPetCareSnapshot {
    this.state.gravityEnabled = gravityEnabled;
    if (position) {
      this.state.position = position;
    }
    this.state.updatedAt = new Date().toISOString();
    return this.getSnapshot();
  }
}

// ── 7. Static SVG Spritesheet Validator & Gemini Sparkle Pet V2 Atlas ────────

export const SVG_SPRITESHEET_WIDTH = 1536;
export const SVG_SPRITESHEET_HEIGHT = 2080;
export const SVG_V2_SPRITESHEET_HEIGHT = 2288;

export interface SvgSpritesheetValidationResult {
  valid: boolean;
  width: number;
  height: number;
  errors: string[];
}

export function validateSvgSpritesheet(
  svgText: string,
): SvgSpritesheetValidationResult {
  const errors: string[] = [];
  if (!svgText.includes("<svg")) {
    errors.push("Missing <svg> root element.");
  }
  if (/<\s*(script|foreignObject)\b/i.test(svgText)) {
    errors.push(
      "SVG spritesheets must not contain <script> or <foreignObject>.",
    );
  }
  const viewBoxMatch = svgText.match(/viewBox\s*=\s*"0\s+0\s+(\d+)\s+(\d+)"/);
  const width = viewBoxMatch ? Number(viewBoxMatch[1]) : 0;
  const height = viewBoxMatch ? Number(viewBoxMatch[2]) : 0;
  if (
    width !== SVG_SPRITESHEET_WIDTH ||
    (height !== SVG_SPRITESHEET_HEIGHT && height !== SVG_V2_SPRITESHEET_HEIGHT)
  ) {
    errors.push(
      `Expected viewBox 1536x2080 (V1) or 1536x2288 (V2), got ${width}x${height}.`,
    );
  }
  return {
    valid: errors.length === 0,
    width,
    height,
    errors,
  };
}

/**
 * Generates a complete, valid OpenPets V2 (`1536x2288`, `8x11` frames of `192x208`)
 * static SVG spritesheet for the **Gemini Sparkle Pet Companion**.
 *
 * Rows 0..8 correspond to the 9 `UniversalSpriteState` animations:
 * - Row 0: `idle` (breathing sparkle body + blinking eyes)
 * - Row 1: `running-right` (leaning right + animated feet)
 * - Row 2: `running-left` (leaning left + animated feet)
 * - Row 3: `waving` (waving right sparkle arm + happy eyes)
 * - Row 4: `jumping` (bouncing upward + star particles)
 * - Row 5: `failed` (dizzy eyes + red/amber alert tint)
 * - Row 6: `waiting` (floating sleep/listen aura + calm eyes)
 * - Row 7: `running` (energetic pulse + dual sparkle orbit)
 * - Row 8: `review` (thinking monocle/halo + upward gaze)
 * - Rows 9..10: 16-sector directional cursor gaze frames (`quantizeCodexV2GazeDirection`).
 */
export function generateGeminiPetSvgSpritesheet(): string {
  const cells: string[] = [];

  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 8; col++) {
      const originX = col * 192;
      const originY = row * 208;
      const phase = (col / 8) * Math.PI * 2;

      let bobY = Math.round(Math.sin(phase) * 5);
      let tiltDeg = 0;
      let eyeOffsetX = 0;
      let eyeOffsetY = 0;
      let blink = col === 7 && row === 0;
      let happyEyes = false;
      let dizzyEyes = false;
      let waveArm = false;
      let thinkingHalo = false;
      let gradId = "geminiMainGrad";

      if (row === 1) {
        // running-right
        tiltDeg = 10;
        bobY = Math.round(Math.abs(Math.sin(phase * 2)) * -10);
        eyeOffsetX = 6;
      } else if (row === 2) {
        // running-left
        tiltDeg = -10;
        bobY = Math.round(Math.abs(Math.sin(phase * 2)) * -10);
        eyeOffsetX = -6;
      } else if (row === 3) {
        // waving
        waveArm = true;
        happyEyes = true;
        tiltDeg = Math.round(Math.sin(phase) * 5);
      } else if (row === 4) {
        // jumping / celebrating
        bobY = Math.round(Math.sin((col / 7) * Math.PI) * -24);
        happyEyes = true;
        gradId = "geminiCelebrateGrad";
      } else if (row === 5) {
        // failed / error
        dizzyEyes = true;
        bobY = Math.round(Math.sin(phase * 2) * 3);
        gradId = "geminiErrorGrad";
      } else if (row === 6) {
        // waiting / listening
        bobY = Math.round(Math.sin(phase) * 4);
      } else if (row === 7) {
        // running / working
        tiltDeg = Math.round(Math.sin(phase * 2) * 8);
        bobY = Math.round(Math.cos(phase * 2) * -8);
      } else if (row === 8) {
        // review / thinking
        thinkingHalo = true;
        eyeOffsetY = -5;
        eyeOffsetX = Math.round(Math.sin(phase) * 4);
      } else if (row >= 9) {
        // 16-direction cursor gaze (rows 9 and 10)
        const dirIndex = (row - 9) * 8 + col;
        const angle = (dirIndex / 16) * Math.PI * 2;
        eyeOffsetX = Math.round(Math.sin(angle) * 9);
        eyeOffsetY = Math.round(-Math.cos(angle) * 7);
        bobY = 0;
      }

      const cx = originX + 96;
      const cy = originY + 112 + bobY;

      const feetOffset = Math.round(Math.sin(phase * 2) * 6);
      const waveAngle = waveArm
        ? Math.round(-35 + Math.sin(phase * 2) * 25)
        : 15;

      const eyesMarkup = dizzyEyes
        ? `<path d="M ${cx - 22} ${cy - 8} L ${cx - 10} ${cy + 4} M ${cx - 10} ${cy - 8} L ${cx - 22} ${cy + 4}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
           <path d="M ${cx + 10} ${cy - 8} L ${cx + 22} ${cy + 4} M ${cx + 22} ${cy - 8} L ${cx + 10} ${cy + 4}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>`
        : blink
          ? `<line x1="${cx - 24}" y1="${cy - 2}" x2="${cx - 10}" y2="${cy - 2}" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
             <line x1="${cx + 10}" y1="${cy - 2}" x2="${cx + 24}" y2="${cy - 2}" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>`
          : happyEyes
            ? `<path d="M ${cx - 24} ${cy} Q ${cx - 17} ${cy - 12} ${cx - 10} ${cy}" fill="none" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
               <path d="M ${cx + 10} ${cy} Q ${cx + 17} ${cy - 12} ${cx + 24} ${cy}" fill="none" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>`
            : `<ellipse cx="${cx - 17 + eyeOffsetX}" cy="${cy - 2 + eyeOffsetY}" rx="6.5" ry="8.5" fill="#0F172A"/>
               <circle cx="${cx - 19 + eyeOffsetX}" cy="${cy - 5 + eyeOffsetY}" r="2.5" fill="#FFFFFF"/>
               <ellipse cx="${cx + 17 + eyeOffsetX}" cy="${cy - 2 + eyeOffsetY}" rx="6.5" ry="8.5" fill="#0F172A"/>
               <circle cx="${cx + 15 + eyeOffsetX}" cy="${cy - 5 + eyeOffsetY}" r="2.5" fill="#FFFFFF"/>`;

      const mouthMarkup = dizzyEyes
        ? `<path d="M ${cx - 8} ${cy + 16} Q ${cx} ${cy + 10} ${cx + 8} ${cy + 16}" fill="none" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>`
        : `<path d="M ${cx - 8} ${cy + 12} Q ${cx} ${cy + 19} ${cx + 8} ${cy + 12}" fill="none" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>`;

      const haloMarkup = thinkingHalo
        ? `<ellipse cx="${cx}" cy="${cy - 68}" rx="28" ry="8" fill="none" stroke="#38BDF8" stroke-width="3" stroke-dasharray="6 4"/>
           <circle cx="${cx + 34}" cy="${cy - 58}" r="5" fill="#F472B6"/>`
        : `<path d="M ${cx} ${cy - 76} C ${cx + 4} ${cy - 62}, ${cx + 8} ${cy - 58}, ${cx + 22} ${cy - 54} C ${cx + 8} ${cy - 50}, ${cx + 4} ${cy - 46}, ${cx} ${cy - 32} C ${cx - 4} ${cy - 46}, ${cx - 8} ${cy - 50}, ${cx - 22} ${cy - 54} C ${cx - 8} ${cy - 58}, ${cx - 4} ${cy - 62}, ${cx} ${cy - 76} Z" fill="url(#${gradId})" opacity="0.9"/>`;

      cells.push(`<g transform="rotate(${tiltDeg} ${cx} ${cy})">
        <!-- Ground Shadow -->
        <ellipse cx="${originX + 96}" cy="${originY + 186}" rx="${Math.max(24, 42 + Math.round(bobY * 0.5))}" ry="10" fill="rgba(15, 23, 42, 0.32)"/>
        <!-- Cute Feet -->
        <ellipse cx="${cx - 20 + feetOffset}" cy="${cy + 58}" rx="12" ry="8" fill="#6366F1"/>
        <ellipse cx="${cx + 20 - feetOffset}" cy="${cy + 58}" rx="12" ry="8" fill="#8B5CF6"/>
        <!-- Gemini Sparkle Body -->
        <path d="M ${cx} ${cy - 56} C ${cx + 22} ${cy - 34}, ${cx + 36} ${cy - 20}, ${cx + 58} ${cy} C ${cx + 36} ${cy + 20}, ${cx + 22} ${cy + 34}, ${cx} ${cy + 56} C ${cx - 22} ${cy + 34}, ${cx - 36} ${cy + 20}, ${cx - 58} ${cy} C ${cx - 36} ${cy - 20}, ${cx - 22} ${cy - 34}, ${cx} ${cy - 56} Z" fill="url(#${gradId})" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity="0.65"/>
        <!-- Inner Plush Belly -->
        <circle cx="${cx}" cy="${cy + 2}" r="36" fill="#F8FAFC" fill-opacity="0.92"/>
        <!-- Cheeks -->
        <ellipse cx="${cx - 26}" cy="${cy + 8}" rx="6" ry="3.5" fill="#F472B6" fill-opacity="0.65"/>
        <ellipse cx="${cx + 26}" cy="${cy + 8}" rx="6" ry="3.5" fill="#F472B6" fill-opacity="0.65"/>
        <!-- Waving / Side Paws -->
        <ellipse cx="${cx - 46}" cy="${cy + 6}" rx="10" ry="7" fill="#60A5FA" transform="rotate(-15 ${cx - 46} ${cy + 6})"/>
        <ellipse cx="${cx + 46}" cy="${cy - 4}" rx="11" ry="7.5" fill="#C084FC" transform="rotate(${waveAngle} ${cx + 46} ${cy - 4})"/>
        ${eyesMarkup}
        ${mouthMarkup}
        ${haloMarkup}
      </g>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="2288" viewBox="0 0 1536 2288">
  <defs>
    <linearGradient id="geminiMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4E82EE"/>
      <stop offset="52%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#D96570"/>
    </linearGradient>
    <linearGradient id="geminiCelebrateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <linearGradient id="geminiErrorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
  </defs>
  ${cells.join("\n  ")}
</svg>`;
}
