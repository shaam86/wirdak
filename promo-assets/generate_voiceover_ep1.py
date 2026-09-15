# -*- coding: utf-8 -*-
"""Generate shorter episode-1 fusHa VO to fit ~55s."""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parent / "audio-ep1"
VOICE = "ar-SA-HamedNeural"
RATE = "-5%"

# Tight fusHa lines sized for scene durations
SEGMENTS = [
    (
        "01",
        "لكي تبدأ باحتراف، قدّم طلب انضمام من شاشة الدخول في سافير المحاسبي، وأدخل بيانات شركتك بأمان.",
    ),
    (
        "02",
        "ثم اضبط من إعدادات النظام عملتك الأساسية، وبيانات شركتك، وصلاحيات الموظفين… لحماية بياناتك.",
    ),
    (
        "03",
        "بعدها انتقل إلى إدارة العملاء، وابنِ قاعدة وكلائك وعملائك بسهولة وتنظيم.",
    ),
    (
        "04",
        "وأدخل الأرصدة الافتتاحية بمرونة: دائن للعميل، أو مدين عليه… بدقة من اليوم الأول.",
    ),
    (
        "05",
        "بضغطة واحدة تُثبَّت الأرقام في الميزانية ودفتر الحسابات… جاهزة وخالية من الأخطاء.",
    ),
    (
        "06",
        "سافير المحاسبي يرسم لك الطريق خطوة بخطوة. انتظرونا في الحلقة القادمة، وحمّله الآن.",
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
        print(name, text[:40], "...")


if __name__ == "__main__":
    asyncio.run(main())
