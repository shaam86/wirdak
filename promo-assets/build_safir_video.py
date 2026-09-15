# -*- coding: utf-8 -*-
"""Build the 9:16 Safir Arabic fusHa promo video (~60s) with VO."""
from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np
from moviepy import (
    AudioFileClip,
    ColorClip,
    CompositeAudioClip,
    CompositeVideoClip,
    ImageClip,
    concatenate_videoclips,
    vfx,
)
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
AUDIO = ROOT / "audio"
OUT = ROOT / "safir-ad-ar-9x16.mp4"
W, H, FPS = 1080, 1920, 30
NAVY = (7, 18, 31)
CYAN = (62, 200, 255)
WHITE = (255, 255, 255)
FONT_REG = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf")

SCENES = [
    ("01-chaos.png", 7.0),
    ("02-transfer.png", 7.0),
    ("03-dashboard.png", 7.0),
    ("04-currencies.png", 7.0),
    ("05-flights.png", 8.0),
    ("06-reports.png", 8.0),
    ("07-remote.png", 8.0),
    ("08-finale.png", 8.0),
]

CAPTION_TEXTS = [
    ("عندما يتوسع العمل.. تزداد التفاصيل.", ""),
    ("الحوالات.. بكل تفاصيلها في مكان واحد.", ""),
    ("عملاؤك ووكلاؤك وصناديقك.. تحت عينك.", ""),
    ("عملات متعددة.. بمرونة ودقة.", ""),
    ("الطيران والفيزا.. من المنظومة نفسها.", ""),
    ("تقارير وكشوفات وفواتير.. في ثوان.", ""),
    ("راقب عملك.. من أي مكان.", ""),
    ("سافير المحاسبي", "حمّله الآن من المتاجر"),
]


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    im = im.convert("RGB")
    scale = max(w / im.width, h / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return im.crop((left, top, left + w, top + h))


def wrap_ar(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    # Noto Arabic is shaped by FreeType; do NOT apply bidi/reshaper (it reverses).
    words = text.split()
    if not words:
        return []
    lines, cur = [], words[0]
    for word in words[1:]:
        trial = f"{cur} {word}"
        if draw.textlength(trial, font=font) <= max_w:
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
    d0.rectangle((0, int(H * 0.70), W, H), fill=(7, 18, 31, 175))
    overlay = overlay.filter(ImageFilter.GaussianBlur(16))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(str(FONT_BOLD), 52)
    sub_font = ImageFont.truetype(str(FONT_REG), 30)
    max_w = W - 100
    title_lines = wrap_ar(draw, title, title_font, max_w)
    y = 1500 if not subtitle else 1435
    for line in title_lines:
        tw = draw.textlength(line, font=title_font)
        x = (W - tw) / 2
        for dx, dy in ((2, 2), (0, 2), (2, 0)):
            draw.text((x + dx, y + dy), line, font=title_font, fill=(0, 0, 0, 160))
        draw.text((x, y), line, font=title_font, fill=WHITE + (255,))
        y += 68
    if subtitle:
        tw = draw.textlength(subtitle, font=sub_font)
        x = (W - tw) / 2
        draw.text((x, y + 10), subtitle, font=sub_font, fill=CYAN + (255,))
    return np.array(img)


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def ken_burns(path: Path, duration: float, zoom_in: bool) -> CompositeVideoClip:
    src = cover(Image.open(path), W, H)
    big = cover(src, int(W * 1.12), int(H * 1.12))
    arr = np.array(big)
    raw = ImageClip(arr).with_duration(duration)

    def scaler(t):
        p = min(max(t / max(duration, 0.001), 0), 1)
        return 1.0 + 0.08 * (p if zoom_in else (1 - p))

    moving = raw.resized(scaler).with_position("center")
    bg = ColorClip(size=(W, H), color=NAVY).with_duration(duration)
    return CompositeVideoClip([bg, moving], size=(W, H)).with_duration(duration)


def make_bed(duration: float) -> Path:
    bed = AUDIO / "bed.wav"
    AUDIO.mkdir(parents=True, exist_ok=True)
    fade_out_start = max(0.1, duration - 1.4)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=110:sample_rate=44100:duration={duration}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=165:sample_rate=44100:duration={duration}",
            "-filter_complex",
            f"[0][1]amix=inputs=2:duration=first,volume=0.03,afade=t=in:st=0:d=1.0,afade=t=out:st={fade_out_start}:d=1.3",
            str(bed),
        ],
        check=True,
        capture_output=True,
    )
    return bed


