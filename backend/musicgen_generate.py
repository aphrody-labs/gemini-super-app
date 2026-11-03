"""Generate one MusicGen WAV using a preinstalled AudioCraft environment."""
import json
import sys
import wave
from pathlib import Path


def main() -> None:
    request = json.load(sys.stdin)
    from audiocraft.models import MusicGen

    model = MusicGen.get_pretrained(request["model"])
    model.set_generation_params(duration=request["durationSec"])
    waveform = model.generate([request["prompt"]])[0].detach().cpu().clamp(-1, 1)
    channels = waveform.shape[0]
    samples = (waveform.transpose(0, 1).contiguous().numpy() * 32767).astype("<i2")
    path = Path(request["output"])
    with wave.open(str(path), "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(2)
        output.setframerate(model.sample_rate)
        output.writeframes(samples.tobytes())


if __name__ == "__main__":
    main()
