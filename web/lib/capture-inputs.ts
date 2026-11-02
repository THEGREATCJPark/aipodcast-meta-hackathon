export type CaptureTrack = Pick<MediaStreamTrack, "readyState" | "enabled" | "muted" | "addEventListener" | "removeEventListener">;

export function assertCaptureInputs(microphone: CaptureTrack[], sharedAudio: CaptureTrack[]): void {
  const usable = (track: CaptureTrack) => track.readyState === "live" && track.enabled && !track.muted;
  if (!sharedAudio.length || !sharedAudio.every(usable)) throw new Error("Shared tab audio is unavailable. Select this tab and enable Share tab audio.");
  if (!microphone.length || !microphone.every(usable)) {
    throw new Error("Your microphone is muted or disconnected. Unmute or reconnect it before recording.");
  }
}

export function watchCaptureInputs(microphone: CaptureTrack[], sharedAudio: CaptureTrack[], onLoss: (message: string) => void): () => void {
  let disposed = false;
  const tracks = [...microphone, ...sharedAudio];
  const dispose = () => {
    disposed = true;
    clearInterval(timer);
    for (const track of tracks) {
      track.removeEventListener("ended", check);
      track.removeEventListener("mute", check);
    }
  };
  const check = () => {
    if (disposed) return;
    try { assertCaptureInputs(microphone, sharedAudio); }
    catch (error) {
      dispose();
      onLoss(error instanceof Error ? error.message : "Capture audio became unavailable.");
    }
  };
  // enabled changes (including app mute) do not emit a MediaStreamTrack event.
  const timer = setInterval(check, 250);
  for (const track of tracks) {
    track.addEventListener("ended", check);
    track.addEventListener("mute", check);
  }
  check();
  return dispose;
}
