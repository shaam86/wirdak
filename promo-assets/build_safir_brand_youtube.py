# -*- coding: utf-8 -*-
"""Build Safir brand cinematic promo for YouTube (16:9 / 1920x1080)."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames-brand"
AUDIO = ROOT / "audio-brand"
SFX = ROOT / "sfx"
WORK = ROOT / "work-brand-yt"
OUT = ROOT / "safir-brand-cinematic-ar-16x9.mp4"

# YouTube landscape
W, H, FPS = 1920, 1080, 30
CYAN = (62, 200, 255)
WHITE = (255, 255, 255)
FONT_REG = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf")

BEATS = [
    ("01-chaos.png", 8.0, 1.10, "عندما يتسع العمل.. لا ينبغي أن تتعقد الحسابات."),
    ("02-transfer.png", 8.0, 1.08, "الحوالات الصادرة والواردة.. في نظام واحد."),
    ("03-dashboard.png", 4.5, 1.06, "العملاء والوكلاء والصناديق والأرصدة."),
    ("03b-customers.png", 4.5, 1.08, "موقفك المالي.. واضح وفي وقته."),
    ("04-currencies.png", 4.0, 1.06, "عملات متعددة.. بمرونة ودقة."),
    ("04b-coins.png", 4.0, 1.10, "بلا ملفات متفرقة."),
    ("05-flights.png", 8.5, 1.06, "الطيران والتأشيرات.. من المنظومة نفسها."),
    ("06-reports.png", 4.5, 1.06, "تقارير وكشوفات وفواتير.. في ثوان."),
    ("06b-statement.png", 4.5, 1.08, "PDF وExcel جاهزان للمشاركة."),
    ("07-remote.png", 9.0, 1.06, "أدر أعمالك بوضوح.. من أي مكان."),
    ("08-finale-card.png", 10.0, 1.10, "اشتراكات سنوية.. اختر الباقة المناسبة."),
]


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-2500:])


def probe(path: Path) -> float:
    return float(
        subprocess.check_output(
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
    )


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


def caption_png(title: str, path: Path) -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if not title:
        img.save(path)
        return
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(overlay)
    d0.rectangle((0, int(H * 0.78), W, H), fill=(7, 18, 31, 190))
    overlay = overlay.filter(ImageFilter.GaussianBlur(12))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(str(FONT_BOLD), 46)
    y = 900
    for line in wrap(draw, title, title_font, W - 160):
        tw = draw.textlength(line, font=title_font)
        x = (W - tw) / 2
        draw.text((x + 2, y + 2), line, font=title_font, fill=(0, 0, 0, 160))
        draw.text((x, y), line, font=title_font, fill=WHITE + (255,))
        y += 58
    img.save(path)


def zoompan_clip(img: Path, dur: float, zoom_end: float, out: Path) -> None:
    frames = max(1, int(round(dur * FPS)))
    z_expr = f"1+({zoom_end}-1)*on/{max(frames - 1, 1)}"
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
            "18",
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
            "18",
            "-an",
            str(out),
        ]
    )


def sync_durs_to_vo(base_durs: list[float]) -> list[float]:
    groups = [[0], [1], [2, 3], [4, 5], [6], [7, 8], [9], [10]]
    durs = list(base_durs)
    for gi, idxs in enumerate(groups):
        vo = AUDIO / f"vo-{gi + 1:02d}.wav"
        need = probe(vo) + 1.0
        cur = sum(durs[i] for i in idxs)
        if need > cur:
            scale = need / cur
            for i in idxs:
                durs[i] *= scale
    return durs


def build_visuals(durs: list[float]) -> Path:
    WORK.mkdir(parents=True, exist_ok=True)
    clips = []
    for i, ((name, _, zoom, title), dur) in enumerate(zip(BEATS, durs)):
        src = FRAMES / name
        covered = WORK / f"cover-{i:02d}.png"
        cover_png(src, covered)
        raw = WORK / f"raw-{i:02d}.mp4"
        zoompan_clip(covered, dur, zoom, raw)
        cap = WORK / f"cap-{i:02d}.png"
        caption_png(title, cap)
        final = WORK / f"clip-{i:02d}.mp4"
        overlay_caption(raw, cap, final, dur)
        clips.append(final)
        print(f"clip {i:02d} {dur:.1f}s {name}")

    lst = WORK / "concat.txt"
    with lst.open("w") as f:
        for c in clips:
            f.write(f"file '{c.resolve()}'\n")
    visual = WORK / "visual.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(visual)])
    return visual


def build_audio(total: float, durs: list[float]) -> Path:
    groups = [[0], [1], [2, 3], [4, 5], [6], [7, 8], [9], [10]]
    parts = []
    for gi, idxs in enumerate(groups):
        gdur = sum(durs[i] for i in idxs)
        vo = AUDIO / f"vo-{gi + 1:02d}.wav"
        padded = WORK / f"vo-pad-{gi + 1:02d}.wav"
        lead = 0.25
        trail = max(0.08, gdur - probe(vo) - lead)
        run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-t",
                f"{lead:.3f}",
                "-i",
                "anullsrc=r=48000:cl=mono",
                "-i",
                str(vo),
                "-f",
                "lavfi",
                "-t",
                f"{trail:.3f}",
                "-i",
                "anullsrc=r=48000:cl=mono",
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

    bed = WORK / "bed.wav"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=88:sample_rate=48000:duration={total}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=132:sample_rate=48000:duration={total}",
            "-filter_complex",
            f"[0][1]amix=inputs=2,volume=0.022,afade=t=in:d=1.4,afade=t=out:st={max(0.1, total - 1.6):.2f}:d=1.5",
            str(bed),
        ]
    )

    starts = [0.0]
    for d in durs[:-1]:
        starts.append(starts[-1] + d)

    schedule = [
        (0.12, "whoosh.wav", 0.55),
        (starts[1] + 0.08, "click.wav", 0.75),
        (starts[2] + 0.1, "whoosh.wav", 0.45),
        (starts[4] + 0.1, "click.wav", 0.7),
        (starts[6] + 0.12, "whoosh.wav", 0.5),
        (starts[7] + 0.15, "chime.wav", 0.7),
        (starts[9] + 0.1, "whoosh.wav", 0.5),
        (starts[10] + 0.2, "bass.wav", 0.8),
    ]

    filter_parts = ["[0]volume=1.25[vo]", "[1]volume=1.0[bed]"]
    mix_labels = ["[vo]", "[bed]"]
    sfx_inputs: list[str] = []
    idx = 2
    for delay_s, name, vol in schedule:
        path = SFX / name
        if not path.exists():
            continue
        sfx_inputs += ["-i", str(path)]
        ms = int(delay_s * 1000)
        filter_parts.append(f"[{idx}]aformat=sample_rates=48000:channel_layouts=mono,volume={vol},adelay={ms}|{ms}[s{idx}]")
        mix_labels.append(f"[s{idx}]")
        idx += 1

    filter_parts.append(
        f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:normalize=0:dropout_transition=0,alimiter=limit=0.95[aout]"
    )
    mixed = WORK / "mixed.wav"
    run(
        [
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
    )
    return mixed


def main() -> None:
    base = [b[1] for b in BEATS]
    durs = sync_durs_to_vo(base)
    visual = build_visuals(durs)
    total = probe(visual)
    print(f"visual={total:.2f}s")
    audio = build_audio(total, durs)
    tmp = WORK / "mux.mp4"
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
            "192k",
            "-ar",
            "48000",
            "-shortest",
            "-movflags",
            "+faststart",
            str(tmp),
        ]
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            str(OUT),
        ]
    )
    print(f"Wrote {OUT} ({probe(OUT):.1f}s) {W}x{H}")


if __name__ == "__main__":
    main()
