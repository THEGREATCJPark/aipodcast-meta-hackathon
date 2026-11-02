import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reviewResearch } from '../server/meta/research-review.js';
import { safeResearchFailure } from '../server/meta/session.js';
const input = {query:'author',requestUtteranceIds:[],utterances:[],resultText:'Source names the author.',contextRevision:1,humansSpeaking:false};
test('review reports budget exhaustion without exposing provider content', async t => {
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:null}}],usage:{completion_tokens:1000,completion_tokens_details:{reasoning_tokens:1000}}})));
  await assert.rejects(reviewResearch('fixture','fixture',input,new AbortController().signal), error => {
    assert.deepEqual(safeResearchFailure(error),{category:'completion_limit',finishReason:'length',contentLength:0,completionTokens:1000,reasoningTokens:1000});return true;
  });
});
test('review never accepts a truncated answer even if its JSON parses',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:JSON.stringify({action:'DELIVER',contextRevision:1,reason:'private fixture',speakText:'private fixture'})}}]})));
  await assert.rejects(reviewResearch('fixture','fixture',input,new AbortController().signal),error=>{assert.equal(safeResearchFailure(error).category,'completion_limit');assert.ok(!JSON.stringify(safeResearchFailure(error)).includes('private fixture'));return true;});
});
test('review leaves answer capacity beyond the observed 1000-token reasoning exhaustion', async t => {
  t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    const request=JSON.parse(init.body as string);
    const exhausted=request.max_completion_tokens<=1000;
    return new Response(JSON.stringify({choices:[{finish_reason:exhausted?'length':'stop',message:{content:exhausted?null:JSON.stringify({action:'DELIVER',contextRevision:1,reason:'Still relevant',speakText:'Source names the author.'})}}],usage:{completion_tokens:exhausted?1000:1080,completion_tokens_details:{reasoning_tokens:998}}}));
  });
  const result=await reviewResearch('fixture','fixture',input,new AbortController().signal);
  assert.equal(result.action,'DELIVER');assert.equal(result.speakText,'Source names the author.');
});
