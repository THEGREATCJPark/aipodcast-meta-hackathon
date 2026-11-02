"""Verify the actual exported video, without claiming human listening review."""
from pathlib import Path
import subprocess, json, hashlib
import numpy as np

out=Path('output/video')
movie=out/'render-final-v1/submission.mp4'
ff='C:/Users/cik61/Documents/Codex/2026-11-02/ai-https-github-com-storytold-filmcraft/work/.venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
probe='C:/Users/cik61/AppData/Local/Overwolf/Extensions/ncfplpkmiejjaklknfnkgcpapnhkggmlcppckhcb/270.0.23/obs/bin/64bit/ffprobe.exe'
info=json.loads(subprocess.check_output([probe,'-v','quiet','-show_streams','-show_format','-of','json',str(movie)]))
decode=subprocess.run([ff,'-v','error','-i',str(movie),'-f','null','-'],capture_output=True)
def pcm(path,start,length):
    data=subprocess.check_output([ff,'-v','error','-ss',str(start),'-i',str(path),'-t',str(length),'-vn','-ac','1','-ar','8000','-f','f32le','-'])
    return np.frombuffer(data,dtype='<f4').astype(float)
checks=[]
raw=out/'raw/meta-studio-raw-2026-11-02T05-15-20-510Z.webm'
for name,dest,source,length in [('research',24,17,70),('manual-hold',122,96,29)]:
    a=pcm(movie,dest,length); b=pcm(raw,source,length)
    n=min(len(a),len(b)); a=a[:n]; b=b[:n]
    size=1<<(2*n-1).bit_length()
    c=np.fft.irfft(np.fft.rfft(a,size)*np.conj(np.fft.rfft(b,size)),size)
    candidates=np.concatenate([c[:1601],c[-1600:]])
    corr=float(candidates.max()/np.sqrt(np.dot(a,a)*np.dot(b,b)))
    checks.append(dict(segment=name,normalizedAudioCorrelation=corr,nonSilent=bool(np.max(np.abs(a))>.01),passed=corr>.95))
duration=float(info['format']['duration'])
v=next(s for s in info['streams'] if s['codec_type']=='video')
result=dict(durationSeconds=duration,width=v['width'],height=v['height'],frames=v.get('nb_frames'),codec=v['codec_name'],sha256=hashlib.sha256(movie.read_bytes()).hexdigest(),bytes=movie.stat().st_size,fullDecodePassed=decode.returncode==0 and not decode.stderr,audioPreservation=checks,humanListeningReview=False,notes=['Visual previews reviewed separately.','Subtitles use source text and event timing; word-level synchronization is approximate.','Synthetic demonstration, not human or acoustic interruption testing.'])
result['passed']=result['fullDecodePassed'] and abs(duration-180)<.1 and v['width']==1920 and v['height']==1080 and all(c['passed'] for c in checks)
(out/'render-final-v1/quality-check.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
raise SystemExit(0 if result['passed'] else 1)
