import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { McAgent } from "../server/agent/mc-agent.js";
import type { AgentRoom } from "../server/agent/room.js";
import { MetaSession } from "../server/meta/session.js";
import { StudioBus } from "../server/bus.js";
import { defaultSettings } from "../shared/settings.js";

class FakeRoom extends EventEmitter {
  connected=false;
  sent=0;
  flushed=0;
  source={captureFrame:async(frame:{data:Int16Array})=>{this.sent+=frame.data.length;},clearQueue:()=>{this.flushed++;}};
  async join(){this.connected=true;}
  async leave(){this.connected=false;}
}
class FixtureSession extends MetaSession {
  // Fake ASR input transport; the real McAgent VAD, control, recorder, event wiring remain active.
  appendParticipant():void {}
}
const wait=(ms=0)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
test("McAgent synthetic room integration: early final, manual speech, HOLD, recording and restart isolation",async()=>{
  const root=mkdtempSync(join(tmpdir(),"meta-agent-fixture-"));const bus=new StudioBus(root);const room=new FakeRoom();
  const sessions:FixtureSession[]=[];let decisions=0;let rejectProvider=false;
  const agent=new McAgent({bus,room:room as unknown as AgentRoom,metaKey:()=>"fixture",openaiKey:()=>"fixture",geminiKey:()=>undefined,livekit:()=>({url:"fixture",agentToken:async()=>"fixture"}),engineFactory:()=>{
    const s=new FixtureSession({key:"fixture",ttsKey:"fixture",asr:"fixture",director:"fixture",tts:"fixture",voice:"fixture"},{
      decide:async(_k,_m,utterances,r)=>{decisions++;if(rejectProvider) throw new Error("synthetic timeout");return {action:"ASK",addressee:utterances[0].identity,speakText:"What would you try first?",sourceUtteranceIds:[utterances[0].id],contextRevision:r,reason:"A concrete next step"};},
      synthesize:async()=>new Int16Array(2400).fill(1000),
    });sessions.push(s);return s;
  }});
  try {
    await agent.startSession(defaultSettings());const first=sessions[0];room.emit("participantJoined","host-fixture","Host");
    for(let i=0;i<13;i++){room.emit("frame",{identity:"host-fixture",name:"Host",pcm:new Int16Array(480).fill(10000)});await wait(20);}
    assert.equal(agent.status().participants[0].speaking,true);
    first.acceptUtterance({id:"u-first",identity:"host-fixture",text:"Let's start small",startMs:0,endMs:200});await wait();assert.equal(decisions,0);
    for(let i=0;i<40;i++){room.emit("frame",{identity:"host-fixture",name:"Host",pcm:new Int16Array(480)});await wait(20);}
    assert.equal(decisions,1);assert.equal(room.sent,0,"ordinary decision must not speak");
    agent.control({action:"handoff"});await wait(20);assert.ok(room.sent>0);
    agent.control({action:"hold"});assert.equal(agent.status().metaState,"held");assert.equal(agent.status().mcState,"held");
    const firstDir=bus.currentSessionDir()!;await agent.stopSession();
    const files=readdirSync(firstDir);assert.ok(files.includes("events.jsonl"));assert.ok(files.includes("mc.wav"));assert.ok(files.some(f=>f.startsWith("tts-generated-")));assert.ok(files.includes("mix.wav"));
    const events=readFileSync(join(firstDir,"events.jsonl"),"utf8").split("\n").filter(Boolean).map(line=>JSON.parse(line));
    assert.ok(events.some(e=>e.meta?.runId===first.runId&&e.meta?.stage==="director-complete"));
    assert.ok(events.some(e=>e.id==="u-first"&&e.meta?.identity==="host-fixture"));
    await agent.startSession(defaultSettings());const current=bus.currentSessionDir()!;const count=bus.history().length;const flushes=room.flushed;
    first.emit("info","STALE");first.emit("error","STALE","stale");first.emit("audio",new Int16Array(480));first.emit("interrupted");first.emit("evidence",{stage:"STALE"});
    assert.equal(bus.history().length,count);assert.equal(room.flushed,flushes);assert.notEqual(current,firstDir);
    rejectProvider=true;
    room.emit("frame",{identity:"host-fixture",name:"Host",pcm:new Int16Array(480).fill(100)});
    sessions[1].acceptUtterance({id:"failure-input",identity:"host-fixture",text:"Keep the recording",startMs:0,endMs:20});await wait(10);
    assert.equal(agent.status().recording,true);assert.equal(agent.status().sessionActive,true);
    await agent.stopSession();assert.ok(readdirSync(current).some(f=>f.startsWith("host-")));assert.ok(!readFileSync(join(current,"events.jsonl"),"utf8").includes("STALE"));
  } finally {await agent.leaveRoom();agent.dispose();rmSync(root,{recursive:true,force:true});}
});
