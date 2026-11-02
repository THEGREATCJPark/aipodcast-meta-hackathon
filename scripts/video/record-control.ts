import { env, livekitConfig } from '../../server/config.js';
import { synthesize } from '../../server/speech/tts.js';
import { AgentRoom } from '../../server/agent/room.js';
import { createToken } from '../../server/livekit/tokens.js';
import { AudioFrame } from '@livekit/rtc-node';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const base=`http://localhost:${env.PORT}`;
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function api(path:string,body?:unknown){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:base,'x-studio':'1'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});const j=await r.json() as any;if(!r.ok||!j.success)throw new Error(`Studio request failed: ${path}`);return j.data;}
const before=await api('/api/state');
if(before.status.sessionActive||before.status.agentInRoom)throw new Error('Refusing to interrupt an active studio. Stop it before running this paid probe.');
if(before.settings.engine!=='meta')throw new Error('Select Meta in Studio before running probe.');
const root=`output/probes/video-control-${Date.now()}`;mkdirSync(root,{recursive:true});
const evidence:any={at:new Date().toISOString(),kind:'synthetic-English-speech-through-real-Studio',humanTrial:false};
const participant=new AgentRoom();let started=false;
const deadline=setTimeout(()=>{console.error('Studio probe exceeded 120 seconds; stop the session in Studio.');process.exit(1)},120000);
try{
 const text='We are discussing the technological singularity. Ask us one short follow-up question about whether intelligence can improve itself without limits.';
 const pcm=await synthesize(env.OPENAI_API_KEY!,env.TTS_MODEL,env.TTS_VOICE,text,new AbortController().signal);
 const cfg=livekitConfig()!;const token=await createToken(cfg,{room:before.settings.show.roomName,role:'guest',name:'Synthetic English fixture',ttlSeconds:180});
 let received=0;participant.on('frame',f=>{if(f.identity==='ai-mc')for(const x of f.pcm)if(Math.abs(x)>100){received++;break;}});
 const start=await api('/api/session/start',{});started=true;evidence.sessionId=start.sessionId;
 await participant.join(cfg.url,token.token);await wait(1500);
 for(let i=0;i<pcm.length;i+=480){const frame=new Int16Array(480);frame.set(pcm.slice(i,i+480));await participant.source.captureFrame(new AudioFrame(frame,24000,1,480));}
 // Send trailing silence so VAD can release the floor.
 for(let i=0;i<100;i++)await participant.source.captureFrame(new AudioFrame(new Int16Array(480),24000,1,480));
 let state:any;for(let i=0;i<100;i++){state=await api('/api/state');if(state.history.some((e:any)=>e.kind==='human'&&e.at>=Date.parse(evidence.at))&&state.status.metaState!=='thinking')break;await wait(250)}
 evidence.transcriptObserved=state.history.some((e:any)=>e.kind==='human'&&e.at>=Date.parse(evidence.at));
 if(!evidence.transcriptObserved)throw new Error('No real ASR transcript observed');
 await api('/api/control',{action:'handoff'});
 for(let i=0;i<160&&!received;i++)await wait(250);
 evidence.receivedNonSilentAiFrames=received;
 if(!received)throw new Error('No AI speech received after handoff');
 await wait(2500); evidence.holdRequestedAt=Date.now(); evidence.framesBeforeHold=received;
 await api('/api/control',{action:'hold'});evidence.holdState=(await api('/api/state')).status.mcState;
 // Separate manual-HOLD receiver check; no synthetic interruption is sent here.
 await wait(2000);const afterGrace=received;await wait(3000);
 evidence.lateAiFramesAfterHoldGrace=received-afterGrace;
 evidence.holdObservation={graceMs:2000,observationMs:3000,preciseStopLatencyMeasured:false};
 await api('/api/session/stop',{});started=false;await participant.leave();
 const dir=join(env.OUTPUT_DIR,evidence.sessionId);evidence.artifacts=['events.jsonl','summary.json','mc.wav','mix.wav'].map(file=>({file,exists:existsSync(join(dir,file))}));
 evidence.decisions=readFileSync(join(dir,'events.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line)).filter(e=>e.meta?.stage==='generated-decision').map(e=>e.meta);
 evidence.ok=evidence.holdState==='held'&&evidence.lateAiFramesAfterHoldGrace===0&&evidence.artifacts.every((f:any)=>f.exists);
}catch(e){evidence.ok=false;evidence.error=e instanceof Error?e.message:'Failed';}finally{if(started)await api('/api/session/stop',{}).catch(()=>undefined);await participant.leave();clearTimeout(deadline);writeFileSync(`${root}/evidence.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));process.exit(evidence.ok?0:1)}

