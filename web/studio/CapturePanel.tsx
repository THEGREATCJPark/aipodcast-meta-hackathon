import { useEffect, useRef, useState } from "react";
import type { VoiceRoomHandle } from "../lib/voice-room";

/** Local-only screen capture. No recording leaves the browser. */
export function CapturePanel({ mic }: { mic: VoiceRoomHandle | null }) {
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{url:string; name:string} | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const release = useRef<() => void>(() => undefined);
  const resultUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop(); release.current(); if (resultUrl.current) URL.revokeObjectURL(resultUrl.current); }; }, []);
  const start = async () => {
    setPending(true); setError("");
    let screen: MediaStream | undefined;
    let context: AudioContext | undefined;
    try {
      if (!mic) throw new Error("Connect your microphone first. Use headphones to avoid echo.");
      if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") throw new Error("Screen recording is unavailable in this browser. Use Chrome or Edge.");
      screen = await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:true});
      if (!screen.getAudioTracks().length) throw new Error("No tab/system audio was shared. Select this browser tab and enable Share tab audio, then try again.");
      const localTracks = [...mic.room.localParticipant.audioTrackPublications.values()].flatMap(p => p.track?.mediaStreamTrack ? [p.track.mediaStreamTrack] : []);
      if (!localTracks.length || localTracks.every(t => t.readyState !== "live")) throw new Error("No live microphone track. Reconnect your microphone and try again.");
      context = new AudioContext(); await context.resume();
      const destination = context.createMediaStreamDestination();
      context.createMediaStreamSource(new MediaStream(screen.getAudioTracks())).connect(destination);
      context.createMediaStreamSource(new MediaStream(localTracks)).connect(destination);
      const combined = new MediaStream([...screen.getVideoTracks(),...destination.stream.getAudioTracks()]);
      const mimeType = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(t=>MediaRecorder.isTypeSupported(t));
      if (!mimeType) throw new Error("WebM recording is unavailable. Use an external screen recorder.");
      const instance = new MediaRecorder(combined,{mimeType,videoBitsPerSecond:5_000_000});
      recorder.current = instance;
      const chunks: Blob[] = []; const started = Date.now();
      const timer = window.setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),500);
      const limit = window.setTimeout(()=>{if(instance.state!=="inactive")instance.stop();},180000);
      const capturedScreen = screen, capturedContext = context;
      release.current = () => {clearInterval(timer);clearTimeout(limit);capturedScreen.getTracks().forEach(t=>t.stop());destination.stream.getTracks().forEach(t=>t.stop());void capturedContext.close().catch(()=>undefined);};
      instance.ondataavailable = e => { if(e.data.size)chunks.push(e.data); };
      instance.onerror = () => {setError("Capture failed. Any available recording will be offered below; inspect it before use.");if(instance.state!=="inactive")instance.stop();};
      instance.onstop = () => {
        release.current(); recorder.current=null;
        if(!mounted.current)return;
        setRecording(false);
        if(resultUrl.current)URL.revokeObjectURL(resultUrl.current);
        const blob = new Blob(chunks,{type:mimeType});
        if(!blob.size){setError("No video was captured.");return;}
        const url=URL.createObjectURL(blob);resultUrl.current=url;
        setResult({url,name:`cohost-capture-${new Date().toISOString().replace(/[:.]/g,"-")}.webm`});
      };
      screen.getVideoTracks()[0].onended=()=>{if(instance.state!=="inactive")instance.stop();};
      setSeconds(0); instance.start(1000);setRecording(true);
    } catch(e){screen?.getTracks().forEach(t=>t.stop());void context?.close().catch(()=>undefined);setError(e instanceof Error?e.message:"Capture failed");}
    finally{setPending(false);}
  };
  return <details className="capture-panel"><summary>Film your 3-minute demo · local recording</summary>
    <p>Use headphones. Connect your mic, then select this tab with <b>Share tab audio</b>. The capture mixes your mic with guest/AI tab audio. Obtain separate permission to publish every participant’s voice. Nothing uploads automatically.</p>
    <div className="row">{recording?<button className="btn stop" onClick={()=>recorder.current?.stop()}>Stop capture · {seconds}s / 180s</button>:<button className="btn ghost" disabled={pending||!mic} onClick={()=>void start()}>{pending?"Choose screen…":"Record this tab + mic"}</button>}
    {result&&<a className="btn" href={result.url} download={result.name}>Save local WebM</a>}</div>
    {error&&<p role="alert" className="error">{error}</p>}
    {result&&!recording&&<video src={result.url} controls preload="metadata" aria-label="Local recording preview" style={{maxWidth:"100%",maxHeight:280}}/>}
    <p className="hint">Stops at 180 seconds. First record a 10-second test and listen for both voices. Verify the final duration and English captions before submission. Browser capture remains unverified until your test.</p>
  </details>;
}
