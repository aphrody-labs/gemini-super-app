//! Consolidated Polaris Audio Engine (`vendor/polaris` -> `crates/polaris-audio`).
//!
//! Provides lossless music indexing, audio format detection (FLAC, MP3, Ogg Opus/Vorbis,
//! WAV, M4A/MP4), WAV/PCM waveform summarization via [`voice_dsp`], and smart playlists
//! for the Gemini Super App Music Hub.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use thiserror::Error;
use voice_dsp::{compute_rms, compute_spectrum_32, SpectrumFrame};

#[derive(Debug, Error)]
pub enum PolarisAudioError {
    #[error("I/O error reading audio file: {0}")]
    Io(#[from] std::io::Error),
    #[error("Unsupported audio extension: {0}")]
    UnsupportedFormat(String),
    #[error("WAV decode error: {0}")]
    WavError(#[from] hound::Error),
}

/// Supported lossless and lossy audio container formats in Polaris.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioCodecFormat {
    Flac,
    Mp3,
    Opus,
    Vorbis,
    Wav,
    Mp4Aac,
}

impl AudioCodecFormat {
    pub fn from_path(path: &Path) -> Option<Self> {
        let ext = path.extension()?.to_str()?.to_ascii_lowercase();
        match ext.as_str() {
            "flac" => Some(Self::Flac),
            "mp3" => Some(Self::Mp3),
            "opus" => Some(Self::Opus),
            "ogg" | "oga" => Some(Self::Vorbis),
            "wav" | "wave" => Some(Self::Wav),
            "m4a" | "mp4" | "aac" => Some(Self::Mp4Aac),
            _ => None,
        }
    }

    pub fn mime_type(&self) -> &'static str {
        match self {
            Self::Flac => "audio/flac",
            Self::Mp3 => "audio/mpeg",
            Self::Opus => "audio/opus",
            Self::Vorbis => "audio/ogg",
            Self::Wav => "audio/wav",
            Self::Mp4Aac => "audio/mp4",
        }
    }
}

/// Metadata and acoustic profile of an indexed Polaris audio track.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub path: String,
    pub format: AudioCodecFormat,
    pub sample_rate_hz: u32,
    pub channels: u16,
    pub duration_ms: u64,
    pub rms_energy: f32,
    pub spectrum_preview: Vec<f32>,
}

/// In-memory music library index with Gemini mood/energy search.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct PolarisLibraryIndex {
    pub tracks: Vec<IndexedTrack>,
}

impl PolarisLibraryIndex {
    pub fn new() -> Self {
        Self { tracks: Vec::new() }
    }

    pub fn add_track(&mut self, track: IndexedTrack) {
        if let Some(existing) = self.tracks.iter_mut().find(|t| t.id == track.id) {
            *existing = track;
        } else {
            self.tracks.push(track);
        }
    }

    pub fn search(&self, query: &str) -> Vec<&IndexedTrack> {
        let q = query.trim().to_ascii_lowercase();
        if q.is_empty() {
            return self.tracks.iter().collect();
        }
        self.tracks
            .iter()
            .filter(|t| {
                t.title.to_ascii_lowercase().contains(&q)
                    || t.artist.to_ascii_lowercase().contains(&q)
                    || t.album.to_ascii_lowercase().contains(&q)
            })
            .collect()
    }

    /// Analyze a 16-bit PCM WAV buffer or file and build an [`IndexedTrack`] with a 32-band FFT preview.
    pub fn analyze_pcm16_track(
        id: impl Into<String>,
        title: impl Into<String>,
        artist: impl Into<String>,
        album: impl Into<String>,
        path: impl Into<String>,
        format: AudioCodecFormat,
        samples: &[i16],
        sample_rate_hz: u32,
        channels: u16,
    ) -> IndexedTrack {
        let rms_energy = compute_rms(samples);
        let spectrum: SpectrumFrame = compute_spectrum_32(samples, sample_rate_hz);
        let total_frames = if channels > 0 {
            samples.len() as u64 / u64::from(channels)
        } else {
            samples.len() as u64
        };
        let duration_ms = if sample_rate_hz > 0 {
            (total_frames * 1000) / u64::from(sample_rate_hz)
        } else {
            0
        };
        IndexedTrack {
            id: id.into(),
            title: title.into(),
            artist: artist.into(),
            album: album.into(),
            path: path.into(),
            format,
            sample_rate_hz,
            channels,
            duration_ms,
            rms_energy,
            spectrum_preview: spectrum.bands,
        }
    }

    /// Scan a directory recursively for supported Polaris audio files.
    pub fn scan_directory(root: &Path) -> Result<Vec<PathBuf>, PolarisAudioError> {
        let mut results = Vec::new();
        if !root.exists() {
            return Ok(results);
        }
        let mut stack = vec![root.to_path_buf()];
        while let Some(dir) = stack.pop() {
            for entry in std::fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                } else if AudioCodecFormat::from_path(&path).is_some() {
                    results.push(path);
                }
            }
        }
        results.sort();
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_codec_detection_and_indexing() {
        assert_eq!(
            AudioCodecFormat::from_path(Path::new("song.flac")),
            Some(AudioCodecFormat::Flac)
        );
        assert_eq!(
            AudioCodecFormat::from_path(Path::new("voice.opus")),
            Some(AudioCodecFormat::Opus)
        );
        assert_eq!(AudioCodecFormat::from_path(Path::new("notes.txt")), None);

        let samples: Vec<i16> = (0..1600)
            .map(|i| ((i as f32 * 0.15).sin() * 12000.0) as i16)
            .collect();
        let track = PolarisLibraryIndex::analyze_pcm16_track(
            "trk-01",
            "Gemini Aurora",
            "Lyria Ensemble",
            "Antigravity Sessions",
            "/music/gemini_aurora.flac",
            AudioCodecFormat::Flac,
            &samples,
            16_000,
            1,
        );
        assert_eq!(track.duration_ms, 100);
        assert_eq!(track.spectrum_preview.len(), 32);
        assert!(track.rms_energy > 0.1);

        let mut index = PolarisLibraryIndex::new();
        index.add_track(track);
        assert_eq!(index.search("lyria").len(), 1);
        assert_eq!(index.search("nonexistent").len(), 0);
    }
}
