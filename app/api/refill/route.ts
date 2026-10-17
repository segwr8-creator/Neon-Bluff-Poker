import { allowedApiOrigin, withApiAccess, apiOptions } from '../../../lib/api-origin';
import { roomDb } from '../../../db';
import { account, eligibility, response, billingReady, adsReady, PACKS, AD_REWARD, grant, hash, playPurchase } from '../../../lib/monetization';
export const dynamic='force-dynamic';
async function getRefill(req:Request){try{
 const p=await account(req);return response({wallet:p.cash_balance,blockedReason:eligibility(p),adBlockedReason:eligibility(p,'ad'),billingAvailable:billingReady(),adsAvailable:adsReady(),packs:PACKS,adReward:AD_REWARD,accountId:p.id});
}catch{return response({error:'Open Play to load your player profile.'},401)}}
async function postRefill(req:Request){try{
 if(!allowedApiOrigin(req))return response({error:'Open the game directly.'},403);
 const text=await req.text();if(text.length>8192)return response({error:'Request too large.'},413);
 const body=JSON.parse(text),p=await account(req),db=roomDb(),now=Date.now();
 if(body.op==='intent'){
  if(body.kind==='ad'?!adsReady():body.kind==='purchase'?!billingReady():true)return response({error:'Chip refills are not live yet.'},503);
  const blocked=eligibility(p,body.kind);if(blocked)return response({error:blocked},409);
  if(body.kind==='purchase'&&!PACKS.some(x=>x.id===body.product))return response({error:'Unknown chip pack.'},400);
  const existing:any=await db.prepare('SELECT * FROM refill_intents WHERE profile_id=? AND created>? ORDER BY created DESC LIMIT 1').bind(p.id,now-60000).first();
  if(existing)return response({error:'A refill was just opened. Please wait a minute before trying again.'},429);
  const id=crypto.randomUUID(),expires=now+3600000;
  await db.prepare('INSERT INTO refill_intents (id,profile_id,kind,product,created,expires) VALUES (?,?,?,?,?,?)').bind(id,p.id,body.kind,body.kind==='purchase'?body.product:null,now,expires).run();
  return response({intent:id,accountId:p.id,expires});
 }
 if(body.op==='verify-purchase'){
  if(!billingReady())return response({error:'Google Play purchases are not live yet.'},503);
  if(typeof body.purchaseToken!=='string'||body.purchaseToken.length>4096||typeof body.intent!=='string')throw new Error('Invalid receipt.');
  const intent:any=await db.prepare('SELECT * FROM refill_intents WHERE id=? AND profile_id=? AND kind=?').bind(body.intent,p.id,'purchase').first();
  if(!intent)throw new Error('Purchase session not found.');
  const pack=PACKS.find(x=>x.id===intent.product);if(!pack)throw new Error('Unknown chip pack.');
  const receipt:any=await playPurchase(pack.id,body.purchaseToken);
  if(receipt.purchaseState!==0)return response({error:'Your purchase is pending or canceled. No chips have been added.',pending:receipt.purchaseState===2},409);
  if(receipt.obfuscatedExternalAccountId!==p.id||receipt.obfuscatedExternalProfileId!==intent.id)throw new Error('Purchase belongs to a different refill session.');
  if(receipt.productId&&receipt.productId!==pack.id)throw new Error('Product does not match.');
  if((receipt.quantity??1)!==1)throw new Error('This pack supports one purchase at a time. Contact support.');
  const purchased=Number(receipt.purchaseTimeMillis);
  if(!Number.isFinite(purchased)||purchased<intent.created-60000||purchased>intent.expires)throw new Error('Purchase is outside this refill session.');
  const id='play:'+await hash(body.purchaseToken),known:any=await db.prepare('SELECT id FROM refill_ledger WHERE id=?').bind(id).first();
  if(receipt.consumptionState===1&&!known)throw new Error('This receipt was already consumed. Contact support.');
  await grant(id,intent,'google-play',pack.id,pack.amount);
  // Grant durably first; retrying consumption cannot grant twice.
  let consumePending=false;if(receipt.consumptionState!==1){try{await playPurchase(pack.id,body.purchaseToken,true)}catch{consumePending=true}}
  const updated:any=await db.prepare('SELECT cash_balance FROM profiles WHERE id=?').bind(p.id).first();
  return response({credited:true,wallet:updated.cash_balance,consumePending});
 }
 return response({error:'Unknown refill request.'},400);
}catch{return response({error:'Unable to confirm the refill. Do not purchase again; retry or contact support.'},400)}}

export const GET=withApiAccess(getRefill);
export const POST=withApiAccess(postRefill);

export const OPTIONS=apiOptions;
