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

#[cfg(test)]
mod tests {
    use super::*;

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
