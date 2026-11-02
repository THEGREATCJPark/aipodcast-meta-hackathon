import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { resolve } from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import type { ServerMessage } from "../shared/events.js";
import { McAgent } from "./agent/mc-agent.js";
import { StudioBus } from "./bus.js";
import { env, livekitConfig } from "./config.js";
import { listGeminiLiveModels } from "./engines/gemini-rest.js";
import { generatePrompts, listModels } from "./engines/openai-rest.js";
import { createToken, inviteLink } from "./livekit/tokens.js";
import { SettingsStore } from "./settings/store.js";

const HOST = "127.0.0.1";
const dataDir = resolve(env.DATA_DIR);
const bus = new StudioBus(resolve(env.OUTPUT_DIR));
const store = new SettingsStore(dataDir);
const agent = new McAgent({
  bus,
  metaKey: () => env.META_API_KEY,
  openaiKey: () => env.OPENAI_API_KEY,
  geminiKey: () => env.GEMINI_API_KEY,
  livekit: () => {
    const cfg = livekitConfig();
    if (!cfg) return null;
    return {
      url: cfg.url,
      agentToken: async (room) => (await createToken(cfg, { room, role: "agent", name: "AI MC", ttlSeconds: 6 * 3600 })).token,
    };
  },
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

const allowedHosts = new Set([`${HOST}:${env.PORT}`, `localhost:${env.PORT}`]);

/** 로컬 전용: 다른 사이트에서 오는 요청(DNS rebinding·CSRF)을 막는다. */
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!allowedHosts.has(req.headers.host ?? "")) return res.status(403).json({ success: false, error: "허용되지 않은 Host" });
  if (req.method !== "GET" && req.path.startsWith("/api/")) {
    const origin = req.headers.origin;
    const okOrigin = origin && [...allowedHosts].some((h) => origin === `http://${h}`);
    if (!okOrigin || req.headers["x-studio"] !== "1") return res.status(403).json({ success: false, error: "허용되지 않은 요청 출처" });
  }
  next();
});

type Handler = (req: Request) => Promise<unknown> | unknown;
const api = (fn: Handler) => async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (err: unknown) {
    const message = err instanceof z.ZodError ? `입력값 오류: ${err.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(", ")}` : err instanceof Error ? err.message : "알 수 없는 오류";
    res.status(400).json({ success: false, error: message });
  }
};

const requireLivekit = () => {
  const cfg = livekitConfig();
  if (!cfg) throw new Error("LiveKit 설정이 없습니다. .env의 LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET을 채워 주세요.");
  return cfg;
};

app.get("/api/state", api(() => ({ settings: store.get(), status: agent.status(), history: bus.history(), locked: agent.activeSettings !== null })));

app.put("/api/settings", api((req) => {
  const before = agent.activeSettings;
  const saved = store.save(req.body);
  if (before) agent.updateLiveSettings(saved);
  return { settings: saved, appliedLive: Boolean(before) };
}));

app.post("/api/settings/reset", api(() => store.reset()));

app.get("/api/models", api(async () => {
  const [openai, gemini] = await Promise.all([listModels(env.OPENAI_API_KEY), listGeminiLiveModels(env.GEMINI_API_KEY)]);
  return { ...openai, gemini };
}));

app.get("/api/sessions", api(() => bus.summaries()));

/** 세션 폴더를 탐색기로 연다 (로컬 전용). 경로는 세션 id 형식 검증 후 서버가 만든다. */
app.post("/api/sessions/:id/open", api((req) => {
  const dir = bus.sessionPath(String(req.params.id));
  if (!dir) throw new Error("세션 폴더를 찾을 수 없습니다");
  const opener = process.platform === "win32" ? "explorer.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  execFile(opener, [dir], () => undefined); // explorer는 성공해도 종료 코드 1을 돌려줄 수 있어 결과를 무시한다
  return { dir };
}));

