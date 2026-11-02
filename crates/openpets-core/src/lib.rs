//! Cross-platform OpenPets Core Engine (`openpets-core`) for the Gemini Super App & Tauri v3.
//!
//! Consolidates the native Rust components and core companion mechanics from `vendor/openpets`:
//! 1. **Length-Prefixed Binary Framing Protocol** (`vendor/openpets/apps/desktop/native/openpets-wayland-helper/src/protocol.rs`):
//!    `TAG_FRAME`, `TAG_MOVE`, `TAG_SHOW`, `TAG_HIDE`, `TAG_QUIT`, `TAG_READY`, `TAG_POINTER`, `TAG_POSITION`.
//! 2. **Reaction-to-Sprite Animation Mapping**:
//!    Maps `OpenPetsReaction` (`idle`, `thinking`, `working`, `editing`, `running`, `testing`, `waiting`, `waving`, `success`, `error`, `celebrating`)
//!    to the 9-row `UniversalSpriteState` (`idle`, `running-right`, `running-left`, `waving`, `jumping`, `failed`, `waiting`, `running`, `review`)
//!    and Codex V2 11-row (`192x208`, `1536x2288`) spritesheet layout.
//! 3. **Ball-Physics Pet Throw Engine** (`step_throw`):
//!    Simulates gravity, air friction, floor friction, wall restitution, and resting settle threshold.
//! 4. **Tamagotchi Virtual Pet Care Engine**:
//!    Tracks `hunger`, `energy`, `happiness`, `affection`, `xp`, `level`, and `mood` (`content`, `happy`, `hungry`, `sleepy`, `bored`, `grumpy`).

use serde::{Deserialize, Serialize};
use std::io::{self, Read, Write};

// ── 1. OpenPets Native Overlay Framing Protocol ───────────────────────────────

pub const TAG_FRAME: u8 = 0x01;
pub const TAG_MOVE: u8 = 0x02;
pub const TAG_SHOW: u8 = 0x03;
pub const TAG_HIDE: u8 = 0x04;
pub const TAG_QUIT: u8 = 0x05;

pub const TAG_READY: u8 = 0x81;
pub const TAG_POINTER: u8 = 0x82;
pub const TAG_POSITION: u8 = 0x83;

const MAX_MESSAGE_BYTES: usize = 16 * 1024 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame {
    pub width: u32,
    pub height: u32,
    pub stride: u32,
    pub bgra: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Message {
    Frame(Frame),
    Move { x: i32, y: i32 },
    Show,
    Hide,
    Quit,
}

pub fn read_message<R: Read>(reader: &mut R) -> io::Result<Option<Message>> {
    let mut len_bytes = [0u8; 4];
    match reader.read_exact(&mut len_bytes) {
        Ok(()) => {}
        Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(error) => return Err(error),
    }

    let len = u32::from_le_bytes(len_bytes) as usize;
    if len == 0 || len > MAX_MESSAGE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("invalid message length {len}"),
        ));
    }

    let mut payload = vec![0u8; len];
    reader.read_exact(&mut payload)?;
    parse_message(&payload).map(Some)
}

pub fn parse_message(payload: &[u8]) -> io::Result<Message> {
    let (&tag, body) = payload
        .split_first()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "empty message"))?;

    match tag {
        TAG_FRAME => {
            if body.len() < 12 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "short frame header",
                ));
            }
            let width = u32::from_le_bytes([body[0], body[1], body[2], body[3]]);
            let height = u32::from_le_bytes([body[4], body[5], body[6], body[7]]);
            let stride = u32::from_le_bytes([body[8], body[9], body[10], body[11]]);
            let pixels = &body[12..];
            let expected = (stride as usize)
                .checked_mul(height as usize)
                .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "frame size overflow"))?;
            if width == 0 || height == 0 || stride < width.saturating_mul(4) || pixels.len() != expected {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "invalid frame dimensions",
                ));
            }
            Ok(Message::Frame(Frame {
                width,
                height,
                stride,
                bgra: pixels.to_vec(),
            }))
        }
        TAG_MOVE => {
            if body.len() != 8 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "invalid move payload",
                ));
            }
            let x = i32::from_le_bytes([body[0], body[1], body[2], body[3]]);
            let y = i32::from_le_bytes([body[4], body[5], body[6], body[7]]);
            Ok(Message::Move { x, y })
        }
        TAG_SHOW => Ok(Message::Show),
        TAG_HIDE => Ok(Message::Hide),
        TAG_QUIT => Ok(Message::Quit),
        _ => Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("unknown message tag {tag:#x}"),
        )),
    }
}

pub fn write_ready<W: Write>(writer: &mut W, backend: &str) -> io::Result<()> {
    let bytes = backend.as_bytes();
    let len = (1 + bytes.len()) as u32;
    writer.write_all(&len.to_le_bytes())?;
    writer.write_all(&[TAG_READY])?;
    writer.write_all(bytes)?;
    writer.flush()
}

pub fn write_pointer<W: Write>(
    writer: &mut W,
    kind: u8,
    x: i32,
    y: i32,
    button: u32,
) -> io::Result<()> {
    let len = 14u32;
    writer.write_all(&len.to_le_bytes())?;
    writer.write_all(&[TAG_POINTER, kind])?;
    writer.write_all(&x.to_le_bytes())?;
    writer.write_all(&y.to_le_bytes())?;
    writer.write_all(&button.to_le_bytes())?;
    writer.flush()
}

