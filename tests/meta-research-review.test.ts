import assert from "node:assert/strict";
import { test } from "node:test";
import { reviewResearch, ResearchReviewSchema } from "../server/meta/research-review.js";
test("research review requires concise Meta-authored release text and a current revision",async(t)=>{
  assert.throws(()=>ResearchReviewSchema.parse({action:"DELIVER",contextRevision:2,reason:"Relevant"}));
  assert.throws(()=>ResearchReviewSchema.parse({action:"DELIVER",contextRevision:2,reason:"Relevant",speakText:"x".repeat(221)}));
  let body:any;
  t.mock.method(globalThis,"fetch",async(_url:unknown,init:RequestInit)=>{body=JSON.parse(init.body as string);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({action:"DELIVER",contextRevision:2,reason:"Relevant",speakText:"Source reports ten."})}}]}));});
  const utterances=Array.from({length:30},(_,i)=>({id:`u${i}`,identity:"host",text:`context ${i}`,startMs:i,endMs:i+1}));
  const input={query:"count",requestUtteranceIds:["original"],requestUtterances:[{...utterances[0],id:"original",text:"Please research the count"}],resultSources:[{title:"Source",url:"https://example.org"}],resultText:"Count is ten",utterances,contextRevision:2,humansSpeaking:false};
  const r=await reviewResearch("fixture","fixture",input,new AbortController().signal);assert.equal(r.action,"DELIVER");
  const sent=JSON.parse(body.messages[1].content);assert.equal(sent.utterances.length,30);assert.equal(sent.requestUtterances[0].id,"original");assert.match(body.messages[0].content,/220 characters/);
  await assert.rejects(reviewResearch("fixture","fixture",{...input,contextRevision:3},new AbortController().signal),/Stale/);
});
