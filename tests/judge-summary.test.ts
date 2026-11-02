import { test } from 'node:test';
import assert from 'node:assert/strict';
import { researchSummary } from '../web/studio/research-summary.js';
import type { LogEntry } from '../shared/events.js';
const e = (stage:string, meta:Record<string,unknown> = {}, at=1):LogEntry => ({id:`${stage}-${at}`,kind:'system',at,text:stage,meta:{stage,...meta}});
test('new result supersedes a pending-result WAIT explanation without inventing a new model verdict',()=>{
  const r=researchSummary([e('research-request',{jobId:'a'},1),e('research-review',{jobId:'a',action:'WAIT',reason:'Pending result'},2),e('research-complete',{jobId:'a'},3)]);
  assert.equal(r.state,'Result ready · checking context'); assert.equal(r.reason,undefined);
});
test('summary distinguishes generated speech from server transport and ignores other generations',()=>{
  const logs=[e('research-request',{jobId:'a'}),e('research-release',{jobId:'a',generation:4}),e('tts-generated',{generation:4}),e('server-first-audio-accepted',{generation:3})];
  assert.match(researchSummary(logs).state,/not yet confirmed sent/);
  logs.push(e('server-first-audio-accepted',{generation:4}));
  assert.equal(researchSummary(logs).state,'Delivered to server transport');
});
test('summary keeps cancelled jobs cancelled after an unrelated later audio event and resets for a new job',()=>{
  const logs=[e('research-request',{jobId:'a'}),e('research-cancelled',{jobId:'a'}),e('server-first-audio-accepted',{generation:9})];
  assert.equal(researchSummary(logs).state,'Cancelled');
  logs.push(e('research-request',{jobId:'b'}));
  assert.equal(researchSummary(logs).state,'Searching');
  assert.equal(researchSummary(logs).answer,null);
});
test('summary separates model WAIT from application permission gate',()=>{
  assert.equal(researchSummary([e('director-complete',{action:'WAIT',handoff:false})]).decision,'Meta chose WAIT');
  assert.match(researchSummary([e('director-complete',{action:'ASK',handoff:false})]).decision!,/application requires Handoff/);
  assert.equal(researchSummary([e('research-request',{jobId:'a'}),e('research-review',{jobId:'a',action:'DELIVER'})]).state,'Waiting · application speech gate');
});
test('summary excludes unsafe source links and shows failed searches as failure rather than generic cancellation',()=>{
  const r=researchSummary([e('research-request',{jobId:'a'}),e('research-complete',{jobId:'a',sources:[{url:'javascript:alert(1)'},{url:'https://user:pass@example.org'},{url:'https://example.org',title:'Source'}]}),e('research-failed',{jobId:'a'}),e('research-cancelled',{jobId:'a',reason:'research-failure'})]);
  assert.equal(r.sources.length,1); assert.match(r.state,/Failed/);
});
