import assert from "node:assert/strict";
import { test } from "node:test";
import type { AudioSource } from "@livekit/rtc-node";
import { Playout } from "../server/agent/playout.js";
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
test("playout flush discards pending generation and permits fresh output only",async()=>{
  let release!:()=>void;let first=true;const sent:number[]=[];const accepted:number[]=[];
  const source={clearQueue:()=>undefined,captureFrame:async(frame:{data:Int16Array})=>{accepted.push(frame.data[0]);if(first){first=false;await new Promise<void>(resolve=>{release=resolve;});}}};
  const p=new Playout(source as unknown as AudioSource,24000,20,()=>undefined,frame=>sent.push(frame[0]));
  p.enqueue(new Int16Array(960).fill(1));p.flush();p.enqueue(new Int16Array(480).fill(2));release();await tick();
  assert.deepEqual(accepted,[1,2]);assert.deepEqual(sent,[2]);
});
test("output transport failure is contained and reports failure instead of unhandled rejection",async()=>{
  let errors=0,sent=0;const source={clearQueue:()=>undefined,captureFrame:async()=>{throw new Error("fixture disconnect");}};
  const p=new Playout(source as unknown as AudioSource,24000,20,()=>undefined,()=>sent++,()=>errors++);
  p.enqueue(new Int16Array(480));await tick();assert.equal(errors,1);assert.equal(sent,0);assert.equal(p.active,false);
});
