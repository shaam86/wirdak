# -*- coding: utf-8 -*-
"""Build Safir episode-1 cinematic promo (9:16) with ffmpeg zoompan — fast."""
from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames-ep1"
AUDIO = ROOT / "audio-ep1"
SFX = ROOT / "sfx"
WORK = ROOT / "work-ep1"
OUT = ROOT / "safir-ep1-onboarding-ar-9x16.mp4"

W, H, FPS = 1080, 1920, 30
NAVY = (7, 18, 31)
CYAN = (62, 200, 255)
WHITE = (255, 255, 255)
FONT_REG = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf")

# Visual beats: (image, duration, zoom_end, caption_title, caption_sub)
# zoom_end >1 = zoom in, <1 = slight zoom out from start
BEATS = [
    ("01-login.png", 5.2, 1.12, "البداية الصحيحة.. أمان وسيطرة من اللحظة الأولى.", ""),
    ("01b-join.png", 5.2, 1.10, "طلب انضمام سهل وسريع.", ""),
    ("02-settings.png", 12.0, 1.08, "إعدادات النظام: العملة، الشركة، والصلاحيات.", ""),
    ("03-customers.png", 8.8, 1.10, "إدارة العملاء.. قاعدة عملك المنظمة.", ""),
    ("04-opening.png", 10.8, 1.12, "أرصدة افتتاحية دقيقة: دائن أو مدين.", ""),
    ("05-dashboard.png", 5.4, 1.08, "الميزانية ودفتر الحسابات.. جاهزان فوراً.", ""),
    ("05b-statement.png", 5.4, 1.10, "أرقام ثابتة.. بلا أخطاء.", ""),
    ("06-settlement.png", 1.6, 1.06, "", ""),
    ("06b-currencies.png", 1.6, 1.06, "", ""),
    ("06c-debts.png", 1.6, 1.06, "", ""),
    ("06d-reports.png", 1.6, 1.06, "", ""),
    ("06e-flights.png", 1.6, 1.06, "", ""),
    ("06f-logo.png", 3.0, 1.15, "سافير المحاسبي", "حمّله الآن من المتاجر"),
]


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-2000:] or r.stdout[-2000:])


def probe(path: Path) -> float:
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


def cover_png(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGB")
    scale = max(W / im.width, H / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - W) // 2, (nh - H) // 2
    im.crop((left, top, left + W, top + H)).save(dst, quality=95)


def wrap(draw, text, font, max_w):
    words = text.split()
    if not words:
        return []
    lines, cur = [], words[0]
    for w in words[1:]:
        trial = f"{cur} {w}"
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def caption_png(title: str, subtitle: str, path: Path) -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if not title and not subtitle:
        img.save(path)
        return
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(overlay)
    d0.rectangle((0, int(H * 0.72), W, H), fill=(7, 18, 31, 180))
    overlay = overlay.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(str(FONT_BOLD), 50)
    sub_font = ImageFont.truetype(str(FONT_REG), 32)
    y = 1480 if not subtitle else 1425
    for line in wrap(draw, title, title_font, W - 100):
        tw = draw.textlength(line, font=title_font)
        x = (W - tw) / 2
        draw.text((x + 2, y + 2), line, font=title_font, fill=(0, 0, 0, 160))
        draw.text((x, y), line, font=title_font, fill=WHITE + (255,))
        y += 66
    if subtitle:
        tw = draw.textlength(subtitle, font=sub_font)
        x = (W - tw) / 2
        draw.text((x, y + 8), subtitle, font=sub_font, fill=CYAN + (255,))
    img.save(path)


def zoompan_clip(img: Path, dur: float, zoom_end: float, out: Path) -> None:
    frames = max(1, int(round(dur * FPS)))
    # Start slightly zoomed if zooming out, else start at 1
    z0 = 1.0
    z1 = zoom_end
    # zoompan z expression: linear from z0 to z1
    # Use high-res input already 1080x1920
    z_expr = f"1+({z1}-1)*on/{max(frames - 1, 1)}"
    run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(img),
            "-vf",
            f"zoompan=z='{z_expr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},format=yuv420p",
            "-t",
            f"{dur:.3f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            str(out),
        ]
    )


def overlay_caption(vid: Path, cap: Path, out: Path, dur: float) -> None:
    fade_out = max(0.35, dur - 0.45)
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(vid),
            "-loop",
            "1",
            "-i",
            str(cap),
            "-filter_complex",
            f"[1]format=rgba,fade=t=in:st=0.12:d=0.22:alpha=1,fade=t=out:st={fade_out:.2f}:d=0.35:alpha=1[c];"
            f"[0][c]overlay=0:0:format=auto,format=yuv420p",
            "-t",
            f"{dur:.3f}",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "19",
            "-an",
            str(out),
        ]
    )


