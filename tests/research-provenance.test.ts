import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResearchResponse, researchSpeech } from "../server/meta/research.js";
const hit=(n:number)=>({type:"text_result",url:`https://example.org/source-${n}`,title:`Source ${n}`,snippet:`Evidence ${n}`});
const response=(text:string,results:unknown[])=>({id:"response",status:"completed",output:[{id:"search",type:"web_search_call",status:"completed",results},{type:"message",status:"completed",role:"assistant",content:[{type:"output_text",text,annotations:[]}]}]});
test("selected real search hit beyond display limit keeps exact evidence and bounded output",()=>{
  const parsed=parseResearchResponse(response("Answer from [Source 12](https://example.org/source-12).",Array.from({length:20},(_,i)=>hit(i+1))),0,1);
  assert.equal(parsed.sources[0].url,"https://example.org/source-12");assert.equal(parsed.sources[0].kind,"model-linked-search-result");assert.equal(parsed.results.length,10);assert.ok(parsed.results.some(r=>r.url===parsed.sources[0].url));
});
test("balanced parentheses in exact result URL do not cause false source rejection or leak into speech",()=>{
  const url="https://example.org/Book_(novel)";
  const parsed=parseResearchResponse(response(`According to [Book](${url}), it was published in 1992.`,[{...hit(1),url,title:"Book"}]),0,1);
  assert.equal(parsed.sources[0].url,url);assert.equal(researchSpeech(parsed),"According to Book, it was published in 1992.");
});
test("chosen hit from later completed search retains its actual search call ID",()=>{
  const body:any=response("Answer from [Source 12](https://example.org/source-12).",[]);
  body.output.splice(0,1,...Array.from({length:12},(_,i)=>({id:`search-${i+1}`,type:"web_search_call",status:"completed",results:[hit(i+1)]})));
  const parsed=parseResearchResponse(body,0,1);assert.ok(parsed.searchCallIds.includes("search-12"));assert.ok(parsed.searchCallIds.length<=10);
});
test("completed-search match still rejects invented URLs and hits returned only by failed calls",()=>{
  const unknown=response("[Invented](https://example.org/missing)",Array.from({length:20},(_,i)=>hit(i+1)));assert.throws(()=>parseResearchResponse(unknown,0,1),/not returned/);
  const failed:any=response("[Source 12](https://example.org/source-12)",[hit(1)]);failed.output.unshift({id:"failed",type:"web_search_call",status:"failed",results:[hit(12)]});assert.throws(()=>parseResearchResponse(failed,0,1),/not returned/);
});
test("full returned-hit inspection is explicitly bounded instead of silently truncating provenance",()=>{
  assert.throws(()=>parseResearchResponse(response("[Source](https://example.org/source-1)",Array.from({length:1001},(_,i)=>hit(i+1))),0,1),/count limit/);
});
