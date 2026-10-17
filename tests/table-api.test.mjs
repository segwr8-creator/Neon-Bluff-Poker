import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const db=new DatabaseSync(':memory:');
for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
function prepare(sql,args=[]){return {bind(...v){return prepare(sql,v)},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},sql,args}}
globalThis.__roomDb={prepare,async batch(statements){db.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>({meta:{changes:Number(db.prepare(s.sql).run(...s.args).changes)}}));db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};
const dir=fs.mkdtempSync(resolve('work')+'/table-api-');
function compile(file,name,replace=s=>s){const code=ts.transpileModule(replace(fs.readFileSync(file,'utf8')),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;fs.writeFileSync(dir+'/'+name,code);return pathToFileURL(dir+'/'+name).href}
try{
 compile('db/schema.ts','schema.mjs');
 const origin=compile('lib/api-origin.ts','origin.mjs',s=>s.replace("import { runtimeConfig } from '@/db/runtime';","const runtimeConfig=()=>({MOBILE_ALLOWED_ORIGINS:'capacitor://localhost'});"));
 const statements=compile('db/table-statements.ts','statements.mjs',s=>s.replace("'./schema'","'./schema.mjs'"));
 const api=await import(compile('app/api/table/route.ts','route.mjs',s=>s.replace("'../../../lib/api-origin'",JSON.stringify(origin)).replace("import { roomDb } from '../../../db';","const roomDb=()=>globalThis.__roomDb;").replace("'../../../db/table-statements'",JSON.stringify(statements)).replace("'../../../lib/table-engine.mjs'",JSON.stringify(pathToFileURL(resolve('lib/table-engine.mjs')).href)).replace("'../../../public/table-config.mjs'",JSON.stringify(pathToFileURL(resolve('public/table-config.mjs')).href))));
 async function post(body,token){const r=await api.POST(new Request('https://game.test/api/table',{method:'POST',headers:{Origin:'https://game.test',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));return{status:r.status,...await r.json()}}
 async function get(op,token,code=''){const r=await api.GET(new Request('https://game.test/api/table?op='+op+'&code='+code,{headers:token?{Authorization:'Bearer '+token}:{}}));return{status:r.status,...await r.json()}}
 const preflight=await api.OPTIONS(new Request('https://game.test/api/table',{method:'OPTIONS',headers:{Origin:'capacitor://localhost'}}));assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'capacitor://localhost');
 assert.equal((await api.OPTIONS(new Request('https://game.test/api/table',{method:'OPTIONS',headers:{Origin:'https://evil.test'}}))).status,403);
 assert.equal((await get('create')).status,405);assert.equal((await post(null)).status,400);
 assert.equal((await get('profile')).status,401);
 const a=await post({op:'profile',name:'Host'}),b=await post({op:'profile',name:'Guest'});
 assert.equal(a.profile.wallet,50000);
 assert.equal((await post({op:'create',buyIn:999999,stake:'cash500'},a.token)).status,400);
 const created=await post({op:'create',name:'Host',kind:'live',variant:'holdem',rules:'classic',stake:'cash500',buyIn:5000},a.token);
 assert.equal(created.status,200);assert.equal(created.profile.wallet,45000);const code=created.view.code;
 const joined=await post({op:'join',code,name:'Guest',buyIn:5000},b.token);assert.equal(joined.status,200);assert.equal(joined.profile.wallet,45000);
 const start=await post({op:'start',code,version:joined.view.version},a.token);assert.equal(start.status,200);
 assert.ok(start.view.players[1].cards.every(c=>c===null));assert.equal(start.view.pot,75);
 const turn=start.view.turn,token=turn===0?a.token:b.token;const v=(await get('poll',token,code)).view;
 const action={op:'action',code,version:v.version,actionStamp:v.actionStamp,requestId:'one-call',action:'call',amount:999999};
 const call=await post(action,token);assert.equal(call.status,200);assert.equal(call.view.pot,100); // only the server-computed deficit is paid
 const again=await post(action,token);assert.equal(again.status,200);assert.equal(again.view.pot,100);
 const opponent=turn===0?b.token:a.token;
 const bad=await post({...action,version:call.view.version,requestId:'out-of-turn',action:'raise'},token);assert.notEqual(bad.status,200);
 let view=(await get('poll',opponent,code)).view;
 const folded=await post({op:'action',code,version:view.version,actionStamp:view.actionStamp,requestId:'fold-now',action:'fold'},opponent);assert.equal(folded.status,200);
 assert.equal(folded.view.players.reduce((sum,p)=>sum+(p?.stack||0),0),10000);
 const leaveA=await post({op:'leave',code},a.token),leaveB=await post({op:'leave',code},b.token);
 assert.equal(leaveA.status,200);assert.equal(leaveB.status,200);assert.equal(leaveA.profile.wallet+leaveB.profile.wallet,100000);
 assert.notEqual((await post({op:'leave',code},a.token)).status,200);
 assert.equal(db.prepare('select sum(cash_balance) total from profiles').get().total,100000);
 console.log('API checks passed: auth, input/method validation, hidden cards, exact calls, replay protection, turn ownership, settlement conservation.');
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});delete globalThis.__roomDb}
