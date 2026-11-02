"""Package one explicitly selected synthetic podcast run. Never copies settings or env."""
from pathlib import Path
import json, hashlib, shutil, sys, wave, zipfile

root = Path.cwd()
evidence_path = Path(sys.argv[1])
video_path = Path(sys.argv[2])
out = root / (sys.argv[3] if len(sys.argv) > 3 else 'output/handoff/claude-v3')
out.mkdir(parents=True, exist_ok=True)
e = json.loads(evidence_path.read_text(encoding='utf-8'))
assert e['scenario'] == 'podcast'
session = root / 'output' / e['sessionId']
def write(name, value):
    (out / name).write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding='utf-8')
def copy(src, name):
    target = out / name
    if target.exists() and target.read_bytes() != src.read_bytes():
        raise RuntimeError(f'Refusing overwrite: {target.name}')
    shutil.copy2(src, target)
copy(evidence_path, 'evidence.json')
copy(video_path, 'actual-app-screen.webm')
for p in session.glob('*.wav'):
    if p.name in ['mix.wav', 'mc.wav'] or p.name.startswith('guest-'):
        copy(p, p.name)
allowed = {'stage','jobId','action','reason','speakText','query','sources','identity','utteranceId','requestedAt','completedAt','elapsedMs','model','provider','resultReady','humansSpeaking','failure','phase','disposition','listenerReceiptMeasured','contextRevision'}
events = [json.loads(line) for line in (session/'events.jsonl').read_text(encoding='utf-8').splitlines() if line.strip()]
events = [dict(id=x['id'], at=x['at'], kind=x['kind'], speaker=x.get('speaker'), text=x.get('text'), meta={k:v for k,v in x.get('meta',{}).items() if k in allowed}) for x in events if x['kind']=='human' or x.get('meta',{}).get('stage')]
write('events.json', events)
write('transcript.json', [x for x in events if x['kind']=='human'])
(out/'transcript.md').write_text('\n\n'.join(f"**{x.get('speaker')}**: {x['text']}" for x in events if x['kind']=='human'),encoding='utf-8')
assets=[]
for p in sorted(out.iterdir()):
    if not p.is_file() or p.name=='asset-manifest.json': continue
    duration=None
    if p.suffix=='.wav':
        with wave.open(str(p),'rb') as wav: duration=wav.getnframes()/wav.getframerate()
    assets.append(dict(path=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),wavDurationSeconds=duration))
write('asset-manifest.json', dict(sessionId=e['sessionId'],codeSHA=e['gitHead'],workingTreeDirty=e['workingTreeDirty'],synthetic=True,assets=assets))
archive=out.with_suffix('.zip')
if '--no-archive' in sys.argv:
    print(json.dumps(dict(folder=str(out), sessionId=e['sessionId'], ok=e.get('ok'))))
    sys.exit(0)
if archive.exists(): raise RuntimeError('Refusing to overwrite ZIP')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(out.iterdir()):
        if p.is_file(): z.write(p,p.name)
with zipfile.ZipFile(archive) as z: assert z.testzip() is None
print(json.dumps(dict(archive=str(archive),bytes=archive.stat().st_size,sha256=hashlib.sha256(archive.read_bytes()).hexdigest())))
