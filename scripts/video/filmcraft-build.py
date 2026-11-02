"""Build an auditable local FilmCraft project from a media timeline manifest.

No uploads or provider calls. All edits/export use FilmCraft's documented CLI.
Manifest: outputDir, duration (default 180), clips [{path,timelineStart,duration,
sourceIn=0,audio=false}], audio [{path,timelineStart,duration,sourceIn=0}],
optional narrationWAV (at zero), captionsSRT, previewSeconds, width, height, fps.
Paths are resolved relative to the manifest. --no-export prepares project only.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import subprocess
import wave

DEFAULT_CLI = Path("C:/Users/cik61/Documents/Codex/2026-11-02/ai-https-github-com-storytold-filmcraft/work/tools/filmcraft/filmcraft-0.16.0-windows-x64-portable/filmcraft-cli.exe")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--cli", type=Path, default=DEFAULT_CLI)
    parser.add_argument("--no-export", action="store_true")
    args = parser.parse_args()
    manifest = args.manifest.resolve()
    spec = json.loads(manifest.read_text(encoding="utf-8-sig"))
    def path(value):
        p = Path(value)
        return (p if p.is_absolute() else manifest.parent / p).resolve()
    out = path(spec["outputDir"])
    out.mkdir(parents=True, exist_ok=True)
    project = out / "submission.fcproj"
    movie = out / "submission.mp4"
    if project.exists() or movie.exists():
        raise ValueError("Choose a new outputDir; existing project/video will not be overwritten.")
    duration = float(spec.get("duration", 180))
    width, height, fps = int(spec.get("width", 1920)), int(spec.get("height", 1080)), float(spec.get("fps", 30))
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError("Duration must be finite and positive")
    audit = []
    def run(command, params, initial=False):
        argv = [str(args.cli)]
        if not initial:
            argv += ["--project", str(project)]
        argv += ["--save-as", str(project), "exec", command, json.dumps(params, ensure_ascii=False)]
        result = subprocess.run(argv, capture_output=True, encoding="utf-8", errors="replace")
        if result.returncode:
            raise RuntimeError(f"FilmCraft {command}: {result.stderr} {result.stdout}")
        data = json.loads(result.stdout)
        audit.append({"command": command, "params": params, "result": data})
        (out / "filmcraft-commands.json").write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
        return data
    def inspect(kind):
        result = subprocess.run([str(args.cli), "--project", str(project), "inspect", kind], capture_output=True, encoding="utf-8", errors="replace", check=True)
        info = json.loads(result.stdout)
        (out / f"{kind}-inspect.json").write_text(json.dumps(info, indent=2, ensure_ascii=False), encoding="utf-8")
        return info
    imported = {}
    def import_item(source):
        source = path(source)
        if not source.is_file():
            raise FileNotFoundError(source)
        if source in imported:
            return imported[source]
        result = run("file.import", {"paths": [str(source)]})
        info = inspect("project")
        candidates = []
        def walk(obj):
            if isinstance(obj, dict):
                if "item" in obj and obj.get("name") == source.name:
                    candidates.append(obj)
                for v in obj.values(): walk(v)
            elif isinstance(obj, list):
                for v in obj: walk(v)
        walk(info)
        if len(candidates) != 1:
            raise ValueError(f"Ambiguous import name {source.name}; give media unique filenames. Import result: {result}")
        imported[source] = candidates[0]["item"]
        return imported[source]
    def timing(clip):
        start, length, source_in = float(clip.get("timelineStart", 0)), float(clip["duration"]), float(clip.get("sourceIn", 0))
        if not all(math.isfinite(n) for n in (start, length, source_in)) or start < 0 or source_in < 0 or length <= 0 or start + length > duration + 1 / fps:
            raise ValueError(f"Invalid/out-of-range clip timing: {clip}")
        return start, length, source_in
    visuals = spec["clips"]
    if not visuals: raise ValueError("At least one visual is required")
    # Require complete non-overlapping visual coverage; don't silently fill black gaps.
    cursor = 0.0
    for clip in sorted(visuals, key=lambda c: c.get("timelineStart", 0)):
        start, length, _ = timing(clip)
        if abs(start - cursor) > 0.5 / fps: raise ValueError("Visual timeline has a gap or overlap")
        cursor = start + length
    if abs(cursor - duration) > 0.5 / fps: raise ValueError("Visual timeline must end at duration")
    run("file.newSequence", {"name": spec.get("name", "Meta Conversation Co-host — Submission"), "width": width, "height": height, "fps": fps, "sampleRate": 48000, "video": 1, "audio": max(3, len(spec.get("audio", [])) + 2)}, initial=True)
    for clip in visuals:
        start, length, source_in = timing(clip)
        run("timeline.place", {"item": import_item(clip["path"]), "track": "V1", "audioTrack": "A1", "seconds": start, "sourceIn": {"seconds": source_in}, "duration": {"seconds": length}, "video": True, "audio": bool(clip.get("audio", False)), "insert": False})
    sounds = list(spec.get("audio", []))
    if spec.get("narrationWAV"):
        with wave.open(str(path(spec["narrationWAV"])), "rb") as w:
            length = w.getnframes() / w.getframerate()
        sounds.insert(0, {"path": spec["narrationWAV"], "timelineStart": 0, "duration": min(length, duration)})
    for index, clip in enumerate(sounds):
        start, length, source_in = timing(clip)
        run("timeline.place", {"item": import_item(clip["path"]), "track": f"A{index+2}", "seconds": start, "sourceIn": {"seconds": source_in}, "duration": {"seconds": length}, "video": False, "audio": True, "insert": False})
    if spec.get("captionsSRT"):
        caption_track = run("captions.import", {"path": str(path(spec["captionsSRT"])), "name": "English captions"})["track"]
        run("captions.setStyle", {"track": caption_track, "font": "Arial", "fontStyle": "Bold", "size": 38, "color": "#FFFFFF", "outline": 2, "outlineColor": "#000000", "background": True, "backgroundColor": "#000000B0", "margin": 0.06})
    inspect("project")
    inspect("sequence")
    for seconds in spec.get("previewSeconds", [0, duration/2, duration-1]):
        if not 0 <= seconds < duration: raise ValueError("Preview outside timeline")
        target = out / f"preview-{float(seconds):07.2f}.png"
        subprocess.run([str(args.cli), "--project", str(project), "render", "--seconds", str(seconds), "--out", str(target)], check=True, capture_output=True)
    if not args.no_export:
        result = run("file.exportMedia", {"path": str(movie), "format": "h264", "width": width, "height": height, "fps": fps, "bitrateKbps": int(spec.get("bitrateKbps", 8000)), "hardwareEncoding": "auto", "burnCaptions": bool(spec.get("captionsSRT")), "range": "custom", "startSeconds": 0, "endSeconds": duration, "wait": True})
        (out / "render-result.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
        if result.get("offlineMedia"): raise RuntimeError("FilmCraft rendered offline media")
        print(json.dumps({"project": str(project), "video": str(movie), "render": result}))
    else:
        print(json.dumps({"project": str(project), "exported": False}))


if __name__ == "__main__":
    main()
