/** Editorial narration only. Never substitutes for the application's Meta answer. */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { env } from '../../server/config.js';
import { synthesize } from '../../server/speech/tts.js';
const root = 'output/video/assets'; mkdirSync(root,{recursive:true});
const clips = [
  {id:'intro',text:'A good conversation should not stop every time someone forgets a fact. Meta Conversation Co-host acts like a research producer: it listens, checks a requested reference, and returns the floor.'},
  {id:'disclosure',text:'This demonstration uses two synthetic speaker inputs and actual Meta API responses. The following recording shows the real app, not a scripted AI answer.'},
  {id:'evidence',text:'The lookup continues while the speakers talk. Before speaking, Meta reviews whether the result is still relevant. The source stays available for inspection. This recording preserves the actual waiting time.'},
  {id:'control',text:'People retain control. In this separate recorded run, a handoff invites a follow-up question. The operator sends HOLD while the co-host is speaking. This is a manual control, not automatic interruption.'},
  {id:'engineering',text:'Meta handles speech recognition, conversation decisions, web research, and the final relevance check. OpenAI provides speech synthesis, and LiveKit carries the audio. The new Meta pipeline builds on my existing React and LiveKit studio. Transcripts, sources, decisions, and separate audio are saved locally.'},
  {id:'closing',text:'A working MVP, with real model calls. Response times vary, sources need review, and human testing remains ahead. Help the conversation. Then step back.'},
];
if(!env.OPENAI_API_KEY)throw new Error('Configure the existing local TTS key.');
const records=[];
for(const clip of clips){
 const fingerprint=createHash('sha256').update(JSON.stringify({text:clip.text,model:env.TTS_MODEL,voice:'onyx'})).digest('hex');
 const path=join(root,`${clip.id}-${fingerprint.slice(0,10)}.wav`);
 if(!existsSync(path)){
  const pcm=await synthesize(env.OPENAI_API_KEY,env.TTS_MODEL,'onyx',clip.text,AbortSignal.timeout(25000));
  const bytes=Buffer.from(pcm.buffer,pcm.byteOffset,pcm.byteLength);const h=Buffer.alloc(44);
  h.write('RIFF',0);h.writeUInt32LE(36+bytes.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(bytes.length,40);writeFileSync(path,Buffer.concat([h,bytes]));
 }
 records.push({...clip,path,seconds:(readFileSync(path).length-44)/48000,provider:'OpenAI',model:env.TTS_MODEL,voice:'onyx',purpose:'editorial narration'});
}
writeFileSync(join(root,'narration.json'),JSON.stringify(records,null,2));
console.log(JSON.stringify(records.map(({id,seconds,path})=>({id,seconds,path}))));