pub fn write_position<W: Write>(
    writer: &mut W,
    x: i32,
    y: i32,
    screen_width: i32,
    screen_height: i32,
) -> io::Result<()> {
    let len = 17u32;
    writer.write_all(&len.to_le_bytes())?;
    writer.write_all(&[TAG_POSITION])?;
    writer.write_all(&x.to_le_bytes())?;
    writer.write_all(&y.to_le_bytes())?;
    writer.write_all(&screen_width.to_le_bytes())?;
    writer.write_all(&screen_height.to_le_bytes())?;
    writer.flush()
}

// ── 2. OpenPets Reaction & Sprite State Engine ────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum OpenPetsReaction {
    Idle,
    Thinking,
    Working,
    Editing,
    Running,
    Testing,
    Waiting,
    Waving,
    Success,
    Error,
    Celebrating,
}

impl OpenPetsReaction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::Thinking => "thinking",
            Self::Working => "working",
            Self::Editing => "editing",
            Self::Running => "running",
            Self::Testing => "testing",
            Self::Waiting => "waiting",
            Self::Waving => "waving",
            Self::Success => "success",
            Self::Error => "error",
            Self::Celebrating => "celebrating",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum UniversalSpriteState {
    Idle,
    RunningRight,
    RunningLeft,
    Waving,
    Jumping,
    Failed,
    Waiting,
    Running,
    Review,
}

impl UniversalSpriteState {
    pub fn row_index(&self) -> u32 {
        match self {
            Self::Idle => 0,
            Self::RunningRight => 1,
            Self::RunningLeft => 2,
            Self::Waving => 3,
            Self::Jumping => 4,
            Self::Failed => 5,
            Self::Waiting => 6,
            Self::Running => 7,
            Self::Review => 8,
        }
    }
}

pub fn resolve_reaction_sprite_state(reaction: OpenPetsReaction) -> UniversalSpriteState {
    match reaction {
        OpenPetsReaction::Idle => UniversalSpriteState::Idle,
        OpenPetsReaction::Thinking | OpenPetsReaction::Testing => UniversalSpriteState::Review,
        OpenPetsReaction::Working | OpenPetsReaction::Editing | OpenPetsReaction::Running => {
            UniversalSpriteState::Running
        }
        OpenPetsReaction::Waiting => UniversalSpriteState::Waiting,
        OpenPetsReaction::Waving => UniversalSpriteState::Waving,
        OpenPetsReaction::Success | OpenPetsReaction::Celebrating => UniversalSpriteState::Jumping,
        OpenPetsReaction::Error => UniversalSpriteState::Failed,
    }
}

