# -*- coding: utf-8 -*-
"""Generate brand-film fusHa VO (~60s)."""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parent / "audio-brand"
VOICE = "ar-SA-HamedNeural"
RATE = "-5%"

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


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in SEGMENTS:
        mp3 = OUT / f"vo-{name}.mp3"
        await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(mp3))
        wav = OUT / f"vo-{name}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(mp3), "-ar", "44100", "-ac", "1", str(wav)],
            check=True,
            capture_output=True,
        )
        print("OK", name)


if __name__ == "__main__":
    asyncio.run(main())
