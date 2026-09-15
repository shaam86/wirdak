# -*- coding: utf-8 -*-
"""45s Safir ad: accountants' problems → Safir solutions. Calm female Arabic VO. YouTube 16:9."""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import edge_tts
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames-45"
AUDIO = ROOT / "audio-45"
SFX = ROOT / "sfx"
WORK = ROOT / "work-45"
OUT = ROOT / "safir-45s-accountants-youtube-16x9.mp4"

W, H, FPS = 1920, 1080, 30
NAVY = (7, 18, 31)
CYAN = (62, 200, 255)
BLUE = (30, 111, 232)
WHITE = (255, 255, 255)
FONT_BOLD = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf")
FONT_REG = Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf")
XFADE = 0.45

VOICE = "ar-SA-ZariyahNeural"  # calm, clear, pleasant
RATE = "-8%"
PITCH = "+0Hz"

# Tight VO lines for ~45s total
VO_LINES = [
    "هل تقضي وقتك بين أوراق وأرقام متفرقة؟ وهل يقلقك خطأ بسيط قد يكلّف الكثير؟",
    "الحوالات والعملات وأرصدة العملاء تحتاج متابعة دقيقة كل يوم.",
    "سافير المحاسبي يجمع عملك في مكان واحد بواجهة واضحة وسهلة.",
    "سجّل الحوالات وتابع العملاء وأدر العملات واستخرج التقارير خلال ثوان.",
    "لتقل الأخطاء ويوضح الموقف المالي. سافير المحاسبي… ابدأ اليوم.",
]

# Visual beats mapped to VO groups: [0], [1], [2], [3 with multi frames], [4]
# Will set durations from VO after synth
BEAT_SOURCES = [
    # (frame relative to FRAMES, caption, highlight optional)
    ("01-problem.png", "يوم المحاسب.. مليء بالتفاصيل.", None),
    ("02-pressure.png", "حوالات.. عملات.. أرصدة.. ومتابعة صعبة.", None),
    ("03-solution.png", "الحل.. في نظام واحد.", (0.50, 0.40)),
    ("04a-transfers.png", "سجّل الحوالات بسهولة.", (0.55, 0.45)),
    ("04b-customers.png", "تابع العملاء والصناديق.", (0.60, 0.30)),
    ("04c-currency.png", "أدر العملات بدقة.", (0.48, 0.38)),
    ("04d-reports.png", "استخرج التقارير فورًا.", (0.42, 0.25)),
    ("05-finale.png", "دقة أعلى.. ووقت أوفر.. وحسابات أوضح.", None),
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
                "default=nw=1:nk=1",
                str(path),
            ],
            text=True,
        ).strip()
    )


def polish_voice(src: Path, dst: Path) -> None:
    af = (
        "highpass=f=90,lowpass=f=10000,"
        "equalizer=f=220:t=q:w=1:g=2,"
        "equalizer=f=2800:t=q:w=1.1:g=1.5,"
        "equalizer=f=6000:t=q:w=1:g=-2,"
        "acompressor=threshold=-20dB:ratio=2.4:attack=15:release=140:makeup=2.2,"
        "aecho=0.75:0.65:22:0.08,"
        "loudnorm=I=-16:TP=-1.5:LRA=9"
    )
    run(["ffmpeg", "-y", "-i", str(src), "-af", af, "-ar", "48000", "-ac", "1", str(dst)])


