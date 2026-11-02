"""Package only explicitly selected synthetic runs and local media. No settings or secrets."""
from pathlib import Path
import json, shutil, wave, hashlib, zipfile, subprocess

root=Path.cwd(); out=root/'output/handoff/claude-v2'
out.mkdir(parents=True,exist_ok=True)
def read(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def copy(src,dst):
    dst.parent.mkdir(parents=True,exist_ok=True)
    if dst.exists():
        if hashlib.sha256(src.read_bytes()).digest()!=hashlib.sha256(dst.read_bytes()).digest(): raise RuntimeError(f'Refusing overwrite: {dst}')
    else: shutil.copy2(src,dst)
def write(path,data): path.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding='utf-8')
paths=sorted((root/'output/probes').glob('conversation-*/evidence.json'))
natural=[(p,read(p)) for p in paths if read(p).get('scenario')=='natural']
selected=[]
for n,(p,e) in enumerate(natural):
    if e.get('startedAt',0)<1793602700000: continue
    name='natural-success' if e.get('ok') else f'natural-failed-{n+1}'
    selected.append((name,p,e))
control=root/'output/probes/video-control-1793596613656/evidence.json'
selected.append(('legacy-manual-hold',control,read(control)))
allowed={'stage','at','runId','jobId','generation','contextRevision','action','reason','speakText','text','query','sourceUtteranceIds','sources','requestedAt','completedAt','elapsedMs','provider','model','resultReady','humansSpeaking','failure','phase','disposition','listenerReceiptMeasured','recordingPreserved','identity','utteranceId','handoff'}
ledger=[]
for name,p,e in selected:
    sid=e.get('sessionId'); folder=out/name; folder.mkdir(exist_ok=True)
    src=root/'output'/sid
    events=[json.loads(s) for s in (src/'events.jsonl').read_text(encoding='utf-8').splitlines() if s.strip()]
    minimal=[dict(id=x['id'],at=x['at'],kind=x['kind'],speaker=x.get('speaker'),text=x['text'],meta={k:v for k,v in x.get('meta',{}).items() if k in allowed}) for x in events if x['kind']=='human' or x.get('meta',{}).get('stage')]
    write(folder/'events.json',minimal)
    transcripts=[x for x in minimal if x['kind']=='human']
    write(folder/'transcript.json',transcripts)
    (folder/'transcript.md').write_text('\n\n'.join(f"**{x.get('speaker') or x.get('meta',{}).get('identity')}**: {x['text']}" for x in transcripts),encoding='utf-8')
    brief={k:e.get(k) for k in ['kind','humanTrial','scenario','gitHead','workingTreeDirty','sessionId','startedAt','sessionStartedAt','finishedAt','ok','error','failureCategories','utterances','firstReceiverObservedAt','firstServerAudioAcceptedAt','receivedNonSilentAiFrames','sameResearchJobSurvivedContinuation','noAiWhileContinuation','noAiBeforeExplicitRequest','reviewDelivered','holdRequestedAt','holdState','lateAiFramesAfterHoldGrace','holdObservation','sources']}
    write(folder/'evidence.json',brief)
    for f in src.glob('*.wav'):
        if f.name in ['mix.wav','mc.wav'] or f.name.startswith('guest-'): copy(f,folder/f.name)
    def stage(s): return next((x for x in minimal if x.get('meta',{}).get('stage')==s),None)
    request=stage('research-request'); complete=stage('research-complete')
    timing={'clockBasis':'Same-computer Date.now event timestamps, not acoustic or sample-accurate timestamps. No cross-device clock subtraction.','humanAcousticEnd':'unavailable','listenerPerceivedAudio':'unavailable','sessionStartedAt':e.get('sessionStartedAt','unavailable'),'requestInputSendEnd':e.get('utterances',[{}, {}, {}])[2].get('syntheticSendEndedAt','unavailable') if e.get('utterances') else 'unavailable','lastInputSendEnd':e['utterances'][-1]['syntheticSendEndedAt'] if e.get('utterances') else 'unavailable','firstReceiverObservedAt':e.get('firstReceiverObservedAt','unavailable')}
    for key,s in [('researchStart','research-request'),('researchComplete','research-complete'),('releaseAfterReview','research-release'),('ttsRequest','tts-request'),('ttsGenerated','tts-generated'),('firstServerAudio','server-first-audio-accepted')]: timing[key]=(stage(s) or {}).get('at','unavailable')
    timing['asrConfirmedEvents']=[{'at':x['at'],'text':x['text'],'identity':x.get('meta',{}).get('identity')} for x in transcripts]
    write(folder/'timing.json',timing)
    ledger.append({'folder':name,'sessionId':sid,'codeSHA':e.get('gitHead'),'ok':e.get('ok'),'inputKind':'synthetic','legacy':name.startswith('legacy')})
