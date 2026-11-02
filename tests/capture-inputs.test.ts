import test from "node:test";
import assert from "node:assert/strict";
import { assertCaptureInputs, watchCaptureInputs, type CaptureTrack } from "../web/lib/capture-inputs.js";

function track(overrides: Partial<CaptureTrack> = {}): CaptureTrack & EventTarget {
  return Object.assign(new EventTarget(), { readyState: "live" as const, enabled: true, muted: false }, overrides);
}

test("capture refuses a disabled or device-muted microphone instead of recording silence", () => {
  assert.throws(() => assertCaptureInputs([track({ enabled: false })], [track()]), /microphone/i);
  assert.throws(() => assertCaptureInputs([track({ muted: true })], [track()]), /microphone/i);
});

test("capture refuses ended or disabled shared audio", () => {
  assert.throws(() => assertCaptureInputs([track()], [track({ readyState: "ended" })]), /shared|tab/i);
  assert.throws(() => assertCaptureInputs([track()], [track({ enabled: false })]), /shared|tab/i);
});

test("capture accepts live enabled microphone and shared audio", () => {
  assert.doesNotThrow(() => assertCaptureInputs([track()], [track()]));
});

test("capture reports lost audio once and cleanup removes listeners", () => {
  const mic = track(); const tab = track(); const losses: string[] = [];
  const stop = watchCaptureInputs([mic], [tab], message => losses.push(message));
  Object.assign(tab, { readyState: "ended" });
  tab.dispatchEvent(new Event("ended"));
  tab.dispatchEvent(new Event("mute"));
  stop();
  assert.equal(losses.length, 1);
  assert.match(losses[0], /tab/i);
  const second = watchCaptureInputs([mic], [track()], message => losses.push(message));
  second(); Object.assign(mic, { muted: true });
  mic.dispatchEvent(new Event("mute"));
  assert.equal(losses.length, 1);
});

test("capture detects disabled microphone even when browser emits no event", async () => {
  const mic = track(); const losses: string[] = [];
  const stop = watchCaptureInputs([mic], [track()], message => losses.push(message));
  try {
    mic.enabled = false;
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.equal(losses.length, 1);
    assert.match(losses[0], /microphone/i);
  } finally { stop(); }
});
