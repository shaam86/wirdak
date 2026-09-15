# -*- coding: utf-8 -*-
"""Generate Arabic fusHa voiceover segments with edge-tts."""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parent / "audio"
VOICE = "ar-SA-HamedNeural"
RATE = "-5%"

SEGMENTS = [
    ("01", "عندما يتوسّع عملك… تزداد العمليات، ويجب أن تبقى الحسابات تحت السيطرة."),
    ("02", "مع سافير المحاسبي، سجّل الحوالات الصادرة والواردة وتابعها بكل تفاصيلها من مكان واحد."),
    ("03", "تابع حسابات العملاء والوكلاء والصناديق، واعرف موقفك المالي في لحظته."),
    ("04", "وتعامل مع العملات المختلفة بمرونة، دون أن تضيع وقتك بين ملفات وحسابات متفرقة."),
    ("05", "وإن كان عملك مرتبطاً بحجوزات الطيران والفيزا، فتابع الحالات والتغييرات من المنظومة نفسها."),
    ("06", "وفي ثوانٍ… استخرج كشوف الحسابات والتقارير والفواتير بصيغ جاهزة للاستخدام."),
    ("07", "فلست بحاجة إلى متابعة كل عملية بنفسك… حين يكون لديك نظام يمنحك وضوحاً أكبر."),
    (
        "08",
        "سافير المحاسبي… حسابات منظّمة، وعمليات أوضح، وإدارة أسهل. حمّله الآن، وابدأ إدارة عملك باحتراف.",
    ),
]


async def synth(name: str, text: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    mp3 = OUT / f"vo-{name}.mp3"
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(mp3))
    return mp3


async def main() -> None:
    paths = []
    for name, text in SEGMENTS:
        path = await synth(name, text)
        paths.append(path)
        print(f"OK {path.name}")

    # Concatenate to one timeline-ready WAV with small gaps
    list_file = OUT / "concat.txt"
    wavs = []
    for p in paths:
        wav = p.with_suffix(".wav")
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(p), "-ar", "44100", "-ac", "1", str(wav)],
            check=True,
            capture_output=True,
        )
        wavs.append(wav)

    # Build padded full mix later in build script; also write raw concat for preview
    with list_file.open("w", encoding="utf-8") as f:
        for w in wavs:
            f.write(f"file '{w.name}'\n")
            # 0.35s silence between segments
            sil = OUT / f"sil-{w.stem}.wav"
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-f",
                    "lavfi",
                    "-i",
                    "anullsrc=r=44100:cl=mono",
                    "-t",
                    "0.35",
                    str(sil),
                ],
                check=True,
                capture_output=True,
            )
            f.write(f"file '{sil.name}'\n")

    full = OUT / "vo-full.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c",
            "copy",
            str(full),
        ],
        check=True,
        capture_output=True,
        cwd=str(OUT),
    )
    print(f"FULL {full}")


if __name__ == "__main__":
    asyncio.run(main())
