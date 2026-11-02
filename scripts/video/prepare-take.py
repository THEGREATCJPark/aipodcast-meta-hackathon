"""Prepare editorial framing and a FilmCraft manifest for the verified Nov 2 take."""
from pathlib import Path
import json, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont

root = Path.cwd()
out = root / 'output/video'
assets = out / 'assets'
ff = Path('C:/Users/cik61/Documents/Codex/2026-11-02/ai-https-github-com-storytold-filmcraft/work/.venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
raw = out / 'raw/meta-studio-raw-2026-11-02T05-15-20-510Z.webm'
bg = Image.new('RGB', (1920,1080), '#0b1019')
d = ImageDraw.Draw(bg)
def txt(x,y,s,size=34,color='#edf4ff',bold=False):
    d.multiline_text((x,y),s,font=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',size),fill=color,spacing=14)
txt(90,90,'ACTUAL APPLICATION RECORDING',24,'#a8e7dc',True)
txt(90,190,'A research producer.\nInside the conversation.',53,bold=True)
txt(90,390,'Two synthetic speakers\nActual Meta API responses\nOpenAI speech synthesis',32)
txt(90,600,'Listen → look up → review → speak\nOperator HOLD cancels output',30,'#a8e7dc')
txt(90,800,'Original playback speed.\nSetup time removed between runs.\nThis is not a human trial.',27,'#becbdc')
bg.save(assets/'demo-frame.png')
framed = out/'raw/framed-take.mp4'
if not framed.exists():
    subprocess.run([str(ff),'-v','error','-loop','1','-i',str(assets/'demo-frame.png'),'-i',str(raw),'-filter_complex','[1:v]scale=-2:1000[v];[0:v][v]overlay=1130:40:shortest=1[out]','-map','[out]','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','20','-r','30','-c:a','aac','-b:a','192k','-t','129.07',str(framed)],check=True)
narr = json.loads((assets/'narration.json').read_text(encoding='utf-8'))
byid = {x['id']:x for x in narr}
clips=[]; sounds=[]; captions=[]
def card(name,start,duration,narration=None):
    clips.append(dict(path=str(assets/f'card-{name}.png'),timelineStart=start,duration=duration))
    if narration:
        n=byid[narration]
        sounds.append(dict(path=str(root/n['path']),timelineStart=start,duration=n['seconds']))
        words=n['text'].split(); groups=[words[i:i+13] for i in range(0,len(words),13)]
        for i,g in enumerate(groups):
            captions.append((start+n['seconds']*i/len(groups),start+n['seconds']*(i+1)/len(groups),' '.join(g)))
card('opening',0,13,'intro')
card('disclosure',13,11,'disclosure')
clips.append(dict(path=str(framed),timelineStart=24,duration=70,sourceIn=17,audio=True))
card('research',94,14,'evidence')
card('control',108,14,'control')
clips.append(dict(path=str(framed),timelineStart=122,duration=29,sourceIn=96,audio=True))
card('architecture',151,20,'engineering')
card('closing',171,9,'closing')
e=json.loads((root/'output/probes/conversation-1793596536183/evidence.json').read_text(encoding='utf-8'))
epoch=1793596521524
for u in e['utterances']:
    a=24+(u['syntheticSendStartedAt']-epoch)/1000-17
    b=24+(u['syntheticSendEndedAt']-epoch)/1000-17
    words=u['text'].split(); groups=[words[i:i+12] for i in range(0,len(words),12)]
    for i,g in enumerate(groups): captions.append((a+(b-a)*i/len(groups),a+(b-a)*(i+1)/len(groups),' '.join(g)))
# Exact text from the actual TTS request, not an invented model answer.
answer='According to Vernor Vinge - Wikipedia, the author was Vernor Vinge, whose 1993 essay was “The Coming Technological Singularity: How to Survive in the Post-Human Era”.'
words=answer.split(); groups=[words[i:i+10] for i in range(0,len(words),10)]
a=24+(e['firstReceiverObservedAt']-epoch)/1000-17
for i,g in enumerate(groups): captions.append((a+11.0625*i/len(groups),a+11.0625*(i+1)/len(groups),' '.join(g)))
def stamp(s):
    ms=round(s*1000); return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
srt=out/'submission-en.srt'
srt.write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n'+ '\n'.join(textwrap.wrap(t,58)) for i,(a,b,t) in enumerate(sorted(captions)))+'\n',encoding='utf-8')
spec=dict(outputDir='render-final-v1',duration=180,clips=clips,audio=sounds,captionsSRT=str(srt),previewSeconds=[5,18,55,88,112,145,159,176])
(out/'submission-manifest.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
print('Prepared actual-take framing, captions and 180-second FilmCraft manifest.')

