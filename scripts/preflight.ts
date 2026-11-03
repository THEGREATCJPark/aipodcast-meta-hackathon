/** Read-only local preparation checks. Never starts a session or requests microphone access. */
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { request as httpRequest } from "node:http";
import { WebSocket } from "ws";

const base = "http://localhost:4400";
const checks: { name: string; passed: boolean }[] = [];
const check = (name: string, passed: boolean) => checks.push({ name, passed });
const request = (path: string, options: RequestInit = {}) => fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(5000) });
try {
  const response = await request("/api/state");
  const payload = await response.json();
  const status = payload?.data?.status;
  check("Studio state responds", response.ok && payload.success === true && !!status);
  check("Meta, selected speech provider and LiveKit configuration present (not an access test)", !!status?.metaConfigured && (status?.ttsProvider === 'gemini' ? !!status?.geminiConfigured : !!status?.openaiConfigured) && !!status?.livekitConfigured);
  check("Studio idle before rehearsal", status?.sessionActive === false && status?.recording === false && status?.agentInRoom === false);
  check("Meta selected", payload?.data?.settings?.engine === "meta");
  check("Research PD enabled for the planned spoken-lookup scene", payload?.data?.settings?.researchEnabled === true);
  const forbidden = await request("/api/control", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://untrusted.invalid", "x-studio": "1" }, body: JSON.stringify({ action: "hold" }) });
  check("Foreign origin cannot control studio", forbidden.status === 403);
  const noMarker = await request("/api/control", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ action: "hold" }) });
  check("Missing studio marker cannot control studio", noMarker.status === 403);
  // Fetch may replace Host; use HTTP directly so this exercises the actual guard.
  const foreignHostStatus = await new Promise<number>((done) => {
    const req = httpRequest(`${base}/api/state`, { headers: { Host: "untrusted.invalid" } }, response => {
      response.resume(); done(response.statusCode ?? 0);
    });
    req.setTimeout(5000, () => req.destroy());
    req.once("error", () => done(0)); req.end();
  });
  check("Foreign host rejected", foreignHostStatus === 403);
  await new Promise<void>((done) => {
    const socket = new WebSocket("ws://localhost:4400/ws", { origin: base });
    const timer = setTimeout(() => { check("Live studio update channel", false); socket.terminate(); done(); }, 5000);
    socket.once("message", (raw) => {
      let valid = false;
      try { const message = JSON.parse(raw.toString()); valid = message.type === "history" && Array.isArray(message.entries); } catch {}
      clearTimeout(timer); check("Live studio update channel", valid); socket.close(); done();
    });
    socket.once("error", () => { clearTimeout(timer); check("Live studio update channel", false); done(); });
  });
} catch { check("Local server reachable and readable within timeout", false); }
const report = {
  checkedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  workingTreeDirty: !!execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  scope: "Read-only local configuration, idle state and API access controls. No microphone, capture, human acceptance or paid provider call.",
  checks, passed: checks.every(c => c.passed),
  pending: ["Actual two-human rehearsal and perceived response timing", "10-second microphone + guest + AI capture and playback", "External guest page hosting/connection if used", "Public release consent and final submission approval"],
};
const dir = resolve("output/preflight");
await mkdir(dir, { recursive: true });
await writeFile(resolve(dir, "latest.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
