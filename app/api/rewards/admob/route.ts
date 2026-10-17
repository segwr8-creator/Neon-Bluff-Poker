import { roomDb } from '../../../../db';
import { adsReady, response, verifyAd, grant, AD_REWARD, config } from '../../../../lib/monetization';
import { verifyRelay, RewardRequestError } from '../../../../lib/admob-relay';
export const dynamic='force-dynamic';

// Both entry points require authentic AdMob SSV proof. Client assertions never mint rewards.
async function settle(req:Request,expectedUser?:string){
 let p:URLSearchParams;
 try{
  if(new URL(req.url).search.length>8193)throw new Error('Callback too large.');
  p=await verifyAd(req);
 }catch(e){
  const unavailable=e instanceof Error&&/temporarily unavailable|fetch failed|timed out/i.test(e.message);
  return response({error:unavailable?'Reward verification temporarily unavailable.':'Invalid AdMob security signature or reward.'},unavailable?503:401);
 }
 const transaction=p.get('transaction_id')||'',intentId=p.get('custom_data')||'',timeText=p.get('timestamp')||'',time=Number(timeText);
 if(!/^[a-zA-Z0-9_-]{1,200}$/.test(transaction)||!intentId||intentId.length>200||!/^\d{1,16}$/.test(timeText)||!Number.isSafeInteger(time)||time>Date.now()+30000)return response({error:'Invalid reward event.'},400);
 if(expectedUser&&p.get('user_id')!==expectedUser)return response({error:'Reward recipient does not match.'},403);
 try{
  const db=roomDb();
  const intent:any=await db.prepare('SELECT * FROM refill_intents WHERE id=? AND kind=?').bind(intentId,'ad').first();
  if(!intent||p.get('user_id')!==intent.profile_id||time<intent.created-60000||time>intent.expires)return response({error:'Reward session does not match.'},403);
  const profile=await db.prepare('SELECT id FROM profiles WHERE id=?').bind(intent.profile_id).first();
  if(!profile)return response({error:'Reward account no longer exists.'},409);
  // A signed old event may arrive late. Unique transaction AND intent IDs prevent
  // double credit, including concurrent retries inside the 30-second relay window.
  const previous:any=await db.prepare('SELECT * FROM refill_ledger WHERE id=? OR intent_id=?').bind('admob:'+transaction,intent.id).first();
  if(previous&&(previous.id!=='admob:'+transaction||previous.intent_id!==intent.id||previous.profile_id!==intent.profile_id||previous.provider!=='admob'||previous.amount!==AD_REWARD))return response({error:'Reward transaction conflicts with a previous claim.'},409);
  await grant('admob:'+transaction,intent,'admob','ad_refill_50',AD_REWARD);
  return response({received:true,success:true,rewardAmount:AD_REWARD/100,message:'Reward verified and recorded. Repeated delivery does not add another reward.'});
 }catch{return response({error:'Reward storage temporarily unavailable. Retry the same transaction.'},503)}
}

// Google's official callback remains GET and does not require our relay secret.
export async function GET(req:Request){
 if(!adsReady())return response({error:'Rewarded ads are not enabled.'},503);
 return settle(req);
}

// Optional server-to-server relay; not an APK-generated reward claim.
export async function POST(req:Request){
 if(!adsReady())return response({error:'Rewarded ads are not enabled.'},503);
 try{
  const body=await verifyRelay(req,config().MOBILE_APP_API_SECRET,AD_REWARD/100);
  return settle(new Request(new URL(req.url).origin+'/api/rewards/admob?'+body.callbackQuery),body.userId);
 }catch(e){
  return e instanceof RewardRequestError?response({error:e.message},e.status):response({error:'Unable to process reward request.'},500);
 }
}