async def synth_vo() -> list[float]:
    AUDIO.mkdir(parents=True, exist_ok=True)
    durs = []
    for i, text in enumerate(VO_LINES, 1):
        mp3 = AUDIO / f"vo-{i:02d}.mp3"
        raw = AUDIO / f"vo-{i:02d}-raw.wav"
        wav = AUDIO / f"vo-{i:02d}.wav"
        await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(str(mp3))
        run(["ffmpeg", "-y", "-i", str(mp3), "-ar", "48000", "-ac", "1", str(raw)])
        polish_voice(raw, wav)
        raw.unlink(missing_ok=True)
        d = probe(wav)
        durs.append(d)
        print(f"VO{i} {d:.2f}s")
    return durs


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    im = im.convert("RGB")
    scale = max(w / im.width, h / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return im.crop((left, top, left + w, top + h))


def grade(im: Image.Image) -> Image.Image:
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = ImageEnhance.Color(im).enhance(1.06)
    arr = np.asarray(im).astype(np.float32)
    lum = arr.mean(axis=2, keepdims=True) / 255.0
    cool = np.array([0.94, 0.98, 1.05], np.float32)
    warm = np.array([1.03, 1.01, 0.97], np.float32)
    arr = np.clip(arr * (cool * (1 - lum) + warm * lum), 0, 255).astype(np.uint8)
    out = Image.fromarray(arr)
    vig = Image.new("L", (W, H), 255)
    vd = ImageDraw.Draw(vig)
    max_inset = min(W, H) // 3
    for i in range(30):
        a = int(255 - 150 * (i / 29) ** 1.3)
        inset = int((i / 29) * max_inset)
        vd.ellipse((inset, inset, W - 1 - inset, H - 1 - inset), outline=a, width=16)
    vig = vig.filter(ImageFilter.GaussianBlur(36))
    return Image.composite(out, Image.new("RGB", (W, H), NAVY), vig)


def highlight(im: Image.Image, xy: tuple[float, float] | None) -> Image.Image:
    if not xy:
        return im
    base = im.convert("RGBA")
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    cx, cy = int(xy[0] * W), int(xy[1] * H)
    for r, a in ((70, 40), (44, 70), (22, 110)):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=CYAN + (a,), width=3)
    return Image.alpha_composite(base, ov).convert("RGB")


