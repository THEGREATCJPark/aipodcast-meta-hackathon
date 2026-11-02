import { randomBytes } from "node:crypto";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import type { LivekitConfig } from "../config.js";

export type Role = "host" | "guest" | "agent";

interface TokenRequest {
  room: string;
  role: Role;
  name: string;
  ttlSeconds: number;
}

const RESERVED = new Set(["ai mc", "ai", "mc", "host", "진행자"]);

const safeName = (name: string): string => {
  const clean = name.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40);
  if (!clean) return "게스트";
  return RESERVED.has(clean.toLowerCase()) ? `${clean} (게스트)` : clean;
};

/** 방 참가 토큰. 게스트는 오디오만 발행할 수 있고 방 관리 권한이 없다. */
export async function createToken(cfg: LivekitConfig, req: TokenRequest): Promise<{ token: string; identity: string }> {
  const identity =
    req.role === "agent" ? "ai-mc" : `${req.role}-${randomBytes(4).toString("hex")}`;
  const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity,
    name: req.role === "agent" ? "AI MC" : req.role === "host" ? req.name.trim().slice(0, 40) || "진행자" : safeName(req.name),
    ttl: req.ttlSeconds,
    metadata: JSON.stringify({ role: req.role }),
  });
  at.addGrant({
    roomJoin: true,
    room: req.room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: req.role !== "guest",
    canPublishSources: req.role === "guest" ? [TrackSource.MICROPHONE] : undefined,
  });
  return { token: await at.toJwt(), identity };
}

/** 게스트 초대 링크. 토큰은 URL fragment(#)에 넣어 서버 로그에 남지 않게 한다. */
export function inviteLink(baseUrl: string, livekitUrl: string, token: string, guestName: string): string {
  const hash = new URLSearchParams({ u: livekitUrl, t: token, n: guestName }).toString();
  return `${baseUrl.replace(/\/$/, "")}/join#${hash}`;
}
