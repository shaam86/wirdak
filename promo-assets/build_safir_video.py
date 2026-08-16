# -*- coding: utf-8 -*-
"""Build the 9:16 Safir Arabic promo video from storyboard frames."""
from __future__ import annotations

from pathlib import Path

import arabic_reshaper
import numpy as np
from bidi.algorithm import get_display
from moviepy import (
    ColorClip,
    CompositeVideoClip,
    ImageClip,
    concatenate_videoclips,
    vfx,
)
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ASSETS = Path(r"C:\Users\sham1\.cursor\projects\c-Users-sham1-noor-app\assets")
OUT_DIR = Path(r"C:\Users\sham1\noor-app\promo-assets")
OUT = OUT_DIR / "safir-ad-ar-9x16.mp4"
W, H, FPS = 1080, 1920, 30
NAVY = (7, 18, 31)
CYAN = (62, 200, 255)
WHITE = (255, 255, 255)
FONT_REG = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")
XFADE = 0.4

SCENES = [
    ("safir-video-01-chaos.png", 6.0),
    ("safir-video-02-transform.png", 4.0),
    ("safir-video-03-center.png", 6.0),
    ("safir-video-04-transfers.png", 5.0),
    ("safir-video-05-currencies.png", 5.0),
    ("safir-video-06-flights.png", 4.0),
    ("safir-video-07-reports-security.png", 5.0),
    ("safir-video-08-finale.png", 10.0),
]

# start, duration, title, subtitle (subtitle may be empty)
CAPTIONS = [
    (0.4, 5.4, "هل ما زالت إدارة أعمالك المالية معقدة؟", ""),
    (6.2, 3.6, "حان وقت السيطرة.", ""),
    (10.4, 5.4, "كل أعمالك المالية… في مكان واحد.", ""),
    (16.3, 4.5, "إدارة الحوالات بدقة وسرعة", ""),
    (21.3, 4.5, "عملات متعددة… وحسابات أوضح.", ""),
    (26.3, 3.6, "الحوالات والطيران والفيز… تحت سيطرتك.", ""),
    (30.3, 4.5, "تقارير فورية. صلاحيات واضحة. حماية قوية.", ""),
    (35.4, 4.4, "سافير المحاسبي", "إدارة أذكى لأعمالك المالية"),
    (40.0, 2.0, "إدارة أذكى لأعمالك المالية", ""),
    (42.1, 2.7, "حمّل سافير الآن", "Microsoft Store"),
]


def ar(text: str) -> str:
    if not text:
        return ""
    return get_display(arabic_reshaper.reshape(text))


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    im = im.convert("RGB")
    scale = max(w / im.width, h / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return im.crop((left, top, left + w, top + h))


def wrap_ar(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines, cur = [], words[0]
    for word in words[1:]:
        trial = f"{cur} {word}"
        if draw.textlength(ar(trial), font=font) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def caption_png(title: str, subtitle: str) -> np.ndarray:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(overlay)
    d0.rectangle((0, int(H * 0.72), W, H), fill=(7, 18, 31, 170))
    overlay = overlay.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(str(FONT_BOLD), 54)
    sub_font = ImageFont.truetype(str(FONT_REG), 36)
    max_w = W - 120
    title_lines = wrap_ar(draw, title, title_font, max_w)
    y = 1480 if not subtitle else 1420
    for line in title_lines:
        shaped = ar(line)
        tw = draw.textlength(shaped, font=title_font)
        x = (W - tw) / 2
        for dx, dy in ((2, 2), (0, 2), (2, 0)):
            draw.text((x + dx, y + dy), shaped, font=title_font, fill=(0, 0, 0, 160))
        draw.text((x, y), shaped, font=title_font, fill=WHITE + (255,))
        y += 70
    if subtitle:
        shaped = ar(subtitle) if any("\u0600" <= c <= "\u06FF" for c in subtitle) else subtitle
        font = sub_font
        tw = draw.textlength(shaped, font=font)
        x = (W - tw) / 2
        draw.text((x, y + 8), shaped, font=font, fill=CYAN + (255,))
    return np.array(img)


def ken_burns(path: Path, duration: float, zoom_in: bool) -> CompositeVideoClip:
    src = cover(Image.open(path), W, H)
    big = cover(src, int(W * 1.14), int(H * 1.14))
    arr = np.array(big)
    raw = ImageClip(arr).with_duration(duration)

    def scaler(t):
        p = min(max(t / duration, 0), 1)
        return 1.0 + 0.10 * (p if zoom_in else (1 - p))

    moving = raw.resized(scaler).with_position("center")
    bg = ColorClip(size=(W, H), color=NAVY).with_duration(duration)
    return CompositeVideoClip([bg, moving], size=(W, H)).with_duration(duration)


def build() -> None:
    visuals = []
    for i, (name, dur) in enumerate(SCENES):
        path = ASSETS / name
        if not path.exists():
            raise FileNotFoundError(path)
        clip = ken_burns(path, dur, zoom_in=(i % 2 == 0))
        if i > 0:
            clip = clip.with_effects([vfx.CrossFadeIn(XFADE)])
        visuals.append(clip)

    base = concatenate_videoclips(visuals, method="compose", padding=-XFADE)
    overlays = [base]
    for start, dur, title, subtitle in CAPTIONS:
        png = caption_png(title, subtitle)
        overlays.append(
            ImageClip(png, transparent=True)
            .with_duration(dur)
            .with_start(start)
            .with_effects([vfx.CrossFadeIn(0.18), vfx.CrossFadeOut(0.18)])
        )
    final = CompositeVideoClip(overlays, size=(W, H)).with_duration(base.duration)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    final.write_videofile(
        str(OUT),
        fps=FPS,
        codec="libx264",
        audio=False,
        preset="medium",
        threads=4,
        ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    )


if __name__ == "__main__":
    build()