def make_finale_card(path: Path) -> None:
    """Programmatic endcard — zero AI typography errors."""
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    # soft glow
    for i in range(20):
        a = 18 - i
        if a <= 0:
            break
        r = 220 + i * 18
        d.ellipse((W // 2 - r, H // 2 - r - 40, W // 2 + r, H // 2 + r - 40), outline=(20, 60, 120))
    # icon
    icon = ROOT / "safir-icon.png"
    if icon.exists():
        ic = Image.open(icon).convert("RGBA")
        ic = ic.resize((220, 220), Image.Resampling.LANCZOS)
        img.paste(ic, ((W - 220) // 2, 210), ic)
    title_f = ImageFont.truetype(str(FONT_BOLD), 64)
    sub_f = ImageFont.truetype(str(FONT_REG), 36)
    cta_f = ImageFont.truetype(str(FONT_BOLD), 40)
    title = "سافير المحاسبي"
    tw = d.textlength(title, font=title_f)
    d.text(((W - tw) / 2, 470), title, font=title_f, fill=WHITE)
    sub = "دقة أعلى  |  وقت أوفر  |  حسابات أوضح"
    sw = d.textlength(sub, font=sub_f)
    d.text(((W - sw) / 2, 560), sub, font=sub_f, fill=CYAN)
    cta = "ابدأ اليوم"
    cw = d.textlength(cta, font=cta_f)
    pad_x, pad_y = 48, 18
    bx1 = (W - cw) / 2 - pad_x
    by1 = 650
    bx2 = (W + cw) / 2 + pad_x
    by2 = 650 + 40 + pad_y * 2
    d.rounded_rectangle((bx1, by1, bx2, by2), radius=18, fill=BLUE)
    d.text(((W - cw) / 2, 650 + pad_y), cta, font=cta_f, fill=WHITE)
    foot = "Google Play   ·   Microsoft Store   ·   الموقع"
    fw = d.textlength(foot, font=sub_f)
    d.text(((W - fw) / 2, 920), foot, font=sub_f, fill=(180, 200, 220))
    img.save(path, quality=95)


def prepare_frames() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    mapping = {
        "01-problem.png": ROOT / "frames-brand" / "01-chaos.png",
        "02-pressure.png": ROOT / "frames-ep1" / "06-settlement.png",
        "03-solution.png": ROOT / "frames-ep1" / "05-dashboard.png",
        "04a-transfers.png": ROOT / "frames-ep1" / "06-settlement.png",
        "04b-customers.png": ROOT / "frames-ep1" / "03-customers.png",
        "04c-currency.png": ROOT / "frames-ep1" / "06b-currencies.png",
        "04d-reports.png": ROOT / "frames-ep1" / "05b-statement.png",
    }
    for dst, src in mapping.items():
        if not src.exists():
            raise FileNotFoundError(src)
        cover(Image.open(src), W, H).save(FRAMES / dst, quality=95)
    make_finale_card(FRAMES / "05-finale.png")


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
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(ov)
    for i, y in enumerate(range(int(H * 0.76), H)):
        a = int(200 * min(1.0, i / 70))
        d0.line((0, y, W, y), fill=(7, 18, 31, a))
    d0.rectangle((72, int(H * 0.82), 78, int(H * 0.93)), fill=CYAN + (230,))
    img = Image.alpha_composite(img, ov)
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(FONT_BOLD), 42)
    y = int(H * 0.84)
    for line in wrap(draw, title, font, W - 200):
        tw = draw.textlength(line, font=font)
        x = (W - tw) / 2
        draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 140))
        draw.text((x, y), line, font=font, fill=WHITE + (255,))
        y += 52
    img.save(path)


def zoom_clip(img: Path, dur: float, zoom_end: float, out: Path) -> None:
    frames = max(1, int(round(dur * FPS)))
    z = f"1+({zoom_end}-1)*(0.5-0.5*cos(PI*on/{max(frames-1,1)}))"
    vf = (
        f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
        f"noise=alls=1:allf=t,format=yuv420p"
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


def overlay_cap(vid: Path, cap: Path, out: Path, dur: float) -> None:
    fo = max(0.35, dur - 0.4)
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
            f"[1]format=rgba,fade=t=in:st=0.12:d=0.22:alpha=1,fade=t=out:st={fo:.2f}:d=0.3:alpha=1[c];"
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


def xfade_concat(clips: list[Path], durs: list[float], out: Path) -> None:
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    filters = []
    offset = durs[0] - XFADE
    prev = "[0]"
    for i in range(1, len(clips)):
        label = f"[v{i}]" if i < len(clips) - 1 else "[vout]"
        filters.append(f"{prev}[{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{label}")
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


def plan_durs(vo: list[float]) -> list[float]:
    """Map 5 VO lines to 8 visual beats totaling ~45s after xfade."""
    # target visual sum before xfade such that after 7 xfades ≈ 45
    # total_after = sum(durs) - 7*XFADE ≈ 45 => sum ≈ 45 + 7*0.45 = 48.15
    target_sum = 45.0 + 7 * XFADE
    # group VO: g0->beat0, g1->beat1, g2->beat2, g3->beats3-6, g4->beat7
    need = [v + 0.85 for v in vo]
    # feature block split across 4 beats
    feat = need[3]
    per = feat / 4
    raw = [need[0], need[1], need[2], per, per, per, per, need[4]]
    scale = target_sum / sum(raw)
    durs = [max(2.2, d * scale) for d in raw]
    # ensure each VO group long enough
    groups = [[0], [1], [2], [3, 4, 5, 6], [7]]
    for gi, idxs in enumerate(groups):
        cur = sum(durs[i] for i in idxs)
        if cur < need[gi]:
            s = need[gi] / cur
            for i in idxs:
                durs[i] *= s
    return durs


def build_audio(total: float, durs: list[float], vo: list[float]) -> Path:
    groups = [[0], [1], [2], [3, 4, 5, 6], [7]]
    parts = []
    for gi, idxs in enumerate(groups):
        gdur = sum(durs[i] for i in idxs)
        wav = AUDIO / f"vo-{gi+1:02d}.wav"
        padded = WORK / f"pad-{gi+1:02d}.wav"
        lead = 0.22
        trail = max(0.08, gdur - probe(wav) - lead)
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
                str(wav),
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

    # fit to visual length
    vo_fit = WORK / "vo-fit.wav"
    vd = probe(vo_full)
    if vd > total + 0.05:
        tempo = min(1.08, vd / total)
        run(["ffmpeg", "-y", "-i", str(vo_full), "-filter:a", f"atempo={tempo:.4f},apad=whole_dur={total:.3f}", "-t", f"{total:.3f}", str(vo_fit)])
    else:
        run(["ffmpeg", "-y", "-i", str(vo_full), "-af", f"apad=whole_dur={total:.3f}", "-t", f"{total:.3f}", str(vo_fit)])

    bed = WORK / "bed.wav"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=82:sample_rate=48000:duration={total}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=123:sample_rate=48000:duration={total}",
            "-filter_complex",
            f"[0][1]amix=inputs=2,volume=0.02,afade=t=in:d=1.2,afade=t=out:st={max(0.2,total-1.5):.2f}:d=1.4",
            str(bed),
        ]
    )

    starts = [0.0]
    for d in durs[:-1]:
        starts.append(starts[-1] + d - XFADE)
    schedule = [
        (0.12, "whoosh.wav", 0.4),
        (starts[1] + 0.05, "click.wav", 0.55),
        (starts[2] + 0.08, "whoosh.wav", 0.35),
        (starts[3] + 0.05, "click.wav", 0.5),
        (starts[7] + 0.1, "chime.wav", 0.55),
    ]
    parts_f = ["[0]volume=1.15[vo]", "[1]volume=0.9[bed]"]
    labels = ["[vo]", "[bed]"]
    sfx_in: list[str] = []
    idx = 2
    for delay, name, vol in schedule:
        p = SFX / name
        if not p.exists():
            continue
        sfx_in += ["-i", str(p)]
        ms = int(max(0, delay) * 1000)
        parts_f.append(f"[{idx}]aformat=sample_rates=48000:channel_layouts=mono,volume={vol},adelay={ms}|{ms}[s{idx}]")
        labels.append(f"[s{idx}]")
        idx += 1
    parts_f.append(
        f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0,alimiter=limit=0.94,loudnorm=I=-16:TP=-1.5:LRA=9[aout]"
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
            *sfx_in,
            "-filter_complex",
            ";".join(parts_f),
            "-map",
            "[aout]",
            "-t",
            f"{total:.3f}",
            str(mixed),
        ]
    )
    return mixed


