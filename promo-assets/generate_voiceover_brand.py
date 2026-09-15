# -*- coding: utf-8 -*-
"""Generate brand-film fusHa VO — more natural male Arabic + light studio polish."""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parent / "audio-brand"
# Hamdan tends to sound warmer/more conversational for MSA marketing
VOICE = "ar-AE-HamdanNeural"
RATE = "-3%"
PITCH = "-1Hz"

SEGMENTS = [
    (
        "01",
        "عندما يتسع نطاق عملك، تزداد العمليات، وتصبح الحاجة إلى نظام يحافظ على تنظيم حساباتك أكثر أهمية.",
    ),
    (
        "02",
        "مع سافير المحاسبي، سجّل وتابع الحوالات الصادرة والواردة، بكل تفاصيلها، من خلال نظام واحد.",
    ),
    (
        "03",
        "وتابع حسابات العملاء والوكلاء والصناديق والأرصدة، لتعرف موقفك المالي بوضوح وفي الوقت المناسب.",
    ),
    (
        "04",
        "وتعامل مع العملات المختلفة بمرونة، دون الحاجة إلى التنقل بين الملفات والحسابات المتفرقة.",
    ),
    (
        "05",
        "وإذا كان نشاطك يشمل حجوزات الطيران والتأشيرات، فتابع بياناتها وحالاتها من المنظومة نفسها.",
    ),
    (
        "06",
        "وفي ثوانٍ، استخرج كشوف الحسابات والتقارير والفواتير، بصيغ جاهزة للاستخدام والمشاركة.",
    ),
    (
        "07",
        "فلست بحاجة إلى متابعة كل عملية بنفسك، عندما تمتلك نظامًا يمنحك وضوحًا وتنظيمًا أكبر.",
    ),
    (
        "08",
        "سافير المحاسبي… لتنظيم حساباتك وتسهيل إدارة أعمالك. متاح باشتراكات سنوية… اختر باقتك، وابدأ باحتراف.",
    ),
]


def polish(wav_in: Path, wav_out: Path) -> None:
    """Make TTS closer to a recorded studio VO: warmth, presence, soft room."""
    # highpass remove rumble, lowpass tame harshness, mild EQ + compression + tiny room
    af = (
        "highpass=f=80,"
        "lowpass=f=10500,"
        "equalizer=f=180:t=q:w=1.0:g=2.5,"
        "equalizer=f=3200:t=q:w=1.2:g=1.8,"
        "equalizer=f=6500:t=q:w=1.0:g=-2.5,"
        "acompressor=threshold=-18dB:ratio=2.8:attack=12:release=120:makeup=2,"
        "aecho=0.8:0.7:28:0.12,"
        "loudnorm=I=-16:TP=-1.5:LRA=11"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav_in),
            "-af",
            af,
            "-ar",
            "48000",
            "-ac",
            "1",
            str(wav_out),
        ],
        check=True,
        capture_output=True,
    )


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in SEGMENTS:
        mp3 = OUT / f"vo-{name}.mp3"
        raw = OUT / f"vo-{name}-raw.wav"
        wav = OUT / f"vo-{name}.wav"
        await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(str(mp3))
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(mp3), "-ar", "48000", "-ac", "1", str(raw)],
            check=True,
            capture_output=True,
        )
        polish(raw, wav)
        raw.unlink(missing_ok=True)
        print("OK", name, VOICE)


if __name__ == "__main__":
    asyncio.run(main())
