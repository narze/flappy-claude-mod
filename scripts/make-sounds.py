"""Synthesizes sounds/flap.wav: a short rising chirp (no samples, no license)."""
import math
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / "sounds" / "flap.wav"


def flap() -> list[float]:
    length = int(RATE * 0.09)
    samples = []
    phase = 0.0
    for i in range(length):
        t = i / length
        freq = 520 + 620 * t  # sweep up, like a wing beat
        phase += 2 * math.pi * freq / RATE
        envelope = min(1.0, i / (RATE * 0.004)) * math.exp(-4.5 * t)
        samples.append(0.45 * envelope * (math.sin(phase) + 0.25 * math.sin(2 * phase)))
    return samples


def write(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32767)) for s in samples))


if __name__ == "__main__":
    write(OUT, flap())
    print(OUT)