def main() -> None:
    prepare_frames()
    vo_durs = asyncio.run(synth_vo())
    durs = plan_durs(vo_durs)
    print("planned durs", [round(d, 2) for d in durs], "sum", round(sum(durs), 2))

    WORK.mkdir(parents=True, exist_ok=True)
    clips = []
    zooms = [1.10, 1.09, 1.08, 1.10, 1.09, 1.09, 1.10, 1.06]
    for i, ((name, caption, hl), dur, z) in enumerate(zip(BEAT_SOURCES, durs, zooms)):
        src = FRAMES / name
        still = WORK / f"still-{i:02d}.jpg"
        im = grade(cover(Image.open(src), W, H))
        im = highlight(im, hl)
        # oversized for zoom quality
        cover(im, int(W * 1.16), int(H * 1.16)).save(still, quality=95)
        raw = WORK / f"raw-{i:02d}.mp4"
        zoom_clip(still, dur, z, raw)
        cap = WORK / f"cap-{i:02d}.png"
        lower_third(caption, cap)
        final = WORK / f"clip-{i:02d}.mp4"
        overlay_cap(raw, cap, final, dur)
        clips.append(final)
        print(f"clip {i} {dur:.2f}s")

    visual = WORK / "visual.mp4"
    xfade_concat(clips, durs, visual)
    total = probe(visual)
    print(f"visual={total:.2f}s")
    audio = build_audio(total, durs, vo_durs)
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
            "-shortest",
            "-movflags",
            "+faststart",
            str(tmp),
        ]
    )
    # Force exact ~45s if slightly over: trim gently
    final_dur = min(45.2, total)
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp),
            "-t",
            f"{final_dur:.3f}",
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
            "192k",
            "-movflags",
            "+faststart",
            str(OUT),
        ]
    )
    print(f"Wrote {OUT} ({probe(OUT):.2f}s)")


if __name__ == "__main__":
    main()
