import { env } from '../server/config.js';
import { decide } from '../server/meta/director.js';
import { MetaAsr } from '../server/meta/asr-realtime.js';
import { synthesize } from '../server/speech/tts.js';
import { GEMINI_TTS_MODEL, synthesizeGemini } from '../server/speech/gemini-tts.js';
import { RoomServiceClient } from 'livekit-server-sdk';
import { mkdirSync, writeFileSync } from 'node:fs';
const gemini = env.TTS_PROVIDER === 'gemini';
const results: Record<string,unknown> = {at:new Date().toISOString(),kind:'real-provider-calls-with-synthetic-input',models:{asr:env.META_ASR_MODEL,director:env.META_DIRECTOR_MODEL,ttsProvider:env.TTS_PROVIDER,tts:gemini?GEMINI_TTS_MODEL:env.TTS_MODEL,voice:gemini?env.GEMINI_TTS_VOICE:env.TTS_VOICE}};
async function check(name:string,fn:()=>Promise<unknown>){try{results[name]={ok:true,result:await fn()}}catch(e){results[name]={ok:false,error:e instanceof Error ? e.message.replace(/(?:https?|wss?):\/\/\S+/g,'[endpoint]'):'failed'}}}
await check('metaDirector',async()=>decide(env.META_API_KEY!,env.META_DIRECTOR_MODEL,[{id:'fixture-1',identity:'synthetic-host',text:'우리는 작은 팀에서 회의 진행자가 필요한지 토론하고 있습니다. 지금 후속 질문을 하나 해 주세요.',startMs:0,endMs:5000}],1,true,new AbortController().signal));
await check('metaAsrHandshake',async()=>{const asr=new MetaAsr(env.META_API_KEY!,env.META_ASR_MODEL,0,{complete(){},failed(){}});try{await asr.connect();return 'authenticated handshake'}finally{asr.close()}});
await check('speech',async()=>{const pcm=await (gemini?synthesizeGemini:synthesize)(gemini?env.GEMINI_API_KEY!:env.OPENAI_API_KEY!,gemini?GEMINI_TTS_MODEL:env.TTS_MODEL,gemini?env.GEMINI_TTS_VOICE:env.TTS_VOICE,'Hello. This is the co-host speech connection check.',new AbortController().signal);return {provider:env.TTS_PROVIDER,samples:pcm.length,seconds:pcm.length/24000}});
await check('livekit',async()=>{const client=new RoomServiceClient(env.LIVEKIT_URL!.replace(/^ws/,'http'),env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET);await client.listRooms();return 'authenticated room listing; names not retained'});
mkdirSync('output/probes',{recursive:true});writeFileSync('output/probes/provider-check.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
