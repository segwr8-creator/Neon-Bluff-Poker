import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
fs.mkdirSync('work',{recursive:true});const dir=fs.mkdtempSync(resolve('work')+'/admob-');
function compile(file,name,replace=s=>s){const code=ts.transpileModule(replace(fs.readFileSync(file,'utf8')),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;fs.writeFileSync(dir+'/'+name,code);return pathToFileURL(dir+'/'+name).href}
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
function prepare(sql,args=[]){return{bind(...v){return prepare(sql,v)},async first(){return db.prepare(sql).get(...args)||null},sql,args}}
globalThis.__rewardDb={prepare,async batch(items){db.exec('BEGIN');try{const result=items.map(s=>({meta:{changes:Number(db.prepare(s.sql).run(...s.args).changes)}}));db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};
const secret='a'.repeat(64),userId='b'.repeat(64),now=Date.now();
globalThis.__rewardConfig={MONETIZATION_ENABLED:'true',ADMOB_REWARDED_UNIT_ID:'test-unit',MOBILE_APP_API_SECRET:secret};
db.prepare('INSERT INTO profiles(id,name,created,updated,cash_balance) VALUES (?,?,?,?,?)').run(userId,'Tester',now,now,0);
db.prepare('INSERT INTO refill_intents(id,profile_id,kind,created,expires) VALUES (?,?,?,?,?)').run('intent-one',userId,'ad',now-120000,now+3600000);
const relayURL=compile('lib/admob-relay.ts','relay.mjs');
const moneyURL=compile('lib/monetization.ts','monetization.mjs',s=>s.replace("import { runtimeConfig } from '@/db/runtime';","const runtimeConfig=()=>globalThis.__rewardConfig;").replace("import { roomDb } from '../db';","const roomDb=()=>globalThis.__rewardDb;").replace('RELEASE_READY = false','RELEASE_READY = true').replace('"../public/store-catalog.mjs"',JSON.stringify(pathToFileURL(resolve('public/store-catalog.mjs')).href)));
const api=await import(compile('app/api/rewards/admob/route.ts','route.mjs',s=>s.replace("import { roomDb } from '../../../../db';","const roomDb=()=>globalThis.__rewardDb;").replace("'../../../../lib/monetization'",JSON.stringify(moneyURL)).replace("'../../../../lib/admob-relay'",JSON.stringify(relayURL))));
const {verifyRelay}=await import(relayURL),encoder=new TextEncoder();
const key=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const savedFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[{keyId:1,base64:Buffer.from(await crypto.subtle.exportKey('spki',key.publicKey)).toString('base64')}]});
async function callback(tx='tx-one'){
 const raw=new URLSearchParams({ad_unit:'test-unit',custom_data:'intent-one',reward_amount:'50',reward_item:'fictional_dollars',timestamp:String(now-60000),transaction_id:tx,user_id:userId}).toString();
 const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key.privateKey,encoder.encode(raw)));
 const parts=[sig.slice(0,32),sig.slice(32)].map(p=>{while(p.length>1&&p[0]===0)p=p.slice(1);return p[0]&128?Uint8Array.from([0,...p]):p});const body=parts.flatMap(p=>[2,p.length,...p]);
 return raw+'&signature='+Buffer.from([48,body.length,...body]).toString('base64url')+'&key_id=1';
}
async function body(query,timestamp=Date.now()){
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',encoder.encode(query))).toString('hex');
 const hmac=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Buffer.from(await crypto.subtle.sign('HMAC',hmac,encoder.encode(`${userId}:50:${timestamp}:${hash}`))).toString('hex');return{userId,rewardAmount:50,timestamp,signature,callbackQuery:query};
}
const request=b=>new Request('https://game.test/api/rewards/admob',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
test('Reward proof, HMAC, replay and transaction checks',async()=>{
 try{
  const query=await callback(),b=await body(query);
  await assert.rejects(verifyRelay(request(b),undefined,50),e=>e.status===503);
  await assert.rejects(verifyRelay(request({...b,timestamp:null}),secret,50),e=>e.status===400);
  await assert.rejects(verifyRelay(request(await body(query,Date.now()-31000)),secret,50),e=>e.status===403);
  await assert.rejects(verifyRelay(request({...b,signature:'0'.repeat(64)}),secret,50),e=>e.status===401);
  await assert.rejects(verifyRelay(request({...b,rewardAmount:5000}),secret,50),e=>e.status===400);
  await assert.rejects(verifyRelay(request({...b,callbackQuery:query+'x'}),secret,50),e=>e.status===401);
  assert.equal((await api.POST(request(await body(query.replace('reward_amount=50','reward_amount=500'))))).status,401);
  const results=await Promise.all([api.POST(request(b)),api.POST(request(b)),api.GET(new Request('https://game.test/api/rewards/admob?'+query))]);
  assert.ok(results.every(r=>r.status===200));assert.equal(db.prepare('SELECT cash_balance FROM profiles WHERE id=?').get(userId).cash_balance,5000);
  assert.equal(db.prepare('SELECT count(*) n FROM refill_ledger').get().n,1);
  assert.equal((await api.POST(request(await body(await callback('tx-two'))))).status,409);
  globalThis.__rewardConfig.MONETIZATION_ENABLED='false';assert.equal((await api.POST(request(b))).status,503);
 }finally{globalThis.fetch=savedFetch;db.close();fs.rmSync(dir,{recursive:true,force:true});delete globalThis.__rewardDb;delete globalThis.__rewardConfig}
});
