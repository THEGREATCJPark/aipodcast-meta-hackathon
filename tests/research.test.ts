import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResearchResponse, research, type ResearchResult } from "../server/meta/research.js";
import { validateDecision, type Decision, type Utterance } from "../server/meta/director.js";
import { MetaSession } from "../server/meta/session.js";
import { defaultSettings } from "../shared/settings.js";
const u:Utterance={id:"u",identity:"host",text:"Please look up the current orbital launch count",startMs:0,endMs:100};
const raw=()=>({id:"response-fixture",status:"completed",output:[{id:"search-1",type:"web_search_call",status:"completed",results:[{type:"text_result",url:"https://example.org/source",title:"Source",snippet:"Result fixture"}]},{type:"message",role:"assistant",status:"completed",content:[{type:"output_text",text:"According to the source, the count is ten.",annotations:[{type:"url_citation",url:"https://example.org/source",title:"Source",start_index:0,end_index:40}]}]}]});
const result=():ResearchResult=>parseResearchResponse(raw(),100,200);
const lookup=(revision:number,utterances:Utterance[]=[u]):Decision=>({action:"LOOKUP",query:"current orbital launch count",speakText:"",reason:"Explicit public lookup request",addressee:"host",sourceUtteranceIds:[utterances.at(-1)!.id],contextRevision:revision});
const options={key:"fixture",ttsKey:"fixture",asr:"fixture",director:"fixture",tts:"fixture",voice:"fixture",researchEnabled:true};
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
test("research rejects unperformed search, missing citations, unsafe URLs and invalid spans",()=>{
  assert.equal(result().searchCallIds[0],"search-1");
  const noSearch=raw();noSearch.output.shift();assert.throws(()=>parseResearchResponse(noSearch,0,1));
  for(const change of ["no-citation","unsafe","bad-span","incomplete"]){
    const body:any=raw();const block=body.output[1].content[0];
    if(change==="no-citation")block.annotations=[];
    if(change==="unsafe")block.annotations[0].url="javascript:alert(1)";
    if(change==="bad-span")block.annotations[0].end_index=999;
    if(change==="incomplete")body.status="incomplete";
    assert.throws(()=>parseResearchResponse(body,0,1));
  }
});
test("research Responses protocol opts into real tool results and sends only bounded recent text",async(t)=>{
  let request:any;let endpoint:unknown;
  t.mock.method(globalThis,"fetch",async(url:unknown,init:RequestInit)=>{endpoint=url;request=JSON.parse(init.body as string);return new Response(JSON.stringify(raw()));});
  await research("fixture","muse-spark-1.3","latest launch count",Array.from({length:20},()=>({text:"x".repeat(900),identity:"private"})),new AbortController().signal);
  assert.equal(endpoint,"https://api.meta.ai/v1/responses");assert.equal(request.tools[0].type,"web_search");assert.deepEqual(request.include,["web_search_call.results"]);
  const data=JSON.parse(request.input);assert.equal(data.recentContext.length,3);assert.equal(data.recentContext[0].length,500);assert.ok(!request.input.includes("private"));
});
test("LOOKUP requires current utterance, query, and no fabricated answer before search",()=>{
  assert.equal(validateDecision(lookup(1),[u],1).action,"LOOKUP");
  for(const patch of [{query:undefined},{speakText:"I checked it"},{sourceUtteranceIds:[]}])assert.throws(()=>validateDecision({...lookup(1),...patch},[u],1));
});
test("opt-in spoken LOOKUP researches, persists cited evidence and speaks without manual handoff once",async()=>{
  let searched=0,spoken=0;const evidence:Record<string,unknown>[]=[];
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>{searched++;return result();},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  s.on("error",()=>undefined);s.on("evidence",e=>evidence.push(e));await s.connect();s.acceptUtterance(u);await tick();
  assert.equal(searched,1);assert.equal(spoken,1);assert.ok(evidence.some(e=>e.stage==="research-complete"&&e.elapsedMs===100));
  await s.evaluate(true);assert.equal(searched,1);assert.equal(spoken,1);await s.close();
});
test("disabled lookup never calls research or TTS; opted-in ASK still needs handoff",async()=>{
  for(const enabled of [false,true]){
    let searched=0,spoken=0;const s=new MetaSession({...options,researchEnabled:enabled},{decide:async(_k,_m,us,r)=>enabled?{...lookup(r,us),action:"ASK",query:undefined,speakText:"What matters to you?"}:lookup(r,us),research:async()=>{searched++;return result();},synthesize:async()=>{spoken++;return new Int16Array(480);}});
    await s.connect();s.acceptUtterance(u);await tick();assert.equal(searched,0);assert.equal(spoken,0);await s.close();
  }
});
for(const reason of ["hold","human","close","permission"] as const)test(`stale research cannot speak after ${reason}`,async()=>{
  let release!:(r:ResearchResult)=>void;let spoken=0;let started!:()=>void;const began=new Promise<void>(resolve=>{started=resolve;});
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:()=>{started();return new Promise(resolve=>{release=resolve;});},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  await s.connect();s.acceptUtterance(u);await began;
  if(reason==="hold")s.hold();if(reason==="human")s.humanSpeaking("host",true);if(reason==="close")await s.close();if(reason==="permission")s.applyLiveSettings({...defaultSettings(),researchEnabled:false});
  release(result());await tick();assert.equal(spoken,0);await s.close();
});
test("research rejection stays silent, retains active session, records failed lookup",async()=>{
  const evidence:Record<string,unknown>[]=[];let spoken=0;const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>{throw new Error("fixture timeout");},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  s.on("error",()=>undefined);s.on("evidence",e=>evidence.push(e));await s.connect();s.acceptUtterance(u);await tick();assert.equal(spoken,0);assert.equal(s.isReady,true);assert.ok(evidence.some(e=>e.stage==="research-failed"));await s.close();
});
test("research cap is eight attempts per session independent of director cap",async()=>{
  let searches=0;const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>{searches++;return result();},synthesize:async()=>new Int16Array(480)});
  await s.connect();for(let i=0;i<12;i++){s.acceptUtterance({...u,id:`u${i}`,startMs:i*200,endMs:i*200+100});await tick();}assert.equal(searches,8);await s.close();
});

