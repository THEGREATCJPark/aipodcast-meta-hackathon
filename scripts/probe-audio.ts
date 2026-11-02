import { env, livekitConfig } from '../server/config.js';
import { MetaAsr } from '../server/meta/asr-realtime.js';
import { decide } from '../server/meta/director.js';
import { synthesize } from '../server/speech/tts.js';
import { AgentRoom } from '../server/agent/room.js';
import { createToken } from '../server/livekit/tokens.js';
import { AudioFrame } from '@livekit/rtc-node';
import { wavHeader } from '../server/recording/wav-track.js';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir=`output/probes/audio-${Date.now()}`;mkdirSync(dir,{recursive:true});
const evidence:any={at:new Date().toISOString(),kind:'synthetic-audio-real-providers',humanTrial:false};
const save=(name:string,pcm:Int16Array)=>writeFileSync(`${dir}/${name}.wav`,Buffer.concat([wavHeader(pcm.byteLength,24000),Buffer.from(pcm.buffer,pcm.byteOffset,pcm.byteLength)]));
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let asr:MetaAsr|undefined;const sender=new AgentRoom(),receiver=new AgentRoom();
try{
 const input=await synthesize(env.OPENAI_API_KEY!,env.TTS_MODEL,env.TTS_VOICE,'작은 팀에서 회의를 할 때 진행자가 꼭 필요할까요? 저는 모두가 공평하게 말할 기회가 중요하다고 생각합니다.',new AbortController().signal);save('synthetic-input',input);
 let final:any;asr=new MetaAsr(env.META_API_KEY!,env.META_ASR_MODEL,0,{complete(id,text,startMs,endMs){final={id,identity:'synthetic-speaker',text,startMs,endMs}},failed(){evidence.asrFailure=true}});
 await asr.connect();for(let i=0;i<input.length;i+=480){asr.append(input.slice(i,i+480));await delay(20)}
 for(let i=0;i<150&&!final;i++)await delay(100);asr.close();if(!final)throw new Error('ASR final timeout');evidence.transcript=final;
 const decision=await decide(env.META_API_KEY!,env.META_DIRECTOR_MODEL,[final],1,true,new AbortController().signal);evidence.decision=decision;
 if(decision.action==='WAIT'){evidence.output='WAIT; no speech';}else{
 const output=await synthesize(env.OPENAI_API_KEY!,env.TTS_MODEL,env.TTS_VOICE,decision.speakText,new AbortController().signal);save('tts-generated',output);
 const cfg=livekitConfig()!;const room=`meta-probe-${Date.now()}`;
 const a=await createToken(cfg,{room,role:'agent',name:'Synthetic sender',ttlSeconds:120});const b=await createToken(cfg,{room,role:'guest',name:'Synthetic receiver',ttlSeconds:120});
 const received:Int16Array[]=[];receiver.on('frame',f=>received.push(new Int16Array(f.pcm)));
 await receiver.join(cfg.url,b.token);await sender.join(cfg.url,a.token);await delay(1500);
 for(let i=0;i<output.length;i+=480){const frame=new Int16Array(480);frame.set(output.slice(i,i+480));await sender.source.captureFrame(new AudioFrame(frame,24000,1,480));}
 await delay(1500);const n=received.reduce((s,p)=>s+p.length,0);const pcm=new Int16Array(n);let offset=0;for(const chunk of received){pcm.set(chunk,offset);offset+=chunk.length}save('livekit-received',pcm);evidence.transport={sentSamples:output.length,receivedSamples:n,nonSilent:pcm.some(x=>Math.abs(x)>100)};if(!evidence.transport.nonSilent)throw new Error('No non-silent receiver audio');
 }
 evidence.ok=true;
}catch{evidence.ok=false;evidence.error='Audio probe failed; inspect stage evidence (credentials suppressed)'}finally{asr?.close();await sender.leave();await receiver.leave();writeFileSync(`${dir}/evidence.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify({dir,...evidence},null,2));process.exit(evidence.ok?0:1)}
