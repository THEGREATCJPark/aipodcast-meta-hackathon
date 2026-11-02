import assert from "node:assert/strict";
import { test } from "node:test";
import { TurnManager } from "../server/meta/turn-manager.js";
import { validateDecision, type Decision, type Utterance } from "../server/meta/director.js";
import { MetaSession } from "../server/meta/session.js";
import { MetaAsr } from "../server/meta/asr-realtime.js";
const u: Utterance = { id: "u1", identity: "host-1", text: "We should start small", startMs: 0, endMs: 1000 };
const decision = (revision: number, action: Decision["action"] = "ASK"): Decision => ({ action, addressee: "host-1", speakText: action === "WAIT" ? "" : "What is the smallest useful step?", sourceUtteranceIds: ["u1"], contextRevision: revision, reason: "Grounded follow-up" });
const options = { key: "fixture", ttsKey: "fixture", asr: "fixture", director: "fixture", tts: "fixture", voice: "fixture" };
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
test("decision rejects invented evidence, attribution, stale revisions and WAIT speech", () => {
  assert.equal(validateDecision(decision(1), [u], 1).action, "ASK");
  for (const patch of [{sourceUtteranceIds:["invented"]}, {addressee:"stranger"}, {contextRevision:2}, {action:"WAIT"}]) {
    assert.throws(() => validateDecision({...decision(1),...patch}, [u], 1));
  }
});
test("turn gate separately cancels on human interruption, HOLD and close/restart", () => {
  const t = new TurnManager(); let ticket = t.begin(); assert.ok(t.permits(ticket));
  t.human("a",true); assert.equal(ticket.signal.aborted,true); assert.equal(t.permits(ticket),false);
  t.human("b",true); t.human("a",false); assert.equal(t.permits(t.begin()),false);
  t.human("b",false); ticket=t.begin(); t.hold(); assert.equal(t.permits(ticket),false);
  t.resume(); assert.equal(t.permits(ticket),false); ticket=t.begin(); t.close(); assert.equal(t.permits(ticket),false);
});
test("synthetic end-to-end: transcript -> Meta decision -> manual gate -> TTS -> audio events", async () => {
  let syntheses=0; const audio:Int16Array[]=[]; const evidence:Decision[]=[];
  const s=new MetaSession(options,{decide:async(_k,_m,_u,r)=>decision(r),synthesize:async()=>{syntheses++;return new Int16Array(9600).fill(1000);}});
  s.on("audio",p=>audio.push(p));s.on("decision",d=>evidence.push(d));s.on("error",()=>undefined);
  await s.connect(); s.acceptUtterance(u); await tick();
  assert.equal(evidence.length,1); assert.equal(syntheses,0,"automatic output disabled");
  await s.evaluate(true); assert.equal(syntheses,1); assert.equal(audio.reduce((n,a)=>n+a.length,0),9600);
  await s.close();
});
test("synthetic WAIT never invokes TTS even on handoff", async () => {
  let calls=0; const s=new MetaSession(options,{decide:async(_k,_m,_u,r)=>decision(r,"WAIT"),synthesize:async()=>{calls++;return new Int16Array(1);}});
  await s.connect();s.acceptUtterance(u);await tick();await s.evaluate(true);assert.equal(calls,0);await s.close();
});
for (const cause of ["hold","human","close"] as const) test(`late TTS cannot refill output after ${cause}`,async()=>{
  let release!:(p:Int16Array)=>void;let audio=0;
  const s=new MetaSession(options,{decide:async(_k,_m,_u,r)=>decision(r),synthesize:()=>new Promise(resolve=>{release=resolve;})});
  s.on("audio",()=>audio++);await s.connect();s.acceptUtterance(u);await tick();
  const pending=s.evaluate(true);await tick();
  if(cause==="hold")s.hold();else if(cause==="human")s.humanSpeaking("guest-1",true);else await s.close();
  release(new Int16Array(100));await pending;assert.equal(audio,0);await s.close();
});
test("provider rejection keeps session alive and emits no audio fallback",async()=>{
  let errors=0,audio=0;const s=new MetaSession(options,{decide:async()=>{throw new Error("429");},synthesize:async()=>{throw new Error("must not call");}});
  s.on("error",()=>errors++);s.on("audio",()=>audio++);await s.connect();s.acceptUtterance(u);await tick();
  assert.equal(errors,1);assert.equal(audio,0);assert.equal(s.isReady,true);await s.close();
});
test("ASR completion deduplicates out of order turns, preserves stream identity and offset",()=>{
  const out:{id:string;text:string;start:number;end:number}[]=[];
  const a=new MetaAsr("fixture","fixture",500,{complete:(id,text,start,end)=>out.push({id,text,start,end}),failed:()=>undefined});
  a.accept({type:"speechStart",turnId:1,audioProcessedMs:10});a.accept({type:"speechStart",turnId:2,audioProcessedMs:100});
  a.accept({type:"speechComplete",turnId:2,audioProcessedMs:200,transcript:"second"});
  a.accept({type:"speechComplete",turnId:1,audioProcessedMs:90,transcript:"first"});
  a.accept({type:"speechComplete",turnId:1,audioProcessedMs:90,transcript:"duplicate"});
  assert.equal(out.length,2);assert.equal(out[1].start,510);assert.equal(out[0].end,700);
  a.close();a.accept({type:"speechComplete",turnId:3,audioProcessedMs:300,transcript:"late"});assert.equal(out.length,2);
});

test("synthetic Meta ASR WebSocket handshake, prebuffer, PCM and completion", async () => {
  const { WebSocketServer } = await import("ws");
  const server = new WebSocketServer({port:0});
  await new Promise<void>(resolve => server.once("listening",resolve));
  let handshake:Record<string,unknown>|undefined;let samples=0;
  server.on("connection",ws=>ws.on("message",(raw,binary)=>{
    if(!binary){handshake=JSON.parse(raw.toString());ws.send(JSON.stringify({sessionId:"synthetic"}));}
    else {samples+=Buffer.isBuffer(raw) ? raw.length : 0;ws.send(JSON.stringify({type:"speechStart",turnId:1,audioProcessedMs:0}));ws.send(JSON.stringify({type:"speechComplete",turnId:1,audioProcessedMs:20,transcript:"fixture"}));}
  }));
  let resolveFinal!:()=>void;const final=new Promise<void>(resolve=>{resolveFinal=resolve;});
  const asr=new MetaAsr("fixture-secret","fixture-model",0,{complete:()=>resolveFinal(),failed:()=>undefined},`ws://127.0.0.1:${(server.address() as {port:number}).port}`);
  try {
    const ready=asr.connect();asr.append(new Int16Array(480).fill(12));await ready;await final;
    assert.deepEqual(handshake?.authorization,{accessToken:"Bearer fixture-secret"});
    assert.equal(handshake?.audioEncoding,"PCM_24KHZ");assert.equal(handshake?.mode,"ENDPOINTING");assert.equal(samples,960);
  } finally {asr.close();server.clients.forEach(ws=>ws.terminate());await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