legacy=out/'legacy-reference'; legacy.mkdir(exist_ok=True)
for source,target in [('output/video/render-final-v1/submission.mp4','submission-v1-reference.mp4'),('output/video/raw/meta-studio-raw-2026-11-02T05-15-20-510Z.webm','raw-v1.webm'),('output/video/raw/meta-studio-raw-2026-11-02T05-15-20-510Z.json','raw-v1-timing.json')]: copy(root/source,legacy/target)
edge=root/'output/probes/research-edge-1793602856699/evidence.json'
copy(edge,out/'minimal-edge-evidence.json')
copy(root/'output/probes/review-shape-1793602813971.json',out/'review-diagnostic.json')
write(out/'run-ledger.json',ledger)
assets=[]
for f in sorted(out.rglob('*')):
    if not f.is_file() or f.name=='asset-manifest.json':continue
    duration=None
    timecodes=[]
    origin=None
    duration_basis='not applicable'
    if f.suffix=='.wav':
        with wave.open(str(f),'rb') as w: duration=w.getnframes()/w.getframerate()
        duration_basis='WAV sample count'
    if f.suffix=='.webm':
        timing_file=f.with_suffix('.json')
        if f.name=='raw-v1.webm': timing_file=f.with_name('raw-v1-timing.json')
        if timing_file.exists():
            capture=read(timing_file); origin=capture['recorderStartAt']
            duration=(capture['recorderStoppedAt']-origin)/1000
            duration_basis='recorder event duration; not exact presentation timestamps'
            if f.parent.name=='natural-success':
                timecodes=[{'startSeconds':9.86,'endSeconds':28.57,'purpose':'Distributed context and short request','basis':'event-derived estimate'}, {'startSeconds':32.49,'endSeconds':43.77,'purpose':'Same research job while both speakers continue','basis':'event-derived estimate'}, {'startSeconds':51.53,'endSeconds':62,'purpose':'Latest-context release, actual answer, then cleanup HOLD','basis':'event-derived estimate'}]
            elif f.name=='raw-v1.webm':timecodes=[{'startSeconds':96,'endSeconds':125,'purpose':'Older separate manual HOLD run','basis':'manual editing estimate; separate session'}]
    role='evidence or editorial instructions'
    if f.suffix=='.webm':role='unedited actual application recording'
    if f.suffix=='.mp4':role='legacy edited reference only, not new-run proof'; duration=180.01
    if f.suffix=='.wav':role='actual session audio; synthetic input/actual model output'
    if f.suffix=='.png':role='actual UI screenshot; not moving footage'
    row=next((x for x in ledger if f.relative_to(out).parts[0]==x['folder']),None)
    if f.parent.name=='failed-natural': row=next(x for x in ledger if x['folder'].startswith('natural-failed'))
    session_ids=[row['sessionId']] if row else ['2026-11-02_1415_meta_3957','2026-11-02_1416_meta_f05b'] if f.parent.name=='legacy-reference' else []
    assets.append(dict(path=f.relative_to(out).as_posix(),purpose=role,durationSeconds=duration,durationBasis='legacy ffprobe' if f.suffix=='.mp4' else duration_basis,sessionId=row['sessionId'] if row else None,sessionIds=session_ids,inputKind='synthetic' if f.suffix in ['.webm','.wav','.mp4'] or row else 'not applicable',originalEpochMs=origin,originalTimeBasis='See session timing.json or adjacent recorder JSON. Different sessions must not be combined as one run.',editTimecodes=timecodes,bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest()))
write(out/'asset-manifest.json',{'version':2,'relativeRoot':'.','runs':ledger,'assets':assets})
zip_path=out.with_suffix('.zip')
if zip_path.exists():raise RuntimeError('Refusing to overwrite handoff ZIP')
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(out.rglob('*')):
        if f.is_file():z.write(f,f.relative_to(out).as_posix())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    assert all(not n.startswith('/') and '..' not in Path(n).parts and not n.endswith('settings.json') and '.env' not in n for n in z.namelist())
print(json.dumps({'zip':str(zip_path),'files':len(assets)+1,'bytes':zip_path.stat().st_size,'runs':ledger}))
