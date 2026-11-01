//! Consolidated Awesome-Rust Audio & Music Registry (`vendor/awesome-rust#audio-and-music` -> `crates/awesome-rust-audio`).
//!
//! Parses the `#audio-and-music` and `#google-gemini` sections from `vendor/awesome-rust/README.md`
//! and exposes structured metadata for the Gemini Super App's Rust Audio Ecosystem Explorer.

use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RustAudioCrateEntry {
    pub name: String,
    pub url: String,
    pub crates_io_badge: Option<String>,
    pub description: String,
    pub category: String,
    pub integrated_in_super_app: bool,
}

/// Crates directly integrated inside the consolidated Gemini Super App workspace.
const INTEGRATED_CRATES: &[&str] = &[
    "cpal",
    "symphonia",
    "hound",
    "rubato",
    "rodio",
    "polaris",
    "flowcat",
    "rustfft",
];

/// Parse Markdown list items under `### Audio and Music` and `#### Google Gemini` from `awesome-rust/README.md`.
pub fn parse_awesome_rust_audio_markdown(markdown: &str) -> Vec<RustAudioCrateEntry> {
    let mut entries = Vec::new();
    let mut current_section = Option::<String>::None;

    for line in markdown.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("### Audio and Music") {
            current_section = Some("Audio and Music".to_string());
            continue;
        } else if trimmed.starts_with("#### Google Gemini") {
            current_section = Some("Google Gemini".to_string());
            continue;
        } else if trimmed.starts_with("## ") || trimmed.starts_with("### ") || trimmed.starts_with("#### ") {
            if current_section.is_some() {
                current_section = None;
            }
        }

        if let Some(section) = &current_section {
            if let Some(rest) = trimmed.strip_prefix("* [") {
                if let Some((name, after_name)) = rest.split_once("](") {
                    if let Some((url, after_url)) = after_name.split_once(')') {
                        let description = after_url
                            .split(" - ")
                            .nth(1)
                            .unwrap_or(after_url)
                            .trim()
                            .trim_start_matches('-')
                            .trim()
                            .to_string();
                        let lower_name = name.to_ascii_lowercase();
                        let integrated = INTEGRATED_CRATES
                            .iter()
                            .any(|&c| lower_name.contains(c));
                        entries.push(RustAudioCrateEntry {
                            name: name.to_string(),
                            url: url.to_string(),
                            crates_io_badge: Some(format!("https://crates.io/crates/{lower_name}")),
                            description,
                            category: section.clone(),
                            integrated_in_super_app: integrated,
                        });
                    }
                }
            }
        }
    }

    entries
}

/// Load and parse the live `vendor/awesome-rust/README.md` file if present, falling back to curated defaults.
pub fn load_awesome_rust_audio_catalog(repo_root: &Path) -> Vec<RustAudioCrateEntry> {
    let readme_path = repo_root.join("vendor/awesome-rust/README.md");
    if let Ok(content) = std::fs::read_to_string(&readme_path) {
        let parsed = parse_awesome_rust_audio_markdown(&content);
        if !parsed.is_empty() {
            return parsed;
        }
    }
    vec![
        RustAudioCrateEntry {
            name: "CPAL".to_string(),
            url: "https://github.com/RustAudio/cpal".to_string(),
            crates_io_badge: Some("https://crates.io/crates/cpal".to_string()),
            description: "Low-level cross-platform audio I/O library in pure Rust.".to_string(),
            category: "Audio and Music".to_string(),
            integrated_in_super_app: true,
        },
        RustAudioCrateEntry {
            name: "Symphonia".to_string(),
            url: "https://github.com/pdeljanov/Symphonia".to_string(),
            crates_io_badge: Some("https://crates.io/crates/symphonia".to_string()),
            description: "Pure Rust multimedia format demuxing, tag reading, and audio decoding.".to_string(),
            category: "Audio and Music".to_string(),
            integrated_in_super_app: true,
        },
        RustAudioCrateEntry {
            name: "Polaris".to_string(),
            url: "https://github.com/agersant/polaris".to_string(),
            crates_io_badge: Some("https://crates.io/crates/polaris".to_string()),
            description: "Music streaming application in Rust.".to_string(),
            category: "Audio and Music".to_string(),
            integrated_in_super_app: true,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_awesome_rust_audio_section() {
        let sample = r#"
### Audio and Music

* [CPAL](https://github.com/RustAudio/cpal) - Low-level cross-platform audio I/O library in pure Rust.
* [Symphonia](https://github.com/pdeljanov/Symphonia) - Pure Rust audio decoding library.
* [Polaris](https://github.com/agersant/polaris) - Music streaming server.

#### Google Gemini

* [gemini-rust](https://github.com/tontinton/gemini-rust) - Rust client library for Google Gemini API.
"#;
        let items = parse_awesome_rust_audio_markdown(sample);
        assert_eq!(items.len(), 4);
        assert_eq!(items[0].name, "CPAL");
        assert!(items[0].integrated_in_super_app);
        assert_eq!(items[3].category, "Google Gemini");
    }
}