test("research ignores intermediate commentary and private reasoning items",()=>{
  const body:any=raw();body.output.unshift({type:"reasoning",summary:[{text:"hidden"}]},{type:"message",role:"assistant",status:"completed",phase:"commentary",content:[{type:"output_text",text:"I will look that up first.",annotations:[]}]});
  const parsed=parseResearchResponse(body,0,1);assert.ok(!parsed.text.includes("look that up"));assert.ok(!JSON.stringify(parsed).includes("hidden"));
});

test("Meta-selected markdown link exactly matching completed search result is distinguished from provider citation",()=>{
  const body:any=raw();const block=body.output[1].content[0];block.annotations=[];block.text="The source reports ten. [Source](https://example.org/source)";
  const parsed=parseResearchResponse(body,0,1);assert.equal(parsed.sources.length,1);assert.equal(parsed.sources[0].kind,"model-linked-search-result");assert.equal(parsed.sources[0].title,"Source");
  assert.equal(result().sources[0].kind,"provider-annotation");
});
test("unmapped model links and unselected raw search hits never become answer citations",()=>{
  const body:any=raw();const block=body.output[1].content[0];block.annotations=[];block.text="Ten launches. [Fake](https://example.org/invented)";
  assert.throws(()=>parseResearchResponse(body,0,1),/not returned/);
  block.text="The answer is ten, I searched.";assert.throws(()=>parseResearchResponse(body,0,1));
  block.text="[Unsafe](javascript:alert)";assert.throws(()=>parseResearchResponse(body,0,1));
});
test("speech removes selected Markdown URL markup while retaining spoken source name",async()=>{
  const { researchSpeech }=await import("../server/meta/research.js");const body:any=raw();const block=body.output[1].content[0];block.annotations=[];block.text="According to [Source](https://example.org/source), the count is ten.";
  const spoken=researchSpeech(parseResearchResponse(body,0,1));assert.equal(spoken,"According to Source, the count is ten.");assert.ok(!spoken.includes("http"));
});