def build_visuals() -> tuple[Path, list[float]]:
    WORK.mkdir(parents=True, exist_ok=True)
    clips = []
    durs = []
    for i, (name, dur, zoom, title, sub) in enumerate(BEATS):
        src = FRAMES / name
        if not src.exists():
            raise FileNotFoundError(src)
        covered = WORK / f"cover-{i:02d}.png"
        cover_png(src, covered)
        raw = WORK / f"raw-{i:02d}.mp4"
        zoompan_clip(covered, dur, zoom, raw)
        cap = WORK / f"cap-{i:02d}.png"
        caption_png(title, sub, cap)
        final = WORK / f"clip-{i:02d}.mp4"
        if title or sub:
            overlay_caption(raw, cap, final, dur)
        else:
            final = raw
        clips.append(final)
        durs.append(dur)
        print(f"clip {i:02d} {dur}s {name}")

    # concat
    lst = WORK / "concat.txt"
    with lst.open("w") as f:
        for c in clips:
            f.write(f"file '{c.name}'\n")
    visual = WORK / "visual.mp4"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            str(visual),
        ]
    )
    # rewrite with absolute paths if needed
    if not visual.exists() or visual.stat().st_size < 1000:
        with lst.open("w") as f:
            for c in clips:
                f.write(f"file '{c.resolve()}'\n")
        run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(lst),
                "-c",
                "copy",
                str(visual),
            ]
        )
    return visual, durs


def build_audio(total: float, durs: list[float]) -> Path:
    # Map VO to scene groups
    # VO1 -> beats 0-1 (8s), VO2 -> 2 (8s), VO3 -> 3 (8s), VO4 -> 4 (10s), VO5 -> 5-6 (8s), VO6 -> 7-12 (10s)
    groups = [
        (0, 2, "01"),
        (2, 3, "02"),
        (3, 4, "03"),
        (4, 5, "04"),
        (5, 7, "05"),
        (7, 13, "06"),
    ]
    parts = []
    for start_i, end_i, vo_name in groups:
        gdur = sum(durs[start_i:end_i])
        vo = AUDIO / f"vo-{vo_name}.wav"
        padded = WORK / f"vo-pad-{vo_name}.wav"
        vo_dur = probe(vo)
        lead = 0.25
        trail = max(0.1, gdur - vo_dur - lead)
        run(
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
                f"[0][1][2]concat=n=3:v=0:a=1,apad=whole_dur={gdur:.3f}",
                "-t",
                f"{gdur:.3f}",
                str(padded),
            ]
        )
        parts.append(padded)

    lst = WORK / "vo-concat.txt"
    with lst.open("w") as f:
        for p in parts:
            f.write(f"file '{p.resolve()}'\n")
    vo_full = WORK / "vo-timeline.wav"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(vo_full)])

    # Soft bed
    bed = WORK / "bed.wav"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=98:sample_rate=44100:duration={total}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=147:sample_rate=44100:duration={total}",
            "-filter_complex",
            f"[0][1]amix=inputs=2,volume=0.028,afade=t=in:d=1,afade=t=out:st={max(0.1, total - 1.4):.2f}:d=1.3",
            str(bed),
        ]
    )

    # Place SFX at scene starts (absolute times)
    starts = [0.0]
    for d in durs[:-1]:
        starts.append(starts[-1] + d)

    sfx_inputs = []
    sfx_filters = []
    # whoosh at 0, click at scene2/3, typing at scene4, chime at scene5, bass at finale
    schedule = [
        (0.15, "whoosh.wav", 0.7),
        (5.25, "whoosh.wav", 0.55),
        (10.5, "click.wav", 0.9),
        (22.6, "click.wav", 0.9),
        (31.5, "typing.wav", 0.55),
        (42.4, "chime.wav", 0.85),
        (53.3, "bass.wav", 0.9),
        (60.0, "whoosh.wav", 0.6),
    ]
    idx = 2  # after vo and bed
    filter_parts = ["[0]volume=1.35[vo]", "[1]volume=1.0[bed]"]
    mix_labels = ["[vo]", "[bed]"]
    for delay_s, name, vol in schedule:
        path = SFX / name
        if not path.exists():
            continue
        sfx_inputs += ["-i", str(path)]
        delay_ms = int(delay_s * 1000)
        filter_parts.append(
            f"[{idx}]volume={vol},adelay={delay_ms}|{delay_ms}[s{idx}]"
        )
        mix_labels.append(f"[s{idx}]")
        idx += 1

    n = len(mix_labels)
    filter_parts.append(
        f"{''.join(mix_labels)}amix=inputs={n}:normalize=0:dropout_transition=0,alimiter=limit=0.95[aout]"
    )
    mixed = WORK / "mixed.wav"
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(vo_full),
        "-i",
        str(bed),
        *sfx_inputs,
        "-filter_complex",
        ";".join(filter_parts),
        "-map",
        "[aout]",
        "-t",
        f"{total:.3f}",
        str(mixed),
    ]
    run(cmd)
    return mixed


def main() -> None:
    visual, durs = build_visuals()
    total = sum(durs)
    # Ensure visual duration matches
    vdur = probe(visual)
    print(f"visual={vdur:.2f}s planned={total:.2f}s")
    audio = build_audio(vdur, durs)
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(visual),
            "-i",
            str(audio),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(OUT),
        ]
    )
    print(f"Wrote {OUT} ({probe(OUT):.1f}s)")


if __name__ == "__main__":
    main()
