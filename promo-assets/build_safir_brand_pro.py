# -*- coding: utf-8 -*-
"""
Professional YouTube (16:9) Safir brand film builder.

Upgrades vs previous cut:
- Crossfade transitions between scenes
- Multi-phase Ken Burns (push-in + slight pan)
- Cinematic color grade + vignette + subtle grain
- Premium lower-thirds (accent bar + title)
- Soft pulse highlight on UI beats
- Cleaner audio bed ducking under VO
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames-brand"
AUDIO = ROOT / "audio-brand"
SFX = ROOT / "sfx"
WORK = ROOT / "work-brand-pro"
OUT = ROOT / "safir-brand-pro-youtube-16x9.mp4"

W, H, FPS = 1920, 1080, 30
NAVY = (7, 18, 31)
CYAN = (62, 200, 255)
BLUE = (30, 111, 232)
WHITE = (255, 255, 255)
FONT_REG = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf")
XFADE = 0.55

# name, base_dur, zoom_end, pan_x(+right), caption, highlight(optional xy normalized)
BEATS = [
    ("01-chaos.png", 8.0, 1.14, 0.02, "عندما يتسع العمل.. لا ينبغي أن تتعقد الحسابات.", None),
    ("02-transfer.png", 8.0, 1.12, -0.02, "الحوالات الصادرة والواردة.. في نظام واحد.", (0.55, 0.42)),
    ("03-dashboard.png", 4.5, 1.10, 0.015, "العملاء والوكلاء والصناديق والأرصدة.", (0.48, 0.35)),
    ("03b-customers.png", 4.5, 1.11, -0.01, "موقفك المالي.. واضح وفي وقته.", (0.62, 0.28)),
    ("04-currencies.png", 4.0, 1.10, 0.02, "عملات متعددة.. بمرونة ودقة.", (0.50, 0.40)),
    ("04b-coins.png", 4.0, 1.13, -0.015, "بلا ملفات متفرقة.", None),
    ("05-flights.png", 8.5, 1.10, 0.01, "الطيران والتأشيرات.. من المنظومة نفسها.", (0.45, 0.30)),
    ("06-reports.png", 4.5, 1.10, -0.02, "تقارير وكشوفات وفواتير.. في ثوان.", (0.52, 0.38)),
    ("06b-statement.png", 4.5, 1.12, 0.015, "PDF وExcel جاهزان للمشاركة.", (0.40, 0.22)),
    ("07-remote.png", 9.0, 1.10, -0.01, "أدر أعمالك بوضوح.. من أي مكان.", None),
    ("08-finale-card.png", 10.0, 1.08, 0.0, "اشتراكات سنوية.. اختر الباقة المناسبة.", None),
]


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-3000:])


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


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    im = im.convert("RGB")
    scale = max(w / im.width, h / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return im.crop((left, top, left + w, top + h))


def grade_frame(im: Image.Image) -> Image.Image:
    """Subtle cinematic grade: cooler shadows, slightly richer midtones."""
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(1.08)
    im = ImageEnhance.Brightness(im).enhance(0.98)
    arr = np.asarray(im).astype(np.float32)
    # lift blues in shadows a touch, warm highlights lightly
    lum = arr.mean(axis=2, keepdims=True) / 255.0
    cool = np.array([0.92, 0.97, 1.06], dtype=np.float32)
    warm = np.array([1.04, 1.01, 0.96], dtype=np.float32)
    mix = cool * (1 - lum) + warm * lum
    arr = np.clip(arr * mix, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr)
    # vignette
    vig = Image.new("L", (W, H), 255)
    vd = ImageDraw.Draw(vig)
    max_inset = min(W, H) // 3
    for i in range(36):
        a = int(255 - 170 * (i / 35) ** 1.35)
        inset = int((i / 35) * max_inset)
        vd.ellipse((inset, inset, W - 1 - inset, H - 1 - inset), outline=a, width=18)
    vig = vig.filter(ImageFilter.GaussianBlur(42))
    black = Image.new("RGB", (W, H), NAVY)
    return Image.composite(out, black, vig)


def add_highlight(im: Image.Image, xy: tuple[float, float] | None) -> Image.Image:
    if not xy:
        return im
    base = im.convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = int(xy[0] * W), int(xy[1] * H)
    for r, a in ((90, 35), (60, 55), (34, 90)):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=CYAN + (a,), width=3)
    d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=CYAN + (160,))
    return Image.alpha_composite(base, overlay).convert("RGB")


def prepare_still(src: Path, highlight: tuple[float, float] | None, dst: Path) -> None:
    # prepare oversized canvas for zoompan quality
    base = cover(Image.open(src), W, H)
    base = grade_frame(base)
    base = add_highlight(base, highlight)
    # export slightly larger for zoom headroom
    big = cover(base, int(W * 1.18), int(H * 1.18))
    big.save(dst, quality=95)


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


def lower_third(title: str, path: Path) -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if not title:
        img.save(path)
        return
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(overlay)
    # gradient bar
    for i, y in enumerate(range(int(H * 0.74), H)):
        a = int(210 * min(1.0, i / 80))
        d0.line((0, y, W, y), fill=(7, 18, 31, a))
    # accent line
    d0.rectangle((80, int(H * 0.80), 86, int(H * 0.92)), fill=CYAN + (230,))
    img = Image.alpha_composite(img, overlay.filter(ImageFilter.GaussianBlur(1)))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(FONT_BOLD), 44)
    y = int(H * 0.82)
    for line in wrap(draw, title, font, W - 220):
        # RTL text drawn LTR visually by font shaping
        tw = draw.textlength(line, font=font)
        x = (W - tw) / 2
        draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 150))
        draw.text((x, y), line, font=font, fill=WHITE + (255,))
        y += 54
    img.save(path)


def zoompan_clip(img: Path, dur: float, zoom_end: float, pan_x: float, out: Path) -> None:
    frames = max(1, int(round(dur * FPS)))
    # ease-in-out zoom
    z = f"1+({zoom_end}-1)*(0.5-0.5*cos(PI*on/{max(frames-1,1)}))"
    # gentle horizontal drift
    xexpr = f"(iw-iw/zoom)/2 + (iw-iw/zoom)*({pan_x})*(on/{max(frames-1,1)})"
    yexpr = "(ih-ih/zoom)/2"
    vf = (
        f"zoompan=z='{z}':x='{xexpr}':y='{yexpr}':d={frames}:s={W}x{H}:fps={FPS},"
        f"noise=alls=2:allf=t+u,format=yuv420p"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(img),
            "-vf",
            vf,
            "-t",
            f"{dur:.3f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "17",
            str(out),
        ]
    )


def overlay_caption(vid: Path, cap: Path, out: Path, dur: float) -> None:
    fade_out = max(0.4, dur - 0.5)
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
            f"[1]format=rgba,fade=t=in:st=0.18:d=0.28:alpha=1,fade=t=out:st={fade_out:.2f}:d=0.35:alpha=1[c];"
            f"[0][c]overlay=0:0:format=auto,format=yuv420p",
            "-t",
            f"{dur:.3f}",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "17",
            "-an",
            str(out),
        ]
    )


def sync_durs(base: list[float]) -> list[float]:
    groups = [[0], [1], [2, 3], [4, 5], [6], [7, 8], [9], [10]]
    durs = list(base)
    for gi, idxs in enumerate(groups):
        need = probe(AUDIO / f"vo-{gi+1:02d}.wav") + 1.05
        cur = sum(durs[i] for i in idxs)
        if need > cur:
            s = need / cur
            for i in idxs:
                durs[i] *= s
    return durs


def xfade_concat(clips: list[Path], durs: list[float], out: Path) -> None:
    if len(clips) == 1:
        run(["ffmpeg", "-y", "-i", str(clips[0]), "-c", "copy", str(out)])
        return
    # Build complex xfade chain
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    filters = []
    # offset accumulates: d0 + d1 - xfade + d2 - xfade ...
    offset = durs[0] - XFADE
    prev = "[0]"
    for i in range(1, len(clips)):
        label = f"[v{i}]" if i < len(clips) - 1 else "[vout]"
        filters.append(
            f"{prev}[{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{label}"
        )
        prev = label
        if i < len(clips) - 1:
            offset += durs[i] - XFADE
    run(
        [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[vout]",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(out),
        ]
    )


def build_audio(total: float, durs: list[float]) -> Path:
    groups = [[0], [1], [2, 3], [4, 5], [6], [7, 8], [9], [10]]
    # account for xfade shortening visual timeline
    # VO pads use group sums of scene durs; visual total is shorter by (n-1)*XFADE
    # We'll pad VO to visual total via loudnorm/trim at end.
    parts = []
    for gi, idxs in enumerate(groups):
        gdur = sum(durs[i] for i in idxs)
        vo = AUDIO / f"vo-{gi+1:02d}.wav"
        padded = WORK / f"vo-pad-{gi+1:02d}.wav"
        lead = 0.28
        trail = max(0.1, gdur - probe(vo) - lead)
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

    lst = WORK / "vo.txt"
    with lst.open("w") as f:
        for p in parts:
            f.write(f"file '{p.resolve()}'\n")
    vo_full = WORK / "vo.wav"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(vo_full)])

    # cinematic bed: layered soft tones
    bed = WORK / "bed.wav"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=70:sample_rate=48000:duration={total}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=105:sample_rate=48000:duration={total}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=210:sample_rate=48000:duration={total}",
            "-filter_complex",
            f"[0]volume=0.4[a];[1]volume=0.28[b];[2]volume=0.12[c];"
            f"[a][b][c]amix=inputs=3,volume=0.035,"
            f"afade=t=in:d=1.6,afade=t=out:st={max(0.2, total-1.8):.2f}:d=1.7",
            str(bed),
        ]
    )

    # compress VO timeline to visual length (xfade shortens video)
    vo_fit = WORK / "vo-fit.wav"
    vo_dur = probe(vo_full)
    # atempo if needed to fit, else trim/pad
    if vo_dur > total + 0.05:
        tempo = min(1.12, vo_dur / total)
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(vo_full),
                "-filter:a",
                f"atempo={tempo:.4f},apad=whole_dur={total:.3f}",
                "-t",
                f"{total:.3f}",
                str(vo_fit),
            ]
        )
    else:
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(vo_full),
                "-af",
                f"apad=whole_dur={total:.3f}",
                "-t",
                f"{total:.3f}",
                str(vo_fit),
            ]
        )

    starts = [0.0]
    for d in durs[:-1]:
        starts.append(starts[-1] + d - XFADE)

    schedule = [
        (0.15, "whoosh.wav", 0.5),
        (max(0.2, starts[1] + 0.05), "click.wav", 0.7),
        (max(0.2, starts[2] + 0.08), "whoosh.wav", 0.4),
        (max(0.2, starts[4] + 0.08), "click.wav", 0.65),
        (max(0.2, starts[6] + 0.1), "whoosh.wav", 0.45),
        (max(0.2, starts[7] + 0.12), "chime.wav", 0.65),
        (max(0.2, starts[9] + 0.08), "whoosh.wav", 0.45),
        (max(0.2, starts[10] + 0.15), "bass.wav", 0.75),
    ]

    filter_parts = [
        "[0]volume=1.2[vo]",
        # sidechain-ish duck: lower bed under VO by fixed amount (VO continuous enough)
        "[1]volume=0.85[bed]",
    ]
    labels = ["[vo]", "[bed]"]
    sfx_inputs: list[str] = []
    idx = 2
    for delay_s, name, vol in schedule:
        path = SFX / name
        if not path.exists():
            continue
        sfx_inputs += ["-i", str(path)]
        ms = int(delay_s * 1000)
        filter_parts.append(
            f"[{idx}]aformat=sample_rates=48000:channel_layouts=mono,volume={vol},adelay={ms}|{ms}[s{idx}]"
        )
        labels.append(f"[s{idx}]")
        idx += 1
    filter_parts.append(
        f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0,"
        f"alimiter=limit=0.94,loudnorm=I=-15:TP=-1.5:LRA=10[aout]"
    )
    mixed = WORK / "mixed.wav"
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(vo_fit),
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
    WORK.mkdir(parents=True, exist_ok=True)
    base = [b[1] for b in BEATS]
    durs = sync_durs(base)

    clips = []
    for i, ((name, _, zoom, pan, title, hl), dur) in enumerate(zip(BEATS, durs)):
        still = WORK / f"still-{i:02d}.jpg"
        prepare_still(FRAMES / name, hl, still)
        raw = WORK / f"raw-{i:02d}.mp4"
        zoompan_clip(still, dur, zoom, pan, raw)
        cap = WORK / f"cap-{i:02d}.png"
        lower_third(title, cap)
        final = WORK / f"clip-{i:02d}.mp4"
        overlay_caption(raw, cap, final, dur)
        clips.append(final)
        print(f"clip {i:02d} {dur:.1f}s")

    visual = WORK / "visual.mp4"
    xfade_concat(clips, durs, visual)
    total = probe(visual)
    print(f"visual={total:.2f}s (xfade)")
    audio = build_audio(total, durs)

    mux = WORK / "mux.mp4"
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
            "224k",
            "-ar",
            "48000",
            "-shortest",
            "-movflags",
            "+faststart",
            str(mux),
        ]
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(mux),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "224k",
            "-movflags",
            "+faststart",
            str(OUT),
        ]
    )
    print(f"Wrote {OUT} ({probe(OUT):.1f}s) {W}x{H}")


if __name__ == "__main__":
    main()
