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
  const data=JSON.parse(request.input);assert.equal(data.recentContext.length,20);assert.equal(data.recentContext[0].length,900);assert.ok(!request.input.includes("private"));
});
test("LOOKUP requires current utterance, query, and no fabricated answer before search",()=>{
  assert.equal(validateDecision(lookup(1),[u],1).action,"LOOKUP");
  for(const patch of [{query:undefined},{speakText:"I checked it"},{sourceUtteranceIds:[]}])assert.throws(()=>validateDecision({...lookup(1),...patch},[u],1));
});
test("opt-in spoken LOOKUP researches, persists cited evidence and speaks without manual handoff once",async()=>{
  let searched=0,spoken=0;const evidence:Record<string,unknown>[]=[];
  const s=new MetaSession(options,{reviewResearch:async(_k,_m,i)=>({action:i.resultText&&!i.humansSpeaking?"DELIVER":"WAIT",reason:"fixture review",speakText:"According to Source, the count is ten.",contextRevision:i.contextRevision}),decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>{searched++;return result();},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  s.on("error",()=>undefined);s.on("evidence",e=>evidence.push(e));await s.connect();s.acceptUtterance(u);await tick();
  assert.equal(searched,1);assert.equal(spoken,1);assert.ok(evidence.some(e=>e.stage==="research-complete"&&e.elapsedMs===100));
  await s.evaluate(true);assert.equal(searched,1);assert.equal(spoken,1);await s.close();
});
test("disabled lookup never calls research or TTS; opted-in ASK still needs handoff",async()=>{
  for(const enabled of [false,true]){
    let searched=0,spoken=0;const s=new MetaSession({...options,researchEnabled:enabled},{reviewResearch:async(_k,_m,i)=>({action:"WAIT",reason:"fixture review",speakText:"According to Source, the count is ten.",contextRevision:i.contextRevision}),decide:async(_k,_m,us,r)=>enabled?{...lookup(r,us),action:"ASK",query:undefined,speakText:"What matters to you?"}:lookup(r,us),research:async()=>{searched++;return result();},synthesize:async()=>{spoken++;return new Int16Array(480);}});
    await s.connect();s.acceptUtterance(u);await tick();assert.equal(searched,0);assert.equal(spoken,0);await s.close();
  }
});
for(const reason of ["hold","human","close","permission"] as const)test(`stale research cannot speak after ${reason}`,async()=>{
  let release!:(r:ResearchResult)=>void;let spoken=0;let started!:()=>void;const began=new Promise<void>(resolve=>{started=resolve;});
  const s=new MetaSession(options,{reviewResearch:async(_k,_m,i)=>({action:i.resultText&&!i.humansSpeaking?"DELIVER":"WAIT",reason:"fixture review",speakText:"According to Source, the count is ten.",contextRevision:i.contextRevision}),decide:async(_k,_m,us,r)=>lookup(r,us),research:()=>{started();return new Promise(resolve=>{release=resolve;});},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  await s.connect();s.acceptUtterance(u);await began;
  if(reason==="hold")s.hold();if(reason==="human")s.humanSpeaking("host",true);if(reason==="close")await s.close();if(reason==="permission")s.applyLiveSettings({...defaultSettings(),researchEnabled:false});
  release(result());await tick();assert.equal(spoken,0);await s.close();
});
test("research rejection stays silent, retains active session, records failed lookup",async()=>{
  const evidence:Record<string,unknown>[]=[];let spoken=0;const s=new MetaSession(options,{reviewResearch:async(_k,_m,i)=>({action:i.resultText&&!i.humansSpeaking?"DELIVER":"WAIT",reason:"fixture review",speakText:"According to Source, the count is ten.",contextRevision:i.contextRevision}),decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>{throw new Error("fixture timeout");},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  s.on("error",()=>undefined);s.on("evidence",e=>evidence.push(e));await s.connect();s.acceptUtterance(u);await tick();assert.equal(spoken,0);assert.equal(s.isReady,true);assert.ok(evidence.some(e=>e.stage==="research-failed"));await s.close();
});
test("research cap is eight attempts per session independent of director cap",async()=>{
  let searches=0;const s=new MetaSession(options,{reviewResearch:async(_k,_m,i)=>({action:i.resultText&&!i.humansSpeaking?"DELIVER":"WAIT",reason:"fixture review",speakText:"According to Source, the count is ten.",contextRevision:i.contextRevision}),decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>{searches++;return result();},synthesize:async()=>new Int16Array(480)});
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

test("provider-annotated answer link remains valid when omitted from bounded search hit list",()=>{
  const body:any=raw();
  body.output[0].results=[];
  body.output[1].content[0].text="According to [Source](https://example.org/source), the count is ten.";
  const parsed=parseResearchResponse(body,0,1);
  assert.equal(parsed.sources.length,1);
  assert.equal(parsed.sources[0].kind,"provider-annotation");
});
test("speech removes selected Markdown URL markup while retaining spoken source name",async()=>{
  const { researchSpeech }=await import("../server/meta/research.js");const body:any=raw();const block=body.output[1].content[0];block.annotations=[];block.text="According to [Source](https://example.org/source), the count is ten.";
  const spoken=researchSpeech(parseResearchResponse(body,0,1));assert.equal(spoken,"According to Source, the count is ten.");assert.ok(!spoken.includes("http"));
});

test("TTS failure after successful research is attributed to OpenAI, never research-failed",async()=>{
  const evidence:Record<string,unknown>[]=[];
  const s=new MetaSession(options,{reviewResearch:async(_k,_m,i)=>({action:i.resultText&&!i.humansSpeaking?"DELIVER":"WAIT",reason:"fixture review",speakText:"According to Source, the count is ten.",contextRevision:i.contextRevision}),decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>result(),synthesize:async()=>{throw new Error("fixture TTS rejection");}});
  s.on("error",()=>undefined);s.on("evidence",e=>evidence.push(e));await s.connect();try{s.acceptUtterance(u);await tick();assert.ok(evidence.some(e=>e.stage==="research-complete"));assert.ok(!evidence.some(e=>e.stage==="research-failed"));assert.ok(evidence.some(e=>e.stage==="provider-failure"&&e.phase==="tts"&&e.provider==="OpenAI"));}finally{await s.close();}
});
test("late research cancellation evidence retains the cancelled generation, not a new control generation",async()=>{
  const evidence:Record<string,unknown>[]=[];let reject!:(e:Error)=>void;
  const s=new MetaSession(options,{reviewResearch:async(_k,_m,i)=>({action:i.resultText&&!i.humansSpeaking?"DELIVER":"WAIT",reason:"fixture review",speakText:"According to Source, the count is ten.",contextRevision:i.contextRevision}),decide:async(_k,_m,us,r)=>lookup(r,us),research:()=>new Promise((_resolve,rej)=>{reject=rej;}),synthesize:async()=>new Int16Array(480)});
  s.on("evidence",e=>evidence.push(e));await s.connect();try{s.acceptUtterance(u);await tick();const request=evidence.find(e=>e.stage==="research-request")!;s.hold();reject(new Error("aborted"));await tick();const cancellation=evidence.find(e=>e.stage==="research-cancelled")!;assert.equal(cancellation.generation,request.generation);assert.notEqual(cancellation.generation,s.turns.generation);}finally{await s.close();}
});

test("continued second-speaker discussion keeps same research alive, stores result, then fresh Meta verdict releases once",async()=>{
  let release!:(r:ResearchResult)=>void;let searchSignal!:AbortSignal;let searches=0;let spoken=0;const reviews:number[]=[];const evidence:Record<string,unknown>[]=[];
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async(_k,_m,_q,_context,signal)=>{searches++;searchSignal=signal;return new Promise(resolve=>{release=resolve;});},reviewResearch:async(_k,_m,input)=>{reviews.push(input.contextRevision);return {action:input.resultText&&!input.humansSpeaking?"DELIVER":"WAIT",reason:"Still relevant",speakText:"Source reports ten.",contextRevision:input.contextRevision};},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  s.on("evidence",e=>evidence.push(e));await s.connect();try{
    s.acceptUtterance(u);await tick();const requested=evidence.find(e=>e.stage==="research-request")!;
    s.humanSpeaking("guest",true);s.acceptUtterance({...u,id:"continued",identity:"guest",text:"That figure is relevant to our discussion",startMs:200,endMs:500});await tick();
    assert.equal(searchSignal.aborted,false,"ordinary speech must preserve background search");release(result());await tick();assert.equal(spoken,0);assert.equal(searches,1);
    assert.equal(evidence.find(e=>e.stage==="research-complete")?.jobId,requested.jobId);
    s.humanSpeaking("guest",false);await tick();assert.equal(spoken,1);assert.equal(reviews.at(-1),s.turns.revision);
    await s.evaluate(true);assert.equal(spoken,1,"same request must not be retried");
  }finally{await s.close();}
});
for(const action of ["DISCARD","CANCEL"] as const)test(`Meta ${action} on topic change or withdrawal cancels pending job`,async()=>{
  let signal!:AbortSignal;let release!:(r:ResearchResult)=>void;let spoken=0;
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async(_k,_m,_q,_c,sig)=>{signal=sig;return new Promise(resolve=>{release=resolve;});},reviewResearch:async(_k,_m,i)=>({action,reason:action==="CANCEL"?"Explicit withdrawal":"Topic changed",contextRevision:i.contextRevision}),synthesize:async()=>{spoken++;return new Int16Array(480);}});
  await s.connect();try{s.acceptUtterance(u);await tick();s.humanSpeaking("guest",true);s.acceptUtterance({...u,id:"change",identity:"guest",text:action==="CANCEL"?"Please cancel that lookup":"Let's leave launches and discuss cooking",startMs:200,endMs:300});await tick();assert.equal(signal.aborted,true);release(result());await tick();assert.equal(spoken,0);}finally{await s.close();}
});
test("stale research release verdict cannot speak and triggers fresh-context review",async()=>{
  let reviewRelease!:()=>void;let reviewCalls=0;let spoken=0;
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>result(),reviewResearch:async(_k,_m,i)=>{if(++reviewCalls===1){await new Promise<void>(resolve=>{reviewRelease=resolve;});return {action:"DELIVER",reason:"old context",speakText:"Source reports ten.",contextRevision:i.contextRevision};}return {action:"DISCARD",reason:"New topic",contextRevision:i.contextRevision};},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  await s.connect();try{s.acceptUtterance(u);await tick();s.acceptUtterance({...u,id:"new-topic",text:"New topic",startMs:200,endMs:300});reviewRelease();await tick();assert.equal(reviewCalls,2);assert.equal(spoken,0);}finally{await s.close();}
});
test("ready research expires after60seconds without stale playback",async(t)=>{
  const realNow=Date.now;let now=realNow();t.mock.method(Date,"now",()=>now);let spoken=0;const evidence:Record<string,unknown>[]=[];
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>result(),reviewResearch:async(_k,_m,i)=>({action:"WAIT",reason:"Wait",contextRevision:i.contextRevision}),synthesize:async()=>{spoken++;return new Int16Array(480);}});
  s.on("evidence",e=>evidence.push(e));await s.connect();try{s.acceptUtterance(u);await tick();now+=61000;await s.evaluate(true);assert.equal(spoken,0);assert.ok(evidence.some(e=>e.stage==="research-cancelled"&&String(e.reason).includes("TTL")));}finally{await s.close();}
});

test("review that finishes after TTL cannot release even if expiry timer is delayed",async(t)=>{
  let now=Date.now();t.mock.method(Date,"now",()=>now);let resolveReview!:()=>void;let spoken=0;
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>result(),reviewResearch:async(_k,_m,i)=>{await new Promise<void>(resolve=>{resolveReview=resolve;});return {action:"DELIVER",reason:"Relevant",speakText:"Source reports ten.",contextRevision:i.contextRevision};},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  await s.connect();try{s.acceptUtterance(u);await tick();now+=61000;resolveReview();await tick();assert.equal(spoken,0);}finally{await s.close();}
});
test("pending-job review cannot authorize a result it never saw",async()=>{
  let finishSearch!:(r:ResearchResult)=>void;let finishReview!:()=>void;let spoken=0;let reviewCalls=0;
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:()=>new Promise(resolve=>{finishSearch=resolve;}),reviewResearch:async(_k,_m,i)=>{if(++reviewCalls===1){assert.equal(i.resultText,null);await new Promise<void>(resolve=>{finishReview=resolve;});return {action:"DELIVER",reason:"Invalid pending delivery fixture",speakText:"Unsupported answer.",contextRevision:i.contextRevision};}return {action:"DISCARD",reason:"Fresh review rejects",contextRevision:i.contextRevision};},synthesize:async()=>{spoken++;return new Int16Array(480);}});
  await s.connect();try{s.acceptUtterance(u);await tick();s.acceptUtterance({...u,id:"continued-pending",text:"More context",startMs:200,endMs:300});await tick();finishSearch(result());await tick();finishReview();await tick();assert.equal(spoken,0);assert.equal(reviewCalls,2);}finally{await s.close();}
});

test("research failure evidence reports safe schema paths and codes without rejected provider values",async()=>{
  const evidence:Record<string,unknown>[]=[];const secret="SENSITIVE_PROVIDER_VALUE";
  const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>parseResearchResponse({...raw(),status:secret},0,1),synthesize:async()=>{throw new Error("must not speak");}});
  s.on("error",()=>undefined);s.on("evidence",e=>evidence.push(e));await s.connect();try{s.acceptUtterance(u);await tick();const failure=evidence.find(e=>e.stage==="research-failed")?.failure as {category:string;issues:{path:string[];code:string}[]};assert.equal(failure.category,"invalid_response");assert.ok(failure.issues.some(i=>i.path.join(".")==="status"));assert.ok(!JSON.stringify(failure).includes(secret));assert.ok(!JSON.stringify(failure).includes("message"));}finally{await s.close();}
});
test("research failure evidence classifies timeout, abort and static HTTP status, redacts unknown messages",async()=>{
  const cases:[Error,string,number?][]=[[new DOMException("sensitive timeout detail","TimeoutError"),"timeout"],[new DOMException("sensitive abort detail","AbortError"),"aborted"],[new Error("Meta research HTTP 429"),"http_error",429],[new Error("Meta research HTTP 401 secret-value"),"provider_error"],[new Error("private-provider-body secret-value"),"provider_error"]];
  for(const [error,category,status] of cases){const evidence:Record<string,unknown>[]=[];const s=new MetaSession(options,{decide:async(_k,_m,us,r)=>lookup(r,us),research:async()=>{throw error;},synthesize:async()=>new Int16Array(480)});s.on("error",()=>undefined);s.on("evidence",e=>evidence.push(e));await s.connect();try{s.acceptUtterance(u);await tick();const failure=evidence.find(e=>e.stage==="research-failed")?.failure as Record<string,unknown>;assert.equal(failure.category,category);assert.equal(failure.httpStatus,status);assert.ok(!JSON.stringify(failure).includes("secret-value"));assert.ok(!JSON.stringify(failure).includes("sensitive"));}finally{await s.close();}}
});
