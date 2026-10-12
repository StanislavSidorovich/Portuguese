"""Озвучка аудиоурока: сценарий → один mp3.

    tools/audiolesson/.venv/Scripts/python.exe tools/audiolesson/build.py lessons/comer.txt

Сначала гоняет check-lesson.js и при ошибке не озвучивает ничего. Каждая
реплика синтезируется отдельно и кладётся в cache/ под хешем голоса,
скорости и текста: правка одной фразы переозвучивает одну фразу, а не урок.
Паузы — тишина из ffmpeg. Итог — out/<имя>.mp3 и оглавление out/<имя>.txt
с метками времени частей.

Голоса — нейроголоса Edge через edge-tts (неофициальный доступ, нужен
интернет). Те же имена голосов есть в официальном Azure Speech: если edge-tts
сломается, меняется только synth().

truststore: Kaspersky подменяет HTTPS своим сертификатом, и certifi его не
знает. truststore проверяет цепочку по хранилищу Windows — проверка остаётся
включённой, просто доверие берётся у системы.
"""

import asyncio
import hashlib
import re
import subprocess
import sys
from pathlib import Path

import truststore

truststore.inject_into_ssl()

import edge_tts  # noqa: E402  — после inject_into_ssl, иначе возьмёт certifi
import imageio_ffmpeg  # noqa: E402

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"
OUT = HERE / "out"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# голос, обычная скорость, медленная скорость
VOICES = {
    "R": ("ru-RU-SvetlanaNeural", "+0%", "+0%"),
    "P": ("pt-PT-DuarteNeural", "-5%", "-30%"),
    "W": ("pt-PT-RaquelNeural", "-5%", "-30%"),
}
GAP = 0.35          # тишина между соседними репликами, с
RATE_HZ = "24000"   # edge-tts отдаёт 24 кГц моно — склеиваем в том же формате

LINE = re.compile(r"^([A-Z])(-?):\s+(.+)$")
PAUSE = re.compile(r"^\[(\d+(?:\.\d+)?)\]$")


def parse(path):
    """Тот же разбор, что в check-lesson.js; ошибки разметки ловит он."""
    items = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line == "#" or line.startswith("# "):
            continue
        if line.startswith("## "):
            items.append(("head", line[3:]))
        elif m := PAUSE.match(line):
            items.append(("pause", float(m[1])))
        elif m := LINE.match(line):
            voice, rate, slow = VOICES[m[1]]
            items.append(("say", voice, slow if m[2] else rate, m[3]))
    return items


def ffmpeg(*args):
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def duration(path):
    # ffmpeg без ffprobe: длительность из строки «Duration:» в stderr.
    r = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True,
                       encoding="utf-8", errors="replace")  # теги кириллицей, а консоль cp1252
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def silence(sec):
    path = CACHE / f"sil_{int(sec * 1000)}.mp3"
    if not path.exists():
        ffmpeg("-f", "lavfi", "-i", f"anullsrc=r={RATE_HZ}:cl=mono", "-t", str(sec),
               "-c:a", "libmp3lame", "-b:a", "48k", str(path))
    return path


# Edge оставляет ~0,2 с тишины до фразы и ~1 с после. На сотне реплик это
# две лишние минуты, и паузы выходят длиннее, чем размечено в сценарии, —
# поэтому края срезаются, и пауза в файле равна паузе в сценарии.
TRIM = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse")


# Сырой ответ Edge хранится в cache/raw отдельно от обрезанного: поменять
# обрезку — дело ffmpeg, а не новой озвучки.
async def synth(voice, rate, text, sem):
    key = hashlib.sha1(f"{voice}|{rate}|{text}".encode()).hexdigest()[:16]
    raw = CACHE / "raw" / f"{key}.mp3"
    path = CACHE / f"{key}.trim1.mp3"
    if not raw.exists():
        async with sem:
            tmp = raw.with_suffix(".part")
            await edge_tts.Communicate(text, voice, rate=rate).save(str(tmp))
            tmp.replace(raw)
    if not path.exists():
        ffmpeg("-i", str(raw), "-af", TRIM, "-ar", RATE_HZ, "-ac", "1",
               "-c:a", "libmp3lame", "-b:a", "48k", str(path))
    return path


async def render(items):
    # Фразы в уроке повторяются нарочно, а две задачи на одну фразу пишут
    # в один и тот же файл. Поэтому озвучивается каждая уникальная — один раз.
    sem = asyncio.Semaphore(4)
    says = [tuple(rest) for kind, *rest in items if kind == "say"]
    uniq = list(dict.fromkeys(says))
    done = dict(zip(uniq, await asyncio.gather(*(synth(*s, sem) for s in uniq))))
    return iter(done[s] for s in says)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        sys.exit("укажи файл сценария, например lessons/comer.txt")
    src = Path(sys.argv[1])
    if not src.is_absolute() and not src.exists():
        src = HERE / src
    name = src.stem

    check = subprocess.run(["node", str(HERE / "check-lesson.js"), str(src)])
    if check.returncode:
        sys.exit("сценарий не прошёл проверку — не озвучиваю")

    (CACHE / "raw").mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)
    items = parse(src)
    voiced = asyncio.run(render(items))

    parts, toc, t = [], [], 0.0
    gap = silence(GAP)
    for kind, *rest in items:
        if kind == "head":
            toc.append(f"{int(t // 60):02d}:{int(t % 60):02d}  {rest[0]}")
            continue
        seg = next(voiced) if kind == "say" else silence(rest[0])
        parts += [seg, gap] if kind == "say" else [seg]
        t += duration(seg) + (GAP if kind == "say" else 0)

    listing = CACHE / f"{name}.concat"
    listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    mp3 = OUT / f"{name}.mp3"
    ffmpeg("-f", "concat", "-safe", "0", "-i", str(listing),
           "-c:a", "libmp3lame", "-b:a", "64k", "-ar", RATE_HZ, "-ac", "1",
           "-metadata", f"title=Аудиоурок · {name}", "-metadata", "album=Português · Situações",
           str(mp3))
    (OUT / f"{name}.txt").write_text("\n".join(toc) + "\n", encoding="utf-8")

    total = duration(mp3)
    print(f"  ✓ {mp3.relative_to(HERE.parent.parent)} — {int(total // 60)}:{int(total % 60):02d}")
    print("\n".join("    " + x for x in toc))


if __name__ == "__main__":
    main()
