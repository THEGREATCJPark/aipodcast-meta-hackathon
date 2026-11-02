import assert from "node:assert/strict";
import { test } from "node:test";
import { MetaSession } from "../server/meta/session.js";
import type { AsrCallbacks } from "../server/meta/asr-realtime.js";
import type { Decision, Utterance } from "../server/meta/director.js";
const options={key:"fixture",ttsKey:"fixture",asr:"fixture",director:"fixture",tts:"fixture",voice:"fixture"};
const u:Utterance={id:"u",identity:"host",text:"A specific plan",startMs:0,endMs:100};
const ask=(r:number,us:Utterance[]):Decision=>({action:"ASK",speakText:"What would you try first?",reason:"Follow-up",addressee:"host",sourceUtteranceIds:[us.at(-1)!.id],contextRevision:r});
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
test("busy host handoff runs once after cancellation instead of getting lost",async()=>{
  let release!:()=>void;let spoken=0;let calls=0;
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>{if(++calls===1)await new Promise<void>(resolve=>{release=resolve;});return ask(r,us);},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  await s.connect();try{s.acceptUtterance(u);s.speakNow("handoff");release();await tick();assert.equal(calls,2);assert.equal(spoken,1);}finally{await s.close();}
});
for(const change of ["human","hold","new-context","close"] as const)test(`queued handoff is invalidated by ${change}`,async()=>{
  let release!:()=>void;let spoken=0;let calls=0;
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>{if(++calls===1)await new Promise<void>(resolve=>{release=resolve;});return ask(r,us);},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  await s.connect();try{s.acceptUtterance(u);s.speakNow("handoff");
    if(change==="human")s.humanSpeaking("host",true);if(change==="hold")s.hold();if(change==="new-context")s.acceptUtterance({...u,id:"new",text:"Changed subject",startMs:200,endMs:300});if(change==="close")await s.close();
    release();await tick();assert.equal(spoken,0);
  }finally{await s.close();}
});
test("ASR failure holds output; Resume authorizes exactly one new stream, old callbacks are discarded",async()=>{
  const callbacks:AsrCallbacks[]=[];let streams=0;let errors=0;const received:string[]=[];
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>({...ask(r,us),action:"WAIT",speakText:""}),synthesize:async()=>new Int16Array(480),createAsr:(_k,_m,_offset,cb)=>{callbacks.push(cb);streams++;return {connect:async()=>undefined,append:()=>undefined,close:()=>undefined};}});
  s.on("error",()=>errors++);s.on("inputTranscript",d=>received.push(d.delta));
  await s.connect();try{
    s.appendParticipant("host",new Int16Array(480));await tick();assert.equal(streams,1);
    callbacks[0].failed("fixture disconnected");callbacks[0].failed("duplicate close");assert.equal(errors,1);assert.equal(s.state,"held");
    for(let i=0;i<5;i++)s.appendParticipant("host",new Int16Array(480));assert.equal(streams,1,"no timer/frame retries");
    s.speakNow("handoff");s.appendParticipant("host",new Int16Array(480));assert.equal(streams,1,"handoff must not authorize ASR retry");
    s.resume();s.appendParticipant("host",new Int16Array(480));await tick();assert.equal(streams,2);
    callbacks[0].complete("old","OLD",0,10);callbacks[1].complete("new","RECOVERED",20,30);await tick();assert.deepEqual(received,["RECOVERED"]);
    callbacks[1].failed("second disconnect");s.resume();s.appendParticipant("host",new Int16Array(480));assert.equal(streams,2);assert.equal(s.state,"held");
  }finally{await s.close();}
});
test("ASR connection rejection and close event produce one held failure",async()=>{
  let cb!:AsrCallbacks;let errors=0;
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>ask(r,us),synthesize:async()=>new Int16Array(480),createAsr:(_k,_m,_o,callbacks)=>{cb=callbacks;return {connect:async()=>{cb.failed("rejected");throw new Error("rejected");},append:()=>undefined,close:()=>undefined};}});
  s.on("error",()=>errors++);await s.connect();try{s.appendParticipant("host",new Int16Array(480));await tick();assert.equal(errors,1);assert.equal(s.state,"held");}finally{await s.close();}
});
