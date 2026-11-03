use std::io::{self, Read};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let rate: u32 = std::env::args()
        .nth(1)
        .ok_or("missing sample rate")?
        .parse()?;
    if !(8_000..=192_000).contains(&rate) {
        return Err("invalid sample rate".into());
    }
    let mut bytes = Vec::new();
    io::stdin()
        .take(8 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() > 8 * 1024 * 1024 || bytes.len() % 2 != 0 {
        return Err("invalid PCM length".into());
    }
    let samples: Vec<i16> = bytes
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();
    let spectrum = voice_dsp::compute_spectrum_32(&samples, rate);
    println!("{}", serde_json::to_string(&spectrum)?);
    Ok(())
}