// ── 3. Pet Throw Physics Simulation (`step_throw`) ────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ThrowState {
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub resting: bool,
    pub bounced_x: bool,
    pub bounced_y: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ThrowBounds {
    pub min_x: f64,
    pub max_x: f64,
    pub min_y: f64,
    pub max_y: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ThrowOptions {
    pub gravity: f64,
    pub bounce_x: f64,
    pub bounce_y: f64,
    pub air_friction: f64,
    pub floor_friction: f64,
    pub rest_speed: f64,
}

impl Default for ThrowOptions {
    fn default() -> Self {
        Self {
            gravity: 2200.0,
            bounce_x: 0.72,
            bounce_y: 0.58,
            air_friction: 0.992,
            floor_friction: 0.86,
            rest_speed: 22.0,
        }
    }
}

pub fn step_throw(
    state: ThrowState,
    bounds: ThrowBounds,
    dt_seconds: f64,
    options: ThrowOptions,
) -> ThrowState {
    let dt = dt_seconds.clamp(0.0, 0.05);
    if dt == 0.0 {
        return ThrowState {
            bounced_x: false,
            bounced_y: false,
            ..state
        };
    }

    let air_drag = options.air_friction.powf(dt * 60.0);
    let mut vx = state.vx * air_drag;
    let mut vy = (state.vy + options.gravity * dt) * air_drag;
    let mut x = state.x + vx * dt;
    let mut y = state.y + vy * dt;
    let mut bounced_x = false;
    let mut bounced_y = false;

    if x < bounds.min_x {
        x = bounds.min_x;
        if vx < 0.0 {
            vx = -vx * options.bounce_x;
            bounced_x = true;
        }
    } else if x > bounds.max_x {
        x = bounds.max_x;
        if vx > 0.0 {
            vx = -vx * options.bounce_x;
            bounced_x = true;
        }
    }

    if y < bounds.min_y {
        y = bounds.min_y;
        if vy < 0.0 {
            vy = -vy * options.bounce_y;
            bounced_y = true;
        }
    } else if y > bounds.max_y {
        y = bounds.max_y;
        if vy > 0.0 {
            vy = -vy * options.bounce_y;
            bounced_y = true;
        }
    }

    let on_floor = (bounds.max_y - y).abs() <= 0.5;
    if on_floor {
        vx *= options.floor_friction.powf(dt * 60.0);
        if vy.abs() < options.rest_speed * 2.5 {
            vy = 0.0;
            y = bounds.max_y;
        }
    }

    let resting = if options.gravity > 0.0 {
        on_floor && vx.abs() < options.rest_speed && vy.abs() < options.rest_speed
    } else {
        vx.hypot(vy) < options.rest_speed
    };

    if resting {
        vx = 0.0;
        vy = 0.0;
    }

    ThrowState {
        x,
        y,
        vx,
        vy,
        resting,
        bounced_x,
        bounced_y,
    }
}

// ── 4. Tamagotchi Virtual Pet Care Engine ─────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GeminiPetMood {
    Content,
    Happy,
    Hungry,
    Sleepy,
    Bored,
    Grumpy,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GeminiPetCareState {
    pub active_pet_id: String,
    pub active_outfit_id: String,
    pub reaction: OpenPetsReaction,
    pub sprite_state: UniversalSpriteState,
    pub hunger: f64,
    pub energy: f64,
    pub happiness: f64,
    pub affection: f64,
    pub xp: u32,
    pub level: u32,
    pub mood: GeminiPetMood,
    pub speech_text: String,
}

impl Default for GeminiPetCareState {
    fn default() -> Self {
        let mut s = Self {
            active_pet_id: "gemini-sparkle".to_string(),
            active_outfit_id: "default".to_string(),
            reaction: OpenPetsReaction::Idle,
            sprite_state: UniversalSpriteState::Idle,
            hunger: 85.0,
            energy: 90.0,
            happiness: 88.0,
            affection: 75.0,
            xp: 40,
            level: 1,
            mood: GeminiPetMood::Happy,
            speech_text: "Bonjour ! Je suis ton compagnon Gemini Pet ✦ Prêt à coder et discuter en Live !".to_string(),
        };
        s.recompute_mood();
        s
    }
}

impl GeminiPetCareState {
    pub fn clamp_stat(v: f64) -> f64 {
        v.clamp(0.0, 100.0).round()
    }

    pub fn recompute_mood(&mut self) {
        self.mood = if self.hunger <= 20.0 && self.happiness <= 20.0 {
            GeminiPetMood::Grumpy
        } else if self.hunger <= 30.0 {
            GeminiPetMood::Hungry
        } else if self.energy <= 25.0 {
            GeminiPetMood::Sleepy
        } else if self.happiness <= 30.0 {
            GeminiPetMood::Bored
        } else if self.hunger >= 70.0 && self.energy >= 60.0 && self.happiness >= 75.0 {
            GeminiPetMood::Happy
        } else {
            GeminiPetMood::Content
        };
    }

    pub fn add_xp(&mut self, amount: u32) -> bool {
        let total = self.xp + amount;
        let new_levels = total / 100;
        self.xp = total % 100;
        self.level += new_levels;
        new_levels > 0
    }

    pub fn feed(&mut self) -> bool {
        self.hunger = Self::clamp_stat(self.hunger + 28.0);
        self.happiness = Self::clamp_stat(self.happiness + 6.0);
        self.affection = Self::clamp_stat(self.affection + 3.0);
        self.reaction = OpenPetsReaction::Success;
        self.sprite_state = resolve_reaction_sprite_state(self.reaction);
        let leveled = self.add_xp(10);
        self.recompute_mood();
        self.speech_text = "Miam ! Merci pour les tokens Gemini ✦ (+28 Food)".to_string();
        leveled
    }

    pub fn play(&mut self) -> bool {
        self.happiness = Self::clamp_stat(self.happiness + 24.0);
        self.energy = Self::clamp_stat(self.energy - 10.0);
        self.hunger = Self::clamp_stat(self.hunger - 6.0);
        self.affection = Self::clamp_stat(self.affection + 5.0);
        self.reaction = OpenPetsReaction::Celebrating;
        self.sprite_state = resolve_reaction_sprite_state(self.reaction);
        let leveled = self.add_xp(15);
        self.recompute_mood();
        self.speech_text = "Youpi ! On joue avec la physique rebondissante ! (+24 Play)".to_string();
        leveled
    }

    pub fn pet(&mut self) -> bool {
        self.happiness = Self::clamp_stat(self.happiness + 12.0);
        self.affection = Self::clamp_stat(self.affection + 8.0);
        self.reaction = OpenPetsReaction::Waving;
        self.sprite_state = resolve_reaction_sprite_state(self.reaction);
        let leveled = self.add_xp(8);
        self.recompute_mood();
        self.speech_text = "Ronronnement cosmique ✦ (+8 Bond)".to_string();
        leveled
    }

    pub fn nap(&mut self) -> bool {
        self.energy = Self::clamp_stat(self.energy + 35.0);
        self.happiness = Self::clamp_stat(self.happiness + 5.0);
        self.reaction = OpenPetsReaction::Waiting;
        self.sprite_state = resolve_reaction_sprite_state(self.reaction);
        let leveled = self.add_xp(5);
        self.recompute_mood();
        self.speech_text = "Zzz... Recharge neuronale terminée (+35 Energy)".to_string();
        leveled
    }
}

// ---------------------------------------------------------------------------
// 5. Mochi 🌱 Cross-Platform Deskling Engine (Bond, Emotes, Focus & Pocket)
// ---------------------------------------------------------------------------

/// Calculates the exact Bond XP required to advance from `level` to `level + 1`.
/// Mirrors `mochi.bond.xp_required_for_level`: `480 + round(90 * sqrt(level - 1))`.
pub fn mochi_bond_xp_required(level: u32) -> u32 {
    let clamped = level.max(1);
    let offset = (90.0 * ((clamped - 1) as f64).sqrt()).round() as u32;
    480 + offset
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MochiBondPhase {
    Fresh,
    WarmingUp,
    Halfway,
    AlmostThere,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MochiBondState {
    pub level: u32,
    pub xp: u32,
}

impl Default for MochiBondState {
    fn default() -> Self {
        Self { level: 1, xp: 0 }
    }
}

impl MochiBondState {
    pub fn xp_needed(&self) -> u32 {
        mochi_bond_xp_required(self.level)
    }

    pub fn progress_fraction(&self) -> f64 {
        let needed = self.xp_needed();
        if needed == 0 {
            1.0
        } else {
            (self.xp as f64 / needed as f64).clamp(0.0, 1.0)
        }
    }

    pub fn phase(&self) -> MochiBondPhase {
        let ratio = self.progress_fraction();
        if ratio < 0.25 {
            MochiBondPhase::Fresh
        } else if ratio < 0.50 {
            MochiBondPhase::WarmingUp
        } else if ratio < 0.80 {
            MochiBondPhase::Halfway
        } else {
            MochiBondPhase::AlmostThere
        }
    }

    /// Awards non-decaying Bond XP and returns the number of levels gained.
    pub fn award_xp(&mut self, amount: u32) -> u32 {
        if amount == 0 {
            return 0;
        }
        let mut remaining = self.xp.saturating_add(amount);
        let mut current_level = self.level.max(1);
        let mut levels_gained = 0;

        loop {
            let needed = mochi_bond_xp_required(current_level);
            if remaining < needed {
                break;
            }
            remaining -= needed;
            current_level = current_level.saturating_add(1);
            levels_gained += 1;
        }

        self.level = current_level;
        self.xp = remaining;
        levels_gained
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MochiEmoteRarity {
    Common,
    Uncommon,
    Rare,
    Epic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MochiEmoteSpec {
    pub id: String,
    pub label: String,
    pub animation: String,
    pub unlock_level: u32,
    pub rarity: MochiEmoteRarity,
    pub description: String,
}

pub fn default_mochi_emote_catalogue() -> Vec<MochiEmoteSpec> {
    vec![
        MochiEmoteSpec {
            id: "heart".into(),
            label: "Heart".into(),
            animation: "emote_heart".into(),
            unlock_level: 1,
            rarity: MochiEmoteRarity::Common,
            description: "Warm little heart burst.".into(),
        },
        MochiEmoteSpec {
            id: "bounce".into(),
            label: "Happy Bounce".into(),
            animation: "bounce".into(),
            unlock_level: 1,
            rarity: MochiEmoteRarity::Common,
            description: "Springy desk hop.".into(),
        },
        MochiEmoteSpec {
            id: "squish".into(),
            label: "Squish".into(),
            animation: "squish".into(),
            unlock_level: 2,
            rarity: MochiEmoteRarity::Common,
            description: "Soft mochi compression.".into(),
        },
        MochiEmoteSpec {
            id: "wave".into(),
            label: "Friendly Wave".into(),
            animation: "wave".into(),
            unlock_level: 3,
            rarity: MochiEmoteRarity::Common,
            description: "Polite hello from the corner of your screen.".into(),
        },
        MochiEmoteSpec {
            id: "coffee".into(),
            label: "Coffee Break".into(),
            animation: "emote_coffee".into(),
            unlock_level: 4,
            rarity: MochiEmoteRarity::Uncommon,
            description: "Freshly brewed coding fuel.".into(),
        },
        MochiEmoteSpec {
            id: "side-eye".into(),
            label: "Side Eye".into(),
            animation: "emote_side_eye".into(),
            unlock_level: 5,
            rarity: MochiEmoteRarity::Uncommon,
            description: "Suspicious glance at that force-push.".into(),
        },
        MochiEmoteSpec {
            id: "look".into(),
            label: "Curious Look".into(),
            animation: "look".into(),
            unlock_level: 6,
            rarity: MochiEmoteRarity::Uncommon,
            description: "Peering closely at your active window.".into(),
        },
        MochiEmoteSpec {
            id: "table-flip".into(),
            label: "Table Flip".into(),
            animation: "emote_table_flip".into(),
            unlock_level: 7,
            rarity: MochiEmoteRarity::Rare,
            description: "For when the build fails on the last step.".into(),
        },
        MochiEmoteSpec {
            id: "this-is-fine".into(),
            label: "This Is Fine".into(),
            animation: "emote_this_is_fine".into(),
            unlock_level: 8,
            rarity: MochiEmoteRarity::Rare,
            description: "Sipping calmly while production warms up.".into(),
        },
        MochiEmoteSpec {
            id: "vs-code".into(),
            label: "Code Sprint".into(),
            animation: "emote_vs_code".into(),
            unlock_level: 9,
            rarity: MochiEmoteRarity::Rare,
            description: "Locking in on the editor.".into(),
        },
        MochiEmoteSpec {
            id: "dance".into(),
            label: "Victory Dance".into(),
            animation: "dance".into(),
            unlock_level: 10,
            rarity: MochiEmoteRarity::Epic,
            description: "Full celebratory groove.".into(),
        },
        MochiEmoteSpec {
            id: "mochi-exe".into(),
            label: "mochi.exe".into(),
            animation: "emote_mochi_exe".into(),
            unlock_level: 12,
            rarity: MochiEmoteRarity::Epic,
            description: "Maximum overdrive deskling mode.".into(),
        },
    ]
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MochiFocusPhase {
    Idle,
    Focusing,
    Thinking,
    Break,
    Complete,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MochiFocusPlan {
    pub focus_minutes: u32,
    pub break_minutes: u32,
    pub cycles: u32,
}

impl Default for MochiFocusPlan {
    fn default() -> Self {
        Self {
            focus_minutes: 25,
            break_minutes: 5,
            cycles: 1,
        }
    }
}

// ---------------------------------------------------------------------------
// 6. OpenPets 3D Plugin Engine (gfx-rs/wgpu WGSL + 2D PNG -> Binary glTF 2.0 GLB)
// ---------------------------------------------------------------------------

pub const GLTF_MAGIC: u32 = 0x46546C67; // "glTF"
pub const GLTF_VERSION: u32 = 2;
pub const GLTF_CHUNK_JSON: u32 = 0x4E4F534A; // "JSON"
pub const GLTF_CHUNK_BIN: u32 = 0x004E4942; // "BIN\0"

/// Canonical WGSL shader for `gfx-rs/wgpu` 3D extruded sprite/voxel rendering.
/// Follows official `wgpu` patterns (`@group(0) @binding(0)` camera uniform,
/// `@group(0) @binding(1)` `texture_2d<f32>`, `@group(0) @binding(2)` `sampler`).
pub const OPENPETS_3D_WGPU_SHADER_WGSL: &str = r#"
struct CameraUniform {
    view_proj: mat4x4<f32>,
    model: mat4x4<f32>,
    light_dir: vec4<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;
@group(0) @binding(1)
var pet_texture: texture_2d<f32>;
@group(0) @binding(2)
var pet_sampler: sampler;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) color: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_normal: vec3<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) color: vec4<f32>,
};

@vertex
fn main_vs(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let world_pos = camera.model * vec4<f32>(in.position, 1.0);
    out.clip_position = camera.view_proj * world_pos;
    out.world_normal = normalize((camera.model * vec4<f32>(in.normal, 0.0)).xyz);
    out.uv = in.uv;
    out.color = in.color;
    return out;
}

@fragment
fn main_fs(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex = textureSample(pet_texture, pet_sampler, in.uv) * in.color;
    if (tex.a < 0.05) {
        discard;
    }
    let l = normalize(camera.light_dir.xyz);
    let ndotl = max(dot(normalize(in.world_normal), l), 0.0);
    let lighting = 0.42 + 0.58 * ndotl;
    return vec4<f32>(tex.rgb * lighting, tex.a);
}
"#;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenPets3dExtrudeConfig {
    pub depth: f32,
    pub alpha_threshold: u8,
    pub sample_step: u32,
}

impl Default for OpenPets3dExtrudeConfig {
    fn default() -> Self {
        Self {
            depth: 0.14,
            alpha_threshold: 24,
            sample_step: 4,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenPets3dMesh {
    pub positions: Vec<[f32; 3]>,
    pub normals: Vec<[f32; 3]>,
    pub uvs: Vec<[f32; 2]>,
    pub colors: Vec<[f32; 4]>,
    pub indices: Vec<u32>,
    pub voxel_count: usize,
}

#[allow(clippy::too_many_arguments)]
fn push_quad(
    positions: &mut Vec<[f32; 3]>,
    normals: &mut Vec<[f32; 3]>,
    uvs: &mut Vec<[f32; 2]>,
    colors: &mut Vec<[f32; 4]>,
    indices: &mut Vec<u32>,
    v0: [f32; 3],
    v1: [f32; 3],
    v2: [f32; 3],
    v3: [f32; 3],
    normal: [f32; 3],
    uv0: [f32; 2],
    uv1: [f32; 2],
    uv2: [f32; 2],
    uv3: [f32; 2],
    color: [f32; 4],
) {
    let base = positions.len() as u32;
    positions.extend_from_slice(&[v0, v1, v2, v3]);
    normals.extend_from_slice(&[normal, normal, normal, normal]);
    uvs.extend_from_slice(&[uv0, uv1, uv2, uv3]);
    colors.extend_from_slice(&[color, color, color, color]);
    indices.extend_from_slice(&[base, base + 1, base + 2, base, base + 2, base + 3]);
}

/// Converts a 2D RGBA image buffer (`width * height * 4`) into an extruded 3D voxel/relief mesh
/// with exposed perimeter walls (`+Z`, `-Z`, `+X`, `-X`, `+Y`, `-Y`), UV coordinates, and vertex colors.
pub fn extrude_rgba_to_3d_mesh(
    rgba: &[u8],
    width: u32,
    height: u32,
    config: &OpenPets3dExtrudeConfig,
) -> OpenPets3dMesh {
    let step = config.sample_step.max(1);
    let grid_w = width.div_ceil(step);
    let grid_h = height.div_ceil(step);
    let half_z = (config.depth.max(0.02)) * 0.5;

    let is_solid = |gx: i32, gy: i32| -> Option<[f32; 4]> {
        if gx < 0 || gy < 0 || gx >= grid_w as i32 || gy >= grid_h as i32 {
            return None;
        }
        let px = ((gx as u32) * step + step / 2).min(width.saturating_sub(1));
        let py = ((gy as u32) * step + step / 2).min(height.saturating_sub(1));
        let idx = ((py * width + px) * 4) as usize;
        if idx + 3 >= rgba.len() {
            return None;
        }
        let a = rgba[idx + 3];
        if a < config.alpha_threshold {
            return None;
        }
        Some([
            rgba[idx] as f32 / 255.0,
            rgba[idx + 1] as f32 / 255.0,
            rgba[idx + 2] as f32 / 255.0,
            a as f32 / 255.0,
        ])
    };

    let mut positions = Vec::new();
    let mut normals = Vec::new();
    let mut uvs = Vec::new();
    let mut colors = Vec::new();
    let mut indices = Vec::new();
    let mut voxel_count = 0usize;

    let max_dim = grid_w.max(grid_h).max(1) as f32;
    let cell = 1.0 / max_dim;

    for gy in 0..(grid_h as i32) {
        for gx in 0..(grid_w as i32) {
            let Some(color) = is_solid(gx, gy) else {
                continue;
            };
            voxel_count += 1;

            let x0 = (gx as f32 - grid_w as f32 * 0.5) * cell;
            let x1 = x0 + cell;
            let y1 = (grid_h as f32 * 0.5 - gy as f32) * cell;
            let y0 = y1 - cell;

            let u0 = gx as f32 / grid_w.max(1) as f32;
            let u1 = (gx + 1) as f32 / grid_w.max(1) as f32;
            let v0 = gy as f32 / grid_h.max(1) as f32;
            let v1 = (gy + 1) as f32 / grid_h.max(1) as f32;

            // Front (+Z)
            push_quad(
                &mut positions,
                &mut normals,
                &mut uvs,
                &mut colors,
                &mut indices,
                [x0, y0, half_z],
                [x1, y0, half_z],
                [x1, y1, half_z],
                [x0, y1, half_z],
                [0.0, 0.0, 1.0],
                [u0, v1],
                [u1, v1],
                [u1, v0],
                [u0, v0],
                color,
            );
            // Back (-Z)
            push_quad(
                &mut positions,
                &mut normals,
                &mut uvs,
                &mut colors,
                &mut indices,
                [x1, y0, -half_z],
                [x0, y0, -half_z],
                [x0, y1, -half_z],
                [x1, y1, -half_z],
                [0.0, 0.0, -1.0],
                [u1, v1],
                [u0, v1],
                [u0, v0],
                [u1, v0],
                color,
            );

            // Left (-X)
            if is_solid(gx - 1, gy).is_none() {
                push_quad(
                    &mut positions,
                    &mut normals,
                    &mut uvs,
                    &mut colors,
                    &mut indices,
                    [x0, y0, -half_z],
                    [x0, y0, half_z],
                    [x0, y1, half_z],
                    [x0, y1, -half_z],
                    [-1.0, 0.0, 0.0],
                    [u0, v1],
                    [u0, v1],
                    [u0, v0],
                    [u0, v0],
                    color,
                );
            }
            // Right (+X)
            if is_solid(gx + 1, gy).is_none() {
                push_quad(
                    &mut positions,
                    &mut normals,
                    &mut uvs,
                    &mut colors,
                    &mut indices,
                    [x1, y0, half_z],
                    [x1, y0, -half_z],
                    [x1, y1, -half_z],
                    [x1, y1, half_z],
                    [1.0, 0.0, 0.0],
                    [u1, v1],
                    [u1, v1],
                    [u1, v0],
                    [u1, v0],
                    color,
                );
            }
            // Top (+Y -> gy - 1)
            if is_solid(gx, gy - 1).is_none() {
                push_quad(
                    &mut positions,
                    &mut normals,
                    &mut uvs,
                    &mut colors,
                    &mut indices,
                    [x0, y1, half_z],
                    [x1, y1, half_z],
                    [x1, y1, -half_z],
                    [x0, y1, -half_z],
                    [0.0, 1.0, 0.0],
                    [u0, v0],
                    [u1, v0],
                    [u1, v0],
                    [u0, v0],
                    color,
                );
            }
            // Bottom (-Y -> gy + 1)
            if is_solid(gx, gy + 1).is_none() {
                push_quad(
                    &mut positions,
                    &mut normals,
                    &mut uvs,
                    &mut colors,
                    &mut indices,
                    [x0, y0, -half_z],
                    [x1, y0, -half_z],
                    [x1, y0, half_z],
                    [x0, y0, half_z],
                    [0.0, -1.0, 0.0],
                    [u0, v1],
                    [u1, v1],
                    [u1, v1],
                    [u0, v1],
                    color,
                );
            }
        }
    }

    OpenPets3dMesh {
        positions,
        normals,
        uvs,
        colors,
        indices,
        voxel_count,
    }
}

/// Serializes an `OpenPets3dMesh` and optional embedded PNG texture bytes into a standards-compliant
/// binary **glTF 2.0 `.glb`** container (`0x46546C67` header + JSON chunk + BIN chunk).
pub fn export_mesh_to_glb(mesh: &OpenPets3dMesh, png_bytes: Option<&[u8]>) -> Vec<u8> {
    let mut bin_chunk = Vec::<u8>::new();
    let pad4 = |buf: &mut Vec<u8>, pad_byte: u8| {
        while !buf.len().is_multiple_of(4) {
            buf.push(pad_byte);
        }
    };

    // 0. Indices (u32 SCALAR)
    let indices_offset = bin_chunk.len();
    for &idx in &mesh.indices {
        bin_chunk.extend_from_slice(&idx.to_le_bytes());
    }
    let indices_len = bin_chunk.len() - indices_offset;
    pad4(&mut bin_chunk, 0);

    // 1. Positions (f32 VEC3) + min/max bounds
    let pos_offset = bin_chunk.len();
    let mut min_pos = [f32::MAX, f32::MAX, f32::MAX];
    let mut max_pos = [f32::MIN, f32::MIN, f32::MIN];
    for p in &mesh.positions {
        for i in 0..3 {
            min_pos[i] = min_pos[i].min(p[i]);
            max_pos[i] = max_pos[i].max(p[i]);
            bin_chunk.extend_from_slice(&p[i].to_le_bytes());
        }
    }
    if mesh.positions.is_empty() {
        min_pos = [0.0, 0.0, 0.0];
        max_pos = [0.0, 0.0, 0.0];
    }
    let pos_len = bin_chunk.len() - pos_offset;
    pad4(&mut bin_chunk, 0);

    // 2. Normals (f32 VEC3)
    let norm_offset = bin_chunk.len();
    for n in &mesh.normals {
        for c in n {
            bin_chunk.extend_from_slice(&c.to_le_bytes());
        }
    }
    let norm_len = bin_chunk.len() - norm_offset;
    pad4(&mut bin_chunk, 0);

    // 3. UVs (f32 VEC2)
    let uv_offset = bin_chunk.len();
    for uv in &mesh.uvs {
        for c in uv {
            bin_chunk.extend_from_slice(&c.to_le_bytes());
        }
    }
    let uv_len = bin_chunk.len() - uv_offset;
    pad4(&mut bin_chunk, 0);

    // 4. Colors (f32 VEC4)
    let col_offset = bin_chunk.len();
    for col in &mesh.colors {
        for c in col {
            bin_chunk.extend_from_slice(&c.to_le_bytes());
        }
    }
    let col_len = bin_chunk.len() - col_offset;
    pad4(&mut bin_chunk, 0);

    // 5. Optional PNG image bufferView
    let mut buffer_views = vec![
        serde_json::json!({ "buffer": 0, "byteOffset": indices_offset, "byteLength": indices_len, "target": 34963 }),
        serde_json::json!({ "buffer": 0, "byteOffset": pos_offset, "byteLength": pos_len, "target": 34962 }),
        serde_json::json!({ "buffer": 0, "byteOffset": norm_offset, "byteLength": norm_len, "target": 34962 }),
        serde_json::json!({ "buffer": 0, "byteOffset": uv_offset, "byteLength": uv_len, "target": 34962 }),
        serde_json::json!({ "buffer": 0, "byteOffset": col_offset, "byteLength": col_len, "target": 34962 }),
    ];

    let mut gltf_json = serde_json::json!({
        "asset": {
            "version": "2.0",
            "generator": "OpenPets-3D-Plugin (gfx-rs/wgpu + PNG-to-GLB)"
        },
        "scene": 0,
        "scenes": [{ "nodes": [0] }],
        "nodes": [{ "name": "OpenPets3DCompanion", "mesh": 0 }],
        "meshes": [{
            "name": "ExtrudedSpriteMesh",
            "primitives": [{
                "attributes": {
                    "POSITION": 1,
                    "NORMAL": 2,
                    "TEXCOORD_0": 3,
                    "COLOR_0": 4
                },
                "indices": 0,
                "material": 0
            }]
        }],
        "accessors": [
            { "bufferView": 0, "componentType": 5125, "count": mesh.indices.len(), "type": "SCALAR" },
            { "bufferView": 1, "componentType": 5126, "count": mesh.positions.len(), "type": "VEC3", "min": min_pos, "max": max_pos },
            { "bufferView": 2, "componentType": 5126, "count": mesh.normals.len(), "type": "VEC3" },
            { "bufferView": 3, "componentType": 5126, "count": mesh.uvs.len(), "type": "VEC2" },
            { "bufferView": 4, "componentType": 5126, "count": mesh.colors.len(), "type": "VEC4" }
        ]
    });

    if let Some(png) = png_bytes.filter(|b| !b.is_empty()) {
        let img_offset = bin_chunk.len();
        bin_chunk.extend_from_slice(png);
        let img_len = png.len();
        pad4(&mut bin_chunk, 0);
        buffer_views.push(serde_json::json!({
            "buffer": 0,
            "byteOffset": img_offset,
            "byteLength": img_len
        }));
        gltf_json["images"] = serde_json::json!([{
            "bufferView": 5,
            "mimeType": "image/png"
        }]);
        gltf_json["samplers"] = serde_json::json!([{
            "magFilter": 9728,
            "minFilter": 9728,
            "wrapS": 33071,
            "wrapT": 33071
        }]);
        gltf_json["textures"] = serde_json::json!([{
            "sampler": 0,
            "source": 0
        }]);
        gltf_json["materials"] = serde_json::json!([{
            "name": "OpenPetsPixelMaterial",
            "alphaMode": "MASK",
            "alphaCutoff": 0.05,
            "doubleSided": true,
            "pbrMetallicRoughness": {
                "baseColorTexture": { "index": 0 },
                "metallicFactor": 0.08,
                "roughnessFactor": 0.62
            }
        }]);
    } else {
        gltf_json["materials"] = serde_json::json!([{
            "name": "OpenPetsVertexColorMaterial",
            "doubleSided": true,
            "pbrMetallicRoughness": {
                "metallicFactor": 0.08,
                "roughnessFactor": 0.62
            }
        }]);
    }

    gltf_json["bufferViews"] = serde_json::Value::Array(buffer_views);
    gltf_json["buffers"] = serde_json::json!([{ "byteLength": bin_chunk.len() }]);

    let mut json_bytes = serde_json::to_vec(&gltf_json).unwrap_or_default();
    pad4(&mut json_bytes, 0x20); // JSON chunk padded with spaces (0x20)

    let total_len = 12 + 8 + json_bytes.len() + 8 + bin_chunk.len();
    let mut glb = Vec::with_capacity(total_len);
    glb.extend_from_slice(&GLTF_MAGIC.to_le_bytes());
    glb.extend_from_slice(&GLTF_VERSION.to_le_bytes());
    glb.extend_from_slice(&(total_len as u32).to_le_bytes());

    glb.extend_from_slice(&(json_bytes.len() as u32).to_le_bytes());
    glb.extend_from_slice(&GLTF_CHUNK_JSON.to_le_bytes());
    glb.extend_from_slice(&json_bytes);

    glb.extend_from_slice(&(bin_chunk.len() as u32).to_le_bytes());
    glb.extend_from_slice(&GLTF_CHUNK_BIN.to_le_bytes());
    glb.extend_from_slice(&bin_chunk);
    glb
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_openpets_3d_plugin_extrude_and_glb_export() {
        assert!(OPENPETS_3D_WGPU_SHADER_WGSL.contains("@vertex"));
        assert!(OPENPETS_3D_WGPU_SHADER_WGSL.contains("textureSample(pet_texture, pet_sampler"));

        // 4x4 RGBA sprite with a 2x2 opaque center
        let mut rgba = vec![0u8; 4 * 4 * 4];
        for y in 1..3 {
            for x in 1..3 {
                let idx = (y * 4 + x) * 4;
                rgba[idx] = 78;
                rgba[idx + 1] = 205;
                rgba[idx + 2] = 120;
                rgba[idx + 3] = 255;
            }
        }
        let cfg = OpenPets3dExtrudeConfig {
            depth: 0.16,
            alpha_threshold: 20,
            sample_step: 1,
        };
        let mesh = extrude_rgba_to_3d_mesh(&rgba, 4, 4, &cfg);
        assert_eq!(mesh.voxel_count, 4);
        assert!(!mesh.positions.is_empty());
        assert_eq!(mesh.positions.len(), mesh.normals.len());
        assert_eq!(mesh.positions.len(), mesh.uvs.len());

        let fake_png = b"\x89PNG\r\n\x1a\n";
        let glb = export_mesh_to_glb(&mesh, Some(fake_png));
        assert!(glb.len() > 64);
        assert_eq!(&glb[0..4], b"glTF");
        let version = u32::from_le_bytes([glb[4], glb[5], glb[6], glb[7]]);
        let declared_len = u32::from_le_bytes([glb[8], glb[9], glb[10], glb[11]]) as usize;
        assert_eq!(version, 2);
        assert_eq!(declared_len, glb.len());
    }

    #[test]
    fn test_mochi_bond_progression_and_emotes() {
        assert_eq!(mochi_bond_xp_required(1), 480);
        assert_eq!(mochi_bond_xp_required(2), 570);
        assert_eq!(mochi_bond_xp_required(5), 660);

        let mut bond = MochiBondState::default();
        assert_eq!(bond.phase(), MochiBondPhase::Fresh);
        let gained = bond.award_xp(480);
        assert_eq!(gained, 1);
        assert_eq!(bond.level, 2);
        assert_eq!(bond.xp, 0);

        let emotes = default_mochi_emote_catalogue();
        assert_eq!(emotes.len(), 12);
        assert_eq!(emotes[0].id, "heart");
        assert_eq!(emotes[11].id, "mochi-exe");
    }

    #[test]
    fn test_framing_protocol_round_trip() {
        let mut buf = Vec::new();
        let len = 9u32;
        buf.extend_from_slice(&len.to_le_bytes());
        buf.push(TAG_MOVE);
        buf.extend_from_slice(&420i32.to_le_bytes());
        buf.extend_from_slice(&180i32.to_le_bytes());

        let mut cursor = std::io::Cursor::new(buf);
        let msg = read_message(&mut cursor).unwrap().unwrap();
        assert_eq!(msg, Message::Move { x: 420, y: 180 });
    }

    #[test]
    fn test_reaction_sprite_mapping_and_care_engine() {
        assert_eq!(
            resolve_reaction_sprite_state(OpenPetsReaction::Thinking),
            UniversalSpriteState::Review
        );
        assert_eq!(
            resolve_reaction_sprite_state(OpenPetsReaction::Celebrating),
            UniversalSpriteState::Jumping
        );

        let mut care = GeminiPetCareState::default();
        assert_eq!(care.mood, GeminiPetMood::Happy);
        care.feed();
        assert_eq!(care.hunger, 100.0);
        care.play();
        assert_eq!(care.reaction, OpenPetsReaction::Celebrating);
    }

    #[test]
    fn test_throw_physics_bounces_and_settles() {
        let mut state = ThrowState {
            x: 100.0,
            y: 50.0,
            vx: 600.0,
            vy: -200.0,
            resting: false,
            bounced_x: false,
            bounced_y: false,
        };
        let bounds = ThrowBounds {
            min_x: 0.0,
            max_x: 300.0,
            min_y: 0.0,
            max_y: 200.0,
        };
        let opts = ThrowOptions::default();
        let mut hit_wall = false;
        for _ in 0..300 {
            state = step_throw(state, bounds, 1.0 / 60.0, opts);
            if state.bounced_x {
                hit_wall = true;
            }
            if state.resting {
                break;
            }
        }
        assert!(hit_wall);
        assert!(state.resting);
        assert_eq!(state.y, bounds.max_y);
    }
}
