import { allowedApiOrigin, withApiAccess, apiOptions } from '../../../lib/api-origin';
import { roomDb } from '../../../db';
import { debitSeat, creditSeat } from '../../../db/table-statements';
import { createRoom, joinRoom, startHand, advance, actionRoom, leaveRoom, viewRoom, emptyStats, validateBuyIn, acceptsAction } from '../../../lib/table-engine.mjs';
import { STAKES, aggression, entryCost } from '../../../public/table-config.mjs';
export const dynamic='force-dynamic';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const roomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(10)),b=>alphabet[b%alphabet.length]).join('');
function cleanName(v:unknown,fallback='Player',limit=24){if(typeof v!=='string')return fallback;return v.trim().replace(/[\x00-\x1f\x7f]/g,'').slice(0,limit)||fallback}
function publicProfile(p:any){return {name:p.name,wallet:p.cash_balance,activeRoom:p.active_room,aggression:aggression(JSON.parse(p.stats)),startingGrant:50000}}
async function handle(req:Request){try{
 const url=new URL(req.url);let input:any={};
 if(req.method==='POST'){const origin=req.headers.get('Origin');if(!allowedApiOrigin(req))return json({error:'Open the game directly to continue.'},403);const text=await req.text();if(text.length>4096)return json({error:'Request too large.'},413);try{input=JSON.parse(text)}catch{return json({error:'Invalid request.'},400)}}
 if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Invalid request.'},400);
 const op=req.method==='GET'?(url.searchParams.get('op')||'poll'):input.op,now=Date.now();
 if(req.method==='GET'&&!['list','inspect','poll','profile'].includes(op))return json({error:'Use POST for table actions.'},405);
 if(!['list','inspect','poll','profile','create','join','start','next','action','leave'].includes(op))return json({error:'Unknown table request.'},400);
 const db=roomDb();
 if(op==='list'){const result=await db.prepare("SELECT code,payload FROM rooms WHERE expires > ? AND json_extract(payload,'$.listed') = 1 AND json_extract(payload,'$.moneyVersion') = 2 AND json_extract(payload,'$.engineVersion') = 3 AND json_extract(payload,'$.updated') > ? ORDER BY json_extract(payload,'$.updated') DESC LIMIT 40").bind(now,now-180000).all();return json({tables:result.results.map((row:any)=>{const r=JSON.parse(row.payload),t=STAKES[r.stake as keyof typeof STAKES];return {code:row.code,name:r.name,stake:r.stake,variant:r.variant,stakeLabel:t.label,funds:t.funds,bankRequired:t.bankRequired,min:t.min,max:t.max,unit:t.unit,players:r.seats.filter(Boolean).length,capacity:r.capacity,phase:r.phase,rules:r.rules}})})}
 if(op==='inspect'){const code=String(url.searchParams.get('code')||'').toUpperCase();if(!/^[A-Z2-9]{10}$/.test(code))throw new Error('Enter the 10-character invite code.');const row:any=await db.prepare('SELECT payload,expires FROM rooms WHERE code=?').bind(code).first();if(!row||row.expires<=now)throw new Error('That table has expired or does not exist.');const r=JSON.parse(row.payload),t=STAKES[r.stake as keyof typeof STAKES];if(r.kind!=='live'||!t||(r.moneyVersion!==2||r.engineVersion!==3))throw new Error('This is not a live table.');return json({table:{code,name:r.name,variant:r.variant,stakeLabel:t.label,funds:t.funds,bankRequired:t.bankRequired,min:t.min,max:t.max,unit:t.unit,phase:r.phase,players:r.seats.filter(Boolean).length,capacity:r.capacity}})}
 let token=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'',auth=/^[a-f0-9]{64}$/.test(token)?await hash(token):null;
 let profile:any=auth?await db.prepare('SELECT * FROM profiles WHERE id = ?').bind(auth).first():null;
 if(op==='profile'&&!profile&&req.method==='POST'){token=secret();auth=await hash(token);await db.prepare('INSERT INTO profiles (id,name,wallet,stats,created,updated) VALUES (?,?,0,?,?,?)').bind(auth,cleanName(input.name),JSON.stringify(emptyStats()),now,now).run();profile=await db.prepare('SELECT * FROM profiles WHERE id = ?').bind(auth).first()}
 if(!profile)return json({error:'Open Play to create or restore your player profile.'},401);
 // Expired tables return remaining stack once; credentials remain in the browser, never in an invite.
 if(profile.active_room){const old:any=await db.prepare('SELECT payload,expires FROM rooms WHERE code = ?').bind(profile.active_room).first();const r=old?JSON.parse(old.payload):null;if(!old||old.expires<=now||(r.moneyVersion!==2||r.engineVersion!==3)){const i=r?.seats.findIndex((s:any)=>s?.hash===auth)??-1,payout=r?.moneyVersion===2&&r?.funds==='cash'?(i>=0?(r.phase==='playing'&&r.engineVersion!==3?r.handStartStacks?.[i]??r.stacks[i]:r.stacks[i]):profile.escrow):0;await creditSeat(db,auth!,profile.active_room,payout,now).run();profile=await db.prepare('SELECT * FROM profiles WHERE id=?').bind(auth).first()}}
 if(op==='profile'){
  let activeTable=null;
  if(profile.active_room){const saved:any=await db.prepare('SELECT payload FROM rooms WHERE code=?').bind(profile.active_room).first();if(saved){const r=JSON.parse(saved.payload);activeTable={kind:r.kind,name:r.name,phase:r.phase}}}
  return json({token,profile:{...publicProfile(profile),activeTable}});
 }
 if(op==='create'){
  if(profile.active_room)return json({error:'You already have a seat. Resume it or leave that table first.',activeRoom:profile.active_room},409);
  const buyIn=Number(input.buyIn),tier=validateBuyIn(input.stake,buyIn),cost=entryCost(input.stake,buyIn);if(profile.cash_balance<cost||profile.cash_balance<tier.bankRequired)throw new Error('Your Stack Dollars available cannot cover this table. Choose a smaller buy-in or a lower stake level.');
  const playerName=cleanName(input.name),room=createRoom(playerName,auth,input.mode,now,{kind:input.kind,variant:input.variant,stake:input.stake,buyIn,capacity:input.capacity,tableName:cleanName(input.tableName,playerName+'’s table',40),listed:input.listed,rules:input.rules,stats:JSON.parse(profile.stats)});
  if(room.kind==='solo'){for(const seat of room.seats.filter((p:any)=>p?.bot)){const id='bot:'+seat.name;await db.prepare('INSERT OR IGNORE INTO profiles (id,name,wallet,stats,created,updated) VALUES (?,?,0,?,?,?)').bind(id,seat.name,JSON.stringify(emptyStats()),now,now).run();const previous:any=await db.prepare('SELECT stats FROM profiles WHERE id=?').bind(id).first();seat.stats=JSON.parse(previous.stats)}startHand(room,now)}
  const code=roomCode();const results=await db.batch([
   debitSeat(db,auth!,code,cost,Math.max(cost,tier.bankRequired),playerName,now),
   db.prepare('INSERT INTO rooms (code,version,payload,expires) SELECT ?,0,?,? WHERE EXISTS (SELECT 1 FROM profiles WHERE id=? AND active_room=?)').bind(code,JSON.stringify(room),now+86400000,auth,code)
  ]);if(!results[0].meta.changes)throw new Error('Your wallet or seat changed. Refresh your profile and try again.');profile=await db.prepare('SELECT * FROM profiles WHERE id=?').bind(auth).first();return json({token,profile:publicProfile(profile),view:viewRoom(room,0,0,code)})
 }
 const code=String(input.code||url.searchParams.get('code')||profile.active_room||'').toUpperCase().replace(/\s/g,'');if(!/^[A-Z2-9]{10}$/.test(code))throw new Error('Enter the 10-character table code.');
 for(let attempt=0;attempt<6;attempt++){
  const row:any=await db.prepare('SELECT payload,version,expires FROM rooms WHERE code=?').bind(code).first();if(!row||row.expires<now)return json({error:'This table has expired or does not exist.'},404);
  const r=JSON.parse(row.payload);if((r.moneyVersion!==2||r.engineVersion!==3))throw new Error('This table used the previous rules. Return to Play to restore your balance and create a new table.');
  let seat=r.seats.findIndex((s:any)=>s?.hash===auth);const original=JSON.stringify(r),priorStats=r.seats.map((s:any)=>s?{...s.stats}:null);let joined=false,leaving:any=null;
  if(op==='join'&&seat<0){profile=await db.prepare('SELECT * FROM profiles WHERE id=?').bind(auth).first();if(profile.active_room)throw new Error('Leave your current table before buying into another.');const buyIn=Number(input.buyIn),tier=validateBuyIn(r.stake,buyIn),cost=entryCost(r.stake,buyIn);if(profile.cash_balance<cost||profile.cash_balance<tier.bankRequired)throw new Error('Not enough Stack Dollars available for this table.');seat=joinRoom(r,cleanName(input.name),auth,buyIn,JSON.parse(profile.stats));joined=true}
  else if(seat<0)return json({error:'Your seat is no longer at this table.'},403);
  advance(r,now);
  if(op==='start'||op==='next'){if(seat!==r.host)throw new Error('Only the host can deal the next hand.');if(input.version!==row.version)return json({error:'The table changed. Try again.',view:viewRoom(r,seat,row.version,code)},409);startHand(r,now)}
  else if(op==='action'){if(typeof input.requestId!=='string'||!input.requestId.length||input.requestId.length>80)throw new Error('Invalid action.');if(r.lastActions[seat]!==input.requestId&&!acceptsAction(r,seat,input,row.version))return json({error:'The table changed. Choose your action again.',view:viewRoom(r,seat,row.version,code)},409);actionRoom(r,seat,input.action,input.amount,input.requestId,now)}
  else if(op==='leave')leaving=leaveRoom(r,seat,now);
  else if(!['poll','join'].includes(op))throw new Error('Unknown table request.');
  if(now-(r.updated||0)>30000)r.updated=now;
  if(JSON.stringify(r)===original)return json({view:viewRoom(r,seat,row.version,code),profile:publicProfile(profile)});
  const mutation=secret();r.mutation=mutation;const guard="EXISTS (SELECT 1 FROM rooms WHERE code=? AND json_extract(payload,'$.mutation')=?)";
  const joinGuard=joined?' AND EXISTS (SELECT 1 FROM profiles WHERE id=? AND active_room IS NULL AND cash_balance>=?)':'';
  const update=db.prepare('UPDATE rooms SET payload=?,version=version+1 WHERE code=? AND version=?'+joinGuard);const binds:any[]=[JSON.stringify(r),code,row.version];if(joined)binds.push(auth,Math.max(entryCost(r.stake,Number(input.buyIn)),STAKES[r.stake as keyof typeof STAKES].bankRequired));
  const batch=[update.bind(...binds)];
  if(joined)batch.push(debitSeat(db,auth!,code,entryCost(r.stake,Number(input.buyIn)),Math.max(entryCost(r.stake,Number(input.buyIn)),STAKES[r.stake as keyof typeof STAKES].bankRequired),cleanName(input.name),now,mutation));
  if(leaving)batch.push(creditSeat(db,auth!,code,leaving.payout,now,JSON.stringify(leaving.stats),mutation));
  for(let i=0;i<r.seats.length;i++){const s=r.seats[i];if(s&&!s.bot&&JSON.stringify(s.stats)!==JSON.stringify(priorStats[i]))batch.push(db.prepare('UPDATE profiles SET stats=?,updated=? WHERE id=? AND active_room=? AND '+guard).bind(JSON.stringify(s.stats),now,s.hash,code,code,mutation))}
  for(let i=0;i<r.seats.length;i++){const s=r.seats[i],prev=priorStats[i];if(s?.bot&&prev&&s.stats.actions>prev.actions){batch.push(db.prepare("UPDATE profiles SET stats=json_set(stats,'$.actions',json_extract(stats,'$.actions')+?,'$.raises',json_extract(stats,'$.raises')+?,'$.calls',json_extract(stats,'$.calls')+?,'$.checks',json_extract(stats,'$.checks')+?,'$.folds',json_extract(stats,'$.folds')+?),updated=? WHERE id=? AND "+guard).bind(s.stats.actions-prev.actions,s.stats.raises-prev.raises,s.stats.calls-prev.calls,s.stats.checks-prev.checks,s.stats.folds-prev.folds,now,'bot:'+s.name,code,mutation))}}
  // Idempotent evidence is committed only with the successful room mutation.
  const previousAudit=new Set((JSON.parse(original).auditHands||[]).map((e:any)=>e.hand+':'+e.loser+':'+e.winner));
  for(const evidence of r.auditHands||[]){const key=evidence.hand+':'+evidence.loser+':'+evidence.winner;if(previousAudit.has(key))continue;
   batch.push(db.prepare('INSERT OR IGNORE INTO fair_play_signals (id,room,hand,loser,winner,loss,gain,created) SELECT ?,?,?,?,?,?,?,? WHERE '+guard).bind(code+':'+key,code,evidence.hand,evidence.loser,evidence.winner,evidence.loss,evidence.gain,evidence.time,code,mutation));
   batch.push(db.prepare("INSERT INTO fair_play_flags (pair,loser,winner,hands,loss,status,updated) SELECT ?,loser,winner,COUNT(*),SUM(loss),'review',? FROM fair_play_signals WHERE loser=? AND winner=? AND created>=? AND "+guard+" GROUP BY loser,winner HAVING COUNT(*)>=3 ON CONFLICT(pair) DO UPDATE SET hands=excluded.hands,loss=excluded.loss,updated=excluded.updated").bind(evidence.loser+':'+evidence.winner,now,evidence.loser,evidence.winner,now-30*86400000,code,mutation));
  }
  const results=await db.batch(batch);if(results[0].meta.changes){profile=await db.prepare('SELECT * FROM profiles WHERE id=?').bind(auth).first();return json(leaving?{left:true,profile:publicProfile(profile)}:{token,profile:publicProfile(profile),view:viewRoom(r,seat,row.version+1,code)})}
 }
 return json({error:'The table is busy. Please try again.'},409);
 }catch(e){const message=e instanceof Error?e.message:'Unable to reach the table.';if(/D1|SQLITE|LIBSQL|HRANA|fetch failed|binding|database|UNIQUE constraint/i.test(message)){console.error('Table storage error',e);return json({error:'The table is temporarily unavailable. Your saved balance is kept; retry shortly.'},503)}return json({error:message},400)}}
export const GET=withApiAccess(handle);
export const POST=withApiAccess(handle);

export const OPTIONS=apiOptions;
