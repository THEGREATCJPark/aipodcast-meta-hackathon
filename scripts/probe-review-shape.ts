/** One opt-in real-provider diagnostic from saved synthetic evidence; no retry or raw provider logging. */
import { readFileSync, writeFileSync } from 'node:fs';
import { env } from '../server/config.js';
import { reviewResearch, type ResearchReviewInput } from '../server/meta/research-review.js';
import { safeResearchFailure } from '../server/meta/session.js';
const e = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const result = e.searchCompletions.at(-1).meta;
const request = e.timeline.find((x:any)=>x.stage==='research-request');
const review = e.timeline.filter((x:any)=>x.stage==='research-review-request').at(-1);
const utterances=e.transcripts.map((x:any,i:number)=>({id:x.meta?.utteranceId??`u${i}`,identity:x.meta?.identity??'synthetic',text:x.text,startMs:i*1000,endMs:i*1000+900}));
const input:ResearchReviewInput={query:result.query,requestUtteranceIds:request.sourceUtteranceIds,requestUtterances:utterances.filter((x:any)=>request.sourceUtteranceIds.includes(x.id)),resultSources:result.sources,resultText:result.text,utterances,contextRevision:review.contextRevision,humansSpeaking:false};
const original=globalThis.fetch;
const report:any={kind:'single-real-review-diagnostic',humanTrial:false,input,startedAt:Date.now()};
globalThis.fetch=async(...args)=>{
 const response=await original(...args); const b=await response.clone().json() as any;
 report.responseShape={httpStatus:response.status,finishReason:b.choices?.[0]?.finish_reason,contentType:typeof b.choices?.[0]?.message?.content,contentLength:b.choices?.[0]?.message?.content?.length??0,usage:b.usage};
 return response;
};
try { report.result=await reviewResearch(env.META_API_KEY!,env.META_DIRECTOR_MODEL,input,AbortSignal.timeout(16000)); report.ok=true; }
catch(error){report.ok=false; report.failure=safeResearchFailure(error);}
finally{globalThis.fetch=original; report.finishedAt=Date.now(); const path=`output/probes/review-shape-${report.startedAt}.json`; writeFileSync(path,JSON.stringify(report,null,2)); console.log(JSON.stringify({path,ok:report.ok,responseShape:report.responseShape,failure:report.failure,result:report.result}));}
