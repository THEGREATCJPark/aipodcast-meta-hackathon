import test from "node:test";
import assert from "node:assert/strict";
import { TokenVerifier } from "livekit-server-sdk";
import { createToken, inviteLink } from "../server/livekit/tokens.js";

test("guest token is scoped to one room, microphone only, no data or admin", async () => {
  const cfg = {url:"ws://localhost:7880",apiKey:"synthetic-key",apiSecret:"synthetic-secret-for-offline-tests-only"};
  const {token,identity} = await createToken(cfg,{room:"synthetic-room",role:"guest",name:"host",ttlSeconds:600});
  const claims = await new TokenVerifier(cfg.apiKey,cfg.apiSecret).verify(token);
  assert.match(identity,/^guest-/);
  assert.equal(claims.video?.room,"synthetic-room");
  assert.equal(claims.video?.roomJoin,true);
  assert.equal(claims.video?.canPublishData,false);
  assert.deepEqual(claims.video?.canPublishSources,["microphone"]);
  assert.ok(!claims.video?.roomAdmin);
  assert.ok(!claims.video?.roomCreate);
  assert.equal(claims.name,"host (게스트)");
  assert.ok(claims.exp! <= Math.floor(Date.now() / 1000) + 600);
});

test("invite credentials are fragment-only and guest identities are distinct", async () => {
  const cfg = {url:"ws://localhost:7880",apiKey:"synthetic-key",apiSecret:"synthetic-secret-for-offline-tests-only"};
  const req = {room:"room",role:"guest" as const,name:"Guest",ttlSeconds:600};
  const a = await createToken(cfg,req), b = await createToken(cfg,req);
  assert.notEqual(a.identity,b.identity);
  const url = new URL(inviteLink("http://localhost:4400",cfg.url,a.token,"Guest"));
  assert.equal(url.search,"");
  assert.equal(url.pathname,"/join");
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("t"),a.token);
});

