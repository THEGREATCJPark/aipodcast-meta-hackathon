import { useEffect, useRef, useState } from "react";
import type { VoiceRoomHandle } from "../lib/voice-room";
import { assertCaptureInputs, watchCaptureInputs } from "../lib/capture-inputs";

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
  const starting = useRef(false);
  const currentMic = useRef(mic);
  currentMic.current = mic;
  useEffect(() => {
    if (!mic && recorder.current && recorder.current.state !== "inactive") {
      setError("Microphone disconnected. Capture stopped; inspect the partial recording before use.");
      recorder.current.stop();
    }
  }, [mic]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop(); release.current(); if (resultUrl.current) URL.revokeObjectURL(resultUrl.current); }; }, []);
  const start = async () => {
    if (starting.current || recorder.current) return;
    starting.current = true;
    setPending(true); setError("");
    let screen: MediaStream | undefined;
    let context: AudioContext | undefined;
    let cleanup = () => { screen?.getTracks().forEach(t => t.stop()); void context?.close().catch(() => undefined); };
    try {
      if (!mic) throw new Error("Connect your microphone first. Use headphones to avoid echo.");
      if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") throw new Error("Screen recording is unavailable in this browser. Use Chrome or Edge.");
      screen = await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:true});
      if (!mounted.current) { cleanup(); return; }
      if (currentMic.current !== mic || mic.room.state !== "connected") throw new Error("The voice room changed while choosing a screen. Reconnect and try again.");
      const publications = [...mic.room.localParticipant.audioTrackPublications.values()];
      if (publications.some(p => p.isMuted)) throw new Error("Unmute your microphone before recording.");
      const localTracks = publications.flatMap(p => p.track?.mediaStreamTrack ? [p.track.mediaStreamTrack] : []);
      const sharedAudio = screen.getAudioTracks();
      assertCaptureInputs(localTracks, sharedAudio);
      const videoTrack = screen.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== "live") throw new Error("No live screen video was shared. Try again.");
      context = new AudioContext(); await context.resume();
      if (!mounted.current) { cleanup(); return; }
      if (currentMic.current !== mic || mic.room.state !== "connected") throw new Error("Microphone disconnected before capture started.");
      assertCaptureInputs(localTracks, sharedAudio);
      const destination = context.createMediaStreamDestination();
      context.createMediaStreamSource(new MediaStream(sharedAudio)).connect(destination);
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
      let stopWatching = () => undefined as void;
      cleanup = () => {stopWatching();clearInterval(timer);clearTimeout(limit);capturedScreen.getTracks().forEach(t=>t.stop());destination.stream.getTracks().forEach(t=>t.stop());void capturedContext.close().catch(()=>undefined);};
      release.current = cleanup;
      instance.ondataavailable = e => { if(e.data.size)chunks.push(e.data); };
      instance.onerror = () => {if(mounted.current)setError("Capture failed. Any available recording will be offered below; inspect it before use.");if(instance.state!=="inactive")instance.stop();};
      instance.onstop = () => {
        cleanup(); if(recorder.current === instance) recorder.current=null;
        if(!mounted.current)return;
        setRecording(false);
        const blob = new Blob(chunks,{type:mimeType});
        if(!blob.size){setError("No video was captured. Your previous recording, if any, is still available.");return;}
        if(resultUrl.current)URL.revokeObjectURL(resultUrl.current);
        const url=URL.createObjectURL(blob);resultUrl.current=url;
        setResult({url,name:`cohost-capture-${new Date().toISOString().replace(/[:.]/g,"-")}.webm`});
      };
      videoTrack.onended=()=>{if(instance.state!=="inactive")instance.stop();};
      setSeconds(0); instance.start(1000);setRecording(true);
      stopWatching = watchCaptureInputs(localTracks, sharedAudio, message => {
        if(mounted.current)setError(`${message} Capture stopped; inspect the partial recording before use.`);
        if(instance.state!=="inactive")instance.stop();
      });
    } catch(e){cleanup(); recorder.current=null; if(mounted.current)setError(e instanceof Error?e.message:"Capture failed");}
    finally{starting.current=false;if(mounted.current)setPending(false);}
  };
  return <details className="capture-panel"><summary>Film your 3-minute demo · local recording</summary>
    <p>Use headphones. Connect your mic, then select this tab with <b>Share tab audio</b>. The capture mixes your mic with guest/AI tab audio. Obtain separate permission to publish every participant’s voice. Nothing uploads automatically.</p>
    <div className="row">{recording?<button className="btn stop" onClick={()=>{if(recorder.current && recorder.current.state!=="inactive")recorder.current.stop();}}>Stop capture · {seconds}s / 180s</button>:<button className="btn ghost" disabled={pending||!mic} onClick={()=>void start()}>{pending?"Choose screen…":"Record this tab + mic"}</button>}
    {result&&<a className="btn" href={result.url} download={result.name}>Save local WebM</a>}</div>
    {error&&<p role="alert" className="error">{error}</p>}
    {result&&!recording&&<video src={result.url} controls preload="metadata" aria-label="Local recording preview" style={{maxWidth:"100%",maxHeight:280}}/>}
    <p className="hint">Stops at 180 seconds. First record a 10-second test and listen for both voices. Verify the final duration and English captions before submission. Browser capture remains unverified until your test.</p>
  </details>;
}
