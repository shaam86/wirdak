# -*- coding: utf-8 -*-
"""Build Safir brand cinematic promo (~60–70s, 9:16) with ffmpeg."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames-brand"
AUDIO = ROOT / "audio-brand"
SFX = ROOT / "sfx"
WORK = ROOT / "work-brand"
OUT = ROOT / "safir-brand-cinematic-ar-9x16.mp4"

W, H, FPS = 1080, 1920, 30
CYAN = (62, 200, 255)
WHITE = (255, 255, 255)
FONT_REG = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf")

# Updated after measuring VO; build() may stretch via pad audio
BEATS = [
    ("01-chaos.png", 8.0, 1.12, "عندما يتسع العمل.. لا ينبغي أن تتعقد الحسابات."),
    ("02-transfer.png", 8.0, 1.10, "الحوالات الصادرة والواردة.. في نظام واحد."),
    ("03-dashboard.png", 4.5, 1.08, "العملاء والوكلاء والصناديق والأرصدة."),
    ("03b-customers.png", 4.5, 1.10, "موقفك المالي.. واضح وفي وقته."),
    ("04-currencies.png", 4.0, 1.08, "عملات متعددة.. بمرونة ودقة."),
    ("04b-coins.png", 4.0, 1.12, "بلا ملفات متفرقة."),
    ("05-flights.png", 8.5, 1.08, "الطيران والتأشيرات.. من المنظومة نفسها."),
    ("06-reports.png", 4.5, 1.08, "تقارير وكشوفات وفواتير.. في ثوان."),
    ("06b-statement.png", 4.5, 1.10, "PDF وExcel جاهزان للمشاركة."),
    ("07-remote.png", 9.0, 1.08, "أدر أعمالك بوضوح.. من أي مكان."),
    ("08-finale-card.png", 10.0, 1.12, "اشتراكات سنوية.. اختر الباقة المناسبة."),
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
    d0.rectangle((0, int(H * 0.72), W, H), fill=(7, 18, 31, 185))
    overlay = overlay.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(str(FONT_BOLD), 48)
    y = 1500
    for line in wrap(draw, title, title_font, W - 100):
        tw = draw.textlength(line, font=title_font)
        x = (W - tw) / 2
        draw.text((x + 2, y + 2), line, font=title_font, fill=(0, 0, 0, 160))
        draw.text((x, y), line, font=title_font, fill=WHITE + (255,))
        y += 64
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
            "19",
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


def sync_durs_to_vo(base_durs: list[float]) -> list[float]:
    """Map VO segments to beat groups and ensure enough time."""
    # groups of beat indices per VO
    groups = [
        [0],
        [1],
        [2, 3],
        [4, 5],
        [6],
        [7, 8],
        [9],
        [10],
    ]
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
    groups = [
        [0],
        [1],
        [2, 3],
        [4, 5],
        [6],
        [7, 8],
        [9],
        [10],
    ]
    parts = []
    for gi, idxs in enumerate(groups):
        gdur = sum(durs[i] for i in idxs)
        vo = AUDIO / f"vo-{gi + 1:02d}.wav"
        padded = WORK / f"vo-pad-{gi + 1:02d}.wav"
        lead = 0.22
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

    bed = WORK / "bed.wav"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=92:sample_rate=44100:duration={total}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=138:sample_rate=44100:duration={total}",
            "-filter_complex",
            f"[0][1]amix=inputs=2,volume=0.026,afade=t=in:d=1.2,afade=t=out:st={max(0.1, total - 1.5):.2f}:d=1.4",
            str(bed),
        ]
    )

    starts = [0.0]
    for d in durs[:-1]:
        starts.append(starts[-1] + d)

    schedule = [
        (0.12, "whoosh.wav", 0.65),
        (starts[1] + 0.08, "click.wav", 0.85),
        (starts[2] + 0.1, "whoosh.wav", 0.5),
        (starts[4] + 0.1, "click.wav", 0.8),
        (starts[6] + 0.12, "whoosh.wav", 0.55),
        (starts[7] + 0.15, "chime.wav", 0.8),
        (starts[9] + 0.1, "whoosh.wav", 0.55),
        (starts[10] + 0.2, "bass.wav", 0.9),
    ]

    filter_parts = ["[0]volume=1.4[vo]", "[1]volume=1.0[bed]"]
    mix_labels = ["[vo]", "[bed]"]
    sfx_inputs: list[str] = []
    idx = 2
    for delay_s, name, vol in schedule:
        path = SFX / name
        if not path.exists():
            continue
        sfx_inputs += ["-i", str(path)]
        ms = int(delay_s * 1000)
        filter_parts.append(f"[{idx}]volume={vol},adelay={ms}|{ms}[s{idx}]")
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
    # compress
    opt = ROOT / "safir-brand-tmp.mp4"
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(OUT),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "22",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            str(opt),
        ]
    )
    opt.replace(OUT)
    print(f"Wrote {OUT} ({probe(OUT):.1f}s)")


if __name__ == "__main__":
    main()
