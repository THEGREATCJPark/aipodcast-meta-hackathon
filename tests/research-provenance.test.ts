import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResearchResponse, researchSpeech } from "../server/meta/research.js";
import { safeResearchFailure } from "../server/meta/session.js";
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
test("literal spaces copied from an exact provider source remain grounded and do not leak URL into speech",()=>{
  const url="https://example.org/Readings/Vinge, The Coming Technological Singularity.pdf";
  const text=`Vernor Vinge wrote it, per [Original essay](${url}).`;
  const parsed=parseResearchResponse(response(text,[{...hit(1),url,title:"Original essay"}]),0,1);
  assert.equal(parsed.sources[0].url,url);
  assert.equal(researchSpeech(parsed),"Vernor Vinge wrote it, per Original essay.");
  const annotated:any=response(text,[]);annotated.output[1].content[0].annotations=[{type:"url_citation",url,title:"Original essay",start_index:0,end_index:21}];
  assert.equal(parseResearchResponse(annotated,0,1).sources[0].url,url);
  assert.throws(()=>parseResearchResponse(response(text,[hit(1)]),0,1),/not returned/);
});
test("source destination still rejects newline and unbalanced truncation even if raw hit exists",()=>{
  for(const url of ["https://example.org/a\nb.pdf","https://example.org/a\tb.pdf","https://example.org/a\u0000b.pdf","https://example.org/a (b.pdf"]){
    assert.throws(()=>parseResearchResponse(response(`[Source](${url})`,[{...hit(1),url}]),0,1),/Malformed/);
  }
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

test("safe research diagnostics distinguish exact parser failures without echoing raw details",()=>{
  assert.deepEqual(safeResearchFailure(new Error("Malformed research source link")),{category:"malformed_source_link"});
  assert.deepEqual(safeResearchFailure(new Error("Research source count limit exceeded")),{category:"source_count_limit"});
  assert.deepEqual(safeResearchFailure(new Error("Meta research review HTTP 429")),{category:"http_error",httpStatus:429});
  assert.deepEqual(safeResearchFailure(new Error("Malformed research source link https://private.invalid/?token=private-value")),{category:"provider_error"});
});
test("safe transport classification allowlists codes and never includes message, URL or unknown code",()=>{
  const nested=Object.assign(new Error("private host and credentials"),{code:"UND_ERR_SOCKET",url:"https://private.invalid"});
  assert.deepEqual(safeResearchFailure(new TypeError("fetch failed: private-value",{cause:nested})),{category:"transport_error",code:"UND_ERR_SOCKET"});
  assert.deepEqual(safeResearchFailure(Object.assign(new Error("private-value"),{code:"ECONNRESET"})),{category:"transport_error",code:"ECONNRESET"});
  assert.deepEqual(safeResearchFailure(new Error("private-value",{cause:{code:"SECRET_CUSTOM_CODE",message:"private-value"}})),{category:"provider_error"});
  const cycle:any=new Error("private-value");cycle.cause=cycle;
  assert.deepEqual(safeResearchFailure(cycle),{category:"provider_error"});
});
