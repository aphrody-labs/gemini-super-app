//! Antigravity Mic Bridge TCP client/server primitives (`127.0.0.1:24713`)

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use voice_dsp::compute_pcm16_rms;

pub const DEFAULT_MIC_ADDR: &str = "127.0.0.1:24713";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MicStreamConfig {
    pub tcp_addr: String,
    pub sample_rate_hz: u32,
    pub channels: u16,
    pub bits_per_sample: u16,
    pub bytes_per_sec: u32,
}

impl Default for MicStreamConfig {
    fn default() -> Self {
        Self {
            tcp_addr: DEFAULT_MIC_ADDR.to_string(),
            sample_rate_hz: 16_000,
            channels: 1,
            bits_per_sample: 16,
            bytes_per_sec: 32_000,
        }
    }
}

pub struct MicClient {
    stream: TcpStream,
}

impl MicClient {
    pub async fn connect(addr: &str) -> Result<Self> {
        let stream = TcpStream::connect(addr).await?;
        Ok(Self { stream })
    }

    pub async fn read_chunk(&mut self, buf: &mut [u8]) -> Result<usize> {
        let n = self.stream.read(buf).await?;
        Ok(n)
    }

    pub async fn write_pcm(&mut self, pcm_bytes: &[u8]) -> Result<()> {
        self.stream.write_all(pcm_bytes).await?;
        Ok(())
    }
}

pub fn analyze_mic_chunk(bytes: &[u8]) -> (f32, bool) {
    let rms = compute_pcm16_rms(bytes);
    let is_speech = rms > 0.025;
    (rms, is_speech)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_mic_chunk() {
        let silence = vec![0u8; 1024];
        let (rms, speech) = analyze_mic_chunk(&silence);
        assert_eq!(rms, 0.0);
        assert!(!speech);
        let cfg = MicStreamConfig::default();
        assert_eq!(cfg.bytes_per_sec, 32_000);
    }
}