app.post("/api/prompt-gen", api(async (req) => {
  const { description } = z.object({ description: z.string().min(5).max(32000) }).parse(req.body);
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다");
  return generatePrompts(env.OPENAI_API_KEY, store.get().gptLive.delegation.model, description);
}));

app.post("/api/session/start", api(async () => {
  await agent.startSession(store.get());
  return agent.status();
}));

/** MC 트랙·엔진을 바꿀 때: 지금 세션을 정리(output 저장)하고 저장된 설정으로 곧바로 새 세션을 연다. */
app.post("/api/session/restart", api(async () => {
  await agent.stopSession();
  await agent.startSession(store.get());
  return agent.status();
}));

app.post("/api/session/stop", api(async () => {
  // 방에 남아 있으면 LiveKit 사용 시간이 계속 쌓이므로 세션 종료 시 함께 나간다.
  await agent.leaveRoom();
  return agent.status();
}));

app.post("/api/room/leave", api(async () => {
  await agent.leaveRoom();
  return agent.status();
}));

const ControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("hold") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("handoff") }),
  z.object({ action: z.literal("note"), text: z.string().min(1).max(1500), speak: z.boolean() }),
]);

app.post("/api/control", api((req) => {
  agent.control(ControlSchema.parse(req.body));
  return agent.status();
}));

app.post("/api/host-token", api(async () => {
  const cfg = requireLivekit();
  const s = store.get();
  const { token } = await createToken(cfg, { room: s.show.roomName, role: "host", name: s.show.hostName, ttlSeconds: 8 * 3600 });
  return { url: cfg.url, token };
}));

app.post("/api/invites", api(async (req) => {
  const { name, ttlHours } = z.object({ name: z.string().min(1).max(40), ttlHours: z.number().min(1).max(72).default(6) }).parse(req.body);
  const cfg = requireLivekit();
  const { token } = await createToken(cfg, { room: store.get().show.roomName, role: "guest", name, ttlSeconds: ttlHours * 3600 });
  const base = env.GUEST_PAGE_URL ?? `http://localhost:${env.PORT}`;
  return { link: inviteLink(base, cfg.url, token, name), local: !env.GUEST_PAGE_URL, expiresInHours: ttlHours };
}));

async function mountWeb(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    const dist = resolve("dist/web");
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));
    return;
  }
  const { createServer: createVite } = await import("vite");
  const vite = await createVite({ server: { middlewareMode: true }, appType: "spa", configFile: resolve("vite.config.ts") });
  app.use(vite.middlewares);
}

async function main(): Promise<void> {
  await mountWeb();
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const okHost = allowedHosts.has(req.headers.host ?? "");
    const okOrigin = [...allowedHosts].some((h) => req.headers.origin === `http://${h}`);
    if (req.url !== "/ws" || !okHost || !okOrigin) {
      // Vite HMR 업그레이드는 vite가 처리하도록 남겨 둔다. 그 외는 닫는다.
      if (req.headers["sec-websocket-protocol"] !== "vite-hmr") socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  const send = (ws: WebSocket, msg: ServerMessage): void => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };
  const broadcast = (msg: ServerMessage): void => wss.clients.forEach((c) => send(c, msg));
  wss.on("connection", (ws) => send(ws, { type: "history", entries: bus.history() }));
  bus.on("history", (entries) => broadcast({ type: "history", entries }));
  bus.on("log", (entry) => broadcast({ type: "log", entry }));
  bus.on("logUpdate", (entry) => broadcast({ type: "log-update", entry }));
  bus.on("status", (status) => broadcast({ type: "status", status }));

  server.listen(env.PORT, HOST, () => {
    process.stdout.write(`AI MC 스튜디오: http://localhost:${env.PORT}\n`);
  });

  const shutdown = async (): Promise<void> => {
    const timeout = new Promise((r) => setTimeout(r, 4000));
    await Promise.race([agent.leaveRoom().catch(() => undefined), timeout]);
    agent.dispose();
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