def build_scene_audio(durs: list[float]) -> Path:
    parts = []
    for i, dur in enumerate(durs):
        vo = AUDIO / f"vo-{i + 1:02d}.wav"
        if not vo.exists():
            raise FileNotFoundError(vo)
        padded = AUDIO / f"pad-{i + 1:02d}.wav"
        lead = 0.28
        vo_dur = probe_duration(vo)
        trail = max(0.08, dur - vo_dur - lead)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-t",
                f"{lead:.3f}",
                "-i",
                "anullsrc=r=44100:cl=mono",
                "-i",
                str(vo),
                "-f",
                "lavfi",
                "-t",
                f"{trail:.3f}",
                "-i",
                "anullsrc=r=44100:cl=mono",
                "-filter_complex",
                f"[0][1][2]concat=n=3:v=0:a=1,apad=whole_dur={dur:.3f}",
                "-t",
                f"{dur:.3f}",
                str(padded),
            ],
            check=True,
            capture_output=True,
        )
        parts.append(padded)

    list_file = AUDIO / "timeline.txt"
    with list_file.open("w", encoding="utf-8") as f:
        for p in parts:
            f.write(f"file '{p.name}'\n")
    timeline = AUDIO / "vo-timeline.wav"
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
            str(timeline),
        ],
        check=True,
        capture_output=True,
        cwd=str(AUDIO),
    )
    return timeline


def build() -> None:
    durs: list[float] = []
    for i, (_, min_dur) in enumerate(SCENES):
        vo = AUDIO / f"vo-{i + 1:02d}.wav"
        vo_dur = probe_duration(vo)
        durs.append(max(min_dur, vo_dur + 1.0))

    visuals = []
    starts: list[float] = []
    t = 0.0
    for i, ((name, _), dur) in enumerate(zip(SCENES, durs)):
        path = FRAMES / name
        if not path.exists():
            raise FileNotFoundError(path)
        starts.append(t)
        clip = ken_burns(path, dur, zoom_in=(i % 2 == 0))
        clip = clip.with_effects([vfx.FadeIn(0.25), vfx.FadeOut(0.25)])
        visuals.append(clip)
        t += dur

    base = concatenate_videoclips(visuals, method="compose")
    total = float(base.duration)

    overlays = [base]
    for (title, subtitle), start, dur in zip(CAPTION_TEXTS, starts, durs):
        cap_dur = max(2.0, dur - 0.55)
        png = caption_png(title, subtitle)
        overlays.append(
            ImageClip(png, transparent=True)
            .with_duration(cap_dur)
            .with_start(start + 0.3)
            .with_effects([vfx.CrossFadeIn(0.2), vfx.CrossFadeOut(0.25)])
        )

    vo_timeline = build_scene_audio(durs)
    bed = make_bed(total)
    vo_clip = AudioFileClip(str(vo_timeline)).subclipped(0, total)
    bed_clip = AudioFileClip(str(bed)).with_duration(total)
    mixed = CompositeAudioClip([bed_clip, vo_clip.with_volume_scaled(1.4)])

    final = CompositeVideoClip(overlays, size=(W, H)).with_duration(total).with_audio(mixed)
    final.write_videofile(
        str(OUT),
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4,
        ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    )
    print(f"Wrote {OUT} ({total:.1f}s)")


if __name__ == "__main__":
    build()
