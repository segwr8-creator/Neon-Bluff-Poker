import { allowedApiOrigin, withApiAccess, apiOptions } from '../../../lib/api-origin';
import { roomDb } from '../../../db';
import { account, response } from '../../../lib/monetization';
import { aggression } from '../../../public/table-config.mjs';
import { GIFT_MAX, GIFT_DAILY_MAX, giftDayStart, GIFT_ACCEPT_SQL } from '../../../public/gift-policy.mjs';
export const dynamic='force-dynamic';
const pairId=(a:string,b:string)=>[a,b].sort().join(':');
async function handle(req:Request){try{
 const db=roomDb(),p=await account(req),now=Date.now(),url=new URL(req.url);let body:any={};
 if(req.method==='POST'){if(!allowedApiOrigin(req))return response({error:'Open the game directly.'},403);const raw=await req.text();if(raw.length>4096)return response({error:'Request too large.'},413);body=JSON.parse(raw)}
 const op=req.method==='GET'?url.searchParams.get('op')||'list':body.op,target=body.target||url.searchParams.get('target');
 if(op==='list'){
  const rows=await db.prepare("SELECT f.*,p.name FROM friendships f JOIN profiles p ON p.id=CASE WHEN f.sender=? THEN f.recipient ELSE f.sender END WHERE (f.sender=? OR f.recipient=?) AND f.status IN ('pending','accepted')").bind(p.id,p.id,p.id).all();
  const incoming=await db.prepare("SELECT g.id,g.sender,g.amount,g.created,p.name FROM gifts g JOIN profiles p ON p.id=g.sender WHERE g.recipient=? AND g.status='pending' AND g.created>?").bind(p.id,now-86400000).all();
  return response({friends:rows.results.map((r:any)=>({id:r.sender===p.id?r.recipient:r.sender,name:r.name,status:r.status,incoming:r.recipient===p.id})),gifts:incoming.results});
 }
 if(op==='gift-accept'||op==='gift-decline'){
  if(req.method!=='POST')return response({error:'Use POST for gifts.'},405);
  if(typeof body.id!=='string')throw new Error('Invalid gift.');const g:any=await db.prepare('SELECT * FROM gifts WHERE id=? AND recipient=?').bind(body.id,p.id).first();if(!g)throw new Error('Gift not found.');
  if(op==='gift-decline'){await db.prepare("UPDATE gifts SET status='declined' WHERE id=? AND recipient=? AND status='pending'").bind(g.id,p.id).run();return response({ok:true})}
  const mutation=crypto.randomUUID();const results=await db.batch([
   db.prepare(GIFT_ACCEPT_SQL).bind(mutation,now,g.id,p.id,now-86400000,g.sender,g.amount,pairId(g.sender,p.id),g.sender,giftDayStart(now),p.id,giftDayStart(now)),
   db.prepare('UPDATE profiles SET cash_balance=cash_balance-?,updated=? WHERE id=? AND EXISTS (SELECT 1 FROM gifts WHERE id=? AND mutation=?)').bind(g.amount,now,g.sender,g.id,mutation),
   db.prepare('UPDATE profiles SET cash_balance=cash_balance+?,updated=? WHERE id=? AND EXISTS (SELECT 1 FROM gifts WHERE id=? AND mutation=?)').bind(g.amount,now,p.id,g.id,mutation)
  ]);if(!results[0].meta.changes)throw new Error('Gift already handled, expired, unaffordable, or a daily gift limit has been reached.');return response({ok:true});
 }
 if(typeof target!=='string'||!/^[a-f0-9]{64}$/.test(target)||target===p.id)throw new Error('Choose another human player.');
 const peer:any=await db.prepare('SELECT id,name,created,stats FROM profiles WHERE id=?').bind(target).first();if(!peer)throw new Error('Player not found.');
 const pair=pairId(p.id,target),friend:any=await db.prepare('SELECT * FROM friendships WHERE pair=?').bind(pair).first();
 if(op==='request'){
  if(friend?.status==='accepted')return response({ok:true});if(friend?.status==='pending')throw new Error('A friend request is already pending.');
  const recent:any=await db.prepare('SELECT COUNT(*) n FROM friendships WHERE sender=? AND created>?').bind(p.id,now-3600000).first();if(recent.n>=10)throw new Error('Please wait before sending more friend requests.');
  await db.prepare("INSERT INTO friendships(pair,sender,recipient,status,created) VALUES (?,?,?,'pending',?) ON CONFLICT(pair) DO UPDATE SET sender=excluded.sender,recipient=excluded.recipient,status='pending',created=excluded.created WHERE friendships.status='declined' AND friendships.created<?").bind(pair,p.id,target,now,now-86400000).run();return response({ok:true});
 }
 if(op==='accept'||op==='decline'){
  if(!friend||friend.recipient!==p.id||friend.status!=='pending')throw new Error('This request is not awaiting your approval.');await db.prepare('UPDATE friendships SET status=? WHERE pair=? AND recipient=?').bind(op==='accept'?'accepted':'declined',pair,p.id).run();return response({ok:true});
 }
 if(op==='remove'){
  await db.prepare("UPDATE friendships SET status='declined',created=? WHERE pair=? AND (sender=? OR recipient=?)").bind(now,pair,p.id,p.id).run();return response({ok:true});
 }
 if(op==='profile'){
  if(friend?.status!=='accepted')return response({name:peer.name,status:friend?.status||'none',incoming:friend?.recipient===p.id});
  const rows=await db.prepare('SELECT id,sender,body,created FROM messages WHERE pair=? ORDER BY created DESC LIMIT 40').bind(pair).all();return response({name:peer.name,status:'accepted',created:peer.created,stats:JSON.parse(peer.stats),aggression:aggression(JSON.parse(peer.stats)),messages:rows.results.reverse(),giftAllowed:p.gift_locked===0});
 }
 if(friend?.status!=='accepted')throw new Error('Both players must approve friendship first.');
 if(op==='message'){
  if(typeof body.message!=='string'||!body.message.trim()||body.message.length>500)throw new Error('Use 1–500 characters.');
  const last:any=await db.prepare('SELECT created FROM messages WHERE pair=? AND sender=? ORDER BY created DESC LIMIT 1').bind(pair,p.id).first();if(last&&now-last.created<1500)throw new Error('Please wait a moment between messages.');
  await db.prepare('INSERT INTO messages (id,pair,sender,body,created) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),pair,p.id,body.message.trim(),now).run();return response({ok:true});
 }
 if(op==='gift'){
  if(req.method!=='POST')return response({error:'Use POST for gifts.'},405);
  const n=body.amount;if(p.gift_locked)throw new Error('Ad-reward accounts cannot send chip gifts.');if(!Number.isSafeInteger(n)||n<5||n%5||n>GIFT_MAX||n>p.cash_balance)throw new Error('Choose an affordable gift from SD 0.05 to SD 25.00 in SD 0.05 increments.');
  const sent:any=await db.prepare("SELECT COALESCE(SUM(amount),0) amount FROM gifts WHERE sender=? AND status='accepted' AND accepted_at>=?").bind(p.id,giftDayStart(now)).first();
  const received:any=await db.prepare("SELECT COALESCE(SUM(amount),0) amount FROM gifts WHERE recipient=? AND status='accepted' AND accepted_at>=?").bind(target,giftDayStart(now)).first();
  if(sent.amount+n>GIFT_DAILY_MAX||received.amount+n>GIFT_DAILY_MAX)throw new Error('The daily SD 300 sent or received gift limit would be exceeded.');
  const recent:any=await db.prepare('SELECT COUNT(*) n FROM gifts WHERE sender=? AND created>?').bind(p.id,now-3600000).first();if(recent.n>=10)throw new Error('Please wait before sending more gift requests.');
  await db.prepare("INSERT INTO gifts (id,sender,recipient,amount,status,created) VALUES (?,?,?,?,'pending',?)").bind(crypto.randomUUID(),p.id,target,n,now).run();return response({ok:true,message:'Gift requested. Chips transfer only when your friend accepts; your balance is checked again then.'});
 }
 return response({error:'Unknown social request.'},400);
}catch(e){return response({error:e instanceof Error?e.message:'Friends are temporarily unavailable.'},400)}}
export const GET=withApiAccess(handle);export const POST=withApiAccess(handle);

export const OPTIONS=apiOptions;
