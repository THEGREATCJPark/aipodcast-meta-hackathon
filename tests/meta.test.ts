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

 test("early ASR final waits for all local VAD speakers, then evaluates once",async()=>{
  let calls=0; const s=new MetaSession(options,{decide:async(_k,_m,_u,r)=>{calls++;return decision(r,"WAIT");},synthesize:async()=>new Int16Array(1)});
  await s.connect();s.humanSpeaking("host-1",true);s.humanSpeaking("guest-1",true);s.acceptUtterance(u);await tick();assert.equal(calls,0);
  s.humanSpeaking("host-1",false);await tick();assert.equal(calls,0);
  s.humanSpeaking("guest-1",false);await tick();assert.equal(calls,1);assert.equal(s.state,"waiting");await s.close();
});
test("HOLD remains held during human speech; resume does not replay a cached question",async()=>{
  let calls=0,spoken=0;const s=new MetaSession(options,{decide:async(_k,_m,_u,r)=>{calls++;return decision(r);},synthesize:async()=>{spoken++;return new Int16Array(10);}});
  await s.connect();s.hold();s.humanSpeaking("host-1",true);s.acceptUtterance(u);s.humanSpeaking("host-1",false);await tick();
  assert.equal(s.state,"held");assert.equal(calls,0);s.resume();await tick();assert.equal(calls,0);assert.equal(spoken,0);
  await s.evaluate(true);assert.equal(spoken,1);await s.close();
});
test("director call cap cannot be bypassed by resume or repeated handoff",async()=>{
  let calls=0;const s=new MetaSession(options,{decide:async(_k,_m,_u,r)=>{calls++;return decision(r,"WAIT");},synthesize:async()=>new Int16Array(1)});
  s.on("error",()=>undefined);await s.connect();s.acceptUtterance(u);await tick();
  for(let i=0;i<70;i++){s.resume();await s.evaluate(true);}
  assert.equal(calls,60);assert.equal(s.state,"held");assert.equal(s.isReady,true);await s.close();
});
test("fixed Lounge style is supplied to Meta as developer instruction and requires English",async(t)=>{
  const { decide }=await import("../server/meta/director.js");let request:any;
  t.mock.method(globalThis,"fetch",async(_url:unknown,init:RequestInit)=>{request=JSON.parse(init.body as string);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(decision(1))}}]}),{status:200});});
  await decide("fixture","muse-spark-1.3",[u],1,true,new AbortController().signal);
  assert.equal(request.messages[0].role,"developer");assert.match(request.messages[0].content,/Speak and explain decisions in English/);assert.match(request.messages[0].content,/Never impersonate/);assert.match(request.messages[0].content,/lived experience/);
});
