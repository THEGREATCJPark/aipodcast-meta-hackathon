import assert from "node:assert/strict";
import { test } from "node:test";
import { AudioPacer } from "../server/meta/audio-pacer.js";
import { MetaAsr } from "../server/meta/asr-realtime.js";
test("30ms timer callbacks keep 20ms PCM production aligned for a minute",()=>{
  const p=new AudioPacer(0);let sent=0;let maxQueued=0;
  for(let now=30;now<=60000;now+=30){const due=p.takeDue(now);assert.ok(due<=5);sent+=due;const produced=Math.floor(now/20);maxQueued=Math.max(maxQueued,produced-sent);}
  assert.equal(sent,3000);assert.equal(maxQueued,0);
});
test("timer jitter catches up at most five frames per pump and never runs ahead",()=>{
  const p=new AudioPacer(1000);
  assert.equal(p.takeDue(1019),0);assert.equal(p.takeDue(1020),1);
  assert.equal(p.takeDue(1220),5);assert.equal(p.takeDue(1230),5);assert.equal(p.takeDue(1230),0);
  assert.equal(p.takeDue(1240),1);
});
test("long scheduler stall fails instead of silently shifting timestamps or bursting audio",()=>{
  const p=new AudioPacer(0);assert.throws(()=>p.takeDue(2020),/stalled/);
});
test("genuine pre-handshake audio backlog remains bounded and fails closed",()=>{
  const failures:string[]=[];const asr=new MetaAsr("fixture","fixture",0,{complete:()=>undefined,failed:message=>failures.push(message)});
  asr.append(new Int16Array(48000));assert.equal(failures.length,0);
  asr.append(new Int16Array(480));assert.equal(failures.length,1);assert.match(failures[0],/2-second input buffer/);
  asr.append(new Int16Array(480));assert.equal(failures.length,1);asr.close();
});
