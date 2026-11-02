import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudioBus } from '../server/bus.js';
test('new session clears browser history while preserving earlier session evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cohost-history-'));
 try {
 const bus=new StudioBus(dir);bus.beginSession('first');bus.log('human','Private prior session');bus.endSession();
 let cleared=false;bus.on('history',entries=>{cleared=entries.length===0});bus.beginSession('second');
 assert.equal(cleared,true);assert.deepEqual(bus.history(),[]);
 assert.match(readFileSync(join(dir,'first','events.jsonl'),'utf8'),/Private prior session/);
 bus.log('human','New discussion');assert.equal(bus.history().length,1);assert.equal(bus.history()[0].text,'New discussion');
 }finally{rmSync(dir,{recursive:true,force:true})}
});
