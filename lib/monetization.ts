import { runtimeConfig } from '@/db/runtime';
import { roomDb } from '../db';
// Keep closed until Android integration, account recovery, refund reconciliation,
// consent/privacy work and Google sandbox validation are complete. No live sales yet.
export const RELEASE_READY = false;
export { STORE_PACKS as PACKS } from "../public/store-catalog.mjs";
export const AD_REWARD = 5000;
export const config = runtimeConfig;
export const billingReady = () => RELEASE_READY && config().MONETIZATION_ENABLED==='true' && !!config().PLAY_PACKAGE_NAME && !!config().PLAY_SERVICE_ACCOUNT_JSON;
export const adsReady = () => RELEASE_READY && config().MONETIZATION_ENABLED==='true' && !!config().ADMOB_REWARDED_UNIT_ID;
export const hash = async (v:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))),b=>b.toString(16).padStart(2,'0')).join('');
export const response = (data:unknown,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function account(req:Request){
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Open Play to restore your player profile.');
 const p:any=await roomDb().prepare('SELECT * FROM profiles WHERE id=?').bind(await hash(token)).first();
 if(!p)throw new Error('Your player profile could not be found.');return p;
}
export function eligibility(p:any,kind='purchase'){
 if(p.active_room)return 'Leave your current table first so its remaining table stack return to your bank.';
 if(kind==='ad'&&p.cash_balance>=500)return 'Ad refills are available when your bank falls below the SD 5.00 Micro minimum buy-in.';
 return null;
}
export async function grant(id:string,intent:any,provider:string,product:string,amount:number){
 const db=roomDb(),mutation=crypto.randomUUID(),now=Date.now();
 // Both provider receipt and intent are unique. A fresh mutation gates the credit
 // inside one atomic D1 batch, including concurrent callbacks and retries.
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO refill_ledger (id,intent_id,profile_id,provider,product,amount,mutation,created) VALUES (?,?,?,?,?,?,?,?)').bind(id,intent.id,intent.profile_id,provider,product,amount,mutation,now),
  db.prepare("UPDATE profiles SET cash_balance=cash_balance+?,gift_locked=CASE WHEN ?='admob' THEN 1 ELSE gift_locked END,updated=? WHERE id=? AND EXISTS (SELECT 1 FROM refill_ledger WHERE id=? AND mutation=?)").bind(amount,provider,now,intent.profile_id,id,mutation)
 ]);
 const row:any=await db.prepare('SELECT * FROM refill_ledger WHERE id=?').bind(id).first();
 if(!row||row.profile_id!==intent.profile_id||row.intent_id!==intent.id)throw new Error('This refill has already been handled.');
 return row;
}
function bytes(s:string){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
function b64(v:Uint8Array){return btoa(String.fromCharCode(...v)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
let oauth:{token:string,expires:number}|null=null;
async function accessToken(){
 if(oauth&&oauth.expires>Date.now()+60000)return oauth.token;
 const service=JSON.parse(config().PLAY_SERVICE_ACCOUNT_JSON),now=Math.floor(Date.now()/1000);
 const enc=(v:unknown)=>b64(new TextEncoder().encode(JSON.stringify(v)));
 const unsigned=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:service.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const key=await crypto.subtle.importKey('pkcs8',bytes(service.private_key.replace(/-----[^-]+-----|\s/g,'')),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signed=b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned))));
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signed}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('Google Play verification is temporarily unavailable.');
 const data:any=await r.json();oauth={token:data.access_token,expires:Date.now()+Number(data.expires_in)*1000};return oauth.token;
}
export async function playPurchase(product:string,token:string,consume=false){
 const path='https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+encodeURIComponent(config().PLAY_PACKAGE_NAME)+'/purchases/products/'+encodeURIComponent(product)+'/tokens/'+encodeURIComponent(token)+(consume?':consume':'');
 const r=await fetch(path,{method:consume?'POST':'GET',headers:{Authorization:'Bearer '+await accessToken()},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('Google Play has not confirmed this purchase. Retry without buying again.');
 return consume?null:r.json();
}
let adKeys:{keys:any[],expires:number}|null=null;
async function verificationKey(id:string){
 if(!adKeys||adKeys.expires<Date.now()||!adKeys.keys.some(k=>String(k.keyId)===id)){
  const r=await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json',{signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('Ad verification temporarily unavailable.');
  const data:any=await r.json();adKeys={keys:data.keys,expires:Date.now()+3600000};
 }
 const k=adKeys.keys.find(k=>String(k.keyId)===id);if(!k)throw new Error('Unknown ad signature key.');
 return crypto.subtle.importKey('spki',bytes(k.base64),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
}
// AdMob uses ASN.1 DER; Web Crypto takes a fixed-width r||s signature.
function rawSignature(der:Uint8Array){
 if(der.length<8||der[0]!==48||der[1]!==der.length-2)throw new Error('Invalid signature.');
 let pos=2;const out=new Uint8Array(64);
 for(let i=0;i<2;i++){
  if(der[pos++]!==2)throw new Error('Invalid signature.');const len=der[pos++];
  if(!len||len>33||pos+len>der.length)throw new Error('Invalid signature.');
  let part=der.slice(pos,pos+len);pos+=len;
  if(part.length===33){if(part[0]!==0)throw new Error('Invalid signature.');part=part.slice(1);}
  out.set(part,i*32+32-part.length);
 }
 if(pos!==der.length)throw new Error('Invalid signature.');return out;
}
export async function verifyAd(req:Request){
 const raw=new URL(req.url).search.slice(1),split=raw.indexOf('&signature=');
 if(split<0)throw new Error('Missing signature.');
 const signed=raw.slice(0,split),tail=raw.slice(split+1);
 if(!/^signature=[^&]+&key_id=\d+$/.test(tail))throw new Error('Malformed signature.');
 const params=new URLSearchParams(raw),seen=new Set<string>();
 for(const [k] of params){if(seen.has(k))throw new Error('Duplicate parameter.');seen.add(k);}
 const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},await verificationKey(params.get('key_id')!),rawSignature(bytes(params.get('signature')!)),new TextEncoder().encode(signed));
 if(!valid)throw new Error('Invalid ad signature.');
 if(params.get('ad_unit')!==config().ADMOB_REWARDED_UNIT_ID||params.get('reward_amount')!=='50'||params.get('reward_item')!=='fictional_dollars')throw new Error('Unexpected ad reward.');
 return params;
}
