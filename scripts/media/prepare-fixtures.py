"""Split generated Gemini dialogue at aligned turn boundaries; retain its native timing.
Requires podcast-{hosts,followup}.wav, matching request JSON and Whisper word JSON.
Only prepares synthetic input. The app still transcribes it with Meta during the run.
"""
import difflib, hashlib, json, re, wave
from pathlib import Path

root=Path(__file__).resolve().parents[2]/'output/media-v6'
out=root/'fixtures';out.mkdir(exist_ok=True)
turns=[];alignment=[]
def tokens(s):return re.findall(r'[a-z0-9]+',s.lower())
for name in ['podcast-hosts','podcast-followup']:
    request=json.loads((root/(name+'-request.json')).read_text(encoding='utf8'))
    source=json.loads((root/(name+'.json')).read_text(encoding='utf8'))
    rows=request['input'][0]['content']
    words=json.loads((root/(name+'.words.json')).read_text(encoding='utf8'))['words']
    expected=[];boundaries=[]
    for row in rows:expected.extend(tokens(row['text']));boundaries.append(len(expected))
    heard=[];heard_words=[]
    for word in words:
        for token in tokens(word['word']):heard.append(token);heard_words.append(word)
    matcher=difflib.SequenceMatcher(None,expected,heard,autojunk=False)
    anchors={a+i:b+i for a,b,n in matcher.get_matching_blocks() for i in range(n)}
    ratio=len(anchors)/len(expected)
    assert ratio>.8,('Low transcript alignment',name,ratio)
    with wave.open(str(root/(name+'.wav')),'rb') as w:
        assert (w.getframerate(),w.getnchannels(),w.getsampwidth())==(24000,1,2)
        audio=w.readframes(w.getnframes());duration=len(audio)/48000
    cuts=[0.0]
    for boundary in boundaries[:-1]:
        left=max(i for i in anchors if i<boundary);right=min(i for i in anchors if i>=boundary)
        assert boundary-left<=4 and right-boundary<=3,(name,boundary,'ambiguous turn boundary')
        a=heard_words[anchors[left]]['end'];b=heard_words[anchors[right]]['start']
        assert a<=b+.06,(name,'overlap cannot safely be assigned to separate speakers')
        cuts.append((a+b)/2)
    cuts.append(duration)
    for row,a,b in zip(rows,cuts,cuts[1:]):
        speaker=row['annotations'][0]['speaker'];index=len(turns);path=f'turn-{index:02}.pcm'
        clip=audio[round(a*24000)*2:round(b*24000)*2];assert 0<len(clip)<=24000*2*30
        (out/path).write_bytes(clip)
        turns.append(dict(path=path,speaker=0 if speaker=='Alex' else 1,text=row['text'],voice='Puck' if speaker=='Alex' else 'Charon',
          gapMs=0,preservePadding=True,sha256=hashlib.sha256(clip).hexdigest(),sourceFile=name+'.wav',sourceStart=a,sourceEnd=b))
    alignment.append(dict(file=name+'.wav',matchedTokenShare=ratio,turnCuts=cuts,sourceSha256=source['sha256']))
manifest=dict(provider='Google Gemini',model='gemini-3.8-flash-tts',sampleRate=24000,channels=1,format='pcm16le',
  timing='Native generated dialogue timing retained; no added gap between turns inside each generated part.',alignment=alignment,turns=turns)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print(json.dumps(dict(manifest=str(out/'manifest.json'),turns=len(turns),alignment=alignment)))
