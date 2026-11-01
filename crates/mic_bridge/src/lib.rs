//! Antigravity Mic Bridge TCP client/server primitives

use anyhow::Result;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use voice_dsp::compute_pcm16_rms;

pub const DEFAULT_MIC_ADDR: &str = "127.0.0.1:24713";

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
    }
}
